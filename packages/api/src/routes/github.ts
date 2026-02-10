/**
 * GitHub Integration Routes
 *
 * Endpoints for GitHub repo listing and org-level GitHub connections.
 *
 * GET    /api/github/repos                          - List user's GitHub repos
 * GET    /api/organizations/:orgId/github            - Get org connection status
 * POST   /api/organizations/:orgId/github/connect    - Connect org to a repo
 * DELETE /api/organizations/:orgId/github/disconnect  - Remove org connection
 */

import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  users,
  teams,
  teamMemberships,
  githubOrgConnections,
} from '../db/schema.js';
import { getAuthUser } from '../middleware/permissions.js';
import { listUserRepos } from '../lib/github-push.js';

// ============================================================================
// Validation helpers
// ============================================================================

/** GitHub owner/repo names: alphanumeric, hyphens, dots, underscores */
const GITHUB_NAME_RE = /^[a-zA-Z0-9._-]{1,100}$/;

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

export async function githubOrgRoutes(app: FastifyInstance) {
  /**
   * GET /api/organizations/:orgId/github
   * Get GitHub connection status for an organization
   */
  app.get<{ Params: { orgId: string } }>(
    '/:orgId/github',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { orgId } = request.params;

      // Check user belongs to this org (has at least one team membership in the org)
      const membership = await db
        .select({ role: teamMemberships.role })
        .from(teamMemberships)
        .innerJoin(teams, eq(teams.id, teamMemberships.teamId))
        .where(and(eq(teams.organizationId, orgId), eq(teamMemberships.userId, authUser.id)))
        .limit(1);

      if (membership.length === 0) {
        return reply.status(403).send({ message: 'Not a member of this organization' });
      }

      const [connection] = await db
        .select()
        .from(githubOrgConnections)
        .where(eq(githubOrgConnections.organizationId, orgId))
        .limit(1);

      if (!connection) {
        return { connected: false };
      }

      return {
        connected: true,
        repoOwner: connection.repoOwner,
        repoName: connection.repoName,
        defaultBranch: connection.defaultBranch,
      };
    },
  );

  /**
   * POST /api/organizations/:orgId/github/connect
   * Connect an organization to a GitHub repository
   */
  app.post<{ Params: { orgId: string }; Body: { owner: string; repo: string; defaultBranch?: string } }>(
    '/:orgId/github/connect',
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['owner', 'repo'],
          properties: {
            owner: { type: 'string', minLength: 1, maxLength: 100 },
            repo: { type: 'string', minLength: 1, maxLength: 100 },
            defaultBranch: { type: 'string', minLength: 1, maxLength: 100 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { orgId } = request.params;
      const { owner, repo, defaultBranch } = request.body;

      // Validate owner/repo format to prevent URL injection
      if (!GITHUB_NAME_RE.test(owner) || !GITHUB_NAME_RE.test(repo)) {
        return reply.status(400).send({ message: 'Invalid repository owner or name' });
      }

      const resolvedBranch = defaultBranch || 'main';
      if (!isValidBranchSlug(resolvedBranch)) {
        return reply.status(400).send({ message: 'Invalid default branch name' });
      }

      // Check user is org_admin
      const membership = await db
        .select({ role: teamMemberships.role })
        .from(teamMemberships)
        .innerJoin(teams, eq(teams.id, teamMemberships.teamId))
        .where(and(
          eq(teamMemberships.userId, authUser.id),
          eq(teams.organizationId, orgId),
          eq(teamMemberships.role, 'org_admin')
        ))
        .limit(1);

      if (membership.length === 0) {
        return reply.status(403).send({ message: 'Only org admins can connect GitHub' });
      }

      // Atomic upsert connection (avoids TOCTOU race)
      await db
        .insert(githubOrgConnections)
        .values({
          organizationId: orgId,
          repoOwner: owner,
          repoName: repo,
          defaultBranch: resolvedBranch,
          connectedBy: authUser.id,
        })
        .onConflictDoUpdate({
          target: githubOrgConnections.organizationId,
          set: {
            repoOwner: owner,
            repoName: repo,
            defaultBranch: resolvedBranch,
            connectedBy: authUser.id,
            updatedAt: new Date(),
          },
        });

      return { message: 'Connected' };
    },
  );

  /**
   * DELETE /api/organizations/:orgId/github/disconnect
   * Remove GitHub connection from an organization
   */
  app.delete<{ Params: { orgId: string } }>(
    '/:orgId/github/disconnect',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { orgId } = request.params;

      // Check user is org_admin
      const membership = await db
        .select({ role: teamMemberships.role })
        .from(teamMemberships)
        .innerJoin(teams, eq(teams.id, teamMemberships.teamId))
        .where(and(
          eq(teamMemberships.userId, authUser.id),
          eq(teams.organizationId, orgId),
          eq(teamMemberships.role, 'org_admin')
        ))
        .limit(1);

      if (membership.length === 0) {
        return reply.status(403).send({ message: 'Only org admins can disconnect GitHub' });
      }

      const result = await db
        .delete(githubOrgConnections)
        .where(eq(githubOrgConnections.organizationId, orgId))
        .returning();

      if (result.length === 0) {
        return reply.code(404).send({ error: 'No GitHub connection found' });
      }

      return { message: 'Disconnected' };
    },
  );
}
