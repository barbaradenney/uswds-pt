/**
 * GitHub Push Utilities Tests
 *
 * Tests for pushToGitHub (single-file), pushFilesToGitHub (multi-file atomic),
 * createGitHubBranch, and listUserRepos.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set ENCRYPTION_KEY before importing so decryptToken works
const TEST_ENCRYPTION_KEY = 'a]f9$kL2mN7pQ4rS8tU1vW3xY6zA0bC'; // 32-char raw string

beforeEach(() => {
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
});

afterEach(() => {
  delete process.env.ENCRYPTION_KEY;
  vi.restoreAllMocks();
});

import { encryptToken } from './github-oauth.js';
import {
  pushToGitHub,
  pushFilesToGitHub,
  createGitHubBranch,
  listUserRepos,
} from './github-push.js';

// ============================================================================
// Helpers
// ============================================================================

/** Create a valid encrypted token for test use. */
function makeEncryptedToken(plaintext = 'gho_test_token_abc123'): string {
  return encryptToken(plaintext);
}

/** Build a mock Response with JSON body. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Build a failed Response with optional JSON body. */
function errorResponse(status: number, body?: unknown): Response {
  const responseBody = body ? JSON.stringify(body) : `Error ${status}`;
  return new Response(responseBody, { status });
}

// ============================================================================
// pushToGitHub (single-file via Contents API)
// ============================================================================

