/**
 * Crash Recovery Hook
 *
 * Orchestrates IndexedDB-based crash recovery for the prototype editor.
 * Saves editor snapshots on a debounced timer and on lifecycle events
 * (beforeunload, visibilitychange, unmount). On next load, checks for
 * a snapshot newer than the server-saved version and offers recovery.
 *
 * All operations are best-effort — if IndexedDB is unavailable the
 * hook is a no-op with no impact on the editor.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createDebugLogger } from '@uswds-pt/shared';
import {
  isIndexedDBAvailable,
  putSnapshot,
  getSnapshot,
  deleteSnapshot,
  cleanupStaleSnapshots,
  type RecoverySnapshot,
} from '../lib/indexeddb';
import { loadUSWDSResources } from '../lib/grapesjs/resource-loader';
import type { UseEditorStateMachineReturn } from './useEditorStateMachine';
import type { EditorInstance } from '../types/grapesjs';
import type { LocalPrototype } from '../lib/localStorage';

const debug = createDebugLogger('CrashRecovery');

const SNAPSHOT_DEBOUNCE_MS = 3000;

// ============================================================================
// Types
// ============================================================================

export interface UseCrashRecoveryOptions {
  editorRef: React.MutableRefObject<EditorInstance | null>;
  stateMachine: UseEditorStateMachineReturn;
  slug: string | undefined;
  isDemoMode: boolean;
  localPrototype: LocalPrototype | null;
  prototypeName: string;
  editorKey: string;
}

export interface UseCrashRecoveryReturn {
  /** Whether recovery data is available and should show the banner */
  recoveryAvailable: boolean;
  /** Timestamp of the recovery snapshot */
  recoveryTimestamp: Date | null;
  /** Restore the recovery snapshot into the editor */
  restoreRecovery: () => Promise<void>;
  /** Dismiss the recovery banner and delete the snapshot */
  dismissRecovery: () => Promise<void>;
  /** Trigger a debounced snapshot write (call on content change) */
  onContentChange: () => void;
  /** Delete recovery data (call after successful server save) */
  clearRecoveryData: () => Promise<void>;
  /** Timestamp of the last successful local draft backup (null if none yet) */
  lastSnapshotAt: Date | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useCrashRecovery({
  editorRef,
  stateMachine,
  slug,
  isDemoMode,
  localPrototype,
  prototypeName,
  editorKey,
}: UseCrashRecoveryOptions): UseCrashRecoveryReturn {
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const [recoveryTimestamp, setRecoveryTimestamp] = useState<Date | null>(null);
  const [recoverySnapshot, setRecoverySnapshot] = useState<RecoverySnapshot | null>(null);
  const [lastSnapshotAt, setLastSnapshotAt] = useState<Date | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPendingChangesRef = useRef(false);
  const available = isIndexedDBAvailable();

  // Compute the stable prototype ID used as the IndexedDB key.
  // Uses a ref so lifecycle handlers (beforeunload, etc.) always read the latest.
  const getPrototypeId = useCallback((): string | null => {
    if (slug) return slug;
    if (isDemoMode && localPrototype?.id) return `demo-${localPrototype.id}`;
    return `unsaved-${editorKey}`;
  }, [slug, isDemoMode, localPrototype?.id, editorKey]);

  const prototypeIdRef = useRef(getPrototypeId());
  prototypeIdRef.current = getPrototypeId();

  // -------------------------------------------------------------------------
  // Snapshot writing
  // -------------------------------------------------------------------------

  const writeSnapshot = useCallback(() => {
    if (!available) return;
    const editor = editorRef.current;
    const protoId = prototypeIdRef.current;
    if (!editor || !protoId) return;

    try {
      const projectData = editor.getProjectData();
      const htmlContent = editor.getHtml();

      const snapshot: RecoverySnapshot = {
        prototypeId: protoId,
        projectData,
        htmlContent,
        prototypeName,
        savedAt: Date.now(),
        serverSavedAt: stateMachine.state.lastSavedAt,
      };

      putSnapshot(snapshot)
        .then(() => {
          hasPendingChangesRef.current = false;
          setLastSnapshotAt(new Date());
        })
        .catch((err) => {
          debug('Snapshot write failed (non-fatal):', err);
        });
    } catch (err) {
      debug('Error creating snapshot (non-fatal):', err);
    }
  }, [available, editorRef, prototypeName, stateMachine.state.lastSavedAt]);

  // Debounced content change handler
  const onContentChange = useCallback(() => {
    if (!available) return;
    hasPendingChangesRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(writeSnapshot, SNAPSHOT_DEBOUNCE_MS);
  }, [available, writeSnapshot]);

  // -------------------------------------------------------------------------
  // Lifecycle flushes (beforeunload, visibilitychange, unmount)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!available) return;

    const flushSnapshot = () => {
      // Cancel any pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      // Only write if there are actual pending changes
      if (hasPendingChangesRef.current) {
        writeSnapshot();
      }
    };

    const handleBeforeUnload = () => {
      flushSnapshot();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        flushSnapshot();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Flush on unmount
      flushSnapshot();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [available, writeSnapshot]);

  // -------------------------------------------------------------------------
  // Recovery check — runs when editor reaches 'ready' state
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!available) return;
    if (stateMachine.state.status !== 'ready') return;

    const protoId = prototypeIdRef.current;
    if (!protoId) return;

    let cancelled = false;

    getSnapshot(protoId)
      .then((snapshot) => {
        if (cancelled || !snapshot) return;

        // Compare snapshot.savedAt with the prototype's updatedAt / lastSavedAt
        const proto = stateMachine.state.prototype;
        const serverTime = proto?.updatedAt
          ? new Date(proto.updatedAt).getTime()
          : stateMachine.state.lastSavedAt;

        // Show recovery if snapshot is newer than the last server save
        // (or if there has never been a server save)
        if (!serverTime || snapshot.savedAt > serverTime) {
          debug('Recovery snapshot found:', {
            protoId,
            snapshotAge: Date.now() - snapshot.savedAt,
            serverTime,
          });
          setRecoverySnapshot(snapshot);
          setRecoveryTimestamp(new Date(snapshot.savedAt));
          setRecoveryAvailable(true);
        } else {
          // Snapshot is older than server version — clean up
          debug('Snapshot older than server version, cleaning up');
          deleteSnapshot(protoId).catch(() => {});
        }
      })
      .catch((err) => {
        debug('Recovery check failed (non-fatal):', err);
      });

    return () => {
      cancelled = true;
    };
    // Only run when status transitions to 'ready' — not on every state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, stateMachine.state.status]);

  // -------------------------------------------------------------------------
  // Restore
  // -------------------------------------------------------------------------

  const restoreRecovery = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || !recoverySnapshot) return;

    try {
      debug('Restoring recovery snapshot');
      editor.loadProjectData(recoverySnapshot.projectData as any);
      await loadUSWDSResources(editor);
      editor.refresh();

      // Mark content as dirty so the user can save
      if (stateMachine.canModifyContent) {
        stateMachine.contentChanged();
      }

      // Clean up
      setRecoveryAvailable(false);
      setRecoveryTimestamp(null);
      setRecoverySnapshot(null);

      const protoId = prototypeIdRef.current;
      if (protoId) {
        await deleteSnapshot(protoId);
      }

      debug('Recovery restore complete');
    } catch (err) {
      debug('Recovery restore failed:', err);
    }
  }, [editorRef, recoverySnapshot, stateMachine]);

  // -------------------------------------------------------------------------
  // Dismiss
  // -------------------------------------------------------------------------

  const dismissRecovery = useCallback(async () => {
    setRecoveryAvailable(false);
    setRecoveryTimestamp(null);
    setRecoverySnapshot(null);

    const protoId = prototypeIdRef.current;
    if (protoId) {
      try {
        await deleteSnapshot(protoId);
        debug('Recovery dismissed');
      } catch (err) {
        debug('Dismiss cleanup failed (non-fatal):', err);
      }
    }
  }, []);

  // -------------------------------------------------------------------------
  // Clear (called after successful server save)
  // -------------------------------------------------------------------------

  const clearRecoveryData = useCallback(async () => {
    if (!available) return;

    // Hide the banner immediately
    setRecoveryAvailable(false);
    setRecoveryTimestamp(null);
    setRecoverySnapshot(null);
    hasPendingChangesRef.current = false;

    const protoId = prototypeIdRef.current;
    if (!protoId) return;

    try {
      await deleteSnapshot(protoId);
      debug('Recovery data cleared after save');
    } catch (err) {
      debug('Clear recovery data failed (non-fatal):', err);
    }
  }, [available]);

  // -------------------------------------------------------------------------
  // Migrate key after first save (unsaved-<key> → slug)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!available || !slug) return;

    const oldKey = `unsaved-${editorKey}`;
    // Check if there's data under the old unsaved key
    getSnapshot(oldKey)
      .then(async (snapshot) => {
        if (snapshot) {
          debug('Migrating recovery key:', oldKey, '→', slug);
          // Write with new key, then delete old
          await putSnapshot({ ...snapshot, prototypeId: slug });
          await deleteSnapshot(oldKey);
        }
      })
      .catch((err) => {
        debug('Key migration failed (non-fatal):', err);
      });
    // Only run when slug appears (first save)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, slug]);

  // -------------------------------------------------------------------------
  // Stale snapshot cleanup — remove snapshots older than 7 days on mount
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!available) return;
    cleanupStaleSnapshots().catch(() => {});
  }, [available]);

  // -------------------------------------------------------------------------
  // No-op return when IndexedDB unavailable
  // -------------------------------------------------------------------------

  if (!available) {
    return {
      recoveryAvailable: false,
      recoveryTimestamp: null,
      restoreRecovery: async () => {},
      dismissRecovery: async () => {},
      onContentChange: () => {},
      clearRecoveryData: async () => {},
      lastSnapshotAt: null,
    };
  }

  return {
    recoveryAvailable,
    recoveryTimestamp,
    restoreRecovery,
    dismissRecovery,
    onContentChange,
    clearRecoveryData,
    lastSnapshotAt,
  };
}
