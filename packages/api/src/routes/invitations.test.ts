/**
 * Invitation Routes Tests
 *
 * Tests team invitation endpoints using Fastify inject().
 * Covers creating, accepting, and cancelling invitations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { invitationRoutes } from './invitations.js';
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
    leftJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn(async (cb: any) => {
      const txDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        innerJoin: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
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
  invitations: {
    id: 'id',
    email: 'email',
    teamId: 'teamId',
    role: 'role',
    token: 'token',
    expiresAt: 'expiresAt',
    invitedBy: 'invitedBy',
    createdAt: 'createdAt',
    acceptedAt: 'acceptedAt',
    status: 'status',
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
  INVITATION_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
  },
  INVITATION_EXPIRY_DAYS: 7,
}));

// Mock email utility
vi.mock('../lib/email.js', () => ({
  normalizeEmail: vi.fn((email: string) => email?.trim()?.toLowerCase() || ''),
}));

// Track whether team member access is granted
let teamMemberGranted = true;
let teamMemberRole = 'team_admin';

// Mock permissions middleware
vi.mock('../middleware/permissions.js', () => ({
  getAuthUser: vi.fn((request) => request.user),
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
    const membership = request.teamMembership;
    if (!membership) {
      return reply.status(500).send({ message: 'Team membership not loaded' });
    }
  }),
}));

describe('Invitation Routes', () => {
  let app: FastifyInstance;
  let validToken: string;

  const testUser = {
    id: 'user-123',
    email: 'admin@example.com',
  };

  const testTeamId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    vi.clearAllMocks();
    teamMemberGranted = true;
    teamMemberRole = 'team_admin';

    app = Fastify({ logger: false });
    await app.register(authPlugin);
    await app.register(errorHandler, {
      includeStackTrace: false,
      logAllErrors: false,
    });
    await app.register(invitationRoutes, { prefix: '/api/invitations' });
    await app.ready();

    validToken = app.jwt.sign(testUser, { expiresIn: '1h' });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/invitations/teams/:teamId/invitations', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/teams/${testTeamId}/invitations`,
        payload: { email: 'invitee@example.com' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should create invitation for admin user', async () => {
      const { db } = await import('../db/index.js');

      // Mock: no existing user with this email
      vi.mocked(db.limit)
        .mockResolvedValueOnce([])    // no existing user
        .mockResolvedValueOnce([])    // no existing pending invitation
        .mockResolvedValueOnce([{ name: 'My Team' }]);  // team info for response

      // Mock: insert invitation
      vi.mocked(db.returning).mockResolvedValueOnce([
        {
          id: 'invitation-1',
          email: 'invitee@example.com',
          teamId: testTeamId,
          role: 'team_member',
          token: 'abc123',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          invitedBy: 'user-123',
          status: 'pending',
          createdAt: new Date(),
          acceptedAt: null,
        },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/teams/${testTeamId}/invitations`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: { email: 'invitee@example.com' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.email).toBe('invitee@example.com');
      expect(body.status).toBe('pending');
    });

    it('should return 400 when email is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/invitations/teams/${testTeamId}/invitations`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/invitations/:token/accept', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/invitations/some-token/accept',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for invalid token', async () => {
      const { db } = await import('../db/index.js');

      // Mock: user lookup
      vi.mocked(db.limit)
        .mockResolvedValueOnce([
          { id: 'user-123', email: 'admin@example.com', organizationId: null },
        ])
        // Mock: no invitation found for this token
        .mockResolvedValueOnce([]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/invitations/invalid-token-xyz/accept',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/Invitation not found/);
    });

    it('should return 404 when invitation is for a different email (prevent enumeration)', async () => {
      const { db } = await import('../db/index.js');

      // Mock: user lookup
      vi.mocked(db.limit)
        .mockResolvedValueOnce([
          { id: 'user-123', email: 'admin@example.com', organizationId: null },
        ])
        // Mock: invitation exists but for different email
        .mockResolvedValueOnce([
          {
            id: 'invitation-1',
            email: 'someone-else@example.com',
            teamId: testTeamId,
            role: 'team_member',
            token: 'valid-token',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            invitedBy: 'admin-user',
            status: 'pending',
          },
        ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/invitations/valid-token/accept',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/Invitation not found/);
    });
  });

  describe('DELETE /api/invitations/:invitationId', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/invitations/invitation-1',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent invitation', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.limit).mockResolvedValueOnce([]);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/invitations/non-existent-id',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/Invitation not found/);
    });

    it('should return 403 for non-admin team member', async () => {
      const { db } = await import('../db/index.js');

      // Mock: invitation exists
      vi.mocked(db.limit)
        .mockResolvedValueOnce([
          {
            id: 'invitation-1',
            email: 'invitee@example.com',
            teamId: testTeamId,
            role: 'team_member',
            token: 'abc123',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            invitedBy: 'other-admin',
            status: 'pending',
          },
        ])
        // Mock: user's membership - team_member (not admin)
        .mockResolvedValueOnce([
          { role: 'team_member' },
        ]);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/invitations/invitation-1',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Only team admins can cancel invitations');
    });

    it('should return 403 when user is not a member of the team', async () => {
      const { db } = await import('../db/index.js');

      // Mock: invitation exists
      vi.mocked(db.limit)
        .mockResolvedValueOnce([
          {
            id: 'invitation-1',
            email: 'invitee@example.com',
            teamId: testTeamId,
            role: 'team_member',
            token: 'abc123',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            invitedBy: 'other-admin',
            status: 'pending',
          },
        ])
        // Mock: no membership found
        .mockResolvedValueOnce([]);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/invitations/invitation-1',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Not a member of this team');
    });
  });

  describe('POST /api/invitations/:token/decline', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/invitations/some-token/decline',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent invitation', async () => {
      const { db } = await import('../db/index.js');

      // Mock: user lookup
      vi.mocked(db.limit)
        .mockResolvedValueOnce([{ email: 'admin@example.com' }])
        // Mock: no invitation
        .mockResolvedValueOnce([]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/invitations/bad-token/decline',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/Invitation not found/);
    });
  });
});
