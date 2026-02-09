/**
 * Organization Routes Tests
 *
 * Tests organization management endpoints using Fastify inject().
 * Organization routes require authentication.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { organizationRoutes } from './organizations.js';
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
    transaction: vi.fn(async (cb: any) => {
      // Execute the callback with the same mock db to simulate a transaction
      const txDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
      };
      return cb(txDb);
    }),
  };
  return {
    db: mockDb,
  };
});

// Mock schema imports
vi.mock('../db/schema.js', () => ({
  organizations: {
    id: 'id',
    name: 'name',
    slug: 'slug',
    description: 'description',
    logoUrl: 'logoUrl',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    isActive: 'isActive',
  },
  users: {
    id: 'id',
    email: 'email',
    name: 'name',
    organizationId: 'organizationId',
    createdAt: 'createdAt',
    isActive: 'isActive',
  },
  teams: {
    id: 'id',
    organizationId: 'organizationId',
    name: 'name',
    slug: 'slug',
  },
  teamMemberships: {
    teamId: 'teamId',
    userId: 'userId',
    role: 'role',
    joinedAt: 'joinedAt',
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
}));

// Mock permissions middleware
vi.mock('../middleware/permissions.js', () => ({
  getAuthUser: vi.fn((request) => request.user),
  requireOrgAdmin: vi.fn(async (request: any, reply: any) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    // Simulate org admin check — by default, set an orgId
    request.userOrganizationId = 'org-123';
  }),
  loadUserOrganization: vi.fn(async (request: any, _reply: any) => {
    // Simulate loading user organization
    request.userOrganizationId = 'org-123';
  }),
}));

describe('Organization Routes', () => {
  let app: FastifyInstance;
  let validToken: string;

  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify({ logger: false });
    await app.register(authPlugin);
    await app.register(errorHandler, {
      includeStackTrace: false,
      logAllErrors: false,
    });
    await app.register(organizationRoutes, { prefix: '/api/organizations' });
    await app.ready();

    validToken = app.jwt.sign(testUser, { expiresIn: '1h' });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/organizations', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/organizations',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return organization for authenticated user', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.limit).mockResolvedValueOnce([
        {
          id: 'org-123',
          name: "Test User's Organization",
          slug: 'org-test',
          description: 'Personal organization',
          logoUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/organizations',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.name).toBe("Test User's Organization");
      expect(body.slug).toBe('org-test');
    });

    it('should return 404 when organization not found in DB', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.limit).mockResolvedValueOnce([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/organizations',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Organization not found');
    });
  });

  describe('POST /api/organizations/setup', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/organizations/setup',
        payload: { teamName: 'My Team' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 if user already has a team', async () => {
      const { db } = await import('../db/index.js');

      // Mock: user exists
      vi.mocked(db.limit).mockResolvedValueOnce([
        { organizationId: 'org-123', email: 'test@example.com' },
      ]);

      // Mock the transaction to simulate "user already has a team"
      vi.mocked(db.transaction).mockImplementationOnce(async (cb: any) => {
        const txDb = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn()
            // First call: re-read user
            .mockResolvedValueOnce([{ organizationId: 'org-123', email: 'test@example.com' }])
            // Second call: existing teams check — found a team
            .mockResolvedValueOnce([{ id: 'team-existing' }]),
          innerJoin: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
        };
        return cb(txDb);
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/organizations/setup',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: { teamName: 'My Team' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('User already has a team');
    });

    it('should return 400 when teamName is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/organizations/setup',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PUT /api/organizations/:orgId', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/organizations/org-123',
        payload: { name: 'Updated Name' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when trying to update another organization', async () => {
      const { requireOrgAdmin } = await import('../middleware/permissions.js');
      // Set the user's org to a different ID
      vi.mocked(requireOrgAdmin).mockImplementationOnce(async (request: any, _reply: any) => {
        request.userOrganizationId = 'different-org-456';
      });

      const response = await app.inject({
        method: 'PUT',
        url: '/api/organizations/org-123',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: { name: 'Updated Name' },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Cannot update another organization');
    });
  });
});
