/**
 * Prototype Routes Tests
 *
 * Tests prototype CRUD endpoints using Fastify inject().
 * Uses mocked database operations for isolation.
 *
 * Covers:
 * - Authentication (401 for unauthenticated requests)
 * - GET  /api/prototypes          (list prototypes)
 * - GET  /api/prototypes/:slug    (get single prototype)
 * - POST /api/prototypes          (create prototype)
 * - PUT  /api/prototypes/:slug    (update prototype with optimistic concurrency)
 * - DELETE /api/prototypes/:slug  (delete prototype)
 * - Permission checks (viewer cannot write)
 * - Validation (missing fields, oversized payloads)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { prototypeRoutes } from './prototypes.js';
import { errorHandler } from '../lib/error-handler.js';

// ---------------------------------------------------------------------------
// Mocks -- use vi.hoisted() so variables are available when vi.mock is hoisted
// ---------------------------------------------------------------------------

const { mockDb, mockLimit, mockReturning, mockOffset, mockLeftJoin, mockTransaction } = vi.hoisted(() => {
  const mockLimit = vi.fn().mockResolvedValue([]);
  const mockReturning = vi.fn().mockResolvedValue([]);
  const mockOffset = vi.fn().mockReturnThis();
  const mockLeftJoin = vi.fn().mockReturnThis();

  // Transaction mock: by default, executes the callback with a tx that
  // mirrors mockDb for chainable calls.
  const mockTransaction = vi.fn();

  const mockDb: Record<string, any> = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: mockLimit,
    orderBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: mockLeftJoin,
    offset: mockOffset,
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: mockReturning,
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: mockTransaction,
  };

  return { mockDb, mockLimit, mockReturning, mockOffset, mockLeftJoin, mockTransaction };
});

vi.mock('../db/index.js', () => ({
  db: mockDb,
  prototypes: {
    id: 'id',
    slug: 'slug',
    name: 'name',
    description: 'description',
    htmlContent: 'htmlContent',
    grapesData: 'grapesData',
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
  prototypeVersions: {
    id: 'id',
    prototypeId: 'prototypeId',
    versionNumber: 'versionNumber',
    htmlContent: 'htmlContent',
    grapesData: 'grapesData',
    label: 'label',
    contentChecksum: 'contentChecksum',
    createdAt: 'createdAt',
    createdBy: 'createdBy',
  },
  teamMemberships: {
    id: 'id',
    userId: 'userId',
    teamId: 'teamId',
    role: 'role',
    joinedAt: 'joinedAt',
    invitedBy: 'invitedBy',
  },
  users: {
    id: 'id',
    githubAccessToken: 'githubAccessToken',
  },
  githubTeamConnections: { teamId: 'teamId' },
  githubHandoffConnections: { teamId: 'teamId' },
}));

vi.mock('@uswds-pt/shared', () => ({
  computeContentChecksum: vi.fn().mockResolvedValue('mock-checksum-abc123'),
  toBranchSlug: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-')),
  createDebugLogger: vi.fn(() => vi.fn()),
}));

vi.mock('../lib/github-push.js', () => ({
  pushFilesToGitHub: vi.fn(),
  createGitHubBranch: vi.fn(),
  listUserRepos: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_USER = { id: 'user-123', email: 'test@example.com' };
const TEAM_ID = '550e8400-e29b-41d4-a716-446655440000';

const NOW = new Date('2026-01-15T00:00:00Z');

/** A sample prototype as returned from DB */
function samplePrototype(overrides: Record<string, unknown> = {}) {
  return {
    id: 'proto-uuid-1',
    slug: 'abc1234567',
    name: 'My Prototype',
    description: 'A test prototype',
    htmlContent: '<div>Hello</div>',
    grapesData: { pages: [], styles: [], assets: [] },
    teamId: TEAM_ID,
    createdBy: TEST_USER.id,
    createdAt: NOW,
    updatedAt: NOW,
    isPublic: false,
    version: 1,
    contentChecksum: 'checksum-1',
    branchSlug: 'my-prototype',
    lastGithubPushAt: null,
    lastGithubCommitSha: null,
    ...overrides,
  };
}