describe('pushToGitHub', () => {
  const baseOptions = () => ({
    encryptedAccessToken: makeEncryptedToken(),
    owner: 'test-org',
    repo: 'test-repo',
    branch: 'main',
    filePath: 'prototypes/page.html',
    content: '<h1>Hello</h1>',
    commitMessage: 'Update prototype',
  });

  it('creates a new file when it does not exist yet', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      // Step 1: GET existing file -> 404 (doesn't exist)
      .mockResolvedValueOnce(errorResponse(404))
      // Step 2: PUT create file -> 201
      .mockResolvedValueOnce(
        jsonResponse({
          commit: { sha: 'abc123commit', html_url: 'https://github.com/test-org/test-repo/commit/abc123commit' },
          content: { html_url: 'https://github.com/test-org/test-repo/blob/main/prototypes/page.html' },
        }, 201),
      );

    const result = await pushToGitHub(baseOptions());

    expect(result.commitSha).toBe('abc123commit');
    expect(result.htmlUrl).toBe('https://github.com/test-org/test-repo/blob/main/prototypes/page.html');

    // The GET call should include the branch ref query param
    const getCall = fetchSpy.mock.calls[0];
    expect(getCall[0]).toContain('/contents/prototypes/page.html');
    expect(getCall[0]).toContain('ref=main');

    // The PUT call should NOT include sha (new file)
    const putCall = fetchSpy.mock.calls[1];
    const putBody = JSON.parse(putCall[1]!.body as string);
    expect(putBody.sha).toBeUndefined();
    expect(putBody.message).toBe('Update prototype');
    expect(putBody.branch).toBe('main');
    expect(putBody.content).toBe(Buffer.from('<h1>Hello</h1>', 'utf8').toString('base64'));
  });

  it('updates an existing file with its SHA', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      // Step 1: GET existing file -> 200 with SHA
      .mockResolvedValueOnce(jsonResponse({ sha: 'existing-file-sha-456' }))
      // Step 2: PUT update file -> 200
      .mockResolvedValueOnce(
        jsonResponse({
          commit: { sha: 'new-commit-sha', html_url: 'https://github.com/commit/new' },
          content: { html_url: 'https://github.com/blob/main/file.html' },
        }),
      );

    const result = await pushToGitHub(baseOptions());

    expect(result.commitSha).toBe('new-commit-sha');

    // The PUT body should include the existing SHA
    const putCall = fetchSpy.mock.calls[1];
    const putBody = JSON.parse(putCall[1]!.body as string);
    expect(putBody.sha).toBe('existing-file-sha-456');
  });

  it('throws when the PUT request fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      // GET existing -> 404
      .mockResolvedValueOnce(errorResponse(404))
      // PUT -> 422
      .mockResolvedValueOnce(
        jsonResponse({ message: 'Validation Failed' }, 422),
      );

    await expect(pushToGitHub(baseOptions())).rejects.toThrow(
      'GitHub push failed (422): Validation Failed',
    );
  });

  it('throws with "Unknown error" when PUT fails and body has no message', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(errorResponse(404))
      // PUT fails with non-JSON body
      .mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

    await expect(pushToGitHub(baseOptions())).rejects.toThrow(
      'GitHub push failed (500): Unknown error',
    );
  });

  it('handles network errors on GET gracefully (file treated as new)', async () => {
    vi.spyOn(globalThis, 'fetch')
      // GET throws network error
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      // PUT succeeds
      .mockResolvedValueOnce(
        jsonResponse({
          commit: { sha: 'commit-sha-after-net-err', html_url: 'https://github.com/commit' },
          content: { html_url: 'https://github.com/blob' },
        }, 201),
      );

    const result = await pushToGitHub(baseOptions());

    // The catch block swallows the GET error and proceeds as a create
    expect(result.commitSha).toBe('commit-sha-after-net-err');
  });

  it('propagates network errors on PUT', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(errorResponse(404))
      .mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(pushToGitHub(baseOptions())).rejects.toThrow('fetch failed');
  });

  it('URL-encodes owner, repo, and filePath segments', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(errorResponse(404))
      .mockResolvedValueOnce(
        jsonResponse({
          commit: { sha: 'sha1', html_url: 'https://url' },
          content: { html_url: 'https://url' },
        }),
      );

    await pushToGitHub({
      ...baseOptions(),
      owner: 'my org',
      repo: 'my repo',
      filePath: 'path with spaces/file name.html',
    });

    const getUrl = fetchSpy.mock.calls[0][0] as string;
    expect(getUrl).toContain('my%20org');
    expect(getUrl).toContain('my%20repo');
    expect(getUrl).toContain('path%20with%20spaces/file%20name.html');
  });

  it('decrypts the access token and uses it in Authorization header', async () => {
    const token = 'gho_super_secret_token';
    const encrypted = encryptToken(token);

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(errorResponse(404))
      .mockResolvedValueOnce(
        jsonResponse({
          commit: { sha: 's', html_url: 'u' },
          content: { html_url: 'u' },
        }),
      );

    await pushToGitHub({ ...baseOptions(), encryptedAccessToken: encrypted });

    // Both calls should have the decrypted token in Authorization header
    for (const call of fetchSpy.mock.calls) {
      const headers = call[1]!.headers as Record<string, string>;
      expect(headers.Authorization).toBe(`Bearer ${token}`);
    }
  });
});

// ============================================================================
// pushFilesToGitHub (multi-file atomic commit via Git Data API)
// ============================================================================

