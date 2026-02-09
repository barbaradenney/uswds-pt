/**
 * Symbols Routes Tests
 *
 * Tests symbol CRUD endpoints using Fastify inject().
 * Symbols require team membership for access.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { symbolRoutes } from './symbols.js';
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

// Mock schema imports used by symbols.ts
vi.mock('../db/schema.js', () => ({
  symbols: {
    id: 'id',
    teamId: 'teamId',
    name: 'name',
    symbolData: 'symbolData',
    createdBy: 'createdBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
}));

// Mock permissions middleware
vi.mock('../middleware/permissions.js', () => ({
  getAuthUser: vi.fn((request) => request.user),
  requireTeamMember: vi.fn(() => async (request: any, reply: any) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    // Simulate team membership being attached
    request.teamMembership = {
      id: 'membership-1',
      teamId: request.params.teamId,
      userId: request.user.id,
      role: 'team_member',
      joinedAt: new Date(),
      invitedBy: null,
    };
  }),
  requireTeamRole: vi.fn(() => async () => {
    // Allow by default
  }),
}));

describe('Symbols Routes', () => {
  let app: FastifyInstance;
  let validToken: string;

  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const testTeamId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify({ logger: false });
    await app.register(authPlugin);
    await app.register(errorHandler, {
      includeStackTrace: false,
      logAllErrors: false,
    });
    await app.register(symbolRoutes, { prefix: '/api/teams' });
    await app.ready();

    validToken = app.jwt.sign(testUser, { expiresIn: '1h' });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/teams/:teamId/symbols', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/teams/${testTeamId}/symbols`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return symbols list for authenticated team member', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.orderBy).mockResolvedValueOnce([
        {
          id: 'symbol-1',
          teamId: testTeamId,
          name: 'Header Symbol',
          symbolData: { component: 'usa-header' },
          createdBy: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/teams/${testTeamId}/symbols`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.symbols).toBeDefined();
      expect(Array.isArray(body.symbols)).toBe(true);
    });
  });

  describe('POST /api/teams/:teamId/symbols', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${testTeamId}/symbols`,
        payload: {
          name: 'New Symbol',
          symbolData: { component: 'usa-button' },
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should create a new symbol for authenticated team member', async () => {
      const { db } = await import('../db/index.js');
      const newSymbol = {
        id: 'symbol-new',
        teamId: testTeamId,
        name: 'New Symbol',
        symbolData: { component: 'usa-button' },
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(db.returning).mockResolvedValueOnce([newSymbol]);

      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${testTeamId}/symbols`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {
          name: 'New Symbol',
          symbolData: { component: 'usa-button' },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.name).toBe('New Symbol');
    });

    it('should return 400 when name is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${testTeamId}/symbols`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {
          symbolData: { component: 'usa-button' },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when symbolData is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${testTeamId}/symbols`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {
          name: 'New Symbol',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/teams/:teamId/symbols/:symbolId', () => {
    it('should return 404 for non-existent symbol', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.limit).mockResolvedValueOnce([]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/teams/${testTeamId}/symbols/non-existent-id`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Symbol not found');
    });

    it('should return symbol for valid ID', async () => {
      const { db } = await import('../db/index.js');
      const existingSymbol = {
        id: 'symbol-1',
        teamId: testTeamId,
        name: 'Header Symbol',
        symbolData: { component: 'usa-header' },
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(db.limit).mockResolvedValueOnce([existingSymbol]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/teams/${testTeamId}/symbols/symbol-1`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.name).toBe('Header Symbol');
    });
  });

  describe('DELETE /api/teams/:teamId/symbols/:symbolId', () => {
    it('should return 404 for non-existent symbol', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.limit).mockResolvedValueOnce([]);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${testTeamId}/symbols/non-existent-id`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Symbol not found');
    });

    it('should return 403 when non-creator non-admin tries to delete', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.limit).mockResolvedValueOnce([
        {
          id: 'symbol-1',
          teamId: testTeamId,
          name: 'Someone Elses Symbol',
          symbolData: { component: 'usa-header' },
          createdBy: 'other-user-456',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${testTeamId}/symbols/symbol-1`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Only the creator or an admin can delete this symbol');
    });
  });
});
