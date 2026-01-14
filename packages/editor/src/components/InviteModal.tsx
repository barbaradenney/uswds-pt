import { useState } from 'react';
import type { Role } from '@uswds-pt/shared';
import { getRoleBadge, getRoleDescription } from '../lib/roles';
import { validateEmail } from '../lib/validation';

interface InviteModalProps {
  availableRoles: Role[];
  onInvite: (email: string, role: Role) => Promise<boolean>;
  onClose: () => void;
}

export function InviteModal({ availableRoles, onInvite, onClose }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(availableRoles[availableRoles.length - 1] || 'team_member');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setIsLoading(true);
    try {
      const success = await onInvite(email.trim(), role);
      if (!success) {
        setError('Failed to send invitation');
      }
    } catch (err) {
      setError('Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invite Team Member</h2>
          <button
            className="btn"
            style={{ background: 'none', padding: '4px' }}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="login-error" style={{ marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div className="invite-form">
              <div className="form-group">
                <label className="form-label" htmlFor="invite-email">
                  Email Address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="invite-role">
                  Role
                </label>
                <select
                  id="invite-role"
                  className="form-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  disabled={isLoading}
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {getRoleBadge(r)}
                    </option>
                  ))}
                </select>
                <p style={{ marginTop: '4px', fontSize: '0.875rem', color: 'var(--color-base-light)' }}>
                  {getRoleDescription(role)}
                </p>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
