/**
 * Version History Panel
 * Sidebar component for viewing and restoring prototype versions
 */

import { useState } from 'react';
import { formatRelativeTime } from '../lib/date';
import type { PrototypeVersion } from '../hooks/useVersionHistory';
import { VersionDiffView } from './VersionDiffView';

interface VersionHistoryPanelProps {
  slug: string;
  versions: PrototypeVersion[];
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;
  onRestore: (versionNumber: number) => Promise<boolean>;
  onUpdateLabel: (versionNumber: number, label: string) => Promise<boolean>;
  onRefresh: () => void;
  onClose: () => void;
}

export function VersionHistoryPanel({
  slug,
  versions,
  isLoading,
  isRestoring,
  error,
  onRestore,
  onUpdateLabel,
  onRefresh,
  onClose,
}: VersionHistoryPanelProps) {
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [labelValue, setLabelValue] = useState('');
  const [labelError, setLabelError] = useState<string | null>(null);
  const [comparingVersion, setComparingVersion] = useState<number | null>(null);

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

  const handleStartEditLabel = (version: PrototypeVersion) => {
    setEditingLabel(version.versionNumber);
    setLabelValue(version.label || '');
    setLabelError(null);
  };

  const handleSaveLabel = async (versionNumber: number) => {
    setLabelError(null);
    const success = await onUpdateLabel(versionNumber, labelValue);
    if (success) {
      setEditingLabel(null);
    } else {
      setLabelError('Failed to save label.');
    }
  };

  const handleCancelEditLabel = () => {
    setEditingLabel(null);
    setLabelValue('');
  };

  return (
    <div className="version-history-panel" role="complementary" aria-label="Version history">
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
          <ul className="version-list" aria-label="Version history">
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
                  <div className="version-item-content">
                    <div className="version-info">
                      <span className="version-number">
                        Version {version.versionNumber}
                      </span>
                      {editingLabel === version.versionNumber ? (
                        <div className="version-label-edit">
                          <input
                            type="text"
                            className="version-label-input"
                            value={labelValue}
                            onChange={(e) => setLabelValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveLabel(version.versionNumber);
                              if (e.key === 'Escape') handleCancelEditLabel();
                            }}
                            placeholder="Label this version..."
                            aria-label="Label this version"
                            maxLength={255}
                            autoFocus
                          />
                          {labelError && (
                            <p className="version-restore-error">{labelError}</p>
                          )}
                          <div className="version-label-actions">
                            <button
                              className="btn btn-secondary version-label-btn"
                              onClick={handleCancelEditLabel}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn btn-primary version-label-btn"
                              onClick={() => handleSaveLabel(version.versionNumber)}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {version.label && (
                            <span className="version-label">{version.label}</span>
                          )}
                          <span className="version-date">
                            {formatRelativeTime(version.createdAt)}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="version-actions">
                      {editingLabel !== version.versionNumber && (
                        <>
                          <button
                            className="btn btn-secondary version-action-btn"
                            onClick={() => handleStartEditLabel(version)}
                            title="Label this version"
                            disabled={isRestoring}
                          >
                            {version.label ? 'Edit' : 'Label'}
                          </button>
                          <button
                            className="btn btn-secondary version-action-btn"
                            onClick={() => setComparingVersion(version.versionNumber)}
                            title="Compare with current"
                            disabled={isRestoring}
                          >
                            Compare
                          </button>
                          <button
                            className="btn btn-secondary version-action-btn"
                            onClick={() => setConfirmRestore(version.versionNumber)}
                            disabled={isRestoring}
                          >
                            Restore
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {comparingVersion !== null && (
        <VersionDiffView
          slug={slug}
          version1={comparingVersion}
          version2="current"
          onClose={() => setComparingVersion(null)}
        />
      )}
    </div>
  );
}
