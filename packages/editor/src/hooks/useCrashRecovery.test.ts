/**
 * Tests for useCrashRecovery hook
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCrashRecovery } from './useCrashRecovery';
import {
  putSnapshot,
  getSnapshot,
  resetDBCache,
  clearAllSnapshots,
  type RecoverySnapshot,
} from '../lib/indexeddb';
import type { UseEditorStateMachineReturn } from './useEditorStateMachine';

// Mock resource-loader
vi.mock('../lib/grapesjs/resource-loader', () => ({
  loadUSWDSResources: vi.fn().mockResolvedValue(undefined),
}));

function createMockEditor() {
  return {
    getProjectData: vi.fn(() => ({ pages: [], styles: [], assets: [] })),
    getHtml: vi.fn(() => '<div>test</div>'),
    loadProjectData: vi.fn(),
    refresh: vi.fn(),
    Canvas: { getDocument: vi.fn() },
    Pages: { getAll: vi.fn(() => []) },
  };
}

function createMockStateMachine(overrides: Partial<UseEditorStateMachineReturn> = {}): UseEditorStateMachineReturn {
  return {
    state: {
      status: 'ready',
      prototype: null,
      dirty: false,
      error: null,
      meta: {},
      previousStatus: null,
      lastSavedAt: null,
    },
    dispatch: vi.fn(),
    canSave: true,
    canSwitchPage: true,
    canAutosave: false,
    canModifyContent: true,
    isLoading: false,
    isBusy: false,
    loadPrototype: vi.fn(),
    prototypeLoaded: vi.fn(),
    prototypeLoadFailed: vi.fn(),
    createPrototype: vi.fn(),
    prototypeCreated: vi.fn(),
    prototypeCreateFailed: vi.fn(),
    editorInitializing: vi.fn(),
    editorReady: vi.fn(),
    contentChanged: vi.fn(),
    markClean: vi.fn(),
    saveStart: vi.fn(),
    saveSuccess: vi.fn(),
    saveFailed: vi.fn(),
    pageSwitchStart: vi.fn(),
    pageSwitchComplete: vi.fn(),
    restoreVersionStart: vi.fn(),
    restoreVersionComplete: vi.fn(),
    restoreVersionFailed: vi.fn(),
    clearError: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<RecoverySnapshot> = {}): RecoverySnapshot {
  return {
    prototypeId: 'test-slug',
    projectData: { pages: [{ id: 'p1' }], styles: [], assets: [] },
    htmlContent: '<div>recovered</div>',
    prototypeName: 'Test Proto',
    savedAt: Date.now(),
    serverSavedAt: null,
    ...overrides,
  };
}

describe('useCrashRecovery', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    resetDBCache();
    await clearAllSnapshots();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // No banner when no snapshot
  // --------------------------------------------------------------------------

  it('should not show recovery banner when no snapshot exists', async () => {
    const editorRef = { current: createMockEditor() };
    const stateMachine = createMockStateMachine();

    const { result } = renderHook(() =>
      useCrashRecovery({
        editorRef: editorRef as any,
        stateMachine,
        slug: 'test-slug',
        isDemoMode: false,
        localPrototype: null,
        prototypeName: 'Test',
        editorKey: 'key-1',
      })
    );

    // Allow the effect to run
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.recoveryAvailable).toBe(false);
    expect(result.current.recoveryTimestamp).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Banner shows when snapshot is newer than server save
  // --------------------------------------------------------------------------

  it('should show recovery banner when snapshot is newer than server save', async () => {
    // Pre-populate a snapshot
    await putSnapshot(makeSnapshot({ savedAt: Date.now() - 1000 }));

    const editorRef = { current: createMockEditor() };
    const stateMachine = createMockStateMachine({
      state: {
        status: 'ready',
        prototype: null,
        dirty: false,
        error: null,
        meta: {},
        previousStatus: null,
        lastSavedAt: Date.now() - 60000, // older than snapshot
      },
    });

    const { result } = renderHook(() =>
      useCrashRecovery({
        editorRef: editorRef as any,
        stateMachine,
        slug: 'test-slug',
        isDemoMode: false,
        localPrototype: null,
        prototypeName: 'Test',
        editorKey: 'key-1',
      })
    );

    await waitFor(() => {
      expect(result.current.recoveryAvailable).toBe(true);
    });

    expect(result.current.recoveryTimestamp).not.toBeNull();
  });

  // --------------------------------------------------------------------------
  // Restore loads projectData into editor
  // --------------------------------------------------------------------------

  it('should load projectData into editor on restore', async () => {
    const snapshotData = { pages: [{ id: 'restored' }], styles: [], assets: [] };
    await putSnapshot(makeSnapshot({ projectData: snapshotData }));

    const mockEditor = createMockEditor();
    const editorRef = { current: mockEditor };
    const stateMachine = createMockStateMachine();

    const { result } = renderHook(() =>
      useCrashRecovery({
        editorRef: editorRef as any,
        stateMachine,
        slug: 'test-slug',
        isDemoMode: false,
        localPrototype: null,
        prototypeName: 'Test',
        editorKey: 'key-1',
      })
    );

    await waitFor(() => {
      expect(result.current.recoveryAvailable).toBe(true);
    });

    await act(async () => {
      await result.current.restoreRecovery();
    });

    expect(mockEditor.loadProjectData).toHaveBeenCalledWith(snapshotData);
    expect(mockEditor.refresh).toHaveBeenCalled();
    expect(stateMachine.contentChanged).toHaveBeenCalled();
    expect(result.current.recoveryAvailable).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Dismiss deletes snapshot
  // --------------------------------------------------------------------------

  it('should delete snapshot on dismiss', async () => {
    await putSnapshot(makeSnapshot());

    const editorRef = { current: createMockEditor() };
    const stateMachine = createMockStateMachine();

    const { result } = renderHook(() =>
      useCrashRecovery({
        editorRef: editorRef as any,
        stateMachine,
        slug: 'test-slug',
        isDemoMode: false,
        localPrototype: null,
        prototypeName: 'Test',
        editorKey: 'key-1',
      })
    );

    await waitFor(() => {
      expect(result.current.recoveryAvailable).toBe(true);
    });

    await act(async () => {
      await result.current.dismissRecovery();
    });

    expect(result.current.recoveryAvailable).toBe(false);

    // Verify the snapshot was actually deleted from IndexedDB
    const remaining = await getSnapshot('test-slug');
    expect(remaining).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Debounced snapshot writes
  // --------------------------------------------------------------------------

  it('should write snapshot after debounce period', async () => {
    const mockEditor = createMockEditor();
    const editorRef = { current: mockEditor };
    const stateMachine = createMockStateMachine();

    const { result } = renderHook(() =>
      useCrashRecovery({
        editorRef: editorRef as any,
        stateMachine,
        slug: 'my-proto',
        isDemoMode: false,
        localPrototype: null,
        prototypeName: 'My Proto',
        editorKey: 'key-1',
      })
    );

    // Allow initial effects to settle
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Trigger content change
    act(() => {
      result.current.onContentChange();
    });

    // Snapshot should not exist yet (debounce hasn't fired)
    const before = await getSnapshot('my-proto');
    expect(before).toBeNull();

    // Advance past debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    const after = await getSnapshot('my-proto');
    expect(after).not.toBeNull();
    expect(after!.prototypeName).toBe('My Proto');
  });

  // --------------------------------------------------------------------------
  // Clear after save
  // --------------------------------------------------------------------------

  it('should clear recovery data after server save', async () => {
    await putSnapshot(makeSnapshot({ prototypeId: 'saved-proto' }));

    const editorRef = { current: createMockEditor() };
    const stateMachine = createMockStateMachine();

    const { result } = renderHook(() =>
      useCrashRecovery({
        editorRef: editorRef as any,
        stateMachine,
        slug: 'saved-proto',
        isDemoMode: false,
        localPrototype: null,
        prototypeName: 'Test',
        editorKey: 'key-1',
      })
    );

    await act(async () => {
      await result.current.clearRecoveryData();
    });

    const remaining = await getSnapshot('saved-proto');
    expect(remaining).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Clear after save hides the banner (regression: banner stayed after Save)
  // --------------------------------------------------------------------------

  it('should hide recovery banner when clearRecoveryData is called', async () => {
    await putSnapshot(makeSnapshot());

    const editorRef = { current: createMockEditor() };
    const stateMachine = createMockStateMachine();

    const { result } = renderHook(() =>
      useCrashRecovery({
        editorRef: editorRef as any,
        stateMachine,
        slug: 'test-slug',
        isDemoMode: false,
        localPrototype: null,
        prototypeName: 'Test',
        editorKey: 'key-1',
      })
    );

    // Wait for banner to appear
    await waitFor(() => {
      expect(result.current.recoveryAvailable).toBe(true);
    });

    // Simulate what happens when user clicks Save (not Restore/Dismiss)
    await act(async () => {
      await result.current.clearRecoveryData();
    });

    // Banner should be hidden
    expect(result.current.recoveryAvailable).toBe(false);
    expect(result.current.recoveryTimestamp).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Demo mode key strategy
  // --------------------------------------------------------------------------

  it('should use demo-prefixed key in demo mode', async () => {
    const mockEditor = createMockEditor();
    const editorRef = { current: mockEditor };
    const stateMachine = createMockStateMachine();

    const { result } = renderHook(() =>
      useCrashRecovery({
        editorRef: editorRef as any,
        stateMachine,
        slug: undefined,
        isDemoMode: true,
        localPrototype: { id: 'local-123', name: 'Demo', htmlContent: '', createdAt: '', updatedAt: '' },
        prototypeName: 'Demo Proto',
        editorKey: 'key-1',
      })
    );

    act(() => {
      result.current.onContentChange();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    const snapshot = await getSnapshot('demo-local-123');
    expect(snapshot).not.toBeNull();
    expect(snapshot!.prototypeName).toBe('Demo Proto');
  });

  // --------------------------------------------------------------------------
  // No false snapshot on lifecycle events without changes
  // --------------------------------------------------------------------------

  it('should not write snapshot on visibilitychange if no content changes were made', async () => {
    const mockEditor = createMockEditor();
    const editorRef = { current: mockEditor };
    const stateMachine = createMockStateMachine();

    renderHook(() =>
      useCrashRecovery({
        editorRef: editorRef as any,
        stateMachine,
        slug: 'no-edit-proto',
        isDemoMode: false,
        localPrototype: null,
        prototypeName: 'Test',
        editorKey: 'key-1',
      })
    );

    // Allow initial effects to settle
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Simulate tab becoming hidden — should NOT write a snapshot
    // because no content changes were made
    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Reset hidden
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });

    const snapshot = await getSnapshot('no-edit-proto');
    expect(snapshot).toBeNull();
  });
});
