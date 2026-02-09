/**
 * Preview Routes Tests
 *
 * Tests public preview endpoints using Fastify inject().
 * Preview routes do not require authentication.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { previewRoutes } from './preview.js';
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
    prototypes: {
      slug: 'slug',
      name: 'name',
      htmlContent: 'htmlContent',
      grapesData: 'grapesData',
      isPublic: 'isPublic',
    },
  };
});

describe('Preview Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify({ logger: false });
    await app.register(authPlugin);
    await app.register(errorHandler, {
      includeStackTrace: false,
      logAllErrors: false,
    });
    await app.register(previewRoutes, { prefix: '/api/preview' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/preview/:slug', () => {
    it('should return 404 for non-existent prototype', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.limit).mockResolvedValueOnce([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/preview/non-existent-slug',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Prototype not found');
    });

    it('should return prototype HTML content for valid public prototype', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.limit).mockResolvedValueOnce([
        {
          name: 'Test Prototype',
          htmlContent: '<div>Hello World</div>',
          grapesData: { pages: [{ component: {} }] },
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/preview/test-slug',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.name).toBe('Test Prototype');
      expect(body.htmlContent).toBe('<div>Hello World</div>');
      expect(body.gjsData).toBeDefined();
    });

    it('should not require authentication', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.limit).mockResolvedValueOnce([
        {
          name: 'Public Prototype',
          htmlContent: '<p>Public content</p>',
          grapesData: null,
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/preview/public-slug',
        // No authorization header
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.name).toBe('Public Prototype');
    });

    it('should return undefined gjsData when grapesData is null', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.limit).mockResolvedValueOnce([
        {
          name: 'No GJS Data',
          htmlContent: '<p>Content</p>',
          grapesData: null,
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/preview/test-slug',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.gjsData).toBeUndefined();
    });

    it('should return undefined gjsData when grapesData is empty object', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.limit).mockResolvedValueOnce([
        {
          name: 'Empty GJS Data',
          htmlContent: '<p>Content</p>',
          grapesData: {},
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/preview/test-slug',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.gjsData).toBeUndefined();
    });

    it('should set Cache-Control header on successful response', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.limit).mockResolvedValueOnce([
        {
          name: 'Cached Prototype',
          htmlContent: '<p>Cached</p>',
          grapesData: null,
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/preview/cached-slug',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe(
        'public, max-age=300, stale-while-revalidate=60'
      );
    });
  });
});
