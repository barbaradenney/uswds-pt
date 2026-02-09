/**
 * GitHub Connect Dialog
 *
 * Modal for connecting a prototype to a GitHub repository.
 * Lists user's repos, lets them select one + configure the file path,
 * and shows connection status / push controls.
 */

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, apiGet, apiPost } from '../lib/api';

interface GitHubRepo {
  fullName: string;
  name: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
}

interface GitHubConnection {
  connected: boolean;
  repoOwner?: string;
  repoName?: string;
  defaultBranch?: string;
  filePath?: string;
  lastPushedAt?: string;
  lastPushedVersion?: number;
  lastPushedCommitSha?: string;
}

interface GitHubConnectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
}

export function GitHubConnectDialog({ isOpen, onClose, slug }: GitHubConnectDialogProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingConnection, setIsLoadingConnection] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<{ commitSha: string; htmlUrl: string; branch: string } | null>(null);

  // Form state for connecting
  const [selectedRepo, setSelectedRepo] = useState('');
  const [filePath, setFilePath] = useState('prototype.html');
  const [repoSearch, setRepoSearch] = useState('');

  const fetchConnection = useCallback(async () => {
    setIsLoadingConnection(true);
    const result = await apiGet<GitHubConnection>(API_ENDPOINTS.GITHUB_CONNECTION(slug));
    if (result.success && result.data) {
      setConnection(result.data);
    } else {
      setConnection(null);
    }
    setIsLoadingConnection(false);
  }, [slug]);

  const fetchRepos = useCallback(async () => {
    setIsLoadingRepos(true);
    setError(null);
    const result = await apiGet<{ repos: GitHubRepo[] }>(API_ENDPOINTS.GITHUB_REPOS);
    if (result.success && result.data) {
      setRepos(result.data.repos);
    } else {
      setError(result.error || 'Failed to load repositories');
    }
    setIsLoadingRepos(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Clear stale state from previous open
      setError(null);
      setPushResult(null);
      setSelectedRepo('');
      setRepoSearch('');
      fetchConnection();
      fetchRepos();
    }
  }, [isOpen, fetchConnection, fetchRepos]);

  const handleConnect = async () => {
    if (!selectedRepo) return;
    setIsConnecting(true);
    setError(null);

    const [owner, repo] = selectedRepo.split('/');
    const selectedRepoData = repos.find((r) => r.fullName === selectedRepo);
    const result = await apiPost(
      API_ENDPOINTS.GITHUB_CONNECT(slug),
      { owner, repo, filePath, defaultBranch: selectedRepoData?.defaultBranch },
    );

    if (result.success) {
      await fetchConnection();
      setSelectedRepo('');
    } else {
      setError(result.error || 'Failed to connect');
    }
    setIsConnecting(false);
  };

  const handlePush = async () => {
    setIsPushing(true);
    setError(null);
    setPushResult(null);

    const result = await apiPost<{ commitSha: string; htmlUrl: string; branch: string }>(
      API_ENDPOINTS.GITHUB_PUSH(slug),
    );

    if (result.success && result.data) {
      setPushResult(result.data);
      await fetchConnection();
    } else {
      setError(result.error || 'Push failed');
    }
    setIsPushing(false);
  };

  const handleDisconnect = async () => {
    setError(null);
    const result = await apiPost(API_ENDPOINTS.GITHUB_DISCONNECT(slug));
    if (result.success) {
      setConnection({ connected: false });
      setPushResult(null);
    } else {
      setError(result.error || 'Failed to disconnect');
    }
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredRepos = repoSearch
    ? repos.filter((r) => r.fullName.toLowerCase().includes(repoSearch.toLowerCase()))
    : repos;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-label="GitHub Integration"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          width: '500px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: '1.125rem' }}>GitHub Integration</h3>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            padding: '8px 12px',
            marginBottom: '12px',
            fontSize: '0.875rem',
            color: '#991b1b',
          }}>
            {error}
          </div>
        )}

        {isLoadingConnection ? (
          <p style={{ fontSize: '0.875rem', color: '#71767a' }}>Loading...</p>
        ) : connection?.connected ? (
          /* Connected state */
          <div>
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ margin: '0 0 4px', fontSize: '0.875rem', fontWeight: 500 }}>
                Connected to{' '}
                <a
                  href={`https://github.com/${connection.repoOwner}/${connection.repoName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#1a4480' }}
                >
                  {connection.repoOwner}/{connection.repoName}
                </a>
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#71767a' }}>
                File: {connection.filePath}
                {connection.lastPushedAt && (
                  <> &middot; Last pushed: {new Date(connection.lastPushedAt).toLocaleString()}</>
                )}
              </p>
              {connection.lastPushedCommitSha && (
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem' }}>
                  <a
                    href={`https://github.com/${connection.repoOwner}/${connection.repoName}/commit/${connection.lastPushedCommitSha}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1a4480' }}
                  >
                    View last commit
                  </a>
                </p>
              )}
            </div>

            {pushResult && (
              <div style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '4px',
                padding: '8px 12px',
                marginBottom: '12px',
                fontSize: '0.8125rem',
              }}>
                Pushed to <strong>{pushResult.branch}</strong> &middot;{' '}
                <a
                  href={pushResult.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#1a4480' }}
                >
                  View on GitHub
                </a>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={handlePush}
                disabled={isPushing}
                style={{ fontSize: '0.875rem' }}
              >
                {isPushing ? 'Pushing...' : 'Push Now'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleDisconnect}
                style={{ fontSize: '0.875rem' }}
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          /* Not connected — show repo picker */
          <div>
            <p style={{ margin: '0 0 12px', fontSize: '0.875rem', color: '#71767a' }}>
              Connect a GitHub repository to automatically push your prototype HTML on save.
            </p>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', fontWeight: 500 }}>
                Repository
              </label>
              <input
                type="text"
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="Search repositories..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                  marginBottom: '4px',
                }}
              />
              {isLoadingRepos ? (
                <p style={{ fontSize: '0.8125rem', color: '#71767a' }}>Loading repos...</p>
              ) : (
                <div style={{
                  maxHeight: '200px',
                  overflow: 'auto',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                }}>
                  {filteredRepos.map((repo) => (
                    <div
                      key={repo.fullName}
                      onClick={() => setSelectedRepo(repo.fullName)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        backgroundColor: selectedRepo === repo.fullName ? '#e7f3ff' : 'transparent',
                        borderBottom: '1px solid #f0f0f0',
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{repo.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#71767a' }}>
                        {repo.private ? 'Private' : 'Public'} &middot; {repo.defaultBranch}
                      </div>
                    </div>
                  ))}
                  {filteredRepos.length === 0 && (
                    <p style={{ padding: '12px', fontSize: '0.8125rem', color: '#71767a', margin: 0 }}>
                      {repos.length === 0 ? 'No repositories found' : 'No matches'}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', fontWeight: 500 }}>
                File path
              </label>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="prototype.html"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConnect}
                disabled={!selectedRepo || isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}

        {/* Close button (always visible) */}
        {connection?.connected && (
          <div style={{ marginTop: '16px', textAlign: 'right' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
