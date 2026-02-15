import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { Prototype } from '@uswds-pt/shared';
import { createDebugLogger } from '@uswds-pt/shared';
import { useAuth } from '../hooks/useAuth';
import { API_ENDPOINTS, apiGet, apiDelete, apiPost } from '../lib/api';
import { formatDate } from '../lib/date';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import { useInvitations } from '../hooks/useInvitations';
import { TeamSwitcher } from './TeamSwitcher';
import { InvitationBannerList } from './InvitationBanner';
import { CreateTeamModal } from './CreateTeamModal';


type SortOption = 'updated' | 'name-asc' | 'name-desc' | 'oldest';

const debug = createDebugLogger('PrototypeList');
const PAGE_SIZE = 20;

/** Props for the memoized PrototypeCard component. */
interface PrototypeCardProps {
  prototype: Prototype;
  confirmDeleteSlug: string | null;
  gitHubConnection: { repoOwner: string; repoName: string } | null;
  onDelete: (slug: string, e: React.MouseEvent) => void;
  onConfirmDelete: (slug: string) => void;
  onCancelDelete: () => void;
  onDuplicate: (slug: string, e: React.MouseEvent) => void;
}

/**
 * Renders a single prototype card in the grid. Memoized so that cards whose
 * props have not changed skip re-rendering when sibling cards update (e.g.,
 * when a different card enters confirm-delete state or a new card is added).
 */
