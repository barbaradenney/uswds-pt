/**
 * GitHub OAuth Utilities Tests
 *
 * Tests token encryption/decryption, auth URL generation,
 * and GitHub API interaction functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set ENCRYPTION_KEY before importing the module under test so
// getEncryptionKey() has a value to work with.
const TEST_ENCRYPTION_KEY = 'a]f9$kL2mN7pQ4rS8tU1vW3xY6zA0bC'; // 32-char raw string

beforeEach(() => {
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  process.env.GITHUB_CLIENT_ID = 'test-client-id';
  process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
  process.env.GITHUB_CALLBACK_URL = 'http://localhost:3001/api/auth/github/callback';
});

afterEach(() => {
  delete process.env.ENCRYPTION_KEY;
  delete process.env.GITHUB_CLIENT_ID;
  delete process.env.GITHUB_CLIENT_SECRET;
  delete process.env.GITHUB_CALLBACK_URL;
  vi.restoreAllMocks();
});

import {
  encryptToken,
  decryptToken,
  getGitHubAuthUrl,
  exchangeCodeForToken,
  fetchGitHubUser,
  fetchGitHubEmail,
} from './github-oauth.js';

// ============================================================================
// Token Encryption / Decryption
// ============================================================================

describe('encryptToken / decryptToken', () => {
  it('encrypts and decrypts a token correctly (round-trip)', () => {
    const token = 'gho_abc123_my_github_token';
    const encrypted = encryptToken(token);
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(token);
  });

  it('produces ciphertext in iv:tag:ciphertext format', () => {
    const encrypted = encryptToken('some-token');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    // IV should be 12 bytes = 24 hex chars
    expect(parts[0]).toHaveLength(24);
    // Auth tag should be 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Ciphertext should be non-empty hex
    expect(parts[2].length).toBeGreaterThan(0);
    expect(/^[0-9a-f]+$/.test(parts[2])).toBe(true);
  });

  it('different encryptions of same token produce different ciphertexts (random IV)', () => {
    const token = 'gho_same_token_each_time';
    const encrypted1 = encryptToken(token);
    const encrypted2 = encryptToken(token);
    expect(encrypted1).not.toBe(encrypted2);
    // Both should still decrypt to the same value
    expect(decryptToken(encrypted1)).toBe(token);
    expect(decryptToken(encrypted2)).toBe(token);
  });

  it('decryption fails with wrong encryption key', () => {
    const token = 'gho_secret_token';
    const encrypted = encryptToken(token);

    // Change the encryption key
    process.env.ENCRYPTION_KEY = 'different-key-that-is-not-right!';

    expect(() => decryptToken(encrypted)).toThrow();
  });

  it('rejects empty ciphertext from encrypting empty token', () => {
    // Encrypting an empty string produces empty ciphertext,
    // which decryptToken correctly rejects.
    const encrypted = encryptToken('');
    expect(() => decryptToken(encrypted)).toThrow('Invalid encrypted token format');
  });

  it('handles long token', () => {
    const longToken = 'gho_' + 'a'.repeat(500);
    const encrypted = encryptToken(longToken);
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(longToken);
  });

  it('throws on invalid encrypted format (missing parts)', () => {
    expect(() => decryptToken('invalid-format')).toThrow('Invalid encrypted token format');
  });

  it('throws on invalid encrypted format (only two parts)', () => {
    expect(() => decryptToken('aabb:ccdd')).toThrow('Invalid encrypted token format');
  });

  it('throws when ENCRYPTION_KEY is not configured', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encryptToken('token')).toThrow('ENCRYPTION_KEY not configured');
  });

  it('works with hex-encoded 64-character ENCRYPTION_KEY', () => {
    // 32 bytes = 64 hex chars
    process.env.ENCRYPTION_KEY = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    const token = 'gho_hex_key_test';
    const encrypted = encryptToken(token);
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(token);
  });
});

// ============================================================================
// getGitHubAuthUrl
// ============================================================================

describe('getGitHubAuthUrl', () => {
  it('returns a valid GitHub OAuth authorization URL', () => {
    const { url, state } = getGitHubAuthUrl();
    expect(url).toContain('https://github.com/login/oauth/authorize');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('redirect_uri=');
    expect(url).toContain('scope=repo+user%3Aemail');
    expect(state).toBeTruthy();
    expect(state.length).toBe(64); // 32 random bytes = 64 hex chars
  });

  it('includes the callback URL', () => {
    const { url } = getGitHubAuthUrl();
    expect(url).toContain(encodeURIComponent('http://localhost:3001/api/auth/github/callback'));
  });

  it('generates unique state values on each call', () => {
    const { state: state1 } = getGitHubAuthUrl();
    const { state: state2 } = getGitHubAuthUrl();
    expect(state1).not.toBe(state2);
  });

  it('throws when GITHUB_CLIENT_ID is not configured', () => {
    delete process.env.GITHUB_CLIENT_ID;
    expect(() => getGitHubAuthUrl()).toThrow('GITHUB_CLIENT_ID not configured');
  });

  it('throws when GITHUB_CALLBACK_URL is not configured', () => {
    delete process.env.GITHUB_CALLBACK_URL;
    expect(() => getGitHubAuthUrl()).toThrow('GITHUB_CALLBACK_URL not configured');
  });
});

// ============================================================================
// exchangeCodeForToken
// ============================================================================

describe('exchangeCodeForToken', () => {
  it('exchanges code for access token', async () => {
    const mockResponse = {
      access_token: 'gho_test_token_123',
      token_type: 'bearer',
      scope: 'repo,user:email',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const result = await exchangeCodeForToken('test-code');
    expect(result.access_token).toBe('gho_test_token_123');
    expect(result.token_type).toBe('bearer');

    // Verify fetch was called with correct params
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://github.com/login/oauth/access_token',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/json',
        }),
      }),
    );
  });

  it('throws when GitHub returns non-OK status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Server Error', { status: 500 }),
    );

    await expect(exchangeCodeForToken('bad-code')).rejects.toThrow('GitHub token exchange failed: 500');
  });

  it('throws when GitHub returns an error in JSON body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'bad_verification_code', error_description: 'The code passed is incorrect' }), { status: 200 }),
    );

    await expect(exchangeCodeForToken('expired-code')).rejects.toThrow('The code passed is incorrect');
  });

  it('throws when GitHub credentials are not configured', async () => {
    delete process.env.GITHUB_CLIENT_ID;
    await expect(exchangeCodeForToken('code')).rejects.toThrow('GitHub OAuth credentials not configured');
  });
});

// ============================================================================
// fetchGitHubUser
// ============================================================================

describe('fetchGitHubUser', () => {
  it('fetches GitHub user profile', async () => {
    const mockUser = {
      id: 12345,
      login: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      avatar_url: 'https://avatars.githubusercontent.com/u/12345',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockUser), { status: 200 }),
    );

    const result = await fetchGitHubUser('gho_token');
    expect(result.id).toBe(12345);
    expect(result.login).toBe('testuser');
    expect(result.name).toBe('Test User');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer gho_token',
        }),
      }),
    );
  });

  it('throws when GitHub API returns non-OK status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 }),
    );

    await expect(fetchGitHubUser('bad-token')).rejects.toThrow('GitHub user fetch failed: 401');
  });
});

// ============================================================================
// fetchGitHubEmail
// ============================================================================

describe('fetchGitHubEmail', () => {
  it('returns primary verified email', async () => {
    const mockEmails = [
      { email: 'secondary@example.com', primary: false, verified: true },
      { email: 'primary@example.com', primary: true, verified: true },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockEmails), { status: 200 }),
    );

    const email = await fetchGitHubEmail('gho_token');
    expect(email).toBe('primary@example.com');
  });

  it('returns any verified email when no primary verified email exists', async () => {
    const mockEmails = [
      { email: 'unverified@example.com', primary: true, verified: false },
      { email: 'verified@example.com', primary: false, verified: true },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockEmails), { status: 200 }),
    );

    const email = await fetchGitHubEmail('gho_token');
    expect(email).toBe('verified@example.com');
  });

  it('returns null when no verified emails exist', async () => {
    const mockEmails = [
      { email: 'unverified@example.com', primary: true, verified: false },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockEmails), { status: 200 }),
    );

    const email = await fetchGitHubEmail('gho_token');
    expect(email).toBeNull();
  });

  it('returns null when API call fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 }),
    );

    const email = await fetchGitHubEmail('bad-token');
    expect(email).toBeNull();
  });
});
