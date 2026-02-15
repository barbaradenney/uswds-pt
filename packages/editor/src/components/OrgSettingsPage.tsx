import { Navigate } from 'react-router-dom';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import { useAuth } from '../hooks/useAuth';
import { OrgSettings } from './OrgSettings';

export function OrgSettingsPage() {
  const { organization, teams, updateOrganization, isLoading: teamsLoading } = useOrganizationContext();
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading || teamsLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading organization settings...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isOrgAdmin = teams.some((t) => t.role === 'org_admin');

  if (!isOrgAdmin || !organization) {
    return <Navigate to="/" replace />;
  }

  return (
    <OrgSettings
      organization={organization}
      updateOrganization={updateOrganization}
    />
  );
}
