/**
 * Symbol Scope Dialog
 *
 * Modal for choosing whether a new symbol should be local (prototype-specific)
 * or global (shared across all prototypes in the team).
 */

import { useState, useEffect } from 'react';
import type { SymbolScope, GrapesJSSymbol } from '@uswds-pt/shared';

interface SymbolScopeDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Close the dialog */
  onClose: () => void;
  /** Called when user selects scope and confirms */
  onConfirm: (scope: SymbolScope, name: string) => void;
  /** The symbol being created (for preview info) */
  pendingSymbol?: GrapesJSSymbol | null;
  /** Whether in demo mode (global symbols not available) */
  isDemoMode?: boolean;
  /** Whether a team is available for global symbols */
  hasTeam?: boolean;
}

export function SymbolScopeDialog({
  isOpen,
  onClose,
  onConfirm,
  pendingSymbol,
  isDemoMode = false,
  hasTeam = true,
}: SymbolScopeDialogProps) {
  const [scope, setScope] = useState<SymbolScope>('local');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens with new symbol
  useEffect(() => {
    if (isOpen && pendingSymbol) {
      setName(pendingSymbol.label || 'New Symbol');
      setScope('local');
      setError(null);
    }
  }, [isOpen, pendingSymbol]);

  if (!isOpen) return null;

  const canUseGlobal = !isDemoMode && hasTeam;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a name for the symbol');
      return;
    }

    if (trimmedName.length > 255) {
      setError('Name must be 255 characters or less');
      return;
    }

    onConfirm(scope, trimmedName);
    onClose();
  }

  function handleClose() {
    setName('');
    setScope('local');
    setError(null);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content symbol-scope-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Create Symbol</h2>
          <button
            className="modal-close"
            onClick={handleClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="symbol-name">Symbol Name *</label>
              <input
                id="symbol-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Header Navigation, Contact Form"
                autoFocus
                maxLength={255}
              />
              <p className="help-text">
                Give your symbol a descriptive name to find it easily later.
              </p>
            </div>

            <div className="form-group">
              <label>Symbol Scope</label>
              <div className="scope-options">
                <label className="scope-option">
                  <input
                    type="radio"
                    name="scope"
                    value="local"
                    checked={scope === 'local'}
                    onChange={() => setScope('local')}
                  />
                  <div className="scope-option-content">
                    <span className="scope-option-title">
                      Local
                      <span className="scope-badge scope-badge-local">This prototype only</span>
                    </span>
                    <span className="scope-option-description">
                      Only available in this prototype. Changes won't affect other prototypes.
                    </span>
                  </div>
                </label>

                <label className={`scope-option ${!canUseGlobal ? 'disabled' : ''}`}>
                  <input
                    type="radio"
                    name="scope"
                    value="global"
                    checked={scope === 'global'}
                    onChange={() => setScope('global')}
                    disabled={!canUseGlobal}
                  />
                  <div className="scope-option-content">
                    <span className="scope-option-title">
                      Global
                      <span className="scope-badge scope-badge-global">Team-wide</span>
                    </span>
                    <span className="scope-option-description">
                      {canUseGlobal
                        ? 'Shared across all prototypes in your team. Updates apply everywhere.'
                        : isDemoMode
                        ? 'Global symbols require signing in.'
                        : 'Global symbols require being part of a team.'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {scope === 'global' && canUseGlobal && (
              <div className="info-message">
                <strong>Tip:</strong> Global symbols are great for headers, footers, and
                other components you want to reuse across multiple prototypes.
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!name.trim()}
            >
              Create Symbol
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .symbol-scope-dialog {
          max-width: 480px;
        }

        .scope-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
        }

        .scope-option {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 6px;
          cursor: pointer;
          transition: border-color 0.15s, background-color 0.15s;
        }

        .scope-option:hover:not(.disabled) {
          border-color: var(--primary-color, #0050d8);
          background-color: var(--hover-bg, #f5f5f5);
        }

        .scope-option.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .scope-option input[type="radio"] {
          margin-top: 2px;
        }

        .scope-option-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .scope-option-title {
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .scope-option-description {
          font-size: 13px;
          color: var(--text-secondary, #666);
        }

        .scope-badge {
          font-size: 11px;
          font-weight: 500;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .scope-badge-local {
          background-color: var(--local-badge-bg, #e8f4fd);
          color: var(--local-badge-color, #0050d8);
        }

        .scope-badge-global {
          background-color: var(--global-badge-bg, #e8f8e8);
          color: var(--global-badge-color, #1a7f37);
        }

        .info-message {
          padding: 12px;
          background-color: var(--info-bg, #e8f4fd);
          border-radius: 6px;
          font-size: 13px;
          color: var(--info-color, #0050d8);
        }

        .help-text {
          font-size: 13px;
          color: var(--text-secondary, #666);
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
