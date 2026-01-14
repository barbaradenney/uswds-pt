import type { InvitationWithTeam } from '@uswds-pt/shared';
import { getRoleDisplayName } from '../lib/roles';

interface InvitationBannerProps {
  invitation: InvitationWithTeam;
  onAccept: (token: string) => void;
  onDecline: (token: string) => void;
  isLoading?: boolean;
}

export function InvitationBanner({
  invitation,
  onAccept,
  onDecline,
  isLoading = false,
}: InvitationBannerProps) {
  return (
    <div className="invitation-banner">
      <div className="invitation-banner-content">
        <div className="invitation-banner-text">
          <strong>You have a pending invitation</strong>
          <span>
            Join <strong>{invitation.teamName}</strong> at{' '}
            <strong>{invitation.organizationName}</strong> as a{' '}
            {getRoleDisplayName(invitation.role)}
          </span>
        </div>
        <div className="invitation-banner-actions">
          <button
            className="btn btn-accept"
            onClick={() => onAccept(invitation.token)}
            disabled={isLoading}
          >
            {isLoading ? 'Accepting...' : 'Accept'}
          </button>
          <button
            className="btn btn-decline"
            onClick={() => onDecline(invitation.token)}
            disabled={isLoading}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

interface InvitationBannerListProps {
  invitations: InvitationWithTeam[];
  onAccept: (token: string) => void;
  onDecline: (token: string) => void;
  loadingToken?: string | null;
}

export function InvitationBannerList({
  invitations,
  onAccept,
  onDecline,
  loadingToken,
}: InvitationBannerListProps) {
  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="invitation-banner-list">
      {invitations.map((invitation) => (
        <InvitationBanner
          key={invitation.id}
          invitation={invitation}
          onAccept={onAccept}
          onDecline={onDecline}
          isLoading={loadingToken === invitation.token}
        />
      ))}
    </div>
  );
}
