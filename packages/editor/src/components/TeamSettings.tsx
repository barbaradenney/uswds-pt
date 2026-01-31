import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Role, Organization } from '@uswds-pt/shared';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useOrganization } from '../hooks/useOrganization';
import { InviteModal } from './InviteModal';
import { getRoleBadge } from '../lib/roles';
import { formatDate } from '../lib/date';

interface TeamSettingsProps {
  teamId: string;
  teamName: string;
  userRole: Role;
  currentUserId: string;
}

export function TeamSettings({
  teamId,
  teamName,
  userRole,
  currentUserId,
}: TeamSettingsProps) {
  const navigate = useNavigate();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isEditingOrgName, setIsEditingOrgName] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const {
    members,
    invitations,
    isLoading,
    error,
    updateMemberRole,
    removeMember,
    sendInvitation,
    cancelInvitation,
    clearError,
  } = useTeamMembers(teamId);

  const { organization, updateOrganization } = useOrganization();

  const canManageMembers = userRole === 'org_admin' || userRole === 'team_admin';
  const isOrgAdmin = userRole === 'org_admin';

  async function handleSaveOrgName() {
    if (!newOrgName.trim()) return;
    setIsSavingOrg(true);
    const result = await updateOrganization({ name: newOrgName.trim() });
    setIsSavingOrg(false);
    if (result) {
      setIsEditingOrgName(false);
    }
  }

  function handleStartEditOrgName() {
    setNewOrgName(organization?.name || '');
    setIsEditingOrgName(true);
  }

  function getAvailableRoles(): Role[] {
    // Users can only assign roles at or below their own level
    if (userRole === 'org_admin') {
      return ['org_admin', 'team_admin', 'team_member', 'team_viewer'];
    }
    if (userRole === 'team_admin') {
      return ['team_admin', 'team_member', 'team_viewer'];
    }
    return [];
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    await updateMemberRole(userId, newRole);
  }

  async function handleRemoveMember(userId: string, memberEmail: string) {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from the team?`)) {
      return;
    }
    await removeMember(userId);
  }

  async function handleInvite(email: string, role: Role) {
    const success = await sendInvitation(email, role);
    if (success) {
      setShowInviteModal(false);
    }
    return success;
  }

  async function handleCancelInvitation(invitationId: string) {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }
    await cancelInvitation(invitationId);
  }

  if (isLoading) {
    return (
      <div className="team-settings">
        <div className="loading-screen" style={{ height: '300px' }}>
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="team-settings">
      <div className="team-settings-header">
        <div>
          <h1>{teamName} Settings</h1>
          <p style={{ color: 'var(--color-base-light)', marginTop: '4px' }}>
            Manage team members and settings
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          Back to Prototypes
        </button>
      </div>

      {error && (
        <div className="login-error" style={{ marginBottom: '16px' }}>
          {error}
          <button
            onClick={clearError}
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

      {/* Organization Settings Section - org_admin only */}
      {isOrgAdmin && organization && (
        <div className="team-settings-section">
          <h2>Organization Settings</h2>
          <div className="org-settings-row">
            <label>Organization Name</label>
            {isEditingOrgName ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="form-input"
                  style={{ width: '250px' }}
                  disabled={isSavingOrg}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveOrgName();
                    if (e.key === 'Escape') setIsEditingOrgName(false);
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSaveOrgName}
                  disabled={isSavingOrg || !newOrgName.trim()}
                >
                  {isSavingOrg ? 'Saving...' : 'Save'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsEditingOrgName(false)}
                  disabled={isSavingOrg}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>{organization.name}</span>
                <button
                  className="btn btn-secondary"
                  onClick={handleStartEditOrgName}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Members Section */}
      <div className="team-settings-section">
        <h2>Team Members</h2>
        <div className="member-list">
          <div className="member-list-header">
            <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
            {canManageMembers && (
              <button
                className="btn btn-primary"
                onClick={() => setShowInviteModal(true)}
              >
                Invite Member
              </button>
            )}
          </div>

          {members.map((member) => (
            <div key={member.id} className="member-item">
              <div className="member-info">
                <span className="member-name">
                  {member.name || member.email}
                  {member.id === currentUserId && ' (You)'}
                </span>
                {member.name && (
                  <span className="member-email">{member.email}</span>
                )}
              </div>
              <div className="member-actions">
                {canManageMembers && member.id !== currentUserId ? (
                  <>
                    <select
                      className="role-select"
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as Role)}
                    >
                      {getAvailableRoles().map((role) => (
                        <option key={role} value={role}>
                          {getRoleBadge(role)}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn"
                      style={{ color: 'var(--color-error)', padding: '4px 8px' }}
                      onClick={() => handleRemoveMember(member.id, member.email)}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <span style={{ color: 'var(--color-base-light)' }}>
                    {getRoleBadge(member.role)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations Section */}
      {canManageMembers && invitations.length > 0 && (
        <div className="team-settings-section">
          <h2>Pending Invitations</h2>
          <div className="member-list">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="pending-invitation">
                <div className="pending-invitation-info">
                  <span className="pending-invitation-email">{invitation.email}</span>
                  <span className="pending-invitation-meta">
                    Invited {formatDate(invitation.createdAt)} •
                    Expires {formatDate(invitation.expiresAt)} •
                    Role: {getRoleBadge(invitation.role)}
                  </span>
                </div>
                <div className="member-actions">
                  <span className="badge badge-pending">Pending</span>
                  <button
                    className="btn"
                    style={{ color: 'var(--color-error)', padding: '4px 8px' }}
                    onClick={() => handleCancelInvitation(invitation.id)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          availableRoles={getAvailableRoles()}
          onInvite={handleInvite}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}