describe('pushFilesToGitHub', () => {
  const baseOptions = () => ({
    encryptedAccessToken: makeEncryptedToken(),
    owner: 'test-org',
    repo: 'test-repo',
    branch: 'prototype-1',
    files: [
      { path: '.uswds-pt/project-data.json', content: '{"version":1}' },
      { path: '.uswds-pt/page.html', content: '<h1>Page</h1>' },
    ],
    commitMessage: 'Update prototype files',
  });

  /**
   * Set up fetch mock for the full 6-step happy path.
   * Returns the spy for assertion.
   */
  function mockHappyPath() {
    return vi.spyOn(globalThis, 'fetch')
      // 1. GET ref -> HEAD SHA
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head-sha-001' } }))
      // 2. GET commit -> tree SHA
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'base-tree-sha-002' } }))
      // 3a. POST blob (file 1)
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob-sha-file1' }))
      // 3b. POST blob (file 2)
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob-sha-file2' }))
      // 4. POST tree
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree-sha-003' }))
      // 5. POST commit
      .mockResolvedValueOnce(
        jsonResponse({
          sha: 'new-commit-sha-004',
          html_url: 'https://github.com/test-org/test-repo/commit/new-commit-sha-004',
        }),
      )
      // 6. PATCH ref
      .mockResolvedValueOnce(jsonResponse({ ref: 'refs/heads/prototype-1' }));
  }

  // --------------------------------------------------------------------------
  // Happy path
  // --------------------------------------------------------------------------

  it('pushes multiple files in a single atomic commit (full 6-step flow)', async () => {
    const fetchSpy = mockHappyPath();

    const result = await pushFilesToGitHub(baseOptions());

    expect(result.commitSha).toBe('new-commit-sha-004');
    expect(result.htmlUrl).toBe('https://github.com/test-org/test-repo/commit/new-commit-sha-004');

    // Verify we made exactly 7 fetch calls (1+1+2 blobs+1+1+1)
    expect(fetchSpy).toHaveBeenCalledTimes(7);

    // Step 1: GET ref
    expect(fetchSpy.mock.calls[0][0]).toContain('/git/ref/heads/prototype-1');

    // Step 2: GET commit
    expect(fetchSpy.mock.calls[1][0]).toContain('/git/commits/head-sha-001');

    // Step 3: POST blobs
    expect(fetchSpy.mock.calls[2][0]).toContain('/git/blobs');
    expect(fetchSpy.mock.calls[3][0]).toContain('/git/blobs');

    // Step 4: POST tree
    const treeCall = fetchSpy.mock.calls[4];
    expect(treeCall[0]).toContain('/git/trees');
    const treeBody = JSON.parse(treeCall[1]!.body as string);
    expect(treeBody.base_tree).toBe('base-tree-sha-002');
    expect(treeBody.tree).toHaveLength(2);
    expect(treeBody.tree[0]).toEqual({
      path: '.uswds-pt/project-data.json',
      mode: '100644',
      type: 'blob',
      sha: 'blob-sha-file1',
    });
    expect(treeBody.tree[1]).toEqual({
      path: '.uswds-pt/page.html',
      mode: '100644',
      type: 'blob',
      sha: 'blob-sha-file2',
    });

    // Step 5: POST commit
    const commitCall = fetchSpy.mock.calls[5];
    expect(commitCall[0]).toContain('/git/commits');
    const commitBody = JSON.parse(commitCall[1]!.body as string);
    expect(commitBody.message).toBe('Update prototype files');
    expect(commitBody.tree).toBe('new-tree-sha-003');
    expect(commitBody.parents).toEqual(['head-sha-001']);

    // Step 6: PATCH ref
    const refCall = fetchSpy.mock.calls[6];
    expect(refCall[0]).toContain('/git/refs/heads/prototype-1');
    expect(refCall[1]!.method).toBe('PATCH');
    const refBody = JSON.parse(refCall[1]!.body as string);
    expect(refBody.sha).toBe('new-commit-sha-004');
  });

  it('sends base64-encoded blob content', async () => {
    const fetchSpy = mockHappyPath();
    const opts = baseOptions();
    opts.files = [{ path: 'test.txt', content: 'Hello World' }];

    // Need to adjust mock: only 1 blob instead of 2
    fetchSpy.mockReset();
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'tree' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob' })) // 1 blob
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-commit', html_url: 'https://url' }))
      .mockResolvedValueOnce(jsonResponse({ ref: 'done' }));

    await pushFilesToGitHub(opts);

    const blobCall = fetchSpy.mock.calls[2];
    const blobBody = JSON.parse(blobCall[1]!.body as string);
    expect(blobBody.content).toBe(Buffer.from('Hello World', 'utf8').toString('base64'));
    expect(blobBody.encoding).toBe('base64');
  });

  // --------------------------------------------------------------------------
  // Single file push
  // --------------------------------------------------------------------------

  it('handles single file push', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'tree' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob-single' })) // 1 blob only
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'commit-sha', html_url: 'https://url' }))
      .mockResolvedValueOnce(jsonResponse({ ref: 'done' }));

    const result = await pushFilesToGitHub({
      ...baseOptions(),
      files: [{ path: 'single-file.json', content: '{}' }],
    });

    expect(result.commitSha).toBe('commit-sha');
    // 6 calls total: ref + commit + 1 blob + tree + commit + update ref
    expect(fetchSpy).toHaveBeenCalledTimes(6);

    // Tree should have exactly 1 entry
    const treeBody = JSON.parse(fetchSpy.mock.calls[3][1]!.body as string);
    expect(treeBody.tree).toHaveLength(1);
    expect(treeBody.tree[0].path).toBe('single-file.json');
  });

  // --------------------------------------------------------------------------
  // Step 1 failure: GET ref
  // --------------------------------------------------------------------------

  it('throws when branch ref is not found (step 1 - GET ref fails)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(errorResponse(404));

    await expect(pushFilesToGitHub(baseOptions())).rejects.toThrow(
      'Failed to get branch ref (404)',
    );
  });

  it('throws when branch ref returns 403 (step 1)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(errorResponse(403));

    await expect(pushFilesToGitHub(baseOptions())).rejects.toThrow(
      'Failed to get branch ref (403)',
    );
  });

  // --------------------------------------------------------------------------
  // Step 2 failure: GET commit
  // --------------------------------------------------------------------------

  it('throws when commit lookup fails (step 2)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(errorResponse(404));

    await expect(pushFilesToGitHub(baseOptions())).rejects.toThrow(
      'Failed to get commit (404)',
    );
  });

  it('throws when commit lookup returns 500 (step 2)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(errorResponse(500));

    await expect(pushFilesToGitHub(baseOptions())).rejects.toThrow(
      'Failed to get commit (500)',
    );
  });

  // --------------------------------------------------------------------------
  // Step 3 failure: blob creation
  // --------------------------------------------------------------------------

  it('throws when blob creation fails for a file (step 3)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'tree' } }))
      // First blob succeeds, second fails
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob1' }))
      .mockResolvedValueOnce(errorResponse(422));

    await expect(pushFilesToGitHub(baseOptions())).rejects.toThrow(
      'Failed to create blob for .uswds-pt/page.html (422)',
    );
  });

  it('throws when the first blob creation fails (step 3)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'tree' } }))
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob2' }));

    await expect(pushFilesToGitHub(baseOptions())).rejects.toThrow(
      'Failed to create blob for .uswds-pt/project-data.json (500)',
    );
  });

  // --------------------------------------------------------------------------
  // Step 4 failure: tree creation
  // --------------------------------------------------------------------------

  it('throws when tree creation fails (step 4)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'tree' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob1' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob2' }))
      .mockResolvedValueOnce(errorResponse(422));

    await expect(pushFilesToGitHub(baseOptions())).rejects.toThrow(
      'Failed to create tree (422)',
    );
  });

  // --------------------------------------------------------------------------
  // Step 5 failure: commit creation
  // --------------------------------------------------------------------------

  it('throws when commit creation fails (step 5)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'tree' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob1' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob2' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree' }))
      .mockResolvedValueOnce(errorResponse(500));

    await expect(pushFilesToGitHub(baseOptions())).rejects.toThrow(
      'Failed to create commit (500)',
    );
  });

  // --------------------------------------------------------------------------
  // Step 6 failure: ref update
  // --------------------------------------------------------------------------

  it('throws when ref update fails (step 6)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'tree' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob1' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob2' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'commit', html_url: 'u' }))
      .mockResolvedValueOnce(errorResponse(422));

    await expect(pushFilesToGitHub(baseOptions())).rejects.toThrow(
      'Failed to update ref (422)',
    );
  });

  // --------------------------------------------------------------------------
  // Token decryption
  // --------------------------------------------------------------------------

  it('decrypts the token and passes it in the Authorization header', async () => {
    const plainToken = 'gho_my_actual_github_token';
    const encrypted = encryptToken(plainToken);

    const fetchSpy = mockHappyPath();

    await pushFilesToGitHub({ ...baseOptions(), encryptedAccessToken: encrypted });

    // Every fetch call should carry the decrypted token
    for (const call of fetchSpy.mock.calls) {
      const headers = call[1]!.headers as Record<string, string>;
      expect(headers.Authorization).toBe(`Bearer ${plainToken}`);
    }
  });

  it('throws when the encrypted token is invalid', async () => {
    await expect(
      pushFilesToGitHub({
        ...baseOptions(),
        encryptedAccessToken: 'not-a-valid-encrypted-token',
      }),
    ).rejects.toThrow('Invalid encrypted token format');
  });

  it('throws when ENCRYPTION_KEY is missing', async () => {
    // Build options while ENCRYPTION_KEY is still set, then delete it
    const opts = { ...baseOptions(), encryptedAccessToken: 'aabb:ccdd:eeff' };
    delete process.env.ENCRYPTION_KEY;

    await expect(
      pushFilesToGitHub(opts),
    ).rejects.toThrow('ENCRYPTION_KEY not configured');
  });

  // --------------------------------------------------------------------------
  // Empty files array
  // --------------------------------------------------------------------------

  it('creates an empty commit when files array is empty', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'tree' } }))
      // No blob calls because files is empty
      // POST tree (with empty tree array)
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree' }))
      // POST commit
      .mockResolvedValueOnce(jsonResponse({ sha: 'commit', html_url: 'https://url' }))
      // PATCH ref
      .mockResolvedValueOnce(jsonResponse({ ref: 'done' }));

    const result = await pushFilesToGitHub({
      ...baseOptions(),
      files: [],
    });

    expect(result.commitSha).toBe('commit');

    // 5 calls: ref + commit-lookup + tree + commit + update-ref (no blobs)
    expect(fetchSpy).toHaveBeenCalledTimes(5);

    // Tree should have empty array
    const treeBody = JSON.parse(fetchSpy.mock.calls[2][1]!.body as string);
    expect(treeBody.tree).toEqual([]);
  });

  // --------------------------------------------------------------------------
  // Network errors
  // --------------------------------------------------------------------------

  it('propagates network errors at step 1 (GET ref)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(pushFilesToGitHub(baseOptions())).rejects.toThrow('Failed to fetch');
  });

  it('propagates network errors at step 2 (GET commit)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockRejectedValueOnce(new TypeError('Network error'));

    await expect(pushFilesToGitHub(baseOptions())).rejects.toThrow('Network error');
  });

  it('propagates network errors during blob creation (step 3)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'tree' } }))
      .mockRejectedValueOnce(new TypeError('Connection reset'))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob2' }));

    await expect(pushFilesToGitHub(baseOptions())).rejects.toThrow('Connection reset');
  });

  it('propagates network errors at step 4 (POST tree)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'tree' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob1' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob2' }))
      .mockRejectedValueOnce(new TypeError('Socket hang up'));

    await expect(pushFilesToGitHub(baseOptions())).rejects.toThrow('Socket hang up');
  });

  it('propagates network errors at step 5 (POST commit)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'tree' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob1' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob2' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'tree-sha' }))
      .mockRejectedValueOnce(new TypeError('ECONNRESET'));

    await expect(pushFilesToGitHub(baseOptions())).rejects.toThrow('ECONNRESET');
  });

  it('propagates network errors at step 6 (PATCH ref)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'tree' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob1' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob2' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'tree-sha' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'commit', html_url: 'u' }))
      .mockRejectedValueOnce(new TypeError('ETIMEDOUT'));

    await expect(pushFilesToGitHub(baseOptions())).rejects.toThrow('ETIMEDOUT');
  });

  // --------------------------------------------------------------------------
  // URL encoding
  // --------------------------------------------------------------------------

  it('URL-encodes owner, repo, and branch in API URLs', async () => {
    const fetchSpy = mockHappyPath();

    await pushFilesToGitHub({
      ...baseOptions(),
      owner: 'my org',
      repo: 'my repo',
      branch: 'feature/special branch',
    });

    const refUrl = fetchSpy.mock.calls[0][0] as string;
    expect(refUrl).toContain('my%20org');
    expect(refUrl).toContain('my%20repo');
    expect(refUrl).toContain('feature%2Fspecial%20branch');

    // PATCH ref URL should also be encoded
    const patchRefUrl = fetchSpy.mock.calls[6][0] as string;
    expect(patchRefUrl).toContain('feature%2Fspecial%20branch');
  });

  // --------------------------------------------------------------------------
  // Many files
  // --------------------------------------------------------------------------

  it('handles push with many files (creates blobs in parallel)', async () => {
    const files = Array.from({ length: 5 }, (_, i) => ({
      path: `file-${i}.txt`,
      content: `Content ${i}`,
    }));

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'tree' } }));

    // 5 blob responses
    for (let i = 0; i < 5; i++) {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ sha: `blob-${i}` }));
    }

    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'commit', html_url: 'https://url' }))
      .mockResolvedValueOnce(jsonResponse({ ref: 'done' }));

    const result = await pushFilesToGitHub({
      ...baseOptions(),
      files,
    });

    expect(result.commitSha).toBe('commit');
    // 2 (ref+commit) + 5 (blobs) + 3 (tree+commit+ref) = 10
    expect(fetchSpy).toHaveBeenCalledTimes(10);

    // Verify tree has all 5 entries
    const treeBody = JSON.parse(fetchSpy.mock.calls[7][1]!.body as string);
    expect(treeBody.tree).toHaveLength(5);
  });

  // --------------------------------------------------------------------------
  // Content with special characters
  // --------------------------------------------------------------------------

  it('handles files with unicode and special characters in content', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'head' } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'tree' } }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'blob' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'new-tree' }))
      .mockResolvedValueOnce(jsonResponse({ sha: 'commit', html_url: 'https://url' }))
      .mockResolvedValueOnce(jsonResponse({ ref: 'done' }));

    const unicodeContent = '<h1>Hello World</h1><p>Special chars: &amp; < > " \' emoji: \u2603\uD83D\uDE00</p>';

    await pushFilesToGitHub({
      ...baseOptions(),
      files: [{ path: 'page.html', content: unicodeContent }],
    });

    const blobBody = JSON.parse(fetchSpy.mock.calls[2][1]!.body as string);
    expect(blobBody.content).toBe(Buffer.from(unicodeContent, 'utf8').toString('base64'));
  });
});

