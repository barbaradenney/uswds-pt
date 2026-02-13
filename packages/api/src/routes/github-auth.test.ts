/**
 * GitHub Auth Routes Tests
 *
 * Tests GitHub OAuth endpoints using Fastify inject().
 * Mocks GitHub API calls and database operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { errorHandler } from '../lib/error-handler.js';

// ── Mock state (vi.hoisted so it's available inside vi.mock factories) ──

const {
  mockFindUserByGithubId,
  mockFindUserByEmail,
  mockCreateOAuthUser,
  mockLinkGithubToUser,
  mockUpdateGithubToken,
  mockExchangeCodeForToken,
  mockFetchGitHubUser,
  mockFetchGitHubEmail,
  mockEncryptToken,
  mockSetupNewUserOrganization,
  mockDb,
} = vi.hoisted(() => ({
  mockFindUserByGithubId: vi.fn(),
  mockFindUserByEmail: vi.fn(),
  mockCreateOAuthUser: vi.fn(),
  mockLinkGithubToUser: vi.fn(),
  mockUpdateGithubToken: vi.fn(),
  mockExchangeCodeForToken: vi.fn(),
  mockFetchGitHubUser: vi.fn(),
  mockFetchGitHubEmail: vi.fn(),
  mockEncryptToken: vi.fn(),
  mockSetupNewUserOrganization: vi.fn(),
  mockDb: {
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
    transaction: vi.fn(),
  },
}));

// ── Module mocks ──

vi.mock('../db/index.js', () => ({ db: mockDb }));

vi.mock('../db/schema.js', () => ({
  users: {
    id: 'id',
    email: 'email',
    name: 'name',
    passwordHash: 'passwordHash',
    organizationId: 'organizationId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    isActive: 'isActive',
    githubId: 'githubId',
    githubUsername: 'githubUsername',
    githubAccessToken: 'githubAccessToken',
    githubTokenExpiresAt: 'githubTokenExpiresAt',
    avatarUrl: 'avatarUrl',
  },
  organizations: { id: 'id', name: 'name', slug: 'slug', description: 'description' },
  teams: { id: 'id', organizationId: 'organizationId', name: 'name', slug: 'slug', description: 'description' },
  teamMemberships: { id: 'id', teamId: 'teamId', userId: 'userId', role: 'role' },
  invitations: { email: 'email', status: 'status' },
}));

vi.mock('../plugins/auth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../plugins/auth.js')>();
  return {
    ...actual,
    findUserByGithubId: mockFindUserByGithubId,
    findUserByEmail: mockFindUserByEmail,
    createOAuthUser: mockCreateOAuthUser,
    linkGithubToUser: mockLinkGithubToUser,
    updateGithubToken: mockUpdateGithubToken,
  };
});

vi.mock('../lib/github-oauth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/github-oauth.js')>();
  return {
    ...actual,
    exchangeCodeForToken: mockExchangeCodeForToken,
    fetchGitHubUser: mockFetchGitHubUser,
    fetchGitHubEmail: mockFetchGitHubEmail,
    encryptToken: mockEncryptToken,
    // Keep getGitHubAuthUrl from actual — it reads env vars directly and is simple enough
  };
});

vi.mock('./auth.js', () => ({
  setupNewUserOrganization: mockSetupNewUserOrganization,
}));

vi.mock('../db/roles.js', () => ({
  ROLES: { ORG_ADMIN: 'org_admin', TEAM_ADMIN: 'team_admin', TEAM_MEMBER: 'team_member', TEAM_VIEWER: 'team_viewer' },
  INVITATION_STATUS: { PENDING: 'pending', ACCEPTED: 'accepted', DECLINED: 'declined', EXPIRED: 'expired' },
}));

// ── Import route module (AFTER mocks are set up) ──
import { githubAuthRoutes } from './github-auth.js';

// ── Test helpers ──

const FRONTEND_URL = 'http://localhost:3000';

const mockGitHubUser = {
  id: 12345,
  login: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://avatars.githubusercontent.com/u/12345',
};

/** Build a Fastify app with the github auth routes registered. */
async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(errorHandler, { includeStackTrace: false, logAllErrors: false });
  await app.register(githubAuthRoutes, { prefix: '/api/auth' });
  await app.ready();
  return app;
}

