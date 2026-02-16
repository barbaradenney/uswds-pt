/**
 * Symbol Editor Header
 *
 * Simplified header for the isolated symbol editor.
 * Shows back button, symbol name with scope badge, save status, and save button.
 */

import { memo } from 'react';
import type { SymbolScope } from '@uswds-pt/shared';
import { mod } from '../../lib/platform';

export type SymbolSaveStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

const SCOPE_LABELS: Record<SymbolScope, string> = {
  prototype: 'Prototype',
  team: 'Team',
  organization: 'Organization',
};

export interface SymbolEditorHeaderProps {
  name: string;
  scope: SymbolScope;
  saveStatus: SymbolSaveStatus;
  onBack: () => void;
  onSave: () => void;
  isSaveDisabled: boolean;
  error?: string | null;
}

export const SymbolEditorHeader = memo(function SymbolEditorHeader({
  name,
  scope,
  saveStatus,
  onBack,
  onSave,
  isSaveDisabled,
  error,
}: SymbolEditorHeaderProps) {
  return (
    <header className="editor-header">
      <div className="editor-header-left">
        <button
          className="btn btn-secondary editor-header-btn"
          onClick={onBack}
          aria-label="Back to prototype editor"
        >
          &larr; Back
        </button>
        <span className="editor-title">
          {name || 'Untitled Symbol'}
        </span>
        <span
          className={`symbols-scope-badge symbols-scope-badge--${scope}`}
          title={SCOPE_LABELS[scope]}
          aria-hidden="true"
          style={{ marginLeft: '8px' }}
        >
          {scope[0].toUpperCase()}
        </span>
        <div className="editor-header-status-area" aria-live="polite">
          {saveStatus === 'saving' && (
            <span className="autosave-indicator saving">
              <span className="autosave-dot" />
              <span>Saving...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="autosave-indicator saved">
              <span className="autosave-dot" />
              <span>Saved</span>
            </span>
          )}
          {saveStatus === 'dirty' && (
            <span className="autosave-indicator pending">
              <span className="autosave-dot" />
              <span>Unsaved changes</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="autosave-indicator error">
              <span className="autosave-dot" />
              <span>Save failed</span>
            </span>
          )}
        </div>
      </div>

      <div className="editor-header-right">
        {error && (
          <span role="alert" className="editor-header-error">
            {error}
          </span>
        )}
        <button
          className="btn btn-primary editor-header-btn"
          onClick={onSave}
          disabled={isSaveDisabled}
          title={`Save (${mod}+S)`}
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save'}
        </button>
      </div>
    </header>
  );
});
