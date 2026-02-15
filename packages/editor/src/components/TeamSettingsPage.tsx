import { useParams, Navigate } from 'react-router-dom';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import { useAuth } from '../hooks/useAuth';
import { TeamSettings } from './TeamSettings';

export function TeamSettingsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { teams, isLoading: teamsLoading } = useOrganizationContext();
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading || teamsLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading team settings...</p>
      </div>
    );
  }

  if (!teamId) {
    return <Navigate to="/" replace />;
  }

  const team = teams.find((t) => t.id === teamId);

  if (!team) {
    return (
      <div className="team-settings-page">
        <div className="error-message">
          <h2>Team Not Found</h2>
          <p>The team you're looking for doesn't exist or you don't have access to it.</p>
          <a href="/#/">Back to Prototypes</a>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <TeamSettings
      teamId={team.id}
      teamName={team.name}
      userRole={team.role}
      currentUserId={user.id}
    />
  );
}
