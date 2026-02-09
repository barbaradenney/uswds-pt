/**
 * GitHub Integration Routes
 *
 * Endpoints for connecting prototypes to GitHub repos and pushing HTML on save.
 *
 * GET  /api/github/repos                     - List user's GitHub repos
 * GET  /api/prototypes/:slug/github           - Get connection info
 * POST /api/prototypes/:slug/github/connect   - Connect a repo
 * POST /api/prototypes/:slug/github/push      - Push current HTML to GitHub
 * POST /api/prototypes/:slug/github/disconnect - Remove connection
 */

import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  users,
  prototypes,
  githubRepoConnections,
  teamMemberships,
} from '../db/schema.js';
import { getAuthUser } from '../middleware/permissions.js';
import { pushToGitHub, createGitHubBranch, listUserRepos } from '../lib/github-push.js';
import { hasPermission, Role, ROLES } from '../db/roles.js';

// ============================================================================
// Validation helpers
// ============================================================================

/** GitHub owner/repo names: alphanumeric, hyphens, dots, underscores */
const GITHUB_NAME_RE = /^[a-zA-Z0-9._-]{1,100}$/;

/**
 * Validate a file path to prevent path traversal.
 * Must not contain `..`, must not start with `/`, and must only use
 * safe characters (alphanumeric, hyphens, underscores, dots, slashes).
 */
function isValidFilePath(filePath: string): boolean {
  if (!filePath || filePath.length > 256) return false;
  if (filePath.includes('..')) return false;
  if (filePath.startsWith('/')) return false;
  if (filePath.includes('\\')) return false;
  // Only allow safe characters
  return /^[a-zA-Z0-9._/\- ]+$/.test(filePath);
}

/**
 * Validate a git branch name segment (the part after `uswds-pt/`).
 * Must not contain `..`, spaces, `~`, `^`, `:`, or control characters.
 */
export function isValidBranchSlug(slug: string): boolean {
  if (!slug || slug.length > 100) return false;
  if (slug.includes('..')) return false;
  // Disallow characters invalid in git refs
  return /^[a-zA-Z0-9._/-]+$/.test(slug) && !slug.endsWith('.lock');
}

// ============================================================================
// Authorization helpers
// ============================================================================

async function getTeamMembership(userId: string, teamId: string) {
  const [membership] = await db
    .select({ role: teamMemberships.role })
    .from(teamMemberships)
    .where(
      and(
        eq(teamMemberships.teamId, teamId),
        eq(teamMemberships.userId, userId),
      )
    )
    .limit(1);
  return membership || null;
}

async function canAccessPrototype(
  userId: string,
  prototype: { teamId: string | null; createdBy: string },
) {
  if (!prototype.teamId) {
    return prototype.createdBy === userId;
  }
  const membership = await getTeamMembership(userId, prototype.teamId);
  return !!membership;
}

async function canEditPrototype(
  userId: string,
  prototype: { teamId: string | null; createdBy: string },
) {
  if (!prototype.teamId) {
    return prototype.createdBy === userId;
  }
  const membership = await getTeamMembership(userId, prototype.teamId);
  if (!membership) return false;
  return hasPermission(membership.role as Role, ROLES.TEAM_MEMBER);
}

// ============================================================================
// Routes
// ============================================================================

export async function githubRoutes(app: FastifyInstance) {
  /**
   * GET /api/github/repos
   * List repositories accessible to the authenticated user
   */
  app.get(
    '/repos',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const authUser = getAuthUser(request);

      // Get user's encrypted GitHub token
      const [user] = await db
        .select({ githubAccessToken: users.githubAccessToken })
        .from(users)
        .where(eq(users.id, authUser.id))
        .limit(1);

      if (!user?.githubAccessToken) {
        return reply.status(400).send({ message: 'GitHub account not linked' });
      }

      try {
        const repos = await listUserRepos(user.githubAccessToken);
        return {
          repos: repos.map((r) => ({
            fullName: r.full_name,
            name: r.name,
            owner: r.owner.login,
            defaultBranch: r.default_branch,
            private: r.private,
            htmlUrl: r.html_url,
          })),
        };
      } catch (err) {
        request.log.error(err, 'Failed to list GitHub repos');
        return reply.status(502).send({ message: 'Failed to fetch GitHub repositories' });
      }
    },
  );
}

