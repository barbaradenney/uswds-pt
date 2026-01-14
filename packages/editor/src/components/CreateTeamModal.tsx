import { useState } from 'react';
import { validateName } from '../lib/validation';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTeam: (name: string, description?: string) => Promise<boolean>;
}

export function CreateTeamModal({
  isOpen,
  onClose,
  onCreateTeam,
}: CreateTeamModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const nameError = validateName(name);
    if (nameError) {
      setError(nameError);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onCreateTeam(name.trim(), description.trim() || undefined);
      if (success) {
        setName('');
        setDescription('');
        onClose();
      } else {
        setError('Failed to create team. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while creating the team.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (!isSubmitting) {
      setName('');
      setDescription('');
      setError(null);
      onClose();
    }
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content create-team-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Team</h2>
          <button
            className="modal-close"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="team-name">Team Name *</label>
              <input
                id="team-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Design Team, Engineering"
                disabled={isSubmitting}
                autoFocus
                maxLength={255}
              />
            </div>

            <div className="form-group">
              <label htmlFor="team-description">Description</label>
              <textarea
                id="team-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for this team"
                disabled={isSubmitting}
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
