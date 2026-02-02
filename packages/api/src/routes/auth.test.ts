/**
 * Auth Routes Tests
 *
 * Tests authentication endpoints using Fastify inject().
 * Focuses on authentication and authorization behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { authPlugin, findUserByEmail, verifyPassword } from '../plugins/auth.js';
import { authRoutes } from './auth.js';
import { errorHandler } from '../lib/error-handler.js';

// Mock the auth plugin functions
vi.mock('../plugins/auth.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../plugins/auth.js')>();
  return {
    ...original,
    findUserByEmail: vi.fn(),
    verifyPassword: vi.fn(),
    createUser: vi.fn(),
  };
});

// Mock database queries
vi.mock('../db/index.js', () => ({
  db: {
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
  },
}));

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify({ logger: false });
    await app.register(authPlugin);
    await app.register(errorHandler, {
      includeStackTrace: false,
      logAllErrors: false,
    });
    await app.register(authRoutes, { prefix: '/api/auth' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('should return 401 for non-existent user', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'password123' },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Invalid email or password');
    });

    it('should return 401 for inactive user', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hash',
        isActive: false,
      } as any);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'password123' },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Account is disabled');
    });

    it('should return 401 for wrong password', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hash',
        isActive: true,
      } as any);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'wrongpassword' },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Invalid email or password');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 if email already exists', async () => {
      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      } as any);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'test@example.com', password: 'password123' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Email already registered');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 with malformed authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: 'NotBearer token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
