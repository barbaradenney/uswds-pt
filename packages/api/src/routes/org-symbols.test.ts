/**
 * Organization Symbols Routes Tests
 *
 * Tests org-level symbol CRUD endpoints using Fastify inject().
 * Uses isUserInOrganization / isOrgAdmin helpers for inline authorization.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { orgSymbolRoutes } from './org-symbols.js';
import { errorHandler } from '../lib/error-handler.js';

// Hoist shared helpers so vi.mock factory can reference them
const { createChain, state, mockPerms } = vi.hoisted(() => {
  const mockVi = vi;
  const createChain = () => {
    const chain: any = {
      select: mockVi.fn().mockReturnThis(),
      from: mockVi.fn().mockReturnThis(),
      where: mockVi.fn().mockReturnThis(),
      limit: mockVi.fn().mockResolvedValue([]),
      orderBy: mockVi.fn().mockResolvedValue([]),
      innerJoin: mockVi.fn().mockReturnThis(),
      insert: mockVi.fn().mockReturnThis(),
      values: mockVi.fn().mockReturnThis(),
      returning: mockVi.fn().mockResolvedValue([]),
      update: mockVi.fn().mockReturnThis(),
      set: mockVi.fn().mockReturnThis(),
      delete: mockVi.fn().mockReturnThis(),
    };
    return chain;
  };
  const state = { selectCallIndex: 0, selectChains: [] as any[] };
  // Dynamic permission flags — read at request time by mock closures
  const mockPerms = {
    isMember: true,
    isAdmin: false,
  };
  return { createChain, state, mockPerms };
});

vi.mock('../db/index.js', () => {
  const db: any = {
    select: vi.fn((...args: any[]) => {
      const chain = state.selectChains[state.selectCallIndex] || createChain();
      state.selectCallIndex++;
      chain.select(...args);
      return chain;
    }),
    insert: vi.fn().mockReturnValue(createChain()),
    update: vi.fn().mockReturnValue(createChain()),
    delete: vi.fn().mockReturnValue(createChain()),
  };
  return { db };
});

vi.mock('../db/schema.js', () => ({
  symbols: {
    id: 'id',
    teamId: 'teamId',
    name: 'name',
    symbolData: 'symbolData',
    scope: 'scope',
    organizationId: 'organizationId',
    prototypeId: 'prototypeId',
    promotedFrom: 'promotedFrom',
    createdBy: 'createdBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  prototypes: {
    id: 'id',
    slug: 'slug',
    name: 'name',
    description: 'description',
    teamId: 'teamId',
    createdBy: 'createdBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    isPublic: 'isPublic',
    version: 'version',
    contentChecksum: 'contentChecksum',
    branchSlug: 'branchSlug',
    lastGithubPushAt: 'lastGithubPushAt',
    lastGithubCommitSha: 'lastGithubCommitSha',
  },
  teamMemberships: {
    userId: 'userId',
    teamId: 'teamId',
    role: 'role',
  },
}));

// Mock permissions — mockPerms values are read at call time
vi.mock('../middleware/permissions.js', () => ({
  getAuthUser: vi.fn((request) => request.user),
  requireOrgAdmin: vi.fn(async () => {
    // no-op → allow by default
  }),
  isUserInOrganization: vi.fn(async () => mockPerms.isMember),
  isOrgAdmin: vi.fn(async () => mockPerms.isAdmin),
}));

describe('Organization Symbols Routes', () => {
  let app: FastifyInstance;
  let validToken: string;

  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const testOrgId = '660e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    vi.clearAllMocks();
    state.selectCallIndex = 0;
    state.selectChains = [];
    mockPerms.isMember = true;
    mockPerms.isAdmin = false;

    app = Fastify({ logger: false });
    await app.register(authPlugin);
    await app.register(errorHandler, {
      includeStackTrace: false,
      logAllErrors: false,
    });
    await app.register(orgSymbolRoutes, { prefix: '/api/organizations' });
    await app.ready();

    validToken = app.jwt.sign(testUser, { expiresIn: '1h' });
  });

  afterEach(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // GET /api/organizations/:orgId/symbols
  // ---------------------------------------------------------------------------
  describe('GET /api/organizations/:orgId/symbols', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/organizations/${testOrgId}/symbols`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when user is not an org member', async () => {
      mockPerms.isMember = false;

      const response = await app.inject({
        method: 'GET',
        url: `/api/organizations/${testOrgId}/symbols`,
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toContain('Not a member');
    });

    it('should return symbols list for org member', async () => {
      const symbolsChain = createChain();
      symbolsChain.orderBy.mockResolvedValueOnce([
        {
          id: 'symbol-1',
          teamId: null,
          name: 'Org Header',
          symbolData: { component: 'usa-header' },
          scope: 'organization',
          organizationId: testOrgId,
          prototypeId: null,
          promotedFrom: null,
          createdBy: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      state.selectChains = [symbolsChain];

      const response = await app.inject({
        method: 'GET',
        url: `/api/organizations/${testOrgId}/symbols`,
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.symbols).toHaveLength(1);
      expect(body.symbols[0].name).toBe('Org Header');
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/organizations/:orgId/symbols
  // ---------------------------------------------------------------------------
  describe('POST /api/organizations/:orgId/symbols', () => {
    it('should create a new org symbol (requireOrgAdmin passes)', async () => {
      const { db } = await import('../db/index.js');
      const newSymbol = {
        id: 'symbol-new',
        name: 'New Org Symbol',
        symbolData: { component: 'usa-button' },
        scope: 'organization',
        organizationId: testOrgId,
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const insertChain = createChain();
      insertChain.returning.mockResolvedValueOnce([newSymbol]);
      vi.mocked(db.insert).mockReturnValueOnce(insertChain);

      const response = await app.inject({
        method: 'POST',
        url: `/api/organizations/${testOrgId}/symbols`,
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          name: 'New Org Symbol',
          symbolData: { component: 'usa-button' },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.name).toBe('New Org Symbol');
      expect(body.scope).toBe('organization');
    });

    it('should return 400 when name is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/organizations/${testOrgId}/symbols`,
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          symbolData: { component: 'usa-button' },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when symbolData is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/organizations/${testOrgId}/symbols`,
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          name: 'New Org Symbol',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // PUT /api/organizations/:orgId/symbols/:symbolId
  // ---------------------------------------------------------------------------
  describe('PUT /api/organizations/:orgId/symbols/:symbolId', () => {
    it('should return 403 for non-org member', async () => {
      mockPerms.isMember = false;

      const response = await app.inject({
        method: 'PUT',
        url: `/api/organizations/${testOrgId}/symbols/symbol-1`,
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toContain('Not a member');
    });

    it('should return 404 for non-existent symbol', async () => {
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([]);
      state.selectChains = [symbolChain];

      const response = await app.inject({
        method: 'PUT',
        url: `/api/organizations/${testOrgId}/symbols/non-existent`,
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Symbol not found');
    });

    it('should update symbol when user is creator', async () => {
      const { db } = await import('../db/index.js');
      const existingSymbol = {
        id: 'symbol-1',
        name: 'Original',
        symbolData: { component: 'usa-header' },
        scope: 'organization',
        organizationId: testOrgId,
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([existingSymbol]);
      state.selectChains = [symbolChain];

      const updated = { ...existingSymbol, name: 'Updated' };
      const updateChain = createChain();
      updateChain.returning.mockResolvedValueOnce([updated]);
      vi.mocked(db.update).mockReturnValueOnce(updateChain);

      const response = await app.inject({
        method: 'PUT',
        url: `/api/organizations/${testOrgId}/symbols/symbol-1`,
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.name).toBe('Updated');
    });

    it('should return 403 when non-creator non-admin tries to update', async () => {
      mockPerms.isAdmin = false;

      const existingSymbol = {
        id: 'symbol-1',
        name: 'Original',
        symbolData: { component: 'usa-header' },
        scope: 'organization',
        organizationId: testOrgId,
        createdBy: 'other-user-456',
      };

      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([existingSymbol]);
      state.selectChains = [symbolChain];

      const response = await app.inject({
        method: 'PUT',
        url: `/api/organizations/${testOrgId}/symbols/symbol-1`,
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toContain('org admin');
    });

    it('should allow org admin to update non-owned symbol', async () => {
      mockPerms.isAdmin = true;
      const { db } = await import('../db/index.js');

      const existingSymbol = {
        id: 'symbol-1',
        name: 'Original',
        symbolData: { component: 'usa-header' },
        scope: 'organization',
        organizationId: testOrgId,
        createdBy: 'other-user-456',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([existingSymbol]);
      state.selectChains = [symbolChain];

      const updated = { ...existingSymbol, name: 'Updated by Admin' };
      const updateChain = createChain();
      updateChain.returning.mockResolvedValueOnce([updated]);
      vi.mocked(db.update).mockReturnValueOnce(updateChain);

      const response = await app.inject({
        method: 'PUT',
        url: `/api/organizations/${testOrgId}/symbols/symbol-1`,
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Updated by Admin' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.name).toBe('Updated by Admin');
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /api/organizations/:orgId/symbols/:symbolId
  // ---------------------------------------------------------------------------
  describe('DELETE /api/organizations/:orgId/symbols/:symbolId', () => {
    it('should return 403 for non-org member', async () => {
      mockPerms.isMember = false;

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/organizations/${testOrgId}/symbols/symbol-1`,
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toContain('Not a member');
    });

    it('should return 404 for non-existent symbol', async () => {
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([]);
      state.selectChains = [symbolChain];

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/organizations/${testOrgId}/symbols/non-existent`,
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Symbol not found');
    });

    it('should delete symbol when user is creator', async () => {
      const existingSymbol = {
        id: 'symbol-1',
        name: 'My Symbol',
        symbolData: { component: 'usa-header' },
        scope: 'organization',
        organizationId: testOrgId,
        createdBy: 'user-123',
      };

      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([existingSymbol]);
      state.selectChains = [symbolChain];

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/organizations/${testOrgId}/symbols/symbol-1`,
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Symbol deleted successfully');
    });

    it('should return 403 when non-creator non-admin tries to delete', async () => {
      mockPerms.isAdmin = false;

      const existingSymbol = {
        id: 'symbol-1',
        name: 'Not Mine',
        symbolData: { component: 'usa-header' },
        scope: 'organization',
        organizationId: testOrgId,
        createdBy: 'other-user-456',
      };

      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([existingSymbol]);
      state.selectChains = [symbolChain];

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/organizations/${testOrgId}/symbols/symbol-1`,
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toContain('org admin');
    });

    it('should allow org admin to delete non-owned symbol', async () => {
      mockPerms.isAdmin = true;

      const existingSymbol = {
        id: 'symbol-1',
        name: 'Not Mine',
        symbolData: { component: 'usa-header' },
        scope: 'organization',
        organizationId: testOrgId,
        createdBy: 'other-user-456',
      };

      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([existingSymbol]);
      state.selectChains = [symbolChain];

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/organizations/${testOrgId}/symbols/symbol-1`,
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Symbol deleted successfully');
    });
  });
});