// ============================================================================
// createGitHubBranch
// ============================================================================

describe('createGitHubBranch', () => {
  const baseOptions = () => ({
    encryptedAccessToken: makeEncryptedToken(),
    owner: 'test-org',
    repo: 'test-repo',
    branchName: 'prototype-new',
    fromBranch: 'main',
  });

  it('creates a new branch from a source branch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      // GET source branch SHA
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'source-sha-123' } }))
      // POST create ref
      .mockResolvedValueOnce(jsonResponse({ ref: 'refs/heads/prototype-new' }, 201));

    await createGitHubBranch(baseOptions());

    // Verify GET call
    const getUrl = fetchSpy.mock.calls[0][0] as string;
    expect(getUrl).toContain('/git/ref/heads/main');

    // Verify POST call
    const postCall = fetchSpy.mock.calls[1];
    const postUrl = postCall[0] as string;
    expect(postUrl).toContain('/git/refs');
    const postBody = JSON.parse(postCall[1]!.body as string);
    expect(postBody.ref).toBe('refs/heads/prototype-new');
    expect(postBody.sha).toBe('source-sha-123');
  });

  it('silently succeeds when branch already exists (422)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'sha' } }))
      .mockResolvedValueOnce(
        jsonResponse({ message: 'Reference already exists' }, 422),
      );

    // Should NOT throw
    await expect(createGitHubBranch(baseOptions())).resolves.toBeUndefined();
  });

  it('throws when source branch is not found', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(errorResponse(404));

    await expect(createGitHubBranch(baseOptions())).rejects.toThrow(
      'Failed to get source branch: 404',
    );
  });

  it('throws when branch creation fails with non-422 error', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'sha' } }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Forbidden' }, 403));

    await expect(createGitHubBranch(baseOptions())).rejects.toThrow(
      'Failed to create branch (403): Forbidden',
    );
  });

  it('throws with "Unknown" when create response has no message', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'sha' } }))
      // Non-JSON error body
      .mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

    await expect(createGitHubBranch(baseOptions())).rejects.toThrow(
      'Failed to create branch (500): Unknown',
    );
  });

  it('decrypts the token and uses it in Authorization header', async () => {
    const plainToken = 'gho_branch_token';
    const encrypted = encryptToken(plainToken);

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'sha' } }))
      .mockResolvedValueOnce(jsonResponse({}, 201));

    await createGitHubBranch({ ...baseOptions(), encryptedAccessToken: encrypted });

    for (const call of fetchSpy.mock.calls) {
      const headers = call[1]!.headers as Record<string, string>;
      expect(headers.Authorization).toBe(`Bearer ${plainToken}`);
    }
  });

  it('URL-encodes owner, repo, and branch names', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ object: { sha: 'sha' } }))
      .mockResolvedValueOnce(jsonResponse({}, 201));

    await createGitHubBranch({
      ...baseOptions(),
      owner: 'my org',
      repo: 'my repo',
      fromBranch: 'branch with spaces',
    });

    const getUrl = fetchSpy.mock.calls[0][0] as string;
    expect(getUrl).toContain('my%20org');
    expect(getUrl).toContain('my%20repo');
    expect(getUrl).toContain('branch%20with%20spaces');
  });

  it('propagates network errors', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('DNS resolution failed'));

    await expect(createGitHubBranch(baseOptions())).rejects.toThrow(
      'DNS resolution failed',
    );
  });
});

