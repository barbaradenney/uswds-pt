import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Prototype } from '@uswds-pt/shared';
import { authFetch, useAuth } from '../hooks/useAuth';
import { formatDate } from '../lib/date';
import { inferTemplateLabel } from '../lib/template-utils';
import { useOrganization } from '../hooks/useOrganization';
import { useInvitations } from '../hooks/useInvitations';
import { TeamSwitcher } from './TeamSwitcher';
import { InvitationBannerList } from './InvitationBanner';
import { CreateTeamModal } from './CreateTeamModal';

export function PrototypeList() {
  const [prototypes, setPrototypes] = useState<Prototype[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingToken, setAcceptingToken] = useState<string | null>(null);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);

  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { organization, teams, currentTeam, setCurrentTeam, refreshTeams, createTeam, setupOrganization, error: orgError } = useOrganization();
  const { invitations, acceptInvitation, declineInvitation } = useInvitations();

  // Check if user is org_admin (can create teams)
  // If user has no teams, allow them to create their first one
  const isOrgAdmin = teams.length === 0 || teams.some((t) => t.role === 'org_admin');
  const hasNoTeams = teams.length === 0;

  const loadPrototypes = useCallback(async () => {
    try {
      setIsLoading(true);
      const url = currentTeam
        ? `/api/prototypes?teamId=${currentTeam.id}`
        : '/api/prototypes';
      const response = await authFetch(url);

      if (!response.ok) {
        throw new Error('Failed to load prototypes');
      }

      const data = await response.json();
      setPrototypes(data.prototypes || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prototypes');
    } finally {
      setIsLoading(false);
    }
  }, [currentTeam]);

  useEffect(() => {
    loadPrototypes();
  }, [currentTeam, loadPrototypes]);

  async function handleDelete(slug: string, e: React.MouseEvent) {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this prototype?')) {
      return;
    }

    try {
      const response = await authFetch(`/api/prototypes/${slug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete prototype');
      }

      setPrototypes((prev) => prev.filter((p) => p.slug !== slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  async function handleDuplicate(slug: string, e: React.MouseEvent) {
    e.stopPropagation();

    try {
      const response = await authFetch(`/api/prototypes/${slug}/duplicate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate prototype');
      }

      const duplicate = await response.json();
      // Add the duplicate to the list
      setPrototypes((prev) => [duplicate, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate');
    }
  }

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
        <div style={{ display: 'flex', gap: '8px' }}>
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
            onClick={() => setError(null)}
            style={{
              marginLeft: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* No teams banner */}
      {hasNoTeams && !isLoading && (
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

      {isLoading ? (
        <div className="loading-screen" style={{ height: '300px' }}>
          <div className="loading-spinner" />
          <p style={{ marginTop: '16px', color: 'var(--color-base-light)', textAlign: 'center' }}>
            Loading prototypes...
          </p>
          <p style={{ marginTop: '8px', color: 'var(--color-base-lighter)', fontSize: '14px', textAlign: 'center' }}>
            If the database was paused, it may take 5-7 minutes to restart.
          </p>
        </div>
      ) : prototypes.length === 0 ? (
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
      ) : (
        <div className="prototype-grid">
          {prototypes.map((prototype) => (
            <div
              key={prototype.id}
              className="prototype-card"
              onClick={() => navigate(`/edit/${prototype.slug}`)}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <h3 className="prototype-card-title">{prototype.name}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button
                    className="btn"
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.875rem',
                      color: 'var(--color-base-light)',
                    }}
                    onClick={(e) => handleDelete(prototype.slug, e)}
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
                    onClick={(e) => handleDuplicate(prototype.slug, e)}
                  >
                    Duplicate
                  </button>
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
                {inferTemplateLabel(prototype.htmlContent) && (
                  <span className="prototype-card-template">
                    {inferTemplateLabel(prototype.htmlContent)}
                  </span>
                )}
                Updated {formatDate(prototype.updatedAt)}
              </div>
            </div>
          ))}
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
