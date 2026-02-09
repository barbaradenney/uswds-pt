/**
 * Create Branch Dialog
 * Modal for creating a new prototype branch
 */

import { useState, useCallback, type FormEvent } from 'react';

interface CreateBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => Promise<boolean>;
}

export function CreateBranchDialog({ isOpen, onClose, onCreate }: CreateBranchDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Branch name is required');
      return;
    }
    if (trimmed.toLowerCase() === 'main') {
      setError('"main" is reserved');
      return;
    }

    setError(null);
    setIsCreating(true);

    const success = await onCreate(trimmed, description.trim() || undefined);
    setIsCreating(false);

    if (success) {
      setName('');
      setDescription('');
      onClose();
    } else {
      setError('Failed to create branch. It may already exist.');
    }
  }, [name, description, onCreate, onClose]);

  const handleClose = useCallback(() => {
    setName('');
    setDescription('');
    setError(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          width: '400px',
          maxWidth: '90vw',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: '1.125rem' }}>Create Branch</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label
              htmlFor="branch-name"
              style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', fontWeight: 500 }}
            >
              Branch name
            </label>
            <input
              id="branch-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., redesign-header"
              maxLength={100}
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="branch-description"
              style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', fontWeight: 500 }}
            >
              Description (optional)
            </label>
            <input
              id="branch-description"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this branch for?"
              maxLength={500}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {error && (
            <p style={{ color: 'var(--color-error, #b50909)', fontSize: '0.875rem', margin: '0 0 12px' }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isCreating || !name.trim()}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