const PrototypeCard = React.memo(function PrototypeCard({
  prototype,
  confirmDeleteSlug,
  gitHubConnection,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onDuplicate,
}: PrototypeCardProps) {
  const isConfirmingDelete = confirmDeleteSlug === prototype.slug;

  return (
    <div className="prototype-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <h3 className="prototype-card-title">
          <Link to={`/edit/${prototype.slug}`}>
            {prototype.name}
          </Link>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {isConfirmingDelete ? (
            <>
              <button
                className="btn"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.875rem',
                  color: '#b50909',
                }}
                onClick={(e) => { e.stopPropagation(); onConfirmDelete(prototype.slug); }}
                aria-label={`Confirm delete ${prototype.name}`}
              >
                Confirm Delete?
              </button>
              <button
                className="btn"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.875rem',
                  color: 'var(--color-base-light)',
                }}
                onClick={(e) => { e.stopPropagation(); onCancelDelete(); }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                className="btn"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.875rem',
                  color: 'var(--color-base-light)',
                }}
                onClick={(e) => onDelete(prototype.slug, e)}
                aria-label={`Delete ${prototype.name}`}
              >
                Delete
              </button>
              <button
                className="btn"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.875rem',
                  color: 'var(--color-base-light)',
                }}
                onClick={(e) => onDuplicate(prototype.slug, e)}
                aria-label={`Duplicate ${prototype.name}`}
              >
                Duplicate
              </button>
            </>
          )}
        </div>
      </div>
      {prototype.description && (
        <p
          style={{
            color: 'var(--color-base-light)',
            marginBottom: '12px',
          }}
        >
          {prototype.description}
        </p>
      )}
      <div className="prototype-card-meta">
        <span>Updated {formatDate(prototype.updatedAt)}</span>
        {gitHubConnection && prototype.lastGithubPushAt && (
          <span
            className="prototype-card-branch"
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5z" />
            </svg>
            <a
              href={`https://github.com/${gitHubConnection.repoOwner}/${gitHubConnection.repoName}/tree/uswds-pt/${prototype.branchSlug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              uswds-pt/{prototype.branchSlug}
            </a>
          </span>
        )}
      </div>
    </div>
  );
});

export function PrototypeList() {
  const [prototypes, setPrototypes] = useState<Prototype[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingToken, setAcceptingToken] = useState<string | null>(null);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);
  const [gitHubConnection, setGitHubConnection] = useState<{ repoOwner: string; repoName: string } | null>(null);

  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { organization, teams, currentTeam, setCurrentTeam, refreshTeams, createTeam, setupOrganization, error: orgError } = useOrganizationContext();
  const { invitations, acceptInvitation, declineInvitation } = useInvitations();

  // Check if user is org_admin (can create teams)
  // If user has no teams, allow them to create their first one
  const isOrgAdmin = teams.length === 0 || teams.some((t) => t.role === 'org_admin');
  const hasNoTeams = teams.length === 0;
  const loadPrototypes = useCallback(async () => {
    setIsLoading(true);
    const url = currentTeam
      ? `${API_ENDPOINTS.PROTOTYPES}?teamId=${currentTeam.id}`
      : API_ENDPOINTS.PROTOTYPES;
    const result = await apiGet<{ prototypes?: Prototype[] } | Prototype[]>(
      url,
      'Failed to load prototypes'
    );

    if (result.success && result.data) {
      const data = result.data;
      setPrototypes(
        Array.isArray(data) ? data : (data as { prototypes?: Prototype[] }).prototypes || []
      );
    } else {
      setError(result.error || 'Failed to load prototypes');
    }
    setIsLoading(false);
  }, [currentTeam]);

  useEffect(() => {
    loadPrototypes();
  }, [currentTeam, loadPrototypes]);

  // Fetch team GitHub connection for displaying links on cards
  useEffect(() => {
    if (!currentTeam) {
      setGitHubConnection(null);
      return;
    }
    apiGet<{ repoOwner?: string; repoName?: string }>(
      API_ENDPOINTS.GITHUB_TEAM_CONNECTION(currentTeam.id),
      'Failed to check GitHub connection'
    ).then((result) => {
      if (result.success && result.data?.repoOwner && result.data?.repoName) {
        setGitHubConnection({ repoOwner: result.data.repoOwner, repoName: result.data.repoName });
      } else {
        if (!result.success) {
          debug('Failed to check GitHub connection:', result.error);
        }
        setGitHubConnection(null);
      }
    });
  }, [currentTeam]);

  const handleDelete = useCallback((slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteSlug(slug);
  }, []);

  const confirmDeleteHandler = useCallback(async (slug: string) => {
    const result = await apiDelete(
      API_ENDPOINTS.PROTOTYPE(slug),
      'Failed to delete prototype'
    );

    if (result.success) {
      setPrototypes((prev) => prev.filter((p) => p.slug !== slug));
    } else {
      setError(result.error || 'Failed to delete');
    }
    setConfirmDeleteSlug(null);
  }, []);

  const cancelDelete = useCallback(() => {
    setConfirmDeleteSlug(null);
  }, []);

  const handleDuplicate = useCallback(async (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const result = await apiPost<Prototype>(
      API_ENDPOINTS.PROTOTYPE_DUPLICATE(slug),
      undefined,
      'Failed to duplicate prototype'
    );

    if (result.success && result.data) {
      // Add the duplicate to the list
      setPrototypes((prev) => [result.data!, ...prev]);
    } else {
      setError(result.error || 'Failed to duplicate');
    }
  }, []);

  async function handleAcceptInvitation(token: string) {
    setAcceptingToken(token);
    const success = await acceptInvitation(token);
    setAcceptingToken(null);
    if (success) {
      // Refresh teams to include the newly joined team
      await refreshTeams();
    }
  }

  function handleDeclineInvitation(token: string) {
    declineInvitation(token);
  }

  async function handleCreateTeam(name: string, _description?: string): Promise<boolean> {
    // If user has no teams, use setup endpoint (handles both no-org and org-without-teams cases)
    if (hasNoTeams) {
      const success = await setupOrganization(name);
      if (success) {
        // Reload page to refresh all data
        window.location.reload();
      }
      return success;
    }

    // Otherwise use normal team creation
    const newTeam = await createTeam(name);
    if (newTeam) {
      // Switch to the newly created team
      setCurrentTeam(newTeam.id);
      return true;
    }
    return false;
  }

  // Filter and sort prototypes
  const filteredPrototypes = useMemo(() => {
    let result = prototypes;

    // Search filter (case-insensitive)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'oldest':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'updated':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return result;
  }, [prototypes, searchQuery, sortBy]);

  // Paginated slice
  const visiblePrototypes = filteredPrototypes.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPrototypes.length;

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, sortBy]);

  if (isLoading) {
    return (
      <div className="prototype-list-container">
        <div className="loading-screen" style={{ height: '60vh' }}>
          <div className="loading-spinner" />
          <p style={{ marginTop: '16px', color: 'var(--color-base-light)', textAlign: 'center' }}>
            Loading prototypes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="prototype-list-container">
      {/* Pending Invitations */}
      <InvitationBannerList
        invitations={invitations}
        onAccept={handleAcceptInvitation}
        onDecline={handleDeclineInvitation}
        loadingToken={acceptingToken}
      />

      <div className="prototype-list-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <h1 style={{ margin: 0 }}>Prototypes</h1>
            <TeamSwitcher
              teams={teams}
              currentTeam={currentTeam}
              onTeamChange={setCurrentTeam}
              organizationName={organization?.name}
              canCreateTeam={isOrgAdmin}
              onCreateTeamClick={() => setShowCreateTeamModal(true)}
            />
          </div>
          {user && (
            <p style={{ color: 'var(--color-base-light)', marginTop: '4px' }}>
              Signed in as {user.email}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isOrgAdmin && organization && !currentTeam && (
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/org/settings')}
            >
              Org Settings
            </button>
          )}
          {currentTeam && (currentTeam.role === 'org_admin' || currentTeam.role === 'team_admin') && (
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/teams/${currentTeam.id}/settings`)}
            >
              Team Settings
            </button>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/new')}>
            + New Prototype
          </button>
          <button className="btn btn-secondary" onClick={logout}>
            Sign Out
          </button>
        </div>
      </div>

      {(error || orgError) && (
        <div className="login-error" style={{ marginBottom: '16px' }}>
          {error || orgError}
          <button
            onClick={() => { setError(null); if (orgError) { window.location.reload(); } }}
            style={{
              marginLeft: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* No teams banner */}
      {hasNoTeams && (
        <div
          style={{
            backgroundColor: '#fef3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <strong style={{ color: '#856404' }}>No team found</strong>
            <p style={{ color: '#856404', margin: '4px 0 0 0', fontSize: '14px' }}>
              Create a team to start organizing your prototypes.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateTeamModal(true)}
          >
            Create Team
          </button>
        </div>
      )}

      {/* Search and Sort Controls */}
      {prototypes.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search prototypes..."
            aria-label="Search prototypes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid var(--color-base-lighter, #dfe1e2)',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          />
          <select
            value={sortBy}
            aria-label="Sort prototypes"
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--color-base-lighter, #dfe1e2)',
              borderRadius: '4px',
              fontSize: '0.875rem',
              background: 'white',
            }}
          >
            <option value="updated">Last Modified</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      )}

      {prototypes.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '48px 24px' }}
        >
          <h2 style={{ marginBottom: '8px' }}>No prototypes yet</h2>
          <p style={{ color: 'var(--color-base-light)', marginBottom: '24px' }}>
            Create your first prototype to get started
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/new')}>
            Create Prototype
          </button>
        </div>
      ) : filteredPrototypes.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '48px 24px' }}
        >
          <h2 style={{ marginBottom: '8px' }}>No matching prototypes</h2>
          <p style={{ color: 'var(--color-base-light)', marginBottom: '24px' }}>
            Try a different search term
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => setSearchQuery('')}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="prototype-grid">
          {visiblePrototypes.map((prototype) => (
            <PrototypeCard
              key={prototype.id}
              prototype={prototype}
              confirmDeleteSlug={confirmDeleteSlug}
              gitHubConnection={gitHubConnection}
              onDelete={handleDelete}
              onConfirmDelete={confirmDeleteHandler}
              onCancelDelete={cancelDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
          >
            Load More ({Math.max(0, filteredPrototypes.length - visibleCount)} remaining)
          </button>
        </div>
      )}

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
        onCreateTeam={handleCreateTeam}
      />

    </div>
  );
}
