/**
 * Permissions Middleware Tests
 *
 * Tests authorization middleware functions using Fastify inject().
 * Each middleware is tested by attaching it as a preHandler to a test route.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { authPlugin } from '../plugins/auth.js';

// ── Mock database ──
// vi.mock factories are hoisted — use vi.hoisted() to define shared mock state

const { mockLimit, mockDb } = vi.hoisted(() => {
  const mockLimit = vi.fn().mockResolvedValue([]);
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: mockLimit,
    orderBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  return { mockLimit, mockDb };
});

vi.mock('../db/index.js', () => ({ db: mockDb }));

vi.mock('../db/schema.js', () => ({
  teams: {
    id: 'id',
    organizationId: 'organizationId',
    name: 'name',
    slug: 'slug',
    description: 'description',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    isActive: 'isActive',
  },
  teamMemberships: {
    id: 'id',
    teamId: 'teamId',
    userId: 'userId',
    role: 'role',
    joinedAt: 'joinedAt',
    invitedBy: 'invitedBy',
  },
  users: {
    id: 'id',
    email: 'email',
    name: 'name',
    organizationId: 'organizationId',
  },
}));

import {
  getAuthUser,
  loadUserOrganization,
  requireTeamMember,
  requireTeamRole,
  requireOrgAdmin,
  getUserHighestRole,
  isUserInOrganization,
} from './permissions.js';

// ── Helpers ──

const testUser = { id: 'user-123', email: 'test@example.com' };

async function buildApp(
  routeSetup: (app: FastifyInstance) => void,
): Promise<{ app: FastifyInstance; token: string }> {
  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  routeSetup(app);
  await app.ready();
  const token = app.jwt.sign(testUser, { expiresIn: '1h' });
  return { app, token };
}

// ── Tests ──

describe('getAuthUser', () => {
  let app: FastifyInstance;
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    const built = await buildApp((a) => {
      a.get('/test', { preHandler: [a.authenticate] }, async (request) => {
        return getAuthUser(request);
      });
    });
    app = built.app;
    token = built.token;
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns user id and email from request', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe('user-123');
    expect(body.email).toBe('test@example.com');
  });

  it('fails without auth token', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(401);
  });
});

describe('loadUserOrganization', () => {
  let app: FastifyInstance;
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    const built = await buildApp((a) => {
      a.get('/test', { preHandler: [a.authenticate, loadUserOrganization] }, async (request) => {
        return { orgId: request.userOrganizationId || null };
      });
    });
    app = built.app;
    token = built.token;
  });

  afterEach(async () => {
    await app.close();
  });

  it('sets userOrganizationId when user has an org', async () => {
    mockLimit.mockResolvedValueOnce([{ organizationId: 'org-456' }]);

    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().orgId).toBe('org-456');
  });

  it('leaves userOrganizationId unset when user has no org', async () => {
    mockLimit.mockResolvedValueOnce([{ organizationId: null }]);

    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().orgId).toBeNull();
  });

  it('leaves userOrganizationId unset when user not found', async () => {
    mockLimit.mockResolvedValueOnce([]);

    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().orgId).toBeNull();
  });
});

describe('requireTeamMember', () => {
  let app: FastifyInstance;
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    const built = await buildApp((a) => {
      a.get(
        '/teams/:teamId/test',
        { preHandler: [a.authenticate, requireTeamMember()] },
        async (request) => {
          return { membership: request.teamMembership };
        },
      );
      // Route with custom param name
      a.get(
        '/custom/:myTeam/test',
        { preHandler: [a.authenticate, requireTeamMember('myTeam')] },
        async (request) => {
          return { membership: request.teamMembership };
        },
      );
    });
    app = built.app;
    token = built.token;
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 400 when teamId param is missing', async () => {
    // Build a separate app with a route that has no teamId param
    const app2 = Fastify({ logger: false });
    await app2.register(authPlugin);
    app2.get('/test', { preHandler: [app2.authenticate, requireTeamMember()] }, async () => ({ ok: true }));
    await app2.ready();
    const token2 = app2.jwt.sign(testUser, { expiresIn: '1h' });

    const res = await app2.inject({
      method: 'GET',
      url: '/test',
      headers: { authorization: `Bearer ${token2}` },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('Team ID is required');
    await app2.close();
  });

  it('returns 403 when user is not a member', async () => {
    mockLimit.mockResolvedValueOnce([]); // No membership found

    const res = await app.inject({
      method: 'GET',
      url: '/teams/team-123/test',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().message).toContain('Not a member');
  });

  it('attaches membership when user is a member', async () => {
    const membership = {
      id: 'mem-1',
      teamId: 'team-123',
      userId: 'user-123',
      role: 'team_member',
      joinedAt: new Date(),
      invitedBy: null,
    };
    mockLimit.mockResolvedValueOnce([membership]);

    const res = await app.inject({
      method: 'GET',
      url: '/teams/team-123/test',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().membership.teamId).toBe('team-123');
    expect(res.json().membership.role).toBe('team_member');
  });

  it('supports custom teamId param name', async () => {
    const membership = {
      id: 'mem-2',
      teamId: 'custom-team',
      userId: 'user-123',
      role: 'team_admin',
      joinedAt: new Date(),
      invitedBy: null,
    };
    mockLimit.mockResolvedValueOnce([membership]);

    const res = await app.inject({
      method: 'GET',
      url: '/custom/custom-team/test',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().membership.teamId).toBe('custom-team');
  });
});

describe('requireTeamRole', () => {
  let app: FastifyInstance;
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    const built = await buildApp((a) => {
      a.get(
        '/teams/:teamId/admin',
        { preHandler: [a.authenticate, requireTeamMember(), requireTeamRole('team_admin')] },
        async () => ({ ok: true }),
      );
    });
    app = built.app;
    token = built.token;
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 500 when membership not loaded', async () => {
    const app2 = Fastify({ logger: false });
    await app2.register(authPlugin);
    app2.get('/test', { preHandler: [app2.authenticate, requireTeamRole('team_admin')] }, async () => ({ ok: true }));
    await app2.ready();
    const token2 = app2.jwt.sign(testUser, { expiresIn: '1h' });

    const res = await app2.inject({
      method: 'GET',
      url: '/test',
      headers: { authorization: `Bearer ${token2}` },
    });
    expect(res.statusCode).toBe(500);
    expect(res.json().message).toContain('Team membership not loaded');
    await app2.close();
  });

  it('returns 403 when role is insufficient', async () => {
    mockLimit.mockResolvedValueOnce([{
      id: 'mem-1',
      teamId: 'team-123',
      userId: 'user-123',
      role: 'team_viewer',
      joinedAt: new Date(),
      invitedBy: null,
    }]);

    const res = await app.inject({
      method: 'GET',
      url: '/teams/team-123/admin',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().message).toContain('team_admin');
  });

  it('allows exact role match', async () => {
    mockLimit.mockResolvedValueOnce([{
      id: 'mem-1',
      teamId: 'team-123',
      userId: 'user-123',
      role: 'team_admin',
      joinedAt: new Date(),
      invitedBy: null,
    }]);

    const res = await app.inject({
      method: 'GET',
      url: '/teams/team-123/admin',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('allows higher role than required', async () => {
    mockLimit.mockResolvedValueOnce([{
      id: 'mem-1',
      teamId: 'team-123',
      userId: 'user-123',
      role: 'org_admin',
      joinedAt: new Date(),
      invitedBy: null,
    }]);

    const res = await app.inject({
      method: 'GET',
      url: '/teams/team-123/admin',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('requireOrgAdmin', () => {
  let app: FastifyInstance;
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    const built = await buildApp((a) => {
      a.get('/admin', { preHandler: [a.authenticate, requireOrgAdmin] }, async (request) => {
        return { orgId: request.userOrganizationId };
      });
    });
    app = built.app;
    token = built.token;
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 403 when user has no organization', async () => {
    mockLimit.mockResolvedValueOnce([{ organizationId: null }]);

    const res = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().message).toContain('does not belong to an organization');
  });

  it('returns 403 when user not found', async () => {
    mockLimit.mockResolvedValueOnce([]);

    const res = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 403 when user is not org_admin', async () => {
    // First query: user lookup — has org
    mockLimit.mockResolvedValueOnce([{ organizationId: 'org-1' }]);
    // Second query: admin membership check — no admin membership
    mockLimit.mockResolvedValueOnce([]);

    const res = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().message).toContain('organization admin');
  });

  it('allows access and sets orgId when user is org_admin', async () => {
    // First query: user lookup
    mockLimit.mockResolvedValueOnce([{ organizationId: 'org-1' }]);
    // Second query: admin membership check — found
    mockLimit.mockResolvedValueOnce([{
      team_memberships: { id: 'mem-1', userId: 'user-123', teamId: 'team-1', role: 'org_admin' },
      teams: { id: 'team-1', organizationId: 'org-1' },
    }]);

    const res = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().orgId).toBe('org-1');
  });
});

describe('getUserHighestRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when user has no memberships', async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const result = await getUserHighestRole('user-999');
    expect(result).toBeNull();
  });

  it('returns org_admin when user has org_admin role', async () => {
    mockDb.where.mockResolvedValueOnce([
      { role: 'team_member' },
      { role: 'org_admin' },
    ]);

    const result = await getUserHighestRole('user-123');
    expect(result).toBe('org_admin');
  });

  it('returns team_member when that is the highest role', async () => {
    mockDb.where.mockResolvedValueOnce([
      { role: 'team_viewer' },
      { role: 'team_member' },
    ]);

    const result = await getUserHighestRole('user-123');
    expect(result).toBe('team_member');
  });

  it('returns team_viewer when only viewer memberships exist', async () => {
    mockDb.where.mockResolvedValueOnce([
      { role: 'team_viewer' },
    ]);

    const result = await getUserHighestRole('user-123');
    expect(result).toBe('team_viewer');
  });
});

describe('isUserInOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when user belongs to the organization', async () => {
    mockLimit.mockResolvedValueOnce([{ organizationId: 'org-1' }]);

    const result = await isUserInOrganization('user-123', 'org-1');
    expect(result).toBe(true);
  });

  it('returns false when user belongs to a different organization', async () => {
    mockLimit.mockResolvedValueOnce([{ organizationId: 'org-2' }]);

    const result = await isUserInOrganization('user-123', 'org-1');
    expect(result).toBe(false);
  });

  it('returns false when user is not found', async () => {
    mockLimit.mockResolvedValueOnce([]);

    const result = await isUserInOrganization('user-999', 'org-1');
    expect(result).toBe(false);
  });
});
