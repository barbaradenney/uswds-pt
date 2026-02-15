/**
 * Symbol Scope Dialog
 *
 * Modal for choosing whether a new symbol should be scoped to the
 * prototype, team, or organization.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
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
  /** Whether in demo mode (team/org symbols not available) */
  isDemoMode?: boolean;
  /** Whether a team is available */
  hasTeam?: boolean;
  /** Whether the user belongs to an organization */
  hasOrganization?: boolean;
  /** Whether the user has org_admin role */
  hasOrgAdmin?: boolean;
}

export function SymbolScopeDialog({
  isOpen,
  onClose,
  onConfirm,
  pendingSymbol,
  isDemoMode = false,
  hasTeam = true,
  hasOrganization = false,
  hasOrgAdmin = false,
}: SymbolScopeDialogProps) {
  const [scope, setScope] = useState<SymbolScope>('prototype');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset state when dialog opens with new symbol
  useEffect(() => {
    if (isOpen && pendingSymbol) {
      setName(pendingSymbol.label || 'New Symbol');
      setScope('prototype');
      setError(null);
    }
  }, [isOpen, pendingSymbol]);

  const handleClose = useCallback(() => {
    setName('');
    setScope('prototype');
    setError(null);
    onClose();
  }, [onClose]);

  // Focus trap + Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      // Focus trap: Tab / Shift+Tab
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const canUseTeam = !isDemoMode && hasTeam;
  const canUseOrg = !isDemoMode && hasOrganization && hasOrgAdmin;

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

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        ref={dialogRef}
        className="modal-content symbol-scope-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="symbol-scope-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="symbol-scope-dialog-title">Create Symbol</h2>
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
            {error && <div className="error-message" role="alert">{error}</div>}

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
              <div className="scope-options" role="radiogroup" aria-label="Symbol scope">
                <label className="scope-option">
                  <input
                    type="radio"
                    name="scope"
                    value="prototype"
                    checked={scope === 'prototype'}
                    onChange={() => setScope('prototype')}
                  />
                  <div className="scope-option-content">
                    <span className="scope-option-title">
                      Prototype
                      <span className="scope-badge scope-badge-local">This prototype only</span>
                    </span>
                    <span className="scope-option-description">
                      Only available in this prototype. Changes won't affect other prototypes.
                    </span>
                  </div>
                </label>

                <label className={`scope-option ${!canUseTeam ? 'disabled' : ''}`}>
                  <input
                    type="radio"
                    name="scope"
                    value="team"
                    checked={scope === 'team'}
                    onChange={() => setScope('team')}
                    disabled={!canUseTeam}
                  />
                  <div className="scope-option-content">
                    <span className="scope-option-title">
                      Team
                      <span className="scope-badge scope-badge-global">Team-wide</span>
                    </span>
                    <span className="scope-option-description">
                      {canUseTeam
                        ? 'Shared across all prototypes in your team. Updates apply everywhere.'
                        : isDemoMode
                        ? 'Team symbols require signing in.'
                        : 'Team symbols require being part of a team.'}
                    </span>
                  </div>
                </label>

                <label className={`scope-option ${!canUseOrg ? 'disabled' : ''}`}>
                  <input
                    type="radio"
                    name="scope"
                    value="organization"
                    checked={scope === 'organization'}
                    onChange={() => setScope('organization')}
                    disabled={!canUseOrg}
                  />
                  <div className="scope-option-content">
                    <span className="scope-option-title">
                      Organization
                      <span className="scope-badge scope-badge-org">Org-wide</span>
                    </span>
                    <span className="scope-option-description">
                      {canUseOrg
                        ? 'Shared across all teams in your organization. Updates apply everywhere.'
                        : !hasOrganization
                        ? 'Organization symbols require belonging to an organization.'
                        : 'Organization symbols require org admin permissions.'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {scope === 'team' && canUseTeam && (
              <div className="info-message">
                <strong>Tip:</strong> Team symbols are great for headers, footers, and
                other components you want to reuse across multiple prototypes.
              </div>
            )}

            {scope === 'organization' && canUseOrg && (
              <div className="info-message">
                <strong>Tip:</strong> Organization symbols are shared across all teams and are
                ideal for brand elements and standard components.
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
          pointer-events: none;
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

        .scope-badge-org {
          background-color: var(--org-badge-bg, #f0e8fd);
          color: var(--org-badge-color, #6f42c1);
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
