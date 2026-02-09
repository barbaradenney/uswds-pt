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
import type { PrototypeBranch } from '@uswds-pt/shared';
import type { UseEditorAutosaveReturn } from '../../hooks/useEditorAutosave';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import { mod } from '../../lib/platform';

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
  /** Whether to show branch selector */
  showBranchSelector?: boolean;
  /** Available branches */
  branches?: PrototypeBranch[];
  /** Currently active branch ID (null = main) */
  activeBranchId?: string | null;
  /** Whether branch switch is in progress */
  isSwitchingBranch?: boolean;
  /** Callback when user selects a branch */
  onSwitchBranch?: (branchSlug: string) => void;
  /** Callback when user selects main */
  onSwitchToMain?: () => void;
  /** Callback to create a new branch */
  onCreateBranch?: () => void;
  /** Whether to show GitHub button */
  showGitHubButton?: boolean;
  /** Callback for GitHub button */
  onGitHub?: () => void;
  /** GitHub repo connection info for link display */
  gitHubRepo?: { owner: string; name: string; branch?: string; filePath?: string } | null;
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
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onShowShortcuts,
  showBranchSelector = false,
  branches = [],
  activeBranchId = null,
  isSwitchingBranch = false,
  onSwitchBranch,
  onSwitchToMain,
  onCreateBranch,
  showGitHubButton = false,
  onGitHub,
  gitHubRepo = null,
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
          aria-label="Prototype name"
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: '1.125rem',
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: '4px',
          }}
        />
        {/* Branch selector */}
        {showBranchSelector && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
            <select
              value={activeBranchId || '__main__'}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__main__') {
                  onSwitchToMain?.();
                } else {
                  const branch = branches.find(b => b.id === val);
                  if (branch) onSwitchBranch?.(branch.slug);
                }
              }}
              disabled={isSwitchingBranch}
              aria-label="Select branch"
              style={{
                padding: '4px 8px',
                fontSize: '0.8125rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: activeBranchId ? '#e7f2ff' : '#fff',
                cursor: isSwitchingBranch ? 'wait' : 'pointer',
                maxWidth: '160px',
              }}
            >
              <option value="__main__">main</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <button
              className="btn btn-secondary"
              onClick={onCreateBranch}
              disabled={isSwitchingBranch}
              aria-label="Create branch"
              title="Create new branch"
              style={{ padding: '4px 8px', fontSize: '0.8125rem', minWidth: 'auto' }}
            >
              +
            </button>
          </div>
        )}
        {/* Undo/Redo */}
        {onUndo && (
          <div style={{ display: 'flex', gap: '2px', marginLeft: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo"
              title={`Undo (${mod}+Z)`}
              style={{ padding: '4px 8px', fontSize: '0.875rem', minWidth: 'auto' }}
            >
              ↩
            </button>
            <button
              className="btn btn-secondary"
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Redo"
              title={`Redo (${mod}+Shift+Z)`}
              style={{ padding: '4px 8px', fontSize: '0.875rem', minWidth: 'auto' }}
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
        {onShowShortcuts && (
          <button
            className="btn btn-secondary"
            onClick={onShowShortcuts}
            aria-label="Keyboard shortcuts"
            title="Keyboard Shortcuts (?)"
            style={{ padding: '4px 10px', fontSize: '0.875rem', minWidth: 'auto' }}
          >
            ?
          </button>
        )}
        {showGitHubButton && onGitHub && (
          <button
            className="btn btn-secondary"
            onClick={onGitHub}
            aria-label="GitHub"
            title={gitHubRepo ? `Connected to ${gitHubRepo.owner}/${gitHubRepo.name}` : 'Connect GitHub'}
            style={{ padding: '4px 10px', fontSize: '0.875rem', minWidth: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {gitHubRepo ? '' : 'GitHub'}
          </button>
        )}
        {/* GitHub repo link (visible when connected + on a branch) */}
        {gitHubRepo && activeBranchId && (
          <a
            href={`https://github.com/${encodeURIComponent(gitHubRepo.owner)}/${encodeURIComponent(gitHubRepo.name)}/blob/uswds-pt/${encodeURIComponent(branches.find(b => b.id === activeBranchId)?.slug || 'main')}/${(gitHubRepo.filePath || 'prototype.html').split('/').map(encodeURIComponent).join('/')}`}
            target="_blank"
            rel="noopener noreferrer"
            title="View on GitHub"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: '#1a4480',
              textDecoration: 'none',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: '#f0f0f0',
            }}
          >
            ↗ GitHub
          </a>
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
