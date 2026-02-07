/**
 * Tests for IndexedDB crash recovery wrapper
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  openRecoveryDB,
  putSnapshot,
  getSnapshot,
  deleteSnapshot,
  clearAllSnapshots,
  cleanupStaleSnapshots,
  isIndexedDBAvailable,
  resetDBCache,
  type RecoverySnapshot,
} from './indexeddb';

function makeSnapshot(overrides: Partial<RecoverySnapshot> = {}): RecoverySnapshot {
  return {
    prototypeId: 'test-proto',
    projectData: { pages: [], styles: [], assets: [] },
    htmlContent: '<div>hello</div>',
    prototypeName: 'Test Prototype',
    savedAt: Date.now(),
    serverSavedAt: null,
    ...overrides,
  };
}

describe('indexeddb', () => {
  beforeEach(() => {
    resetDBCache();
  });

  describe('isIndexedDBAvailable', () => {
    it('should return true when indexedDB is available', () => {
      expect(isIndexedDBAvailable()).toBe(true);
    });
  });

  describe('openRecoveryDB', () => {
    it('should open the database and create the store', async () => {
      const db = await openRecoveryDB();
      expect(db).toBeDefined();
      expect(db.objectStoreNames.contains('recovery-snapshots')).toBe(true);
    });

    it('should return cached connection on second call', async () => {
      const db1 = await openRecoveryDB();
      const db2 = await openRecoveryDB();
      expect(db1).toBe(db2);
    });
  });

  describe('putSnapshot / getSnapshot', () => {
    it('should store and retrieve a snapshot', async () => {
      const snapshot = makeSnapshot();
      await putSnapshot(snapshot);

      const retrieved = await getSnapshot('test-proto');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.prototypeId).toBe('test-proto');
      expect(retrieved!.htmlContent).toBe('<div>hello</div>');
      expect(retrieved!.prototypeName).toBe('Test Prototype');
    });

    it('should return null for non-existent key', async () => {
      const result = await getSnapshot('does-not-exist');
      expect(result).toBeNull();
    });

    it('should overwrite existing snapshot with same key', async () => {
      await putSnapshot(makeSnapshot({ htmlContent: 'original' }));
      await putSnapshot(makeSnapshot({ htmlContent: 'updated' }));

      const retrieved = await getSnapshot('test-proto');
      expect(retrieved!.htmlContent).toBe('updated');
    });

    it('should store multiple snapshots with different keys', async () => {
      await putSnapshot(makeSnapshot({ prototypeId: 'proto-1' }));
      await putSnapshot(makeSnapshot({ prototypeId: 'proto-2' }));

      const s1 = await getSnapshot('proto-1');
      const s2 = await getSnapshot('proto-2');
      expect(s1).not.toBeNull();
      expect(s2).not.toBeNull();
      expect(s1!.prototypeId).toBe('proto-1');
      expect(s2!.prototypeId).toBe('proto-2');
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete an existing snapshot', async () => {
      await putSnapshot(makeSnapshot());
      await deleteSnapshot('test-proto');

      const result = await getSnapshot('test-proto');
      expect(result).toBeNull();
    });

    it('should not throw when deleting non-existent key', async () => {
      await expect(deleteSnapshot('does-not-exist')).resolves.not.toThrow();
    });
  });

  describe('clearAllSnapshots', () => {
    it('should clear all snapshots', async () => {
      await putSnapshot(makeSnapshot({ prototypeId: 'proto-1' }));
      await putSnapshot(makeSnapshot({ prototypeId: 'proto-2' }));

      await clearAllSnapshots();

      const s1 = await getSnapshot('proto-1');
      const s2 = await getSnapshot('proto-2');
      expect(s1).toBeNull();
      expect(s2).toBeNull();
    });
  });

  describe('cleanupStaleSnapshots', () => {
    it('should delete snapshots older than max age', async () => {
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      await putSnapshot(makeSnapshot({ prototypeId: 'old', savedAt: eightDaysAgo }));
      await putSnapshot(makeSnapshot({ prototypeId: 'recent', savedAt: oneHourAgo }));

      const deleted = await cleanupStaleSnapshots();
      expect(deleted).toBe(1);

      expect(await getSnapshot('old')).toBeNull();
      expect(await getSnapshot('recent')).not.toBeNull();
    });

    it('should return 0 when no stale snapshots exist', async () => {
      await putSnapshot(makeSnapshot({ savedAt: Date.now() }));
      const deleted = await cleanupStaleSnapshots();
      expect(deleted).toBe(0);
    });
  });
});