// ============================================================================
// listUserRepos
// ============================================================================

describe('listUserRepos', () => {
  it('returns the list of repositories', async () => {
    const mockRepos = [
      {
        full_name: 'test-org/repo-1',
        name: 'repo-1',
        owner: { login: 'test-org' },
        default_branch: 'main',
        private: false,
        html_url: 'https://github.com/test-org/repo-1',
      },
      {
        full_name: 'test-org/repo-2',
        name: 'repo-2',
        owner: { login: 'test-org' },
        default_branch: 'develop',
        private: true,
        html_url: 'https://github.com/test-org/repo-2',
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(mockRepos),
    );

    const repos = await listUserRepos(makeEncryptedToken());

    expect(repos).toHaveLength(2);
    expect(repos[0].full_name).toBe('test-org/repo-1');
    expect(repos[1].private).toBe(true);
  });

  it('calls the correct GitHub API endpoint with auth header', async () => {
    const plainToken = 'gho_list_repos_token';
    const encrypted = encryptToken(plainToken);

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse([]),
    );

    await listUserRepos(encrypted);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe(
      'https://api.github.com/user/repos?sort=pushed&per_page=100&affiliation=owner,collaborator,organization_member',
    );
    const headers = opts!.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${plainToken}`);
    expect(headers.Accept).toBe('application/vnd.github.v3+json');
  });

  it('returns empty array when user has no repos', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse([]),
    );

    const repos = await listUserRepos(makeEncryptedToken());
    expect(repos).toEqual([]);
  });

  it('throws when API returns non-OK status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      errorResponse(401),
    );

    await expect(listUserRepos(makeEncryptedToken())).rejects.toThrow(
      'Failed to list repos: 401',
    );
  });

  it('throws when API returns 403 (rate limited or forbidden)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      errorResponse(403),
    );

    await expect(listUserRepos(makeEncryptedToken())).rejects.toThrow(
      'Failed to list repos: 403',
    );
  });

  it('propagates network errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new TypeError('fetch failed'),
    );

    await expect(listUserRepos(makeEncryptedToken())).rejects.toThrow(
      'fetch failed',
    );
  });

  it('throws when encrypted token is invalid', async () => {
    await expect(listUserRepos('bad-token')).rejects.toThrow(
      'Invalid encrypted token format',
    );
  });
});