export async function githubPrototypeRoutes(app: FastifyInstance) {
  /**
   * GET /api/prototypes/:slug/github
   * Get GitHub connection info for a prototype
   */
  app.get<{ Params: { slug: string } }>(
    '/:slug/github',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { slug } = request.params;

      const [proto] = await db
        .select({ id: prototypes.id, teamId: prototypes.teamId, createdBy: prototypes.createdBy })
        .from(prototypes)
        .where(eq(prototypes.slug, slug))
        .limit(1);

      if (!proto) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Authorization: must be able to access the prototype
      if (!(await canAccessPrototype(authUser.id, proto))) {
        return reply.status(403).send({ message: 'Not authorized to access this prototype' });
      }

      const [connection] = await db
        .select()
        .from(githubRepoConnections)
        .where(eq(githubRepoConnections.prototypeId, proto.id))
        .limit(1);

      if (!connection) {
        return { connected: false };
      }

      return {
        connected: true,
        repoOwner: connection.repoOwner,
        repoName: connection.repoName,
        defaultBranch: connection.defaultBranch,
        filePath: connection.filePath,
        lastPushedAt: connection.lastPushedAt,
        lastPushedVersion: connection.lastPushedVersion,
        lastPushedCommitSha: connection.lastPushedCommitSha,
      };
    },
  );

  /**
   * POST /api/prototypes/:slug/github/connect
   * Connect a prototype to a GitHub repository
   */
  app.post<{
    Params: { slug: string };
    Body: { owner: string; repo: string; filePath?: string; defaultBranch?: string };
  }>(
    '/:slug/github/connect',
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['owner', 'repo'],
          properties: {
            owner: { type: 'string', minLength: 1, maxLength: 100 },
            repo: { type: 'string', minLength: 1, maxLength: 100 },
            filePath: { type: 'string', minLength: 1, maxLength: 256 },
            defaultBranch: { type: 'string', minLength: 1, maxLength: 100 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { slug } = request.params;
      const { owner, repo, filePath, defaultBranch } = request.body;

      // Validate owner/repo format to prevent URL injection
      if (!GITHUB_NAME_RE.test(owner) || !GITHUB_NAME_RE.test(repo)) {
        return reply.status(400).send({ message: 'Invalid repository owner or name' });
      }

      // Validate filePath to prevent path traversal
      const resolvedPath = filePath || 'prototype.html';
      if (!isValidFilePath(resolvedPath)) {
        return reply.status(400).send({ message: 'Invalid file path' });
      }

      // Validate defaultBranch if provided
      const resolvedBranch = defaultBranch || 'main';
      if (!isValidBranchSlug(resolvedBranch)) {
        return reply.status(400).send({ message: 'Invalid default branch name' });
      }

      const [proto] = await db
        .select({ id: prototypes.id, teamId: prototypes.teamId, createdBy: prototypes.createdBy })
        .from(prototypes)
        .where(eq(prototypes.slug, slug))
        .limit(1);

      if (!proto) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Authorization: must be able to edit the prototype
      if (!(await canEditPrototype(authUser.id, proto))) {
        return reply.status(403).send({ message: 'Not authorized to modify this prototype' });
      }

      // Upsert connection
      const existing = await db
        .select({ id: githubRepoConnections.id })
        .from(githubRepoConnections)
        .where(eq(githubRepoConnections.prototypeId, proto.id))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(githubRepoConnections)
          .set({
            repoOwner: owner,
            repoName: repo,
            defaultBranch: resolvedBranch,
            filePath: resolvedPath,
            updatedAt: new Date(),
          })
          .where(eq(githubRepoConnections.prototypeId, proto.id));
      } else {
        await db.insert(githubRepoConnections).values({
          prototypeId: proto.id,
          repoOwner: owner,
          repoName: repo,
          defaultBranch: resolvedBranch,
          filePath: resolvedPath,
        });
      }

      return { message: 'Connected' };
    },
  );

  /**
   * POST /api/prototypes/:slug/github/push
   * Push current prototype HTML to the connected GitHub repository
   */
  app.post<{ Params: { slug: string } }>(
    '/:slug/github/push',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { slug } = request.params;

      // Get prototype
      const [proto] = await db
        .select({
          id: prototypes.id,
          htmlContent: prototypes.htmlContent,
          version: prototypes.version,
          name: prototypes.name,
          activeBranchId: prototypes.activeBranchId,
          teamId: prototypes.teamId,
          createdBy: prototypes.createdBy,
        })
        .from(prototypes)
        .where(eq(prototypes.slug, slug))
        .limit(1);

      if (!proto) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Authorization: must be able to edit the prototype
      if (!(await canEditPrototype(authUser.id, proto))) {
        return reply.status(403).send({ message: 'Not authorized to modify this prototype' });
      }

      // Get connection
      const [connection] = await db
        .select()
        .from(githubRepoConnections)
        .where(eq(githubRepoConnections.prototypeId, proto.id))
        .limit(1);

      if (!connection) {
        return reply.status(400).send({ message: 'No GitHub repo connected' });
      }

      // Get user's token
      const [user] = await db
        .select({ githubAccessToken: users.githubAccessToken })
        .from(users)
        .where(eq(users.id, authUser.id))
        .limit(1);

      if (!user?.githubAccessToken) {
        return reply.status(400).send({ message: 'GitHub account not linked' });
      }

      // Determine branch: if prototype is on an app branch, use uswds-pt/<branchSlug>
      let gitBranch = connection.defaultBranch;
      if (proto.activeBranchId) {
        const { prototypeBranches } = await import('../db/schema.js');
        const [branch] = await db
          .select({ slug: prototypeBranches.slug })
          .from(prototypeBranches)
          .where(eq(prototypeBranches.id, proto.activeBranchId))
          .limit(1);

        if (branch && isValidBranchSlug(branch.slug)) {
          gitBranch = `uswds-pt/${branch.slug}`;
          try {
            await createGitHubBranch({
              encryptedAccessToken: user.githubAccessToken,
              owner: connection.repoOwner,
              repo: connection.repoName,
              branchName: gitBranch,
              fromBranch: connection.defaultBranch,
            });
          } catch {
            // Branch may already exist, that's fine
          }
        }
      }

      try {
        const result = await pushToGitHub({
          encryptedAccessToken: user.githubAccessToken,
          owner: connection.repoOwner,
          repo: connection.repoName,
          branch: gitBranch,
          filePath: connection.filePath,
          content: proto.htmlContent,
          commitMessage: `Update ${proto.name} (v${proto.version})`,
        });

        // Update connection with push info
        await db
          .update(githubRepoConnections)
          .set({
            lastPushedAt: new Date(),
            lastPushedVersion: proto.version,
            lastPushedCommitSha: result.commitSha,
            updatedAt: new Date(),
          })
          .where(eq(githubRepoConnections.id, connection.id));

        return {
          commitSha: result.commitSha,
          htmlUrl: result.htmlUrl,
          branch: gitBranch,
        };
      } catch (err) {
        request.log.error(err, 'GitHub push failed');
        // Don't leak GitHub API error details to client
        return reply.status(502).send({ message: 'Failed to push to GitHub' });
      }
    },
  );

  /**
   * POST /api/prototypes/:slug/github/disconnect
   * Remove GitHub connection from a prototype
   */
  app.post<{ Params: { slug: string } }>(
    '/:slug/github/disconnect',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { slug } = request.params;

      const [proto] = await db
        .select({ id: prototypes.id, teamId: prototypes.teamId, createdBy: prototypes.createdBy })
        .from(prototypes)
        .where(eq(prototypes.slug, slug))
        .limit(1);

      if (!proto) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Authorization: must be able to edit the prototype
      if (!(await canEditPrototype(authUser.id, proto))) {
        return reply.status(403).send({ message: 'Not authorized to modify this prototype' });
      }

      await db
        .delete(githubRepoConnections)
        .where(eq(githubRepoConnections.prototypeId, proto.id));

      return { message: 'Disconnected' };
    },
  );
}
