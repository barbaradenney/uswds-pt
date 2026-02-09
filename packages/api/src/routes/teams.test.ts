/**
 * Team Routes Tests
 *
 * Tests team management endpoints using Fastify inject().
 * Team routes require authentication and various role checks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { teamRoutes } from './teams.js';
import { errorHandler } from '../lib/error-handler.js';

// Mock database
vi.mock('../db/index.js', () => {
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
  return {
    db: mockDb,
  };
});

// Mock schema imports
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
  organizations: {
    id: 'id',
    name: 'name',
    slug: 'slug',
  },
}));

// Mock roles
vi.mock('../db/roles.js', () => ({
  ROLES: {
    ORG_ADMIN: 'org_admin',
    TEAM_ADMIN: 'team_admin',
    TEAM_MEMBER: 'team_member',
    TEAM_VIEWER: 'team_viewer',
  },
  canAssignRole: vi.fn(() => true),
}));

// Track whether requireTeamMember should grant or deny access
let teamMemberGranted = true;
let teamMemberRole = 'team_member';

// Mock permissions middleware
vi.mock('../middleware/permissions.js', () => ({
  getAuthUser: vi.fn((request) => request.user),
  requireOrgAdmin: vi.fn(async (request: any, reply: any) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    request.userOrganizationId = 'org-123';
  }),
  requireTeamMember: vi.fn(() => async (request: any, reply: any) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    if (!teamMemberGranted) {
      return reply.status(403).send({ message: 'Not a member of this team' });
    }
    request.teamMembership = {
      id: 'membership-1',
      teamId: request.params.teamId,
      userId: request.user.id,
      role: teamMemberRole,
      joinedAt: new Date(),
      invitedBy: null,
    };
  }),
  requireTeamRole: vi.fn(() => async (request: any, reply: any) => {
    // By default, allow access. Tests can override teamMemberRole to test role restrictions.
    const membership = request.teamMembership;
    if (!membership) {
      return reply.status(500).send({ message: 'Team membership not loaded' });
    }
  }),
}));

describe('Team Routes', () => {
  let app: FastifyInstance;
  let validToken: string;

  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const testTeamId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    vi.clearAllMocks();
    teamMemberGranted = true;
    teamMemberRole = 'team_member';

    app = Fastify({ logger: false });
    await app.register(authPlugin);
    await app.register(errorHandler, {
      includeStackTrace: false,
      logAllErrors: false,
    });
    await app.register(teamRoutes, { prefix: '/api/teams' });
    await app.ready();

    validToken = app.jwt.sign(testUser, { expiresIn: '1h' });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/teams', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/teams',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return teams list for authenticated user', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.where).mockResolvedValueOnce([
        {
          id: testTeamId,
          name: 'My Team',
          slug: 'my-team',
          description: 'A test team',
          organizationId: 'org-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          role: 'org_admin',
          joinedAt: new Date(),
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/teams',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.teams).toBeDefined();
      expect(Array.isArray(body.teams)).toBe(true);
    });
  });

  describe('POST /api/teams', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/teams',
        payload: { name: 'New Team' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should create a team for authenticated org admin', async () => {
      const { db } = await import('../db/index.js');
      // First call: check slug uniqueness (no existing team)
      vi.mocked(db.limit).mockResolvedValueOnce([]);
      // Insert + returning: the new team
      const newTeam = {
        id: 'new-team-id',
        name: 'New Team',
        slug: 'new-team',
        organizationId: 'org-123',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };
      vi.mocked(db.returning)
        .mockResolvedValueOnce([newTeam])  // team insert
        .mockResolvedValueOnce([]);        // membership insert

      const response = await app.inject({
        method: 'POST',
        url: '/api/teams',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: { name: 'New Team' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.name).toBe('New Team');
    });

    it('should return 400 when name is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/teams',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/teams/:teamId', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/teams/${testTeamId}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 for non-member', async () => {
      teamMemberGranted = false;

      const response = await app.inject({
        method: 'GET',
        url: `/api/teams/${testTeamId}`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return team details for team member', async () => {
      const { db } = await import('../db/index.js');
      // First limit call: team details
      vi.mocked(db.limit)
        .mockResolvedValueOnce([
          {
            id: testTeamId,
            name: 'My Team',
            slug: 'my-team',
            description: 'A test team',
            organizationId: 'org-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])
        // Second limit call: organization info
        .mockResolvedValueOnce([
          {
            id: 'org-123',
            name: 'My Organization',
            slug: 'my-org',
          },
        ]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/teams/${testTeamId}`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.name).toBe('My Team');
      expect(body.organization).toBeDefined();
      expect(body.organization.name).toBe('My Organization');
    });
  });

  describe('DELETE /api/teams/:teamId', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${testTeamId}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 for non-admin user', async () => {
      const { requireOrgAdmin } = await import('../middleware/permissions.js');
      vi.mocked(requireOrgAdmin).mockImplementationOnce(async (_request: any, reply: any) => {
        return reply.status(403).send({ message: 'Requires organization admin role' });
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${testTeamId}`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 when team does not exist', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.limit).mockResolvedValueOnce([]);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${testTeamId}`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Team not found');
    });

    it('should return 403 when team belongs to a different organization', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.limit).mockResolvedValueOnce([
        { organizationId: 'different-org-456' },
      ]);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${testTeamId}`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Cannot delete team from another organization');
    });
  });
});
