/**
 * Team-Level GitHub Settings
 *
 * Inline sections for the Team Settings page — one for the prototype repo
 * connection and one for the developer handoff repo connection.
 */

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, apiGet, apiPost, apiDelete } from '../lib/api';

interface GitHubRepo {
  fullName: string;
  name: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
}

interface TeamConnection {
  connected: boolean;
  repoOwner?: string;
  repoName?: string;
  defaultBranch?: string;
}

interface TeamGitHubSettingsProps {
  teamId: string;
  hasGitHubLinked: boolean;
}

export function TeamGitHubSettings({ teamId, hasGitHubLinked }: TeamGitHubSettingsProps) {
  const [connection, setConnection] = useState<TeamConnection | null>(null);
  const [handoffConnection, setHandoffConnection] = useState<TeamConnection | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoadingConnection, setIsLoadingConnection] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnectingHandoff, setIsConnectingHandoff] = useState(false);
  const [isDisconnectingHandoff, setIsDisconnectingHandoff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [selectedHandoffRepo, setSelectedHandoffRepo] = useState<string>('');
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showHandoffDisconnectConfirm, setShowHandoffDisconnectConfirm] = useState(false);

  const fetchConnection = useCallback(async () => {
    setIsLoadingConnection(true);
    setError(null);

    const [connResult, handoffResult] = await Promise.all([
      apiGet<TeamConnection>(
        API_ENDPOINTS.GITHUB_TEAM_CONNECTION(teamId),
        'Failed to fetch GitHub connection'
      ),
      apiGet<TeamConnection>(
        API_ENDPOINTS.GITHUB_TEAM_HANDOFF(teamId),
        'Failed to fetch handoff connection'
      ),
    ]);

    if (connResult.success && connResult.data) {
      setConnection(connResult.data);
    } else {
      setError(connResult.error || null);
    }

    if (handoffResult.success && handoffResult.data) {
      setHandoffConnection(handoffResult.data);
    }

    setIsLoadingConnection(false);
  }, [teamId]);

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
    if (teamId) {
      fetchConnection();
      if (hasGitHubLinked) {
        fetchRepos();
      }
    }
  }, [teamId, hasGitHubLinked, fetchConnection, fetchRepos]);

  const handleConnect = async () => {
    if (!selectedRepo) return;
    const repo = repos.find(r => r.fullName === selectedRepo);
    if (!repo) return;

    setIsConnecting(true);
    setError(null);
    const result = await apiPost(
      API_ENDPOINTS.GITHUB_TEAM_CONNECT(teamId),
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
      API_ENDPOINTS.GITHUB_TEAM_DISCONNECT(teamId),
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

  const handleHandoffConnect = async () => {
    if (!selectedHandoffRepo) return;
    const repo = repos.find(r => r.fullName === selectedHandoffRepo);
    if (!repo) return;

    setIsConnectingHandoff(true);
    setError(null);
    const result = await apiPost(
      API_ENDPOINTS.GITHUB_TEAM_HANDOFF_CONNECT(teamId),
      { owner: repo.owner, repo: repo.name, defaultBranch: repo.defaultBranch },
      'Failed to connect handoff repository'
    );
    if (result.success) {
      setHandoffConnection({
        connected: true,
        repoOwner: repo.owner,
        repoName: repo.name,
        defaultBranch: repo.defaultBranch,
      });
      setSelectedHandoffRepo('');
    } else {
      setError(result.error || 'Failed to connect');
    }
    setIsConnectingHandoff(false);
  };

  const handleHandoffDisconnect = async () => {
    setIsDisconnectingHandoff(true);
    setError(null);
    const result = await apiDelete(
      API_ENDPOINTS.GITHUB_TEAM_HANDOFF_DISCONNECT(teamId),
      'Failed to disconnect handoff repository'
    );
    if (result.success) {
      setHandoffConnection({ connected: false });
      setShowHandoffDisconnectConfirm(false);
    } else {
      setError(result.error || 'Failed to disconnect');
    }
    setIsDisconnectingHandoff(false);
  };

  const errorBanner = error && (
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
  );

  const notLinkedMessage = !hasGitHubLinked && (
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
  );

  const repoSelect = (
    id: string,
    value: string,
    onChange: (v: string) => void,
    disabled: boolean,
  ) => (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
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
      {repos.filter(repo => !repo.private).map(repo => (
        <option key={repo.fullName} value={repo.fullName}>
          {repo.fullName}
        </option>
      ))}
    </select>
  );

  return (
    <>
      {/* Prototype Repository Section */}
      <div className="team-settings-section">
        <h2>
          Prototype Repository{' '}
          <span style={{ fontWeight: 400, fontSize: '0.875rem', color: 'var(--color-base-light, #71767a)' }}>
            (optional)
          </span>
        </h2>
        <p style={{ color: 'var(--color-base-light, #71767a)', fontSize: '0.875rem', marginBottom: '12px' }}>
          Push full prototype data (HTML + GrapesJS project) to GitHub on every save.
          Each prototype pushes to its own <code>uswds-pt/&lt;name&gt;</code> branch.
        </p>

        {errorBanner}

        {isLoadingConnection ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div className="loading-spinner" />
          </div>
        ) : connection?.connected ? (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}>
              <span style={{
                fontSize: '0.875rem',
                color: 'var(--color-success-darker, #4d8055)',
                backgroundColor: 'var(--color-success-lighter, #ecf3ec)',
                padding: '6px 10px',
                borderRadius: '4px',
              }}>
                Connected to{' '}
                <a
                  href={`https://github.com/${connection.repoOwner}/${connection.repoName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'underline' }}
                >
                  {connection.repoOwner}/{connection.repoName}
                </a>
              </span>
            </div>
            {showDisconnectConfirm ? (
              <div style={{
                padding: '12px',
                backgroundColor: '#fce4e4',
                borderRadius: '4px',
              }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.875rem', color: '#b50909' }}>
                  Disconnect? Prototypes will no longer push to this repo.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    style={{ color: '#b50909', borderColor: '#b50909' }}
                  >
                    {isDisconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowDisconnectConfirm(false)}
                    disabled={isDisconnecting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={() => setShowDisconnectConfirm(true)}
              >
                Disconnect Repository
              </button>
            )}
          </div>
        ) : notLinkedMessage || (
          <div>
            <label
              htmlFor="repo-select"
              style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '4px' }}
            >
              Select a repository
            </label>
            {repoSelect('repo-select', selectedRepo, setSelectedRepo, isLoadingRepos || isConnecting)}
            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={!selectedRepo || isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect Repository'}
            </button>
          </div>
        )}
      </div>

      {/* Developer Handoff Repository Section */}
      <div className="team-settings-section">
        <h2>
          Developer Handoff Repository{' '}
          <span style={{ fontWeight: 400, fontSize: '0.875rem', color: 'var(--color-base-light, #71767a)' }}>
            (optional)
          </span>
        </h2>
        <p style={{ color: 'var(--color-base-light, #71767a)', fontSize: '0.875rem', marginBottom: '12px' }}>
          Hand off clean, production-ready HTML (no editor metadata) to a separate repo.
          Each prototype pushes to its own <code>handoff/&lt;name&gt;</code> branch.
        </p>

        {isLoadingConnection ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div className="loading-spinner" />
          </div>
        ) : handoffConnection?.connected ? (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}>
              <span style={{
                fontSize: '0.875rem',
                color: 'var(--color-success-darker, #4d8055)',
                backgroundColor: 'var(--color-success-lighter, #ecf3ec)',
                padding: '6px 10px',
                borderRadius: '4px',
              }}>
                Connected to{' '}
                <a
                  href={`https://github.com/${handoffConnection.repoOwner}/${handoffConnection.repoName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'underline' }}
                >
                  {handoffConnection.repoOwner}/{handoffConnection.repoName}
                </a>
              </span>
            </div>
            {showHandoffDisconnectConfirm ? (
              <div style={{
                padding: '12px',
                backgroundColor: '#fce4e4',
                borderRadius: '4px',
              }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.875rem', color: '#b50909' }}>
                  Disconnect? You will no longer be able to hand off prototypes to this repo.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleHandoffDisconnect}
                    disabled={isDisconnectingHandoff}
                    style={{ color: '#b50909', borderColor: '#b50909' }}
                  >
                    {isDisconnectingHandoff ? 'Disconnecting...' : 'Yes, Disconnect'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowHandoffDisconnectConfirm(false)}
                    disabled={isDisconnectingHandoff}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={() => setShowHandoffDisconnectConfirm(true)}
              >
                Disconnect Handoff Repository
              </button>
            )}
          </div>
        ) : notLinkedMessage || (
          <div>
            <label
              htmlFor="handoff-repo-select"
              style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '4px' }}
            >
              Select a repository
            </label>
            {repoSelect('handoff-repo-select', selectedHandoffRepo, setSelectedHandoffRepo, isLoadingRepos || isConnectingHandoff)}
            <button
              className="btn btn-primary"
              onClick={handleHandoffConnect}
              disabled={!selectedHandoffRepo || isConnectingHandoff}
            >
              {isConnectingHandoff ? 'Connecting...' : 'Connect Handoff Repository'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
