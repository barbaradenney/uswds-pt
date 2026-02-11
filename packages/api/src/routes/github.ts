/**
 * GitHub Integration Routes
 *
 * Endpoints for GitHub repo listing and team-level GitHub connections.
 *
 * GET    /api/github/repos                       - List user's GitHub repos
 * GET    /api/teams/:teamId/github               - Get team connection status
 * POST   /api/teams/:teamId/github/connect       - Connect team to a repo
 * DELETE /api/teams/:teamId/github/disconnect     - Remove team connection
 * GET    /api/teams/:teamId/github/handoff        - Get handoff connection status
 * POST   /api/teams/:teamId/github/handoff/connect    - Connect handoff repo
 * DELETE /api/teams/:teamId/github/handoff/disconnect  - Remove handoff connection
 */

import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  users,
  teamMemberships,
  githubTeamConnections,
  githubHandoffConnections,
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

export async function githubTeamRoutes(app: FastifyInstance) {
  /**
   * GET /api/teams/:teamId/github
   * Get GitHub connection status for a team
   */
  app.get<{ Params: { teamId: string } }>(
    '/:teamId/github',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { teamId } = request.params;

      // Check user belongs to this team
      const [membership] = await db
        .select({ role: teamMemberships.role })
        .from(teamMemberships)
        .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, authUser.id)))
        .limit(1);

      if (!membership) {
        return reply.status(403).send({ message: 'Not a member of this team' });
      }

      const [connection] = await db
        .select()
        .from(githubTeamConnections)
        .where(eq(githubTeamConnections.teamId, teamId))
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
   * POST /api/teams/:teamId/github/connect
   * Connect a team to a GitHub repository
   */
  app.post<{ Params: { teamId: string }; Body: { owner: string; repo: string; defaultBranch?: string } }>(
    '/:teamId/github/connect',
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
      const { teamId } = request.params;
      const { owner, repo, defaultBranch } = request.body;

      // Validate owner/repo format to prevent URL injection
      if (!GITHUB_NAME_RE.test(owner) || !GITHUB_NAME_RE.test(repo)) {
        return reply.status(400).send({ message: 'Invalid repository owner or name' });
      }

      const resolvedBranch = defaultBranch || 'main';
      if (!isValidBranchSlug(resolvedBranch)) {
        return reply.status(400).send({ message: 'Invalid default branch name' });
      }

      // Check user is team_admin or org_admin
      const [membership] = await db
        .select({ role: teamMemberships.role })
        .from(teamMemberships)
        .where(and(
          eq(teamMemberships.userId, authUser.id),
          eq(teamMemberships.teamId, teamId),
        ))
        .limit(1);

      if (!membership || (membership.role !== 'team_admin' && membership.role !== 'org_admin')) {
        return reply.status(403).send({ message: 'Only team admins can connect GitHub' });
      }

      // Atomic upsert connection (avoids TOCTOU race)
      await db
        .insert(githubTeamConnections)
        .values({
          teamId,
          repoOwner: owner,
          repoName: repo,
          defaultBranch: resolvedBranch,
          connectedBy: authUser.id,
        })
        .onConflictDoUpdate({
          target: githubTeamConnections.teamId,
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
   * DELETE /api/teams/:teamId/github/disconnect
   * Remove GitHub connection from a team
   */
  app.delete<{ Params: { teamId: string } }>(
    '/:teamId/github/disconnect',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { teamId } = request.params;

      // Check user is team_admin or org_admin
      const [membership] = await db
        .select({ role: teamMemberships.role })
        .from(teamMemberships)
        .where(and(
          eq(teamMemberships.userId, authUser.id),
          eq(teamMemberships.teamId, teamId),
        ))
        .limit(1);

      if (!membership || (membership.role !== 'team_admin' && membership.role !== 'org_admin')) {
        return reply.status(403).send({ message: 'Only team admins can disconnect GitHub' });
      }

      const result = await db
        .delete(githubTeamConnections)
        .where(eq(githubTeamConnections.teamId, teamId))
        .returning();

      if (result.length === 0) {
        return reply.code(404).send({ message: 'No GitHub connection found' });
      }

      return { message: 'Disconnected' };
    },
  );

  // ============================================================================
  // Handoff Connection Endpoints
  // ============================================================================

  /**
   * GET /api/teams/:teamId/github/handoff
   * Get developer handoff connection status for a team
   */
  app.get<{ Params: { teamId: string } }>(
    '/:teamId/github/handoff',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { teamId } = request.params;

      const [membership] = await db
        .select({ role: teamMemberships.role })
        .from(teamMemberships)
        .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, authUser.id)))
        .limit(1);

      if (!membership) {
        return reply.status(403).send({ message: 'Not a member of this team' });
      }

      const [connection] = await db
        .select()
        .from(githubHandoffConnections)
        .where(eq(githubHandoffConnections.teamId, teamId))
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
   * POST /api/teams/:teamId/github/handoff/connect
   * Connect a team to a handoff GitHub repository
   */
  app.post<{ Params: { teamId: string }; Body: { owner: string; repo: string; defaultBranch?: string } }>(
    '/:teamId/github/handoff/connect',
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
      const { teamId } = request.params;
      const { owner, repo, defaultBranch } = request.body;

      if (!GITHUB_NAME_RE.test(owner) || !GITHUB_NAME_RE.test(repo)) {
        return reply.status(400).send({ message: 'Invalid repository owner or name' });
      }

      const resolvedBranch = defaultBranch || 'main';
      if (!isValidBranchSlug(resolvedBranch)) {
        return reply.status(400).send({ message: 'Invalid default branch name' });
      }

      const [membership] = await db
        .select({ role: teamMemberships.role })
        .from(teamMemberships)
        .where(and(
          eq(teamMemberships.userId, authUser.id),
          eq(teamMemberships.teamId, teamId),
        ))
        .limit(1);

      if (!membership || (membership.role !== 'team_admin' && membership.role !== 'org_admin')) {
        return reply.status(403).send({ message: 'Only team admins can connect GitHub' });
      }

      await db
        .insert(githubHandoffConnections)
        .values({
          teamId,
          repoOwner: owner,
          repoName: repo,
          defaultBranch: resolvedBranch,
          connectedBy: authUser.id,
        })
        .onConflictDoUpdate({
          target: githubHandoffConnections.teamId,
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
   * DELETE /api/teams/:teamId/github/handoff/disconnect
   * Remove handoff connection from a team
   */
  app.delete<{ Params: { teamId: string } }>(
    '/:teamId/github/handoff/disconnect',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { teamId } = request.params;

      const [membership] = await db
        .select({ role: teamMemberships.role })
        .from(teamMemberships)
        .where(and(
          eq(teamMemberships.userId, authUser.id),
          eq(teamMemberships.teamId, teamId),
        ))
        .limit(1);

      if (!membership || (membership.role !== 'team_admin' && membership.role !== 'org_admin')) {
        return reply.status(403).send({ message: 'Only team admins can disconnect GitHub' });
      }

      const result = await db
        .delete(githubHandoffConnections)
        .where(eq(githubHandoffConnections.teamId, teamId))
        .returning();

      if (result.length === 0) {
        return reply.code(404).send({ message: 'No handoff connection found' });
      }

      return { message: 'Disconnected' };
    },
  );
}