/**
 * Build a valid state cookie header value.
 * The callback route reads the state from a cookie and compares it
 * to the query ?state= parameter using timingSafeEqual.
 */
function buildStateCookie(state: string): string {
  return `gh_oauth_state=${state}`;
}

// ── Environment setup ──

beforeEach(() => {
  vi.clearAllMocks();

  process.env.GITHUB_CLIENT_ID = 'test-client-id';
  process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
  process.env.GITHUB_CALLBACK_URL = 'http://localhost:3001/api/auth/github/callback';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing!';
  process.env.FRONTEND_URL = FRONTEND_URL;

  // Default mock implementations
  mockEncryptToken.mockReturnValue('encrypted:token:value');
  mockExchangeCodeForToken.mockResolvedValue({
    access_token: 'gho_test_token',
    token_type: 'bearer',
    scope: 'repo,user:email',
  });
  mockFetchGitHubUser.mockResolvedValue(mockGitHubUser);
  mockFetchGitHubEmail.mockResolvedValue('test@example.com');
  mockFindUserByGithubId.mockResolvedValue(null);
  mockFindUserByEmail.mockResolvedValue(null);
  mockCreateOAuthUser.mockResolvedValue({ id: 'new-user-id' });
  mockLinkGithubToUser.mockResolvedValue(undefined);
  mockUpdateGithubToken.mockResolvedValue(undefined);
  mockSetupNewUserOrganization.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.GITHUB_CLIENT_ID;
  delete process.env.GITHUB_CLIENT_SECRET;
  delete process.env.GITHUB_CALLBACK_URL;
  delete process.env.ENCRYPTION_KEY;
  delete process.env.FRONTEND_URL;
});

// ============================================================================
// GET /api/auth/github
// ============================================================================

describe('GET /api/auth/github', () => {
  it('redirects to GitHub OAuth URL', async () => {
    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/github',
      });

      expect(response.statusCode).toBe(302);
      const location = response.headers.location as string;
      expect(location).toContain('https://github.com/login/oauth/authorize');
      expect(location).toContain('client_id=test-client-id');
      expect(location).toContain('scope=repo+user%3Aemail');
    } finally {
      await app.close();
    }
  });

  it('sets state cookie for CSRF protection', async () => {
    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/github',
      });

      const setCookie = response.headers['set-cookie'] as string;
      expect(setCookie).toContain('gh_oauth_state=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('SameSite=Lax');
      expect(setCookie).toContain('Max-Age=600');
    } finally {
      await app.close();
    }
  });

  it('returns 500 when GITHUB_CLIENT_ID is missing', async () => {
    delete process.env.GITHUB_CLIENT_ID;
    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/github',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('GitHub OAuth not configured');
    } finally {
      await app.close();
    }
  });
});

// ============================================================================
// GET /api/auth/github/callback
// ============================================================================