/** Reset all mock chain methods to default return-this behavior */
function resetMockChain() {
  mockLimit.mockReset().mockResolvedValue([]);
  mockReturning.mockReset().mockResolvedValue([]);
  mockOffset.mockReset().mockReturnThis();
  mockLeftJoin.mockReset().mockReturnThis();
  mockTransaction.mockReset();

  mockDb.select.mockReturnThis();
  mockDb.from.mockReturnThis();
  mockDb.where.mockReturnThis();
  mockDb.orderBy.mockReturnThis();
  mockDb.innerJoin.mockReturnThis();
  mockDb.leftJoin = mockLeftJoin;
  mockDb.offset = mockOffset;
  mockDb.insert.mockReturnThis();
  mockDb.values.mockReturnThis();
  mockDb.update.mockReturnThis();
  mockDb.set.mockReturnThis();
  mockDb.delete.mockReturnThis();
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Prototype Routes', () => {
  let app: FastifyInstance;
  let validToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetMockChain();

    app = Fastify({ logger: false });
    await app.register(authPlugin);
    await app.register(errorHandler, {
      includeStackTrace: false,
      logAllErrors: false,
    });
    await app.register(prototypeRoutes, { prefix: '/api/prototypes' });
    await app.ready();

    validToken = app.jwt.sign(TEST_USER, { expiresIn: '1h' });
  });

  afterEach(async () => {
    await app.close();
  });

  // =========================================================================
  // GET /api/prototypes  (list)
  // =========================================================================

  describe('GET /api/prototypes', () => {
    it('should return 401 without authentication', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/prototypes' });
      expect(res.statusCode).toBe(401);
    });

    it('should return prototypes list for authenticated user (no teamId filter)', async () => {
      // 1st: user memberships — select().from().where() terminal
      mockDb.where.mockResolvedValueOnce([{ teamId: TEAM_ID }]);

      // 2nd: count query — select().from().where() terminal
      mockDb.where.mockResolvedValueOnce([{ total: 1 }]);

      // 3rd: paginated list — select().from().where().orderBy().limit().offset()
      //   where() falls back to default (chainable)
      //   limit() must be chainable here so offset() can follow
      const proto = samplePrototype();
      mockLimit.mockReturnValueOnce(mockDb); // chainable limit for pagination
      mockOffset.mockResolvedValueOnce([proto]); // terminal offset

      const res = await app.inject({
        method: 'GET',
        url: '/api/prototypes',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.prototypes).toBeDefined();
      expect(Array.isArray(body.prototypes)).toBe(true);
      expect(body.total).toBeDefined();
      expect(body.page).toBe(1);
      expect(body.limit).toBeDefined();
    });

    it('should return prototypes for a specific team', async () => {
      // 1st: getTeamMembership — where() chainable, limit() terminal
      mockDb.where.mockReturnValueOnce(mockDb);
      mockLimit.mockResolvedValueOnce([{ role: 'team_member', userId: TEST_USER.id, teamId: TEAM_ID }]);

      // 2nd: count query — where() terminal
      mockDb.where.mockResolvedValueOnce([{ total: 2 }]);

      // 3rd: paginated list — where().orderBy().limit().offset()
      //   where() falls back to default (chainable)
      //   limit() must be chainable so offset() can follow
      const protos = [samplePrototype(), samplePrototype({ slug: 'def456', name: 'Proto 2' })];
      mockLimit.mockReturnValueOnce(mockDb); // chainable limit for pagination
      mockOffset.mockResolvedValueOnce(protos); // terminal offset

      const res = await app.inject({
        method: 'GET',
        url: `/api/prototypes?teamId=${TEAM_ID}`,
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.prototypes).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('should return 403 when user is not a member of the queried team', async () => {
      // Membership check returns empty
      mockLimit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/prototypes?teamId=${TEAM_ID}`,
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Not a member of this team');
    });
  });

  // =========================================================================
  // GET /api/prototypes/:slug  (get single)
  // =========================================================================

  describe('GET /api/prototypes/:slug', () => {
    it('should return 401 without authentication', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/prototypes/test-slug' });
      expect(res.statusCode).toBe(401);
    });

    it('should return a prototype when user is a team member', async () => {
      const proto = samplePrototype();
      // Single join query returns prototype + memberRole
      mockLimit.mockResolvedValueOnce([{ prototype: proto, memberRole: 'team_member' }]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.slug).toBe('abc1234567');
      expect(body.name).toBe('My Prototype');
    });

    it('should return 404 when prototype does not exist', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/prototypes/nonexistent',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Prototype not found');
    });

    it('should return 403 when user is not a member of the prototype team', async () => {
      const proto = samplePrototype({ createdBy: 'other-user-456' });
      // Join returns null memberRole and the prototype belongs to a team
      mockLimit.mockResolvedValueOnce([{ prototype: proto, memberRole: null }]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Access denied');
    });

    it('should allow access to legacy prototype (no team) for creator', async () => {
      const proto = samplePrototype({ teamId: null, createdBy: TEST_USER.id });
      mockLimit.mockResolvedValueOnce([{ prototype: proto, memberRole: null }]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(200);
    });
  });

  // =========================================================================
  // POST /api/prototypes  (create)
  // =========================================================================

  describe('POST /api/prototypes', () => {
    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        payload: { name: 'Test Prototype', teamId: TEAM_ID },
      });
      expect(res.statusCode).toBe(401);
    });

    it('should create a prototype with valid data', async () => {
      // 1st: getTeamMembership — chain: select().from().where().limit()
      //   where is chainable (returns this), limit resolves
      mockDb.where.mockReturnValueOnce(mockDb); // chainable where for getTeamMembership
      mockLimit.mockResolvedValueOnce([{ role: 'team_member', userId: TEST_USER.id, teamId: TEAM_ID }]);

      // 2nd: isNameTaken — chain: select({count}).from().where() [terminal]
      mockDb.where.mockResolvedValueOnce([{ count: 0 }]);

      // 3rd: insertWithBranchSlug -> db.insert().values().returning()
      const created = samplePrototype();
      mockReturning.mockResolvedValueOnce([created]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          name: 'My Prototype',
          teamId: TEAM_ID,
          description: 'A test prototype',
          htmlContent: '<div>Hello</div>',
          grapesData: { pages: [] },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.name).toBe('My Prototype');
      expect(body.teamId).toBe(TEAM_ID);
    });

    it('should return 400 when name is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { teamId: TEAM_ID },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when teamId is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Test' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when teamId is not a valid UUID', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Test', teamId: 'not-a-uuid' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when name is whitespace-only (trim to empty)', async () => {
      // Schema passes minLength:1 for '   ' (length 3), but handler trims to empty
      // and returns 400 before any DB calls
      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: '   ', teamId: TEAM_ID },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Name cannot be empty');
    });

    it('should return 403 when user is not a member of the team', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Test', teamId: TEAM_ID },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Not a member of this team');
    });

    it('should return 403 when user is a viewer (cannot create)', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_viewer', userId: TEST_USER.id, teamId: TEAM_ID }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Test', teamId: TEAM_ID },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Viewers cannot create prototypes');
    });

    it('should return 409 when prototype name already exists in team', async () => {
      // 1st: getTeamMembership — where is chainable, limit resolves
      mockDb.where.mockReturnValueOnce(mockDb);
      mockLimit.mockResolvedValueOnce([{ role: 'team_member', userId: TEST_USER.id, teamId: TEAM_ID }]);

      // 2nd: isNameTaken — where is terminal, resolves with count > 0
      mockDb.where.mockResolvedValueOnce([{ count: 1 }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Duplicate Name', teamId: TEAM_ID },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.payload);
      expect(body.message).toContain('already exists');
    });

    it('should strip additional properties in the body (Fastify removeAdditional)', async () => {
      // Fastify's default Ajv config has removeAdditional: true,
      // so extra properties are silently stripped rather than rejected.
      // The request proceeds normally with the valid fields only.
      mockDb.where.mockReturnValueOnce(mockDb); // getTeamMembership chainable where
      mockLimit.mockResolvedValueOnce([{ role: 'team_member', userId: TEST_USER.id, teamId: TEAM_ID }]);
      mockDb.where.mockResolvedValueOnce([{ count: 0 }]); // isNameTaken terminal
      const created = samplePrototype({ name: 'Test' });
      mockReturning.mockResolvedValueOnce([created]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          name: 'Test',
          teamId: TEAM_ID,
          malicious: 'data',
        },
      });

      // Extra properties stripped; request succeeds
      expect(res.statusCode).toBe(201);
    });

    it('should return 400 when grapesData.pages is not an array', async () => {
      // 1st: getTeamMembership — chainable where, limit resolves
      mockDb.where.mockReturnValueOnce(mockDb);
      mockLimit.mockResolvedValueOnce([{ role: 'team_member', userId: TEST_USER.id, teamId: TEAM_ID }]);

      // 2nd: isNameTaken — terminal where, count 0
      mockDb.where.mockResolvedValueOnce([{ count: 0 }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          name: 'Test',
          teamId: TEAM_ID,
          grapesData: { pages: 'not-an-array' },
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toContain('pages must be an array');
    });
  });

  // =========================================================================
  // PUT /api/prototypes/:slug  (update)
  // =========================================================================

  describe('PUT /api/prototypes/:slug', () => {
    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/prototypes/test-slug',
        payload: { name: 'Updated Name' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('should update a prototype successfully', async () => {
      const proto = samplePrototype();
      // 1st: fetch current prototype — where() chainable, limit() resolves
      mockDb.where.mockReturnValueOnce(mockDb);
      mockLimit.mockResolvedValueOnce([proto]);

      // 2nd: canEditPrototype -> getTeamMembership — where() chainable, limit() resolves
      mockDb.where.mockReturnValueOnce(mockDb);
      mockLimit.mockResolvedValueOnce([{ role: 'team_member', userId: TEST_USER.id, teamId: TEAM_ID }]);

      // 3rd: isNameTaken (name changed) — where() terminal, count 0
      mockDb.where.mockResolvedValueOnce([{ count: 0 }]);

      // Transaction mock: simulate the full transaction
      const updatedProto = { ...proto, name: 'Updated Name', version: 2 };
      mockTransaction.mockImplementationOnce(async (cb: (tx: any) => Promise<any>) => {
        // Inside the transaction:
        //   1. tx.select().from().where().limit(1) — re-read prototype
        //   2. tx.select().from().where().orderBy().limit(1) — get last version number
        //   3. tx.insert().values({...}) — insert version snapshot (no .returning())
        //   4. tx.update().set().where().returning() — update prototype
        const txLimit = vi.fn()
          .mockResolvedValueOnce([proto])   // #1: re-read prototype
          .mockResolvedValueOnce([]);       // #2: lastVersion (no versions yet)
        const txReturning = vi.fn()
          .mockResolvedValueOnce([updatedProto]); // #4: update returning
        const tx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: txLimit,
          orderBy: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockResolvedValue(undefined), // #3: insert version (awaited, no returning)
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
          returning: txReturning,
        };
        return cb(tx);
      });

      const res = await app.inject({
        method: 'PUT',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Updated Name' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.name).toBe('Updated Name');
      expect(body.version).toBe(2);
    });

    it('should return 404 when prototype does not exist', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/prototypes/nonexistent',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Updated' },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Prototype not found');
    });

    it('should return 403 when viewer tries to edit', async () => {
      const proto = samplePrototype({ createdBy: 'other-user-456' });
      // Fetch prototype
      mockLimit.mockResolvedValueOnce([proto]);
      // canEditPrototype -> getTeamMembership: viewer role
      mockLimit.mockResolvedValueOnce([{ role: 'team_viewer', userId: TEST_USER.id, teamId: TEAM_ID }]);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Updated' },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Access denied');
    });

    it('should return 403 when non-member tries to edit', async () => {
      const proto = samplePrototype({ createdBy: 'other-user-456' });
      mockLimit.mockResolvedValueOnce([proto]);
      // No membership found
      mockLimit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Updated' },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Access denied');
    });

    it('should return 409 on optimistic concurrency conflict via If-Match header', async () => {
      const proto = samplePrototype({ version: 5 });
      // Fetch prototype
      mockLimit.mockResolvedValueOnce([proto]);
      // canEditPrototype -> getTeamMembership
      mockLimit.mockResolvedValueOnce([{ role: 'team_member', userId: TEST_USER.id, teamId: TEAM_ID }]);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/prototypes/abc1234567',
        headers: {
          authorization: `Bearer ${validToken}`,
          'if-match': '3', // Client thinks it is version 3, but server has version 5
        },
        payload: { htmlContent: '<div>Conflict</div>' },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.payload);
      expect(body.message).toContain('modified by another session');
      expect(body.serverVersion).toBe(5);
      expect(body.yourVersion).toBe(3);
    });

    it('should return 400 when name is empty after trim', async () => {
      // Empty name check happens before any DB calls in the PUT handler
      const res = await app.inject({
        method: 'PUT',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: '   ' },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Name cannot be empty');
    });

    it('should strip additional properties in the body (Fastify removeAdditional)', async () => {
      // Fastify's default Ajv config has removeAdditional: true,
      // so extra properties are silently stripped.
      // The request proceeds with valid fields only (name: 'Test').
      // Since name is provided, the PUT handler fetches the prototype and checks permissions.
      const proto = samplePrototype();
      mockDb.where.mockReturnValueOnce(mockDb); // fetch prototype chainable where
      mockLimit.mockResolvedValueOnce([proto]);
      mockDb.where.mockReturnValueOnce(mockDb); // getTeamMembership chainable where
      mockLimit.mockResolvedValueOnce([{ role: 'team_member', userId: TEST_USER.id, teamId: TEAM_ID }]);
      // isNameTaken (name changed from 'My Prototype' to 'Test')
      mockDb.where.mockResolvedValueOnce([{ count: 0 }]);

      const updatedProto = { ...proto, name: 'Test', version: 2 };
      mockTransaction.mockImplementationOnce(async (cb: (tx: any) => Promise<any>) => {
        const txLimit = vi.fn()
          .mockResolvedValueOnce([proto])
          .mockResolvedValueOnce([]);
        const txReturning = vi.fn()
          .mockResolvedValueOnce([updatedProto]);
        const tx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: txLimit,
          orderBy: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockResolvedValue(undefined),
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
          returning: txReturning,
        };
        return cb(tx);
      });

      const res = await app.inject({
        method: 'PUT',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Test', extraField: 'malicious' },
      });

      // Extra properties stripped; request succeeds
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 when grapesData.pages is not an array', async () => {
      const proto = samplePrototype();
      // Fetch prototype: where() is chainable, limit resolves
      mockLimit.mockResolvedValueOnce([proto]);
      // canEditPrototype -> getTeamMembership: where() chainable, limit resolves
      mockLimit.mockResolvedValueOnce([{ role: 'team_member', userId: TEST_USER.id, teamId: TEAM_ID }]);
      // No name change -> no isNameTaken call
      // validateGrapesData returns error for invalid pages before any further DB calls

      const res = await app.inject({
        method: 'PUT',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { grapesData: { pages: 'invalid' } },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toContain('pages must be an array');
    });

    it('should return 409 when renaming to a duplicate name within the same team', async () => {
      const proto = samplePrototype();
      // Fetch prototype: where() chainable, limit resolves
      mockDb.where.mockReturnValueOnce(mockDb);
      mockLimit.mockResolvedValueOnce([proto]);
      // canEditPrototype -> getTeamMembership: where() chainable, limit resolves
      mockDb.where.mockReturnValueOnce(mockDb);
      mockLimit.mockResolvedValueOnce([{ role: 'team_member', userId: TEST_USER.id, teamId: TEAM_ID }]);
      // isNameTaken: where() terminal, resolves with count > 0
      mockDb.where.mockResolvedValueOnce([{ count: 1 }]);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Already Taken' },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.payload);
      expect(body.message).toContain('already exists');
    });
  });

  // =========================================================================
  // DELETE /api/prototypes/:slug
  // =========================================================================

  describe('DELETE /api/prototypes/:slug', () => {
    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/prototypes/test-slug',
      });
      expect(res.statusCode).toBe(401);
    });

    it('should delete a prototype when user is the creator', async () => {
      const proto = samplePrototype();
      // Fetch prototype
      mockLimit.mockResolvedValueOnce([proto]);
      // canDeletePrototype: creator === userId, so no more DB calls needed

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });

    it('should delete a prototype when user is a team admin (not creator)', async () => {
      const proto = samplePrototype({ createdBy: 'other-user-456' });
      // Fetch prototype
      mockLimit.mockResolvedValueOnce([proto]);
      // canDeletePrototype: not creator -> getTeamMembership -> admin role
      mockLimit.mockResolvedValueOnce([{ role: 'team_admin', userId: TEST_USER.id, teamId: TEAM_ID }]);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });

    it('should return 404 when prototype does not exist', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/prototypes/nonexistent',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Prototype not found');
    });

    it('should return 403 when viewer tries to delete', async () => {
      const proto = samplePrototype({ createdBy: 'other-user-456' });
      // Fetch prototype
      mockLimit.mockResolvedValueOnce([proto]);
      // canDeletePrototype: not creator -> getTeamMembership -> viewer
      mockLimit.mockResolvedValueOnce([{ role: 'team_viewer', userId: TEST_USER.id, teamId: TEAM_ID }]);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Access denied');
    });

    it('should return 403 when regular member tries to delete a prototype they did not create', async () => {
      const proto = samplePrototype({ createdBy: 'other-user-456' });
      mockLimit.mockResolvedValueOnce([proto]);
      // canDeletePrototype: not creator -> getTeamMembership -> member (not admin)
      mockLimit.mockResolvedValueOnce([{ role: 'team_member', userId: TEST_USER.id, teamId: TEAM_ID }]);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Access denied');
    });

    it('should return 403 when non-member tries to delete', async () => {
      const proto = samplePrototype({ createdBy: 'other-user-456' });
      mockLimit.mockResolvedValueOnce([proto]);
      // canDeletePrototype: not creator -> getTeamMembership -> no membership
      mockLimit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Access denied');
    });
  });

  // =========================================================================
  // GET /api/prototypes/:slug/versions
  // =========================================================================

  describe('GET /api/prototypes/:slug/versions', () => {
    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/prototypes/test-slug/versions',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // POST /api/prototypes/:slug/versions/:version/restore
  // =========================================================================

  describe('POST /api/prototypes/:slug/versions/:version/restore', () => {
    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes/test-slug/versions/1/restore',
      });
      expect(res.statusCode).toBe(401);
    });

    it('should return 400 for invalid version number', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes/test-slug/versions/invalid/restore',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Invalid version number');
    });
  });

  // =========================================================================
  // Permission matrix: viewer can read but not write
  // =========================================================================

  describe('Permission checks — viewer role', () => {
    it('viewer can read a prototype via GET /:slug', async () => {
      const proto = samplePrototype();
      mockLimit.mockResolvedValueOnce([{ prototype: proto, memberRole: 'team_viewer' }]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.name).toBe('My Prototype');
    });

    it('viewer cannot create via POST', async () => {
      mockLimit.mockResolvedValueOnce([{ role: 'team_viewer', userId: TEST_USER.id, teamId: TEAM_ID }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Viewer Proto', teamId: TEAM_ID },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toBe('Viewers cannot create prototypes');
    });

    it('viewer cannot update via PUT', async () => {
      const proto = samplePrototype({ createdBy: 'other-user-456' });
      mockLimit.mockResolvedValueOnce([proto]);
      mockLimit.mockResolvedValueOnce([{ role: 'team_viewer', userId: TEST_USER.id, teamId: TEAM_ID }]);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'Viewer Update' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('viewer cannot delete via DELETE', async () => {
      const proto = samplePrototype({ createdBy: 'other-user-456' });
      mockLimit.mockResolvedValueOnce([proto]);
      mockLimit.mockResolvedValueOnce([{ role: 'team_viewer', userId: TEST_USER.id, teamId: TEAM_ID }]);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/prototypes/abc1234567',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // =========================================================================
  // Validation edge cases
  // =========================================================================

  describe('Validation', () => {
    it('should reject name longer than 255 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { name: 'x'.repeat(256), teamId: TEAM_ID },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should reject description longer than 1000 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          name: 'Test',
          teamId: TEAM_ID,
          description: 'x'.repeat(1001),
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should accept valid optional fields for POST', async () => {
      // 1st: getTeamMembership — where() chainable, limit() resolves
      mockDb.where.mockReturnValueOnce(mockDb);
      mockLimit.mockResolvedValueOnce([{ role: 'team_member', userId: TEST_USER.id, teamId: TEAM_ID }]);
      // 2nd: isNameTaken — where() terminal
      mockDb.where.mockResolvedValueOnce([{ count: 0 }]);
      // 3rd: insert returning
      const created = samplePrototype({ name: 'Valid', description: 'Short desc' });
      mockReturning.mockResolvedValueOnce([created]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/prototypes',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          name: 'Valid',
          teamId: TEAM_ID,
          description: 'Short desc',
        },
      });

      expect(res.statusCode).toBe(201);
    });
  });
});
