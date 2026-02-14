/**
 * GitHub Routes Tests
 *
 * Tests GitHub integration endpoints using Fastify inject().
 * Covers:
 * - GET  /api/github/repos                          (list user repos)
 * - GET  /api/teams/:teamId/github                  (team connection status)
 * - POST /api/teams/:teamId/github/connect          (connect repo)
 * - DELETE /api/teams/:teamId/github/disconnect      (disconnect repo)
 * - GET  /api/teams/:teamId/github/handoff           (handoff connection status)
 * - POST /api/teams/:teamId/github/handoff/connect   (connect handoff repo)
 * - DELETE /api/teams/:teamId/github/handoff/disconnect (disconnect handoff)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { githubRoutes, githubTeamRoutes, isValidBranchSlug } from './github.js';
import { errorHandler } from '../lib/error-handler.js';

// ---------------------------------------------------------------------------
// Mocks — use vi.hoisted() so variables are available when vi.mock is hoisted
// ---------------------------------------------------------------------------

const { mockDb, mockLimit, mockReturning, mockListUserRepos } = vi.hoisted(() => {
  const mockLimit = vi.fn().mockResolvedValue([]);
  const mockReturning = vi.fn().mockResolvedValue([]);
  const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate, returning: mockReturning });

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: mockLimit,
    orderBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: mockValues,
    returning: mockReturning,
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ returning: mockReturning }),
    }),
  };

  const mockListUserRepos = vi.fn();

  return { mockDb, mockLimit, mockReturning, mockListUserRepos };
});

vi.mock('../db/index.js', () => ({
  db: mockDb,
  users: { id: 'id', githubAccessToken: 'githubAccessToken' },
  teamMemberships: { userId: 'userId', teamId: 'teamId', role: 'role' },
  githubTeamConnections: { teamId: 'teamId' },
  githubHandoffConnections: { teamId: 'teamId' },
}));

vi.mock('../lib/github-push.js', () => ({
  listUserRepos: (...args: unknown[]) => mockListUserRepos(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_USER = { id: 'user-123', email: 'test@example.com' };
const TEAM_ID = '550e8400-e29b-41d4-a716-446655440000';

/**
 * Build a fresh Fastify app for each test with the given route plugin
 * registered under the appropriate prefix.
 */
async function buildApp(
  plugin: typeof githubRoutes | typeof githubTeamRoutes,
  prefix: string,
): Promise<{ app: FastifyInstance; token: string }> {
  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(errorHandler, { includeStackTrace: false, logAllErrors: false });
  await app.register(plugin, { prefix });
  await app.ready();
  const token = app.jwt.sign(TEST_USER, { expiresIn: '1h' });
  return { app, token };
}

// ===========================================================================
// isValidBranchSlug unit tests
// ===========================================================================

describe('isValidBranchSlug', () => {
  it('should accept valid branch names', () => {
    expect(isValidBranchSlug('main')).toBe(true);
    expect(isValidBranchSlug('develop')).toBe(true);
    expect(isValidBranchSlug('feature/login-page')).toBe(true);
    expect(isValidBranchSlug('release/1.0.0')).toBe(true);
    expect(isValidBranchSlug('my-branch.name')).toBe(true);
    expect(isValidBranchSlug('a')).toBe(true);
  });

  it('should reject empty or overly long slugs', () => {
    expect(isValidBranchSlug('')).toBe(false);
    expect(isValidBranchSlug('a'.repeat(101))).toBe(false);
  });

  it('should reject slugs containing ".."', () => {
    expect(isValidBranchSlug('foo..bar')).toBe(false);
  });

  it('should reject slugs ending with ".lock"', () => {
    expect(isValidBranchSlug('branch.lock')).toBe(false);
  });

  it('should reject slugs with spaces or special characters', () => {
    expect(isValidBranchSlug('my branch')).toBe(false);
    expect(isValidBranchSlug('foo~bar')).toBe(false);
    expect(isValidBranchSlug('foo^bar')).toBe(false);
    expect(isValidBranchSlug('foo:bar')).toBe(false);
  });
});

// ===========================================================================
// GET /api/github/repos
// ===========================================================================

