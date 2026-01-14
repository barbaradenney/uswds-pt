/**
 * Version History Panel
 * Sidebar component for viewing and restoring prototype versions
 */

import { useState } from 'react';
import { formatRelativeTime } from '../lib/date';
import type { PrototypeVersion } from '../hooks/useVersionHistory';

interface VersionHistoryPanelProps {
  versions: PrototypeVersion[];
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;
  onRestore: (versionNumber: number) => Promise<boolean>;
  onRefresh: () => void;
  onClose: () => void;
}

export function VersionHistoryPanel({
  versions,
  isLoading,
  isRestoring,
  error,
  onRestore,
  onRefresh,
  onClose,
}: VersionHistoryPanelProps) {
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const handleRestore = async (versionNumber: number) => {
    setRestoreError(null);
    const success = await onRestore(versionNumber);
    if (success) {
      setConfirmRestore(null);
    } else {
      setRestoreError('Failed to restore version. Please try again.');
    }
  };

  const handleCancelRestore = () => {
    setConfirmRestore(null);
    setRestoreError(null);
  };

  return (
    <div className="version-history-panel">
      <div className="version-history-header">
        <h3>Version History</h3>
        <button
          className="btn"
          onClick={onClose}
          aria-label="Close version history"
          style={{ padding: '4px 8px', minWidth: 'auto' }}
        >
          &times;
        </button>
      </div>

      <div className="version-history-content">
        {error && (
          <div className="version-history-error">
            {error}
            <button className="btn btn-secondary" onClick={onRefresh}>
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="version-history-loading">
            <div className="loading-spinner" />
            <p>Loading versions...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="version-history-empty">
            <p>No previous versions yet.</p>
            <p className="version-history-hint">
              Versions are created automatically when you save.
            </p>
          </div>
        ) : (
          <ul className="version-list">
            {versions.map((version) => (
              <li key={version.id} className="version-item">
                {confirmRestore === version.versionNumber ? (
                  <div className="version-confirm">
                    <p>Restore to version {version.versionNumber}?</p>
                    <p className="version-confirm-hint">
                      Your current work will be saved as a new version.
                    </p>
                    {restoreError && (
                      <p className="version-restore-error">{restoreError}</p>
                    )}
                    <div className="version-confirm-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={handleCancelRestore}
                        disabled={isRestoring}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleRestore(version.versionNumber)}
                        disabled={isRestoring}
                      >
                        {isRestoring ? 'Restoring...' : 'Restore'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="version-info">
                      <span className="version-number">
                        Version {version.versionNumber}
                      </span>
                      <span className="version-date">
                        {formatRelativeTime(version.createdAt)}
                      </span>
                    </div>
                    <button
                      className="btn btn-secondary version-restore-btn"
                      onClick={() => setConfirmRestore(version.versionNumber)}
                      disabled={isRestoring}
                    >
                      Restore
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
