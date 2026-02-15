/**
 * Symbols Routes Tests
 *
 * Tests symbol CRUD + promote endpoints using Fastify inject().
 * Symbols require team membership for access.
 * Single-symbol endpoints use buildAccessConditions() which issues
 * 2 parallel select calls (team + prototypes) before the main query.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { symbolRoutes } from './symbols.js';
import { errorHandler } from '../lib/error-handler.js';

// Hoist shared helpers so vi.mock factory can reference them
const { createChain, state, mockRole } = vi.hoisted(() => {
  const mockVi = vi; // capture vi for use inside
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
  // Dynamic role — read at request time by the requireTeamMember mock closure
  const mockRole = { value: 'team_member' };
  return { createChain, state, mockRole };
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

// Mock schema imports used by symbols.ts
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
  teams: {
    id: 'teams.id',
    organizationId: 'teams.organizationId',
  },
  prototypes: {
    id: 'prototypes.id',
    teamId: 'prototypes.teamId',
    createdBy: 'prototypes.createdBy',
  },
}));

// Mock permissions middleware — mockRole.value is read at request time
vi.mock('../middleware/permissions.js', () => ({
  getAuthUser: vi.fn((request) => request.user),
  requireTeamMember: vi.fn(() => async (request: any, reply: any) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    request.teamMembership = {
      id: 'membership-1',
      teamId: request.params.teamId,
      userId: request.user.id,
      role: mockRole.value,
      joinedAt: new Date(),
      invitedBy: null,
    };
  }),
  requireTeamRole: vi.fn(() => async () => {
    // Allow by default
  }),
}));

/**
 * Helper: set up the 2 select chains consumed by buildAccessConditions().
 * Returns [teamChain, prototypesChain] — prepend to state.selectChains.
 */
function setupAccessChains(opts: { orgId?: string; protoIds?: string[] } = {}) {
  // Chain 0: team org lookup — resolves via .limit()
  const teamChain = createChain();
  teamChain.limit.mockResolvedValueOnce(
    opts.orgId ? [{ organizationId: opts.orgId }] : []
  );

  // Chain 1: user's prototypes — resolves via .where() (no .limit/.orderBy)
  const prototypesChain = createChain();
  prototypesChain.where.mockResolvedValueOnce(
    (opts.protoIds || []).map((id: string) => ({ id }))
  );

  return [teamChain, prototypesChain];
}

