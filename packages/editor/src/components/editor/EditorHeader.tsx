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
  /** Whether push to GitHub is available */
  canPush?: boolean;
  /** Whether handoff push is available */
  canHandoff?: boolean;
  /** Whether a push is in progress */
  isPushing?: boolean;
  /** Whether there are unpushed changes */
  hasUnpushedChanges?: boolean;
  /** Callback to trigger push */
  onPush?: () => void;
  /** Callback to trigger handoff push */
  onPushHandoff?: () => void;
  /** Result from the last successful push */
  lastPushResult?: { commitUrl: string; branch: string } | null;
  /** Callback to dismiss push result */
  onDismissPushResult?: () => void;
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
  canPush = false,
  canHandoff = false,
  isPushing = false,
  hasUnpushedChanges = false,
  onPush,
  onPushHandoff,
  lastPushResult = null,
  onDismissPushResult,
}: EditorHeaderProps) {
  const connectionStatus = useConnectionStatus();

  // Push dropdown state
  const [showPushMenu, setShowPushMenu] = useState(false);
  const pushDropdownRef = useRef<HTMLDivElement>(null);
  const showPushDropdown = canPush || canHandoff;

  // Close push dropdown on outside click
  useEffect(() => {
    if (!showPushMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pushDropdownRef.current && !pushDropdownRef.current.contains(e.target as Node)) {
        setShowPushMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPushMenu]);

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
        {/* Status area — left-aligned before undo/redo */}
        <div className="editor-header-status-area" aria-live="polite">
          {lastPushResult && (
            <span className="push-success" role="status">
              <span style={{ color: '#2e8540' }}>&#10003;</span>
              {' '}Pushed to {lastPushResult.branch.replace(/^(uswds-pt|handoff)\//, '')}
              {' '}&middot;{' '}
              <a
                href={lastPushResult.commitUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#005ea2' }}
              >
                View commit
              </a>
              <button
                className="push-success-dismiss"
                onClick={onDismissPushResult}
                aria-label="Dismiss"
              >
                &times;
              </button>
            </span>
          )}
          {!lastPushResult && showDraftBadge && (
            <span role="status" className="editor-header-draft-badge">
              Draft backed up
            </span>
          )}
          {!lastPushResult && !showDraftBadge && showAutosaveIndicator && (
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
        </div>
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
          <span role="alert" className="editor-header-error">
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
        {/* Push to GitHub (dropdown) */}
        {showPushDropdown && (
          <div className="push-dropdown" ref={pushDropdownRef}>
            <button
              className="btn btn-secondary editor-header-btn push-button"
              onClick={() => setShowPushMenu(prev => !prev)}
              disabled={isPushing}
              aria-label="Push to GitHub"
              aria-expanded={showPushMenu}
              aria-haspopup="true"
            >
              {isPushing ? (
                <>
                  <span className="push-spinner" />
                  Pushing...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  Push
                  {hasUnpushedChanges && <span className="push-indicator" />}
                  <span style={{ marginLeft: '2px', fontSize: '0.625rem' }}>&#9662;</span>
                </>
              )}
            </button>
            {showPushMenu && (
              <div className="push-dropdown-menu" role="menu">
                <button
                  className="push-dropdown-item"
                  role="menuitem"
                  disabled={!canPush || !hasUnpushedChanges}
                  onClick={() => {
                    setShowPushMenu(false);
                    onPush?.();
                  }}
                >
                  Push prototype
                </button>
                <button
                  className="push-dropdown-item"
                  role="menuitem"
                  disabled={!canHandoff}
                  onClick={() => {
                    setShowPushMenu(false);
                    onPushHandoff?.();
                  }}
                >
                  Hand off to development
                </button>
              </div>
            )}
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
