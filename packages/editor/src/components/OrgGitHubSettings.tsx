/**
 * Org-Level GitHub Settings
 *
 * Modal dialog for connecting/disconnecting an organization to a GitHub repo.
 * All prototypes in the org auto-push to the connected repo on save.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_ENDPOINTS, apiGet, apiPost, apiDelete } from '../lib/api';

interface GitHubRepo {
  fullName: string;
  name: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
}

interface OrgConnection {
  connected: boolean;
  repoOwner?: string;
  repoName?: string;
  defaultBranch?: string;
}

interface OrgGitHubSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  hasGitHubLinked: boolean;
}

export function OrgGitHubSettings({ isOpen, onClose, orgId, hasGitHubLinked }: OrgGitHubSettingsProps) {
  const [connection, setConnection] = useState<OrgConnection | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoadingConnection, setIsLoadingConnection] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchConnection = useCallback(async () => {
    setIsLoadingConnection(true);
    setError(null);
    const result = await apiGet<OrgConnection>(
      API_ENDPOINTS.GITHUB_ORG_CONNECTION(orgId),
      'Failed to fetch GitHub connection'
    );
    if (result.success && result.data) {
      setConnection(result.data);
    } else {
      setError(result.error || null);
    }
    setIsLoadingConnection(false);
  }, [orgId]);

  const fetchRepos = useCallback(async () => {
    setIsLoadingRepos(true);
    const result = await apiGet<{ repos: GitHubRepo[] }>(
      API_ENDPOINTS.GITHUB_REPOS,
      'Failed to fetch GitHub repositories'
    );
    if (result.success && result.data) {
      setRepos(result.data.repos);
    } else if (!result.success) {
      setError(result.error || 'Failed to fetch repositories');
    }
    setIsLoadingRepos(false);
  }, []);

  useEffect(() => {
    if (isOpen && orgId) {
      fetchConnection();
      if (hasGitHubLinked) {
        fetchRepos();
      }
    }
  }, [isOpen, orgId, hasGitHubLinked, fetchConnection, fetchRepos]);

  // Escape key handling
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSelectedRepo('');
      setShowDisconnectConfirm(false);
    }
  }, [isOpen]);

  const handleConnect = async () => {
    if (!selectedRepo) return;
    const repo = repos.find(r => r.fullName === selectedRepo);
    if (!repo) return;

    setIsConnecting(true);
    setError(null);
    const result = await apiPost(
      API_ENDPOINTS.GITHUB_ORG_CONNECT(orgId),
      { owner: repo.owner, repo: repo.name, defaultBranch: repo.defaultBranch },
      'Failed to connect repository'
    );
    if (result.success) {
      setConnection({
        connected: true,
        repoOwner: repo.owner,
        repoName: repo.name,
        defaultBranch: repo.defaultBranch,
      });
      setSelectedRepo('');
    } else {
      setError(result.error || 'Failed to connect');
    }
    setIsConnecting(false);
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setError(null);
    const result = await apiDelete(
      API_ENDPOINTS.GITHUB_ORG_DISCONNECT(orgId),
      'Failed to disconnect repository'
    );
    if (result.success) {
      setConnection({ connected: false });
      setShowDisconnectConfirm(false);
    } else {
      setError(result.error || 'Failed to disconnect');
    }
    setIsDisconnecting(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="github-settings-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className="modal-content"
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '480px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 id="github-settings-title" style={{ margin: 0, fontSize: '1.25rem' }}>GitHub Integration</h2>
          <button
            className="btn"
            onClick={onClose}
            aria-label="Close"
            style={{ padding: '4px 8px', minWidth: 'auto' }}
          >
            &times;
          </button>
        </div>

        <p style={{ color: 'var(--color-base-light, #71767a)', fontSize: '0.875rem', marginBottom: '16px' }}>
          Connect a GitHub repository to auto-push all prototypes on save.
          Each prototype pushes to its own branch ({`uswds-pt/<name>`}).
        </p>

        {error && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#fce4e4',
            borderRadius: '4px',
            color: '#b50909',
            fontSize: '0.875rem',
            marginBottom: '12px',
          }}>
            {error}
          </div>
        )}

        {isLoadingConnection ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div className="loading-spinner" />
            <p style={{ color: 'var(--color-base-light)', marginTop: '8px' }}>Loading...</p>
          </div>
        ) : connection?.connected ? (
          <div>
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-success-lighter, #ecf3ec)',
              borderRadius: '4px',
              marginBottom: '16px',
            }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Connected</div>
              <div style={{ fontSize: '0.875rem' }}>
                <a
                  href={`https://github.com/${connection.repoOwner}/${connection.repoName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {connection.repoOwner}/{connection.repoName}
                </a>
                <span style={{ color: 'var(--color-base-light)', marginLeft: '8px' }}>
                  (default: {connection.defaultBranch})
                </span>
              </div>
            </div>
            {showDisconnectConfirm ? (
              <div style={{
                padding: '12px',
                backgroundColor: '#fce4e4',
                borderRadius: '4px',
              }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.875rem', color: '#b50909' }}>
                  Disconnect GitHub? Prototypes will no longer auto-push.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    style={{ flex: 1, color: '#b50909', borderColor: '#b50909' }}
                  >
                    {isDisconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowDisconnectConfirm(false)}
                    disabled={isDisconnecting}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={() => setShowDisconnectConfirm(true)}
                style={{ width: '100%' }}
              >
                Disconnect Repository
              </button>
            )}
          </div>
        ) : !hasGitHubLinked ? (
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--color-base-lightest, #f0f0f0)',
            borderRadius: '4px',
            textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>GitHub account not linked</p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-base-light)' }}>
              Sign in with GitHub first to connect a repository.
            </p>
          </div>
        ) : (
          <div>
            <label
              htmlFor="repo-select"
              style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '4px' }}
            >
              Select a repository
            </label>
            <select
              id="repo-select"
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              disabled={isLoadingRepos || isConnecting}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '0.875rem',
                marginBottom: '12px',
              }}
            >
              <option value="">
                {isLoadingRepos ? 'Loading repositories...' : '-- Choose a repo --'}
              </option>
              {repos.map(repo => (
                <option key={repo.fullName} value={repo.fullName}>
                  {repo.fullName} {repo.private ? '(private)' : ''}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={!selectedRepo || isConnecting}
              style={{ width: '100%' }}
            >
              {isConnecting ? 'Connecting...' : 'Connect Repository'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