describe('Symbols Routes', () => {
  let app: FastifyInstance;
  let validToken: string;

  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const testTeamId = '550e8400-e29b-41d4-a716-446655440000';
  const testPrototypeId = '770e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    vi.clearAllMocks();
    state.selectCallIndex = 0;
    state.selectChains = [];
    mockRole.value = 'team_member';

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

  // ---------------------------------------------------------------------------
  // GET /api/teams/:teamId/symbols  (list)
  // ---------------------------------------------------------------------------
  describe('GET /api/teams/:teamId/symbols', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/teams/${testTeamId}/symbols`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return symbols list for authenticated team member', async () => {
      const accessChains = setupAccessChains({ orgId: 'org-1' });

      const symbolsChain = createChain();
      symbolsChain.orderBy.mockResolvedValueOnce([
        {
          id: 'symbol-1',
          teamId: testTeamId,
          name: 'Header Symbol',
          symbolData: { component: 'usa-header' },
          scope: 'team',
          organizationId: null,
          prototypeId: null,
          promotedFrom: null,
          createdBy: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      state.selectChains = [...accessChains, symbolsChain];

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

  // ---------------------------------------------------------------------------
  // POST /api/teams/:teamId/symbols  (create)
  // ---------------------------------------------------------------------------
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

    it('should create a team-scoped symbol by default', async () => {
      const { db } = await import('../db/index.js');
      const newSymbol = {
        id: 'symbol-new',
        teamId: testTeamId,
        name: 'New Symbol',
        symbolData: { component: 'usa-button' },
        scope: 'team',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const insertChain = createChain();
      insertChain.returning.mockResolvedValueOnce([newSymbol]);
      vi.mocked(db.insert).mockReturnValueOnce(insertChain);

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

    it('should return 400 for prototype scope without prototypeId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${testTeamId}/symbols`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {
          name: 'Proto Symbol',
          symbolData: { component: 'usa-card' },
          scope: 'prototype',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toContain('prototypeId');
    });

    it('should create a prototype-scoped symbol with prototypeId', async () => {
      const { db } = await import('../db/index.js');
      const newSymbol = {
        id: 'symbol-proto',
        teamId: testTeamId,
        name: 'Proto Symbol',
        symbolData: { component: 'usa-card' },
        scope: 'prototype',
        prototypeId: testPrototypeId,
        createdBy: 'user-123',
      };

      const insertChain = createChain();
      insertChain.returning.mockResolvedValueOnce([newSymbol]);
      vi.mocked(db.insert).mockReturnValueOnce(insertChain);

      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${testTeamId}/symbols`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {
          name: 'Proto Symbol',
          symbolData: { component: 'usa-card' },
          scope: 'prototype',
          prototypeId: testPrototypeId,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.scope).toBe('prototype');
    });

    it('should return 403 for org scope when user is not admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${testTeamId}/symbols`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {
          name: 'Org Symbol',
          symbolData: { component: 'usa-header' },
          scope: 'organization',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toContain('team_admin or org_admin');
    });

    it('should create org-scoped symbol when user is org_admin', async () => {
      mockRole.value = 'org_admin';
      const { db } = await import('../db/index.js');

      // Team lookup for org ID (selectChains[0])
      const teamChain = createChain();
      teamChain.limit.mockResolvedValueOnce([{ organizationId: 'org-1' }]);
      state.selectChains = [teamChain];

      const newSymbol = {
        id: 'symbol-org',
        name: 'Org Symbol',
        symbolData: { component: 'usa-header' },
        scope: 'organization',
        organizationId: 'org-1',
        createdBy: 'user-123',
      };
      const insertChain = createChain();
      insertChain.returning.mockResolvedValueOnce([newSymbol]);
      vi.mocked(db.insert).mockReturnValueOnce(insertChain);

      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${testTeamId}/symbols`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {
          name: 'Org Symbol',
          symbolData: { component: 'usa-header' },
          scope: 'organization',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.scope).toBe('organization');
    });

    it('should return 400 for org scope when team has no organization', async () => {
      mockRole.value = 'org_admin';

      // Team lookup returns no org
      const teamChain = createChain();
      teamChain.limit.mockResolvedValueOnce([{}]); // no organizationId
      state.selectChains = [teamChain];

      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${testTeamId}/symbols`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {
          name: 'Org Symbol',
          symbolData: { component: 'usa-header' },
          scope: 'organization',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toContain('does not belong to an organization');
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/teams/:teamId/symbols/:symbolId  (single)
  // ---------------------------------------------------------------------------
  describe('GET /api/teams/:teamId/symbols/:symbolId', () => {
    it('should return 404 for non-existent symbol', async () => {
      const accessChains = setupAccessChains({ orgId: 'org-1' });
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([]);
      state.selectChains = [...accessChains, symbolChain];

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
      const existingSymbol = {
        id: 'symbol-1',
        teamId: testTeamId,
        name: 'Header Symbol',
        symbolData: { component: 'usa-header' },
        scope: 'team',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const accessChains = setupAccessChains({ orgId: 'org-1' });
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([existingSymbol]);
      state.selectChains = [...accessChains, symbolChain];

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

  // ---------------------------------------------------------------------------
  // PUT /api/teams/:teamId/symbols/:symbolId
  // ---------------------------------------------------------------------------
  describe('PUT /api/teams/:teamId/symbols/:symbolId', () => {
    it('should return 404 for non-existent symbol', async () => {
      const accessChains = setupAccessChains({ orgId: 'org-1' });
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([]);
      state.selectChains = [...accessChains, symbolChain];

      const response = await app.inject({
        method: 'PUT',
        url: `/api/teams/${testTeamId}/symbols/non-existent-id`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should update symbol when user is creator', async () => {
      const { db } = await import('../db/index.js');
      const existingSymbol = {
        id: 'symbol-1',
        teamId: testTeamId,
        name: 'Original Name',
        symbolData: { component: 'usa-header' },
        scope: 'team',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const accessChains = setupAccessChains({ orgId: 'org-1' });
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([existingSymbol]);
      state.selectChains = [...accessChains, symbolChain];

      const updatedSymbol = { ...existingSymbol, name: 'Updated Name' };
      const updateChain = createChain();
      updateChain.returning.mockResolvedValueOnce([updatedSymbol]);
      vi.mocked(db.update).mockReturnValueOnce(updateChain);

      const response = await app.inject({
        method: 'PUT',
        url: `/api/teams/${testTeamId}/symbols/symbol-1`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: { name: 'Updated Name' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.name).toBe('Updated Name');
    });

    it('should return 403 when non-creator non-admin tries to update', async () => {
      const existingSymbol = {
        id: 'symbol-1',
        teamId: testTeamId,
        name: 'Original',
        symbolData: { component: 'usa-header' },
        scope: 'team',
        createdBy: 'other-user-456',
      };
      const accessChains = setupAccessChains({ orgId: 'org-1' });
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([existingSymbol]);
      state.selectChains = [...accessChains, symbolChain];

      const response = await app.inject({
        method: 'PUT',
        url: `/api/teams/${testTeamId}/symbols/symbol-1`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toContain('Only the creator or an admin');
    });

    it('should return 403 when non-creator non-org_admin edits org-scoped symbol', async () => {
      const existingSymbol = {
        id: 'symbol-1',
        name: 'Org Symbol',
        symbolData: { component: 'usa-header' },
        scope: 'organization',
        createdBy: 'other-user-456',
      };
      const accessChains = setupAccessChains({ orgId: 'org-1' });
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([existingSymbol]);
      state.selectChains = [...accessChains, symbolChain];

      const response = await app.inject({
        method: 'PUT',
        url: `/api/teams/${testTeamId}/symbols/symbol-1`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toContain('org admin');
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /api/teams/:teamId/symbols/:symbolId
  // ---------------------------------------------------------------------------
  describe('DELETE /api/teams/:teamId/symbols/:symbolId', () => {
    it('should return 404 for non-existent symbol', async () => {
      const accessChains = setupAccessChains({ orgId: 'org-1' });
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([]);
      state.selectChains = [...accessChains, symbolChain];

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
      const accessChains = setupAccessChains({ orgId: 'org-1' });
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([
        {
          id: 'symbol-1',
          teamId: testTeamId,
          name: 'Someone Elses Symbol',
          symbolData: { component: 'usa-header' },
          scope: 'team',
          createdBy: 'other-user-456',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      state.selectChains = [...accessChains, symbolChain];

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

    it('should delete symbol when user is creator', async () => {
      const accessChains = setupAccessChains({ orgId: 'org-1' });
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([
        {
          id: 'symbol-1',
          teamId: testTeamId,
          name: 'My Symbol',
          symbolData: { component: 'usa-header' },
          scope: 'team',
          createdBy: 'user-123',
        },
      ]);
      state.selectChains = [...accessChains, symbolChain];

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${testTeamId}/symbols/symbol-1`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Symbol deleted successfully');
    });

    it('should return 403 when non-creator non-org_admin deletes org-scoped symbol', async () => {
      const accessChains = setupAccessChains({ orgId: 'org-1' });
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([
        {
          id: 'symbol-1',
          name: 'Org Symbol',
          symbolData: { component: 'usa-header' },
          scope: 'organization',
          createdBy: 'other-user-456',
        },
      ]);
      state.selectChains = [...accessChains, symbolChain];

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/teams/${testTeamId}/symbols/symbol-1`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toContain('org admin');
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/teams/:teamId/symbols/:symbolId/promote
  // ---------------------------------------------------------------------------
  describe('POST /api/teams/:teamId/symbols/:symbolId/promote', () => {
    it('should return 404 for non-existent symbol', async () => {
      const accessChains = setupAccessChains({ orgId: 'org-1' });
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([]);
      state.selectChains = [...accessChains, symbolChain];

      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${testTeamId}/symbols/non-existent-id/promote`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {
          targetScope: 'team',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should promote a symbol to team scope', async () => {
      const sourceSymbol = {
        id: 'symbol-proto-1',
        name: 'Proto Symbol',
        symbolData: { component: 'usa-card' },
        scope: 'prototype',
        createdBy: 'user-123',
      };
      const accessChains = setupAccessChains({ orgId: 'org-1' });
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([sourceSymbol]);
      state.selectChains = [...accessChains, symbolChain];

      const { db } = await import('../db/index.js');
      const promotedSymbol = {
        ...sourceSymbol,
        id: 'symbol-promoted-1',
        scope: 'team',
        teamId: testTeamId,
        promotedFrom: 'symbol-proto-1',
      };
      const insertChain = createChain();
      insertChain.returning.mockResolvedValueOnce([promotedSymbol]);
      vi.mocked(db.insert).mockReturnValueOnce(insertChain);

      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${testTeamId}/symbols/symbol-proto-1/promote`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {
          targetScope: 'team',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.scope).toBe('team');
      expect(body.promotedFrom).toBe('symbol-proto-1');
    });

    it('should return 403 when non-org_admin promotes to organization', async () => {
      const sourceSymbol = {
        id: 'symbol-1',
        name: 'Team Symbol',
        symbolData: { component: 'usa-card' },
        scope: 'team',
        createdBy: 'user-123',
      };
      const accessChains = setupAccessChains({ orgId: 'org-1' });
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([sourceSymbol]);
      state.selectChains = [...accessChains, symbolChain];

      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${testTeamId}/symbols/symbol-1/promote`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {
          targetScope: 'organization',
        },
      });

      // team_member role → should get 403
      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toContain('org_admin');
    });

    it('should return 400 when team has no organization for org promotion', async () => {
      mockRole.value = 'org_admin';

      const sourceSymbol = {
        id: 'symbol-1',
        name: 'Team Symbol',
        symbolData: { component: 'usa-card' },
        scope: 'team',
        createdBy: 'user-123',
      };
      // No orgId → teamRow has no organizationId
      const accessChains = setupAccessChains({});
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([sourceSymbol]);
      state.selectChains = [...accessChains, symbolChain];

      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${testTeamId}/symbols/symbol-1/promote`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {
          targetScope: 'organization',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toContain('does not belong to an organization');
    });

    it('should promote to organization when user is org_admin', async () => {
      mockRole.value = 'org_admin';

      const sourceSymbol = {
        id: 'symbol-1',
        name: 'Team Symbol',
        symbolData: { component: 'usa-card' },
        scope: 'team',
        createdBy: 'user-123',
      };
      const accessChains = setupAccessChains({ orgId: 'org-1' });
      const symbolChain = createChain();
      symbolChain.limit.mockResolvedValueOnce([sourceSymbol]);
      state.selectChains = [...accessChains, symbolChain];

      const { db } = await import('../db/index.js');
      const promotedSymbol = {
        ...sourceSymbol,
        id: 'symbol-promoted-org',
        scope: 'organization',
        organizationId: 'org-1',
        promotedFrom: 'symbol-1',
      };
      const insertChain = createChain();
      insertChain.returning.mockResolvedValueOnce([promotedSymbol]);
      vi.mocked(db.insert).mockReturnValueOnce(insertChain);

      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${testTeamId}/symbols/symbol-1/promote`,
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        payload: {
          targetScope: 'organization',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.scope).toBe('organization');
      expect(body.promotedFrom).toBe('symbol-1');
      expect(body.organizationId).toBe('org-1');
    });
  });
});