describe('GET /api/auth/github/callback', () => {
  it('redirects to login with error when code is missing', async () => {
    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/github/callback',
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(`${FRONTEND_URL}/#/login?error=oauth_denied`);
    } finally {
      await app.close();
    }
  });

  it('redirects to login with error when error query param is present', async () => {
    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/github/callback?error=access_denied',
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(`${FRONTEND_URL}/#/login?error=oauth_denied`);
    } finally {
      await app.close();
    }
  });

  it('redirects to login with error on state mismatch (CSRF protection)', async () => {
    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/github/callback?code=test-code&state=abc123',
        headers: {
          cookie: buildStateCookie('different-state'),
        },
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(`${FRONTEND_URL}/#/login?error=oauth_failed`);
    } finally {
      await app.close();
    }
  });

  it('redirects to login with error when state cookie is missing', async () => {
    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/github/callback?code=test-code&state=abc123',
        // No cookie header
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(`${FRONTEND_URL}/#/login?error=oauth_failed`);
    } finally {
      await app.close();
    }
  });

  it('creates new user when GitHub user does not exist', async () => {
    const state = 'valid-state-value';
    mockFindUserByGithubId.mockResolvedValue(null);
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateOAuthUser.mockResolvedValue({ id: 'new-user-123' });

    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/github/callback?code=test-code&state=${state}`,
        headers: {
          cookie: buildStateCookie(state),
        },
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain(`${FRONTEND_URL}/#/auth/callback?token=`);

      // Verify createOAuthUser was called with correct args
      expect(mockCreateOAuthUser).toHaveBeenCalledWith(
        'test@example.com',     // email
        'Test User',            // name (ghUser.name)
        12345,                  // githubId
        'testuser',             // githubUsername
        'encrypted:token:value', // encrypted token
        'https://avatars.githubusercontent.com/u/12345', // avatar_url
      );

      // Verify org setup was called for new user
      expect(mockSetupNewUserOrganization).toHaveBeenCalledWith('new-user-123', 'test@example.com');
    } finally {
      await app.close();
    }
  });

  it('uses ghUser.login as name fallback when ghUser.name is null', async () => {
    const state = 'valid-state-value';
    mockFindUserByGithubId.mockResolvedValue(null);
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateOAuthUser.mockResolvedValue({ id: 'new-user-456' });
    mockFetchGitHubUser.mockResolvedValue({
      ...mockGitHubUser,
      name: null,
    });

    const app = await buildApp();
    try {
      await app.inject({
        method: 'GET',
        url: `/api/auth/github/callback?code=test-code&state=${state}`,
        headers: {
          cookie: buildStateCookie(state),
        },
      });

      // Should use login as fallback name
      expect(mockCreateOAuthUser).toHaveBeenCalledWith(
        'test@example.com',
        'testuser',              // login used as fallback
        12345,
        'testuser',
        'encrypted:token:value',
        'https://avatars.githubusercontent.com/u/12345',
      );
    } finally {
      await app.close();
    }
  });

  it('links existing user by email', async () => {
    const state = 'valid-state-value';
    mockFindUserByGithubId.mockResolvedValue(null);
    mockFindUserByEmail.mockResolvedValue({
      id: 'existing-user-by-email',
      email: 'test@example.com',
      isActive: true,
    });

    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/github/callback?code=test-code&state=${state}`,
        headers: {
          cookie: buildStateCookie(state),
        },
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain(`${FRONTEND_URL}/#/auth/callback?token=`);

      // Verify linkGithubToUser was called
      expect(mockLinkGithubToUser).toHaveBeenCalledWith(
        'existing-user-by-email',
        12345,
        'testuser',
        'encrypted:token:value',
        'https://avatars.githubusercontent.com/u/12345',
      );

      // Should NOT create new user or setup org
      expect(mockCreateOAuthUser).not.toHaveBeenCalled();
      expect(mockSetupNewUserOrganization).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('links existing user by GitHub ID (returning user)', async () => {
    const state = 'valid-state-value';
    mockFindUserByGithubId.mockResolvedValue({
      id: 'existing-user-by-github',
      email: 'test@example.com',
      isActive: true,
    });

    // db.update().set().where() chain for updating username/avatar
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.where.mockResolvedValue(undefined);

    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/github/callback?code=test-code&state=${state}`,
        headers: {
          cookie: buildStateCookie(state),
        },
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain(`${FRONTEND_URL}/#/auth/callback?token=`);

      // Verify token was updated for returning user
      expect(mockUpdateGithubToken).toHaveBeenCalledWith(
        'existing-user-by-github',
        'encrypted:token:value',
      );

      // Should NOT create new user, link, or setup org
      expect(mockCreateOAuthUser).not.toHaveBeenCalled();
      expect(mockLinkGithubToUser).not.toHaveBeenCalled();
      expect(mockSetupNewUserOrganization).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('returns JWT token on successful callback', async () => {
    const state = 'valid-state-value';
    mockFindUserByGithubId.mockResolvedValue(null);
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateOAuthUser.mockResolvedValue({ id: 'jwt-test-user' });

    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/github/callback?code=test-code&state=${state}`,
        headers: {
          cookie: buildStateCookie(state),
        },
      });

      expect(response.statusCode).toBe(302);
      const location = response.headers.location as string;
      expect(location).toContain(`${FRONTEND_URL}/#/auth/callback?token=`);

      // Extract and verify the JWT token
      const tokenMatch = location.match(/token=([^&]+)/);
      expect(tokenMatch).toBeTruthy();
      const token = decodeURIComponent(tokenMatch![1]);

      // Verify the token is a valid JWT (3 base64url segments separated by dots)
      const jwtParts = token.split('.');
      expect(jwtParts).toHaveLength(3);

      // Decode payload and verify contents
      const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64url').toString());
      expect(payload.id).toBe('jwt-test-user');
      expect(payload.email).toBe('test@example.com');
      expect(payload.exp).toBeDefined(); // Expiry should be set
    } finally {
      await app.close();
    }
  });

  it('redirects to login error when no verified email is available', async () => {
    const state = 'valid-state-value';
    mockFetchGitHubEmail.mockResolvedValue(null);

    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/github/callback?code=test-code&state=${state}`,
        headers: {
          cookie: buildStateCookie(state),
        },
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(`${FRONTEND_URL}/#/login?error=no_email`);
    } finally {
      await app.close();
    }
  });

  it('redirects to login error when account is disabled (found by GitHub ID)', async () => {
    const state = 'valid-state-value';
    mockFindUserByGithubId.mockResolvedValue({
      id: 'disabled-user',
      email: 'test@example.com',
      isActive: false,
    });

    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/github/callback?code=test-code&state=${state}`,
        headers: {
          cookie: buildStateCookie(state),
        },
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(`${FRONTEND_URL}/#/login?error=account_disabled`);
    } finally {
      await app.close();
    }
  });

  it('redirects to login error when account is disabled (found by email)', async () => {
    const state = 'valid-state-value';
    mockFindUserByGithubId.mockResolvedValue(null);
    mockFindUserByEmail.mockResolvedValue({
      id: 'disabled-user-email',
      email: 'test@example.com',
      isActive: false,
    });

    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/github/callback?code=test-code&state=${state}`,
        headers: {
          cookie: buildStateCookie(state),
        },
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(`${FRONTEND_URL}/#/login?error=account_disabled`);
    } finally {
      await app.close();
    }
  });

  it('redirects to login error when token exchange fails', async () => {
    const state = 'valid-state-value';
    mockExchangeCodeForToken.mockRejectedValue(new Error('Token exchange failed'));

    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/github/callback?code=test-code&state=${state}`,
        headers: {
          cookie: buildStateCookie(state),
        },
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(`${FRONTEND_URL}/#/login?error=oauth_failed`);
    } finally {
      await app.close();
    }
  });

  it('clears the state cookie on successful callback', async () => {
    const state = 'valid-state-value';
    mockFindUserByGithubId.mockResolvedValue(null);
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateOAuthUser.mockResolvedValue({ id: 'cookie-test-user' });

    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/github/callback?code=test-code&state=${state}`,
        headers: {
          cookie: buildStateCookie(state),
        },
      });

      const setCookie = response.headers['set-cookie'] as string;
      expect(setCookie).toContain('gh_oauth_state=;');
      expect(setCookie).toContain('Max-Age=0');
    } finally {
      await app.close();
    }
  });

  it('clears the state cookie on error callback', async () => {
    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/github/callback?error=access_denied',
      });

      const setCookie = response.headers['set-cookie'] as string;
      expect(setCookie).toContain('gh_oauth_state=;');
      expect(setCookie).toContain('Max-Age=0');
    } finally {
      await app.close();
    }
  });

  it('encrypts the access token before storing', async () => {
    const state = 'valid-state-value';
    mockFindUserByGithubId.mockResolvedValue(null);
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateOAuthUser.mockResolvedValue({ id: 'encrypt-test-user' });

    const app = await buildApp();
    try {
      await app.inject({
        method: 'GET',
        url: `/api/auth/github/callback?code=test-code&state=${state}`,
        headers: {
          cookie: buildStateCookie(state),
        },
      });

      // Verify encryptToken was called with the raw access token
      expect(mockEncryptToken).toHaveBeenCalledWith('gho_test_token');
    } finally {
      await app.close();
    }
  });
});
