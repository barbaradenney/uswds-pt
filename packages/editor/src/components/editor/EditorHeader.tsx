/**
 * Editor Header Component
 *
 * Contains the top navigation bar for the editor with:
 * - Back button
 * - Prototype name input
 * - Action buttons (Preview, Export, Embed, History, Save)
 * - Autosave indicator
 * - Error display
 */

import type { UseEditorAutosaveReturn } from '../../hooks/useEditorAutosave';

export interface EditorHeaderProps {
  /** Prototype name */
  name: string;
  /** Callback when name changes */
  onNameChange: (name: string) => void;
  /** Callback for back button */
  onBack: () => void;
  /** Callback for preview button */
  onPreview: () => void;
  /** Callback for export button */
  onExport: () => void;
  /** Callback for embed button */
  onEmbed: () => void;
  /** Callback for save button */
  onSave: () => void;
  /** Callback for history button toggle */
  onToggleHistory: () => void;
  /** Whether history panel is open */
  showVersionHistory: boolean;
  /** Whether embed button should be shown */
  showEmbedButton: boolean;
  /** Whether history button should be shown */
  showHistoryButton: boolean;
  /** Whether autosave indicator should be shown */
  showAutosaveIndicator: boolean;
  /** Autosave status */
  autosaveStatus: UseEditorAutosaveReturn['status'];
  /** Whether save is in progress */
  isSaving: boolean;
  /** Whether save button should be disabled */
  isSaveDisabled: boolean;
  /** Error message to display */
  error: string | null;
}

export function EditorHeader({
  name,
  onNameChange,
  onBack,
  onPreview,
  onExport,
  onEmbed,
  onSave,
  onToggleHistory,
  showVersionHistory,
  showEmbedButton,
  showHistoryButton,
  showAutosaveIndicator,
  autosaveStatus,
  isSaving,
  isSaveDisabled,
  error,
}: EditorHeaderProps) {
  return (
    <header className="editor-header">
      <div className="editor-header-left">
        <button
          className="btn btn-secondary"
          onClick={onBack}
          style={{ padding: '6px 12px' }}
        >
          ← Back
        </button>
        <input
          type="text"
          className="editor-title"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Prototype name"
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: '1.125rem',
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: '4px',
          }}
        />
      </div>

      <div className="editor-header-right">
        {error && (
          <span style={{ color: 'var(--color-error)', marginRight: '12px' }}>
            {error}
          </span>
        )}
        <button className="btn btn-secondary" onClick={onPreview}>
          Preview
        </button>
        <button className="btn btn-secondary" onClick={onExport}>
          Export
        </button>
        {showEmbedButton && (
          <button className="btn btn-secondary" onClick={onEmbed}>
            Embed
          </button>
        )}
        {showHistoryButton && (
          <button
            className={`btn btn-secondary ${showVersionHistory ? 'active' : ''}`}
            onClick={onToggleHistory}
            title="Version History"
          >
            History
          </button>
        )}
        {showAutosaveIndicator && (
          <div className={`autosave-indicator ${autosaveStatus}`}>
            <span className="autosave-dot" />
            <span>
              {autosaveStatus === 'saving' && 'Saving...'}
              {autosaveStatus === 'saved' && 'Saved'}
              {autosaveStatus === 'error' && 'Save failed'}
              {autosaveStatus === 'idle' && 'Autosave on'}
              {autosaveStatus === 'pending' && 'Unsaved changes'}
            </span>
          </div>
        )}
        <button
          className="btn btn-primary"
          onClick={onSave}
          disabled={isSaveDisabled}
        >
          {isSaving ? 'Saving...' : isSaveDisabled ? 'Loading...' : 'Save'}
        </button>
      </div>
    </header>
  );
}
