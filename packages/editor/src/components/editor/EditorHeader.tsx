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

import { memo, useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import type { UseEditorAutosaveReturn } from '../../hooks/useEditorAutosave';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';

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
  /** Timestamp of last successful save */
  lastSavedAt: Date | null;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Whether save button should be disabled */
  isSaveDisabled: boolean;
  /** Error message to display */
  error: string | null;
  /** Whether to show connection status (default: true when not in demo mode) */
  showConnectionStatus?: boolean;
  /** Timestamp of last local draft backup to IndexedDB */
  lastSnapshotAt?: Date | null;
}

function formatLastSaved(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export const EditorHeader = memo(function EditorHeader({
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
  lastSavedAt,
  isSaving,
  isSaveDisabled,
  error,
  showConnectionStatus = false,
  lastSnapshotAt = null,
}: EditorHeaderProps) {
  const connectionStatus = useConnectionStatus();

  // Show "Draft backed up" briefly after each local snapshot.
  // Minimum 30s gap between badge displays to avoid constant flicker
  // (snapshots fire every 3s, so without the gap the badge is nearly always visible).
  const [showDraftBadge, setShowDraftBadge] = useState(false);
  const lastBadgeTimeRef = useRef(0);
  useEffect(() => {
    if (!lastSnapshotAt) return;
    const now = Date.now();
    if (now - lastBadgeTimeRef.current < 30_000) return;
    lastBadgeTimeRef.current = now;
    setShowDraftBadge(true);
    const timeout = setTimeout(() => setShowDraftBadge(false), 2000);
    return () => clearTimeout(timeout);
  }, [lastSnapshotAt]);

  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onNameChange(e.target.value),
    [onNameChange]
  );

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
          onChange={handleNameChange}
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
        {/* Connection status indicator */}
        {showConnectionStatus && !connectionStatus.isOnline && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-warning-lighter, #faf3d1)',
              color: 'var(--color-warning-darker, #936f38)',
              fontSize: '0.875rem',
              marginRight: '8px',
            }}
            title="You are offline. Changes will be saved when you reconnect."
          >
            <span style={{ fontSize: '0.75rem' }}>⚠</span>
            Offline
          </span>
        )}
        {showConnectionStatus && connectionStatus.justReconnected && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-success-lighter, #ecf3ec)',
              color: 'var(--color-success-darker, #4d8055)',
              fontSize: '0.875rem',
              marginRight: '8px',
            }}
          >
            <span style={{ fontSize: '0.75rem' }}>✓</span>
            Back online
          </span>
        )}
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
        {showDraftBadge && (
          <span
            style={{
              fontSize: '0.75rem',
              color: '#71767a',
              opacity: 0.8,
              transition: 'opacity 0.3s',
            }}
          >
            Draft backed up
          </span>
        )}
        {showAutosaveIndicator && (
          <div className={`autosave-indicator ${autosaveStatus}`}>
            <span className="autosave-dot" />
            <span>
              {autosaveStatus === 'saving' && 'Saving...'}
              {autosaveStatus === 'saved' && 'Saved'}
              {autosaveStatus === 'error' && 'Save failed'}
              {autosaveStatus === 'idle' && (lastSavedAt ? `Saved ${formatLastSaved(lastSavedAt)}` : 'Autosave on')}
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
});
