/**
 * Prototype Routes Tests
 *
 * Tests prototype CRUD endpoints using Fastify inject().
 * Uses mocked database operations for isolation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { prototypeRoutes } from './prototypes.js';
import { errorHandler } from '../lib/error-handler.js';

// Mock database - must be inside vi.mock to avoid hoisting issues
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
    prototypes: { slug: 'slug', teamId: 'teamId', id: 'id' },
    prototypeVersions: { prototypeId: 'prototypeId', versionNumber: 'versionNumber' },
    teamMemberships: { userId: 'userId', teamId: 'teamId' },
  };
});

describe('Prototype Routes', () => {
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
    await app.register(prototypeRoutes, { prefix: '/api/prototypes' });
    await app.ready();

    // Generate a valid token for authenticated requests
    validToken = app.jwt.sign(testUser, { expiresIn: '1h' });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/prototypes', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/prototypes',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/prototypes/:slug', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/prototypes/test-slug',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/prototypes', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        payload: {
          name: 'Test Prototype',
          teamId: '550e8400-e29b-41d4-a716-446655440000',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PUT /api/prototypes/:slug', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/prototypes/test-slug',
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/prototypes/:slug', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/prototypes/test-slug',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/prototypes/:slug/versions', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/prototypes/test-slug/versions',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/prototypes/:slug/versions/:version/restore', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/prototypes/test-slug/versions/1/restore',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for invalid version number', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/prototypes/test-slug/versions/invalid/restore',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Invalid version number');
    });
  });
});
