/**
 * IndexedDB Wrapper for Crash Recovery
 *
 * Thin, promise-based wrapper around native IndexedDB for storing
 * editor recovery snapshots. No external dependencies.
 *
 * All operations are best-effort — crash recovery should never block
 * the editor or throw unhandled errors.
 */

import { createDebugLogger } from '@uswds-pt/shared';

const debug = createDebugLogger('IndexedDB');

const DB_NAME = 'uswds-pt-recovery';
const DB_VERSION = 1;
const STORE_NAME = 'recovery-snapshots';

/**
 * Shape of a recovery snapshot stored in IndexedDB.
 */
export interface RecoverySnapshot {
  /** keyPath — slug, "demo-<id>", or "unsaved-<editorKey>" */
  prototypeId: string;
  /** Full editor.getProjectData() */
  projectData: Record<string, unknown>;
  /** editor.getHtml() */
  htmlContent: string;
  /** For display in recovery banner */
  prototypeName: string;
  /** Date.now() when snapshot was taken */
  savedAt: number;
  /** stateMachine.state.lastSavedAt at snapshot time (null if never saved to server) */
  serverSavedAt: number | null;
}

// Cached DB connection
let cachedDb: IDBDatabase | null = null;

/**
 * Check if IndexedDB is available in the current environment.
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Open (or return cached) connection to the recovery database.
 */
export function openRecoveryDB(): Promise<IDBDatabase> {
  if (cachedDb) {
    return Promise.resolve(cachedDb);
  }

  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'prototypeId' });
          debug('Created object store:', STORE_NAME);
        }
      };

      request.onsuccess = () => {
        cachedDb = request.result;

        // Clear cache on close (e.g., version change from another tab)
        cachedDb.onclose = () => {
          cachedDb = null;
        };
        cachedDb.onversionchange = () => {
          cachedDb?.close();
          cachedDb = null;
        };

        debug('Database opened');
        resolve(cachedDb);
      };

      request.onerror = () => {
        debug('Failed to open database:', request.error);
        reject(request.error);
      };
    } catch (err) {
      debug('Error opening database:', err);
      reject(err);
    }
  });
}

/**
 * Insert or replace a recovery snapshot by its prototypeId key.
 */
export async function putSnapshot(snapshot: RecoverySnapshot): Promise<void> {
  try {
    const db = await openRecoveryDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(snapshot);

      request.onsuccess = () => {
        debug('Snapshot saved:', snapshot.prototypeId);
        resolve();
      };
      request.onerror = () => {
        debug('Failed to save snapshot:', request.error);
        reject(request.error);
      };
    });
  } catch (err) {
    // Re-throw so callers know the snapshot was NOT saved.
    // Callers should catch this and avoid treating it as success.
    debug('putSnapshot error (non-fatal):', err);
    throw err;
  }
}

/**
 * Retrieve a recovery snapshot by prototypeId, or null if not found.
 */
export async function getSnapshot(prototypeId: string): Promise<RecoverySnapshot | null> {
  try {
    const db = await openRecoveryDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(prototypeId);

      request.onsuccess = () => {
        resolve(request.result ?? null);
      };
      request.onerror = () => {
        debug('Failed to get snapshot:', request.error);
        reject(request.error);
      };
    });
  } catch (err) {
    debug('getSnapshot error (non-fatal):', err);
    return null;
  }
}

/**
 * Delete a single recovery snapshot by prototypeId.
 */
export async function deleteSnapshot(prototypeId: string): Promise<void> {
  try {
    const db = await openRecoveryDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(prototypeId);

      request.onsuccess = () => {
        debug('Snapshot deleted:', prototypeId);
        resolve();
      };
      request.onerror = () => {
        debug('Failed to delete snapshot:', request.error);
        reject(request.error);
      };
    });
  } catch (err) {
    debug('deleteSnapshot error (non-fatal):', err);
  }
}

/**
 * Delete all recovery snapshots.
 */
export async function clearAllSnapshots(): Promise<void> {
  try {
    const db = await openRecoveryDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        debug('All snapshots cleared');
        resolve();
      };
      request.onerror = () => {
        debug('Failed to clear snapshots:', request.error);
        reject(request.error);
      };
    });
  } catch (err) {
    debug('clearAllSnapshots error (non-fatal):', err);
  }
}

/**
 * Delete snapshots older than the given age (default: 7 days).
 * Best-effort cleanup — failures are silently ignored.
 */
export async function cleanupStaleSnapshots(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
  try {
    const db = await openRecoveryDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();
      const cutoff = Date.now() - maxAgeMs;
      let deleted = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const snapshot = cursor.value as RecoverySnapshot;
          if (snapshot.savedAt < cutoff) {
            cursor.delete();
            deleted++;
            debug('Cleaned up stale snapshot:', snapshot.prototypeId);
          }
          cursor.continue();
        } else {
          if (deleted > 0) {
            debug(`Cleanup complete: ${deleted} stale snapshot(s) removed`);
          }
          resolve(deleted);
        }
      };

      request.onerror = () => {
        debug('Stale snapshot cleanup failed:', request.error);
        reject(request.error);
      };
    });
  } catch (err) {
    debug('cleanupStaleSnapshots error (non-fatal):', err);
    return 0;
  }
}

/**
 * Reset the cached database connection.
 * Useful for testing or after HMR.
 */
export function resetDBCache(): void {
  cachedDb = null;
}
