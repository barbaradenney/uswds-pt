/**
 * Editor Header Component
 *
 * Contains the top navigation bar for the editor with:
 * - Back button
 * - Prototype name (read-only)
 * - Undo/Redo buttons
 * - Action buttons (Preview, Export, History, Save)
 * - Autosave indicator
 * - Error display
 */

import { memo, useState, useEffect, useRef } from 'react';
import type { UseEditorAutosaveReturn } from '../../hooks/useEditorAutosave';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import { mod } from '../../lib/platform';

export interface EditorHeaderProps {
  /** Prototype name (read-only) */
  name: string;
  /** Callback for back button */
  onBack: () => void;
  /** Callback for preview button */
  onPreview: () => void;
  /** Callback for export button */
  onExport: () => void;
  /** Callback for save button */
  onSave: () => void;
  /** Callback for history button toggle */
  onToggleHistory: () => void;
  /** Whether history panel is open */
  showVersionHistory: boolean;
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
  /** Callback for undo */
  onUndo?: () => void;
  /** Callback for redo */
  onRedo?: () => void;
  /** Whether undo is available */
  canUndo?: boolean;
  /** Whether redo is available */
  canRedo?: boolean;
  /** Callback to show keyboard shortcuts dialog */
  onShowShortcuts?: () => void;
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
  onBack,
  onPreview,
  onExport,
  onSave,
  onToggleHistory,
  showVersionHistory,
  showHistoryButton,
  showAutosaveIndicator,
  autosaveStatus,
  lastSavedAt,
  isSaving,
  isSaveDisabled,
  error,
  showConnectionStatus = false,
  lastSnapshotAt = null,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onShowShortcuts,
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

  // Force re-render every 30s to keep the relative "Saved Xm ago" timestamp fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastSavedAt) return;
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  return (
    <header className="editor-header">
      <div className="editor-header-left">
        <button
          className="btn btn-secondary editor-header-btn"
          onClick={onBack}
          aria-label="Back to prototype list"
        >
          ← Back
        </button>
        <span className="editor-title">
          {name || 'Untitled Prototype'}
        </span>
        {/* Undo/Redo */}
        {onUndo && (
          <div className="editor-header-undo-redo">
            <button
              className="btn btn-secondary editor-header-btn editor-header-btn--icon"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo"
              title={`Undo (${mod}+Z)`}
            >
              ↩
            </button>
            <button
              className="btn btn-secondary editor-header-btn editor-header-btn--icon"
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Redo"
              title={`Redo (${mod}+Shift+Z)`}
            >
              ↪
            </button>
          </div>
        )}
      </div>

      <div className="editor-header-right">
        {/* Connection status indicator */}
        {showConnectionStatus && !connectionStatus.isOnline && (
          <span
            role="status"
            className="editor-header-status editor-header-status--offline"
            title="You are offline. Changes will be saved when you reconnect."
          >
            <span style={{ fontSize: '0.75rem' }}>⚠</span>
            Offline
          </span>
        )}
        {showConnectionStatus && connectionStatus.justReconnected && (
          <span
            role="status"
            className="editor-header-status editor-header-status--online"
          >
            <span style={{ fontSize: '0.75rem' }}>✓</span>
            Back online
          </span>
        )}
        {error && (
          <span role="alert" style={{ color: 'var(--color-error)', marginRight: '12px' }}>
            {error}
          </span>
        )}
        <button className="btn btn-secondary editor-header-btn" onClick={onPreview}>
          Preview
        </button>
        <button className="btn btn-secondary editor-header-btn" onClick={onExport}>
          Export
        </button>
        {showHistoryButton && (
          <button
            className={`btn btn-secondary editor-header-btn editor-header-btn--icon ${showVersionHistory ? 'active' : ''}`}
            onClick={onToggleHistory}
            aria-label="Version History"
            title="Version History"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
          </button>
        )}
        {showDraftBadge && (
          <span
            role="status"
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
          <div className={`autosave-indicator ${autosaveStatus}`} aria-live="polite">
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
        {onShowShortcuts && (
          <button
            className="btn btn-secondary editor-header-btn editor-header-btn--icon"
            onClick={onShowShortcuts}
            aria-label="Keyboard shortcuts"
            title="Keyboard Shortcuts (?)"
          >
            ?
          </button>
        )}
        <button
          className="btn btn-primary editor-header-btn"
          onClick={onSave}
          disabled={isSaveDisabled}
        >
          {isSaving ? 'Saving...' : isSaveDisabled ? 'Loading...' : 'Save'}
        </button>
      </div>
    </header>
  );
});
