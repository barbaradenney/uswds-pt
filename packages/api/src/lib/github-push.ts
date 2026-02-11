/**
 * GitHub Push Utilities
 *
 * Handles pushing prototype data to GitHub repositories using the GitHub API.
 * - pushToGitHub: Single-file push via Contents API (legacy, kept for reference)
 * - pushFilesToGitHub: Multi-file atomic commit via Git Data API
 */

import { decryptToken } from './github-oauth.js';

// ============================================================================
// Types
// ============================================================================

interface PushOptions {
  encryptedAccessToken: string;
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  content: string;
  commitMessage: string;
}

interface PushResult {
  commitSha: string;
  htmlUrl: string;
}

interface GitHubRepo {
  full_name: string;
  name: string;
  owner: { login: string };
  default_branch: string;
  private: boolean;
  html_url: string;
}

// ============================================================================
// Push to GitHub
// ============================================================================

/**
 * Push (create or update) a file in a GitHub repository
 */
export async function pushToGitHub(options: PushOptions): Promise<PushResult> {
  const { encryptedAccessToken, owner, repo, branch, filePath, content, commitMessage } = options;
  const accessToken = decryptToken(encryptedAccessToken);

  // Get the current file SHA (needed for updates, not for creates)
  let existingSha: string | undefined;
  try {
    const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
    const getResponse = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    if (getResponse.ok) {
      const data = await getResponse.json() as { sha: string };
      existingSha = data.sha;
    }
  } catch {
    // File doesn't exist yet — that's fine, we'll create it
  }

  // Create or update file
  const body: Record<string, string> = {
    message: commitMessage,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch,
  };
  if (existingSha) {
    body.sha = existingSha;
  }

  const encodedPutPath = filePath.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPutPath}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `GitHub push failed (${response.status}): ${(errorData as Record<string, string>).message || 'Unknown error'}`
    );
  }

  const result = await response.json() as {
    commit: { sha: string; html_url: string };
    content: { html_url: string };
  };

  return {
    commitSha: result.commit.sha,
    htmlUrl: result.content.html_url,
  };
}

// ============================================================================
// Multi-file push via Git Data API
// ============================================================================

interface FileToCommit {
  path: string;    // e.g. ".uswds-pt/project-data.json"
  content: string;
}

interface MultiFilePushOptions {
  encryptedAccessToken: string;
  owner: string;
  repo: string;
  branch: string;
  files: FileToCommit[];
  commitMessage: string;
}

/**
 * Push multiple files in a single atomic commit using the Git Data API.
 *
 * Flow: get HEAD ref → get tree SHA → create blobs (parallel) → create tree → create commit → update ref
 */
export async function pushFilesToGitHub(options: MultiFilePushOptions): Promise<PushResult> {
  const { encryptedAccessToken, owner, repo, branch, files, commitMessage } = options;
  const accessToken = decryptToken(encryptedAccessToken);

  const baseUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  // 1. Get current HEAD commit SHA
  const refResponse = await fetch(
    `${baseUrl}/git/ref/heads/${encodeURIComponent(branch)}`,
    { headers }
  );
  if (!refResponse.ok) {
    throw new Error(`Failed to get branch ref (${refResponse.status})`);
  }
  const refData = await refResponse.json() as { object: { sha: string } };
  const headSha = refData.object.sha;

  // 2. Get the HEAD commit's tree SHA
  const commitResponse = await fetch(
    `${baseUrl}/git/commits/${headSha}`,
    { headers }
  );
  if (!commitResponse.ok) {
    throw new Error(`Failed to get commit (${commitResponse.status})`);
  }
  const commitData = await commitResponse.json() as { tree: { sha: string } };
  const baseTreeSha = commitData.tree.sha;

  // 3. Create blobs in parallel
  const blobShas = await Promise.all(
    files.map(async (file) => {
      const blobResponse = await fetch(`${baseUrl}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: Buffer.from(file.content, 'utf8').toString('base64'),
          encoding: 'base64',
        }),
      });
      if (!blobResponse.ok) {
        throw new Error(`Failed to create blob for ${file.path} (${blobResponse.status})`);
      }
      const blobData = await blobResponse.json() as { sha: string };
      return { path: file.path, sha: blobData.sha };
    })
  );

  // 4. Create tree with base_tree to preserve existing files
  const treeResponse = await fetch(`${baseUrl}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: blobShas.map(({ path, sha }) => ({
        path,
        mode: '100644',
        type: 'blob',
        sha,
      })),
    }),
  });
  if (!treeResponse.ok) {
    throw new Error(`Failed to create tree (${treeResponse.status})`);
  }
  const treeData = await treeResponse.json() as { sha: string };

  // 5. Create commit
  const newCommitResponse = await fetch(`${baseUrl}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: commitMessage,
      tree: treeData.sha,
      parents: [headSha],
    }),
  });
  if (!newCommitResponse.ok) {
    throw new Error(`Failed to create commit (${newCommitResponse.status})`);
  }
  const newCommitData = await newCommitResponse.json() as { sha: string; html_url: string };

  // 6. Update branch ref to point to new commit
  const updateRefResponse = await fetch(
    `${baseUrl}/git/refs/heads/${encodeURIComponent(branch)}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ sha: newCommitData.sha }),
    }
  );
  if (!updateRefResponse.ok) {
    throw new Error(`Failed to update ref (${updateRefResponse.status})`);
  }

  return {
    commitSha: newCommitData.sha,
    htmlUrl: newCommitData.html_url,
  };
}

/**
 * Create a branch on GitHub from an existing branch
 */
export async function createGitHubBranch(options: {
  encryptedAccessToken: string;
  owner: string;
  repo: string;
  branchName: string;
  fromBranch: string;
}): Promise<void> {
  const { encryptedAccessToken, owner, repo, branchName, fromBranch } = options;
  const accessToken = decryptToken(encryptedAccessToken);

  // Get the SHA of the source branch
  const refResponse = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(fromBranch)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!refResponse.ok) {
    throw new Error(`Failed to get source branch: ${refResponse.status}`);
  }

  const refData = await refResponse.json() as { object: { sha: string } };

  // Create the new branch ref
  const createResponse = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha,
      }),
    }
  );

  if (!createResponse.ok) {
    const err = await createResponse.json().catch(() => ({}));
    // 422 = branch already exists, which is fine
    if (createResponse.status !== 422) {
      throw new Error(
        `Failed to create branch (${createResponse.status}): ${(err as Record<string, string>).message || 'Unknown'}`
      );
    }
  }
}

/**
 * List repositories accessible to the authenticated user
 */
export async function listUserRepos(encryptedAccessToken: string): Promise<GitHubRepo[]> {
  const accessToken = decryptToken(encryptedAccessToken);

  const response = await fetch(
    'https://api.github.com/user/repos?sort=pushed&per_page=100&affiliation=owner,collaborator,organization_member',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list repos: ${response.status}`);
  }

  return response.json() as Promise<GitHubRepo[]>;
}