describe('GET /api/github/repos', () => {
  let app: FastifyInstance;
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    const built = await buildApp(githubRoutes, '/api/github');
    app = built.app;
    token = built.token;
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 401 without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/github/repos' });
    expect(res.statusCode).toBe(401);
  });

  it('should return 400 when user has no GitHub token', async () => {
    // DB returns a user with no githubAccessToken
    mockLimit.mockResolvedValueOnce([{ githubAccessToken: null }]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/github/repos',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.message).toBe('GitHub account not linked');
  });

  it('should return 400 when user record is not found', async () => {
    // DB returns empty array (no user row)
    mockLimit.mockResolvedValueOnce([]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/github/repos',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.message).toBe('GitHub account not linked');
  });

  it('should return mapped repos on success', async () => {
    mockLimit.mockResolvedValueOnce([{ githubAccessToken: 'encrypted-token' }]);

    mockListUserRepos.mockResolvedValueOnce([
      {
        full_name: 'octocat/hello-world',
        name: 'hello-world',
        owner: { login: 'octocat' },
        default_branch: 'main',
        private: false,
        html_url: 'https://github.com/octocat/hello-world',
      },
      {
        full_name: 'org/private-repo',
        name: 'private-repo',
        owner: { login: 'org' },
        default_branch: 'develop',
        private: true,
        html_url: 'https://github.com/org/private-repo',
      },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/github/repos',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.repos).toHaveLength(2);
    expect(body.repos[0]).toEqual({
      fullName: 'octocat/hello-world',
      name: 'hello-world',
      owner: 'octocat',
      defaultBranch: 'main',
      private: false,
      htmlUrl: 'https://github.com/octocat/hello-world',
    });
    expect(body.repos[1]).toEqual({
      fullName: 'org/private-repo',
      name: 'private-repo',
      owner: 'org',
      defaultBranch: 'develop',
      private: true,
      htmlUrl: 'https://github.com/org/private-repo',
    });
  });

  it('should return 502 when listUserRepos throws', async () => {
    mockLimit.mockResolvedValueOnce([{ githubAccessToken: 'encrypted-token' }]);
    mockListUserRepos.mockRejectedValueOnce(new Error('GitHub API down'));

    const res = await app.inject({
      method: 'GET',
      url: '/api/github/repos',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(502);
    const body = JSON.parse(res.payload);
    expect(body.message).toBe('Failed to fetch GitHub repositories');
  });
});

// ===========================================================================
// Team GitHub Connection Routes
// ===========================================================================

describe('GitHub Team Routes', () => {
  let app: FastifyInstance;
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // mockReset clears the "once" queue that clearAllMocks leaves behind,
    // then re-establish the default resolved value.
    mockLimit.mockReset().mockResolvedValue([]);
    mockReturning.mockReset().mockResolvedValue([]);

    // Re-establish chainable return-this on DB methods
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockReturnThis();
    mockDb.innerJoin.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();

    // Reset the delete mock so the chain works fresh each test
    mockDb.delete = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ returning: mockReturning }),
    });

    const built = await buildApp(githubTeamRoutes, '/api/teams');
    app = built.app;
    token = built.token;
  });

  afterEach(async () => {
    await app.close();
  });

  // =========================================================================
  // GET /api/teams/:teamId/github
  // =========================================================================

  describe('GET /api/teams/:teamId/github', () => {
    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/teams/${TEAM_ID}/github`,
      });
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 when user is not a team member', async () => {
      // First DB call: membership lookup returns empty
      mockLimit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/teams/${TEAM_ID}/github`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Not a member of this team');
    });

    it('should return { connected: false } when no connection exists', async () => {
      // First call: membership found
      mockLimit.mockResolvedValueOnce([{ role: 'team_member' }]);
      // Second call: no github connection
      mockLimit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/teams/${TEAM_ID}/github`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body).toEqual({ connected: false });
    });

    it('should return connection details when connected', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_member' }]);
      mockLimit.mockResolvedValueOnce([
        {
          id: 'conn-1',
          teamId: TEAM_ID,
          repoOwner: 'my-org',
          repoName: 'my-repo',
          defaultBranch: 'main',
          connectedBy: TEST_USER.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/teams/${TEAM_ID}/github`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.connected).toBe(true);
      expect(body.repoOwner).toBe('my-org');
      expect(body.repoName).toBe('my-repo');
      expect(body.defaultBranch).toBe('main');
    });
  });

  // =========================================================================
  // POST /api/teams/:teamId/github/connect
  // =========================================================================

  describe('POST /api/teams/:teamId/github/connect', () => {
    const validPayload = { owner: 'my-org', repo: 'my-repo', defaultBranch: 'main' };

    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/connect`,
        payload: validPayload,
      });
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 when user is a regular team_member (not admin)', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_member' }]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/connect`,
        payload: validPayload,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Only team admins can connect GitHub');
    });

    it('should return 403 when user is a team_viewer', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_viewer' }]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/connect`,
        payload: validPayload,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return 403 when user is not a team member at all', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/connect`,
        payload: validPayload,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return 400 for invalid owner name (special chars)', async () => {
      // No mockLimit setup needed — validation runs before DB call
      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/connect`,
        payload: { owner: 'bad owner!', repo: 'my-repo' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Invalid repository owner or name');
    });

    it('should return 400 for invalid repo name (special chars)', async () => {
      // No mockLimit setup needed — validation runs before DB call
      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/connect`,
        payload: { owner: 'my-org', repo: 'repo with spaces' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Invalid repository owner or name');
    });

    it('should return 400 for invalid branch name', async () => {
      // No membership check needed - validation runs before DB
      // Actually, looking at the code, the GITHUB_NAME_RE check runs first,
      // then branch validation, then membership DB check.
      // Wait - re-reading the code, the order is:
      // 1. Validate owner/repo regex
      // 2. Validate branch slug
      // 3. Check membership
      // So invalid branch won't even hit the DB.

      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/connect`,
        payload: { owner: 'my-org', repo: 'my-repo', defaultBranch: 'bad..branch' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Invalid default branch name');
    });

    it('should return 400 for branch ending in .lock', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/connect`,
        payload: { owner: 'my-org', repo: 'my-repo', defaultBranch: 'branch.lock' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Invalid default branch name');
    });

    it('should connect successfully as team_admin', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_admin' }]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/connect`,
        payload: validPayload,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Connected');
      // Verify the insert was called
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should connect successfully as org_admin', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'org_admin' }]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/connect`,
        payload: validPayload,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Connected');
    });

    it('should default branch to "main" when not provided', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_admin' }]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/connect`,
        payload: { owner: 'my-org', repo: 'my-repo' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Connected');
    });

    it('should reject request with missing required fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/connect`,
        payload: { owner: 'my-org' }, // missing "repo"
        headers: { authorization: `Bearer ${token}` },
      });

      // Fastify schema validation returns 400
      expect(res.statusCode).toBe(400);
    });

    it('should silently strip extra properties (Fastify removeAdditional)', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_admin' }]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/connect`,
        payload: { owner: 'my-org', repo: 'my-repo', extraField: 'nope' },
        headers: { authorization: `Bearer ${token}` },
      });

      // Fastify's default Ajv config has removeAdditional: true
      expect(res.statusCode).toBe(200);
    });

    it('should reject owner exceeding maxLength', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/connect`,
        payload: { owner: 'a'.repeat(101), repo: 'my-repo' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // DELETE /api/teams/:teamId/github/disconnect
  // =========================================================================

  describe('DELETE /api/teams/:teamId/github/disconnect', () => {
    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${TEAM_ID}/github/disconnect`,
      });
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 when user is a regular team_member', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_member' }]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${TEAM_ID}/github/disconnect`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Only team admins can disconnect GitHub');
    });

    it('should return 403 when user is not a member', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${TEAM_ID}/github/disconnect`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 when no connection exists', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_admin' }]);

      // The delete mock chain: db.delete().where().returning()
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${TEAM_ID}/github/disconnect`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('No GitHub connection found');
    });

    it('should disconnect successfully as team_admin', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_admin' }]);

      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'conn-1', teamId: TEAM_ID }]),
        }),
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${TEAM_ID}/github/disconnect`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Disconnected');
    });

    it('should disconnect successfully as org_admin', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'org_admin' }]);

      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'conn-1', teamId: TEAM_ID }]),
        }),
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${TEAM_ID}/github/disconnect`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Disconnected');
    });
  });

  // =========================================================================
  // GET /api/teams/:teamId/github/handoff
  // =========================================================================

  describe('GET /api/teams/:teamId/github/handoff', () => {
    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/teams/${TEAM_ID}/github/handoff`,
      });
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 when user is not a team member', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/teams/${TEAM_ID}/github/handoff`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Not a member of this team');
    });

    it('should return { connected: false } when no handoff connection exists', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_member' }]);
      mockLimit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/teams/${TEAM_ID}/github/handoff`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body).toEqual({ connected: false });
    });

    it('should return handoff connection details when connected', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_member' }]);
      mockLimit.mockResolvedValueOnce([
        {
          id: 'handoff-1',
          teamId: TEAM_ID,
          repoOwner: 'dev-org',
          repoName: 'handoff-repo',
          defaultBranch: 'develop',
          connectedBy: TEST_USER.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/teams/${TEAM_ID}/github/handoff`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.connected).toBe(true);
      expect(body.repoOwner).toBe('dev-org');
      expect(body.repoName).toBe('handoff-repo');
      expect(body.defaultBranch).toBe('develop');
    });
  });

  // =========================================================================
  // POST /api/teams/:teamId/github/handoff/connect
  // =========================================================================

  describe('POST /api/teams/:teamId/github/handoff/connect', () => {
    const validPayload = { owner: 'dev-org', repo: 'handoff-repo', defaultBranch: 'develop' };

    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/handoff/connect`,
        payload: validPayload,
      });
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 when user is a regular team_member', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_member' }]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/handoff/connect`,
        payload: validPayload,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Only team admins can connect GitHub');
    });

    it('should return 403 when user is not a member', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/handoff/connect`,
        payload: validPayload,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return 400 for invalid owner', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/handoff/connect`,
        payload: { owner: '../evil', repo: 'repo' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Invalid repository owner or name');
    });

    it('should return 400 for invalid repo name', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/handoff/connect`,
        payload: { owner: 'org', repo: 'repo name!' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Invalid repository owner or name');
    });

    it('should return 400 for invalid branch name', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/handoff/connect`,
        payload: { owner: 'org', repo: 'repo', defaultBranch: 'has spaces' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Invalid default branch name');
    });

    it('should connect handoff repo successfully as team_admin', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_admin' }]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/handoff/connect`,
        payload: validPayload,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Connected');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should connect handoff repo successfully as org_admin', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'org_admin' }]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/handoff/connect`,
        payload: validPayload,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Connected');
    });

    it('should default branch to "main" when omitted', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_admin' }]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/handoff/connect`,
        payload: { owner: 'org', repo: 'repo' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
    });

    it('should reject request with missing required fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/handoff/connect`,
        payload: { repo: 'my-repo' }, // missing "owner"
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should silently strip extra properties (Fastify removeAdditional)', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_admin' }]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/teams/${TEAM_ID}/github/handoff/connect`,
        payload: { owner: 'org', repo: 'repo', sneaky: true },
        headers: { authorization: `Bearer ${token}` },
      });

      // Fastify's default Ajv config has removeAdditional: true
      expect(res.statusCode).toBe(200);
    });
  });

  // =========================================================================
  // DELETE /api/teams/:teamId/github/handoff/disconnect
  // =========================================================================

  describe('DELETE /api/teams/:teamId/github/handoff/disconnect', () => {
    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${TEAM_ID}/github/handoff/disconnect`,
      });
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 when user is a regular team_member', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_member' }]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${TEAM_ID}/github/handoff/disconnect`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Only team admins can disconnect GitHub');
    });

    it('should return 403 when user is not a member', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${TEAM_ID}/github/handoff/disconnect`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 when no handoff connection exists', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_admin' }]);

      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${TEAM_ID}/github/handoff/disconnect`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('No handoff connection found');
    });

    it('should disconnect handoff successfully as team_admin', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_admin' }]);

      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'handoff-1', teamId: TEAM_ID }]),
        }),
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${TEAM_ID}/github/handoff/disconnect`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Disconnected');
    });

    it('should disconnect handoff successfully as org_admin', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'org_admin' }]);

      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'handoff-1', teamId: TEAM_ID }]),
        }),
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${TEAM_ID}/github/handoff/disconnect`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Disconnected');
    });
  });
});
