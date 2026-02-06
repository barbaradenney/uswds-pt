/**
 * Tests for useEditorStateMachine hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useEditorStateMachine,
  editorReducer,
  initialState,
  canSave,
  canSwitchPage,
  canAutosave,
  canModifyContent,
  isLoading,
  isBusy,
  type EditorState,
  type EditorAction,
} from './useEditorStateMachine';
import { mockPrototype } from '../test/fixtures/prototypes';

describe('useEditorStateMachine', () => {
  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('initial state', () => {
    it('should start in uninitialized state', () => {
      const { result } = renderHook(() => useEditorStateMachine());

      expect(result.current.state.status).toBe('uninitialized');
      expect(result.current.state.prototype).toBeNull();
      expect(result.current.state.dirty).toBe(false);
      expect(result.current.state.error).toBeNull();
    });

    it('should have all guard functions return false initially', () => {
      const { result } = renderHook(() => useEditorStateMachine());

      expect(result.current.canSave).toBe(false);
      expect(result.current.canSwitchPage).toBe(false);
      expect(result.current.canAutosave).toBe(false);
      expect(result.current.canModifyContent).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isBusy).toBe(false);
    });
  });

  // ============================================================================
  // Load Prototype Flow Tests
  // ============================================================================

  describe('load prototype flow', () => {
    it('should transition through load flow correctly', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Start loading
      act(() => {
        result.current.loadPrototype('test-slug');
      });

      expect(result.current.state.status).toBe('loading_prototype');
      expect(result.current.state.meta.slug).toBe('test-slug');
      expect(result.current.isLoading).toBe(true);

      // Prototype loaded -> goes to initializing_editor
      act(() => {
        result.current.prototypeLoaded(proto);
      });

      expect(result.current.state.status).toBe('initializing_editor');
      expect(result.current.state.prototype).toEqual(proto);
      // initializing_editor is not a loading state - editor renders so onReady can fire
      expect(result.current.isLoading).toBe(false);

      // Editor ready
      act(() => {
        result.current.editorReady();
      });

      expect(result.current.state.status).toBe('ready');
      expect(result.current.canSave).toBe(true);
      expect(result.current.canSwitchPage).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle load failure', () => {
      const { result } = renderHook(() => useEditorStateMachine());

      act(() => {
        result.current.loadPrototype('test-slug');
      });

      act(() => {
        result.current.prototypeLoadFailed('Not found');
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.error).toBe('Not found');
      expect(result.current.state.previousStatus).toBe('loading_prototype');
    });

    it('should allow recovery from error state', () => {
      const { result } = renderHook(() => useEditorStateMachine());

      // Go to error state
      act(() => {
        result.current.loadPrototype('test-slug');
      });
      act(() => {
        result.current.prototypeLoadFailed('Not found');
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.error).toBe('Not found');

      // Can retry directly from error state by loading again
      act(() => {
        result.current.loadPrototype('new-slug');
      });

      expect(result.current.state.status).toBe('loading_prototype');
      expect(result.current.state.error).toBeNull();
    });
  });

  // ============================================================================
  // Create Prototype Flow Tests
  // ============================================================================

  describe('create prototype flow', () => {
    it('should transition through create flow correctly', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype({ slug: 'new-proto' });

      // Start creating
      act(() => {
        result.current.createPrototype();
      });

      expect(result.current.state.status).toBe('creating_prototype');
      expect(result.current.isLoading).toBe(true);

      // Prototype created -> goes to initializing_editor
      act(() => {
        result.current.prototypeCreated(proto);
      });

      expect(result.current.state.status).toBe('initializing_editor');
      expect(result.current.state.prototype).toEqual(proto);

      // Editor ready
      act(() => {
        result.current.editorReady();
      });

      expect(result.current.state.status).toBe('ready');
    });

    it('should handle create failure', () => {
      const { result } = renderHook(() => useEditorStateMachine());

      act(() => {
        result.current.createPrototype();
      });

      act(() => {
        result.current.prototypeCreateFailed('Failed to create');
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.error).toBe('Failed to create');
    });
  });

  // ============================================================================
  // Save Flow Tests
  // ============================================================================

  describe('save flow', () => {
    it('should transition through save flow correctly', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state via proper load flow
      act(() => {
        result.current.loadPrototype('test-slug');
      });
      act(() => {
        result.current.prototypeLoaded(proto);
      });
      act(() => {
        result.current.editorReady();
      });

      // Start save
      act(() => {
        result.current.saveStart('manual');
      });

      expect(result.current.state.status).toBe('saving');
      expect(result.current.state.meta.saveType).toBe('manual');
      expect(result.current.isBusy).toBe(true);
      expect(result.current.canSave).toBe(false);

      // Save success
      act(() => {
        result.current.saveSuccess(proto);
      });

      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.dirty).toBe(false);
      expect(result.current.state.lastSavedAt).not.toBeNull();
    });

    it('should handle save failure and return to ready', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state via proper load flow
      act(() => {
        result.current.loadPrototype('test-slug');
      });
      act(() => {
        result.current.prototypeLoaded(proto);
      });
      act(() => {
        result.current.editorReady();
      });
      act(() => {
        result.current.saveStart('manual');
      });

      // Save fails
      act(() => {
        result.current.saveFailed('Network error');
      });

      // Should return to ready (not error) so user can continue editing
      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.error).toBe('Network error');
      expect(result.current.canSave).toBe(true); // Can retry
    });

    it('should not allow save when not in ready state', () => {
      const { result } = renderHook(() => useEditorStateMachine());

      // Try to save from uninitialized state
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      act(() => {
        result.current.saveStart('manual');
      });

      // Should remain in uninitialized state
      expect(result.current.state.status).toBe('uninitialized');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Page Switching Flow Tests
  // ============================================================================

  describe('page switching flow', () => {
    it('should transition through page switch flow', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state via proper load flow
      act(() => {
        result.current.loadPrototype('test-slug');
      });
      act(() => {
        result.current.prototypeLoaded(proto);
      });
      act(() => {
        result.current.editorReady();
      });

      // Start page switch
      act(() => {
        result.current.pageSwitchStart();
      });

      expect(result.current.state.status).toBe('page_switching');
      expect(result.current.canSave).toBe(false);
      expect(result.current.canSwitchPage).toBe(false);
      expect(result.current.isBusy).toBe(true);

      // Complete page switch
      act(() => {
        result.current.pageSwitchComplete();
      });

      expect(result.current.state.status).toBe('ready');
      expect(result.current.canSave).toBe(true);
    });

    it('should block saves during page switch', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to page_switching state via proper load flow
      act(() => {
        result.current.loadPrototype('test-slug');
      });
      act(() => {
        result.current.prototypeLoaded(proto);
      });
      act(() => {
        result.current.editorReady();
      });
      act(() => {
        result.current.pageSwitchStart();
      });

      // Try to save during page switch
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      act(() => {
        result.current.saveStart('autosave');
      });

      // Should remain in page_switching state
      expect(result.current.state.status).toBe('page_switching');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Version Restore Flow Tests
  // ============================================================================

  describe('version restore flow', () => {
    it('should transition through restore flow', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();
      const restoredProto = mockPrototype({ htmlContent: '<div>Restored</div>' });

      // Get to ready state via proper load flow
      act(() => {
        result.current.loadPrototype('test-slug');
      });
      act(() => {
        result.current.prototypeLoaded(proto);
      });
      act(() => {
        result.current.editorReady();
      });

      // Start restore
      act(() => {
        result.current.restoreVersionStart(3);
      });

      expect(result.current.state.status).toBe('restoring_version');
      expect(result.current.state.meta.versionNumber).toBe(3);
      expect(result.current.isBusy).toBe(true);

      // Complete restore
      act(() => {
        result.current.restoreVersionComplete(restoredProto);
      });

      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.prototype).toEqual(restoredProto);
      expect(result.current.state.dirty).toBe(false);
    });

    it('should handle restore failure', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state via proper load flow
      act(() => {
        result.current.loadPrototype('test-slug');
      });
      act(() => {
        result.current.prototypeLoaded(proto);
      });
      act(() => {
        result.current.editorReady();
      });
      act(() => {
        result.current.restoreVersionStart(3);
      });

      // Restore fails
      act(() => {
        result.current.restoreVersionFailed('Version not found');
      });

      // Should return to ready (not error)
      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.error).toBe('Version not found');
    });
  });

  // ============================================================================
  // Content Changed Tests
  // ============================================================================

  describe('content changes', () => {
    it('should mark state as dirty on content change', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state via proper load flow
      act(() => {
        result.current.loadPrototype('test-slug');
      });
      act(() => {
        result.current.prototypeLoaded(proto);
      });
      act(() => {
        result.current.editorReady();
      });

      expect(result.current.state.dirty).toBe(false);

      act(() => {
        result.current.contentChanged();
      });

      expect(result.current.state.dirty).toBe(true);
    });

    it('should enable autosave when dirty with prototype', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state via proper load flow
      act(() => {
        result.current.loadPrototype('test-slug');
      });
      act(() => {
        result.current.prototypeLoaded(proto);
      });
      act(() => {
        result.current.editorReady();
      });

      expect(result.current.canAutosave).toBe(false); // Not dirty yet

      act(() => {
        result.current.contentChanged();
      });

      expect(result.current.canAutosave).toBe(true);
    });

    it('should reset dirty flag after save', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state via proper load flow and make dirty
      act(() => {
        result.current.loadPrototype('test-slug');
      });
      act(() => {
        result.current.prototypeLoaded(proto);
      });
      act(() => {
        result.current.editorReady();
      });
      act(() => {
        result.current.contentChanged();
      });

      expect(result.current.state.dirty).toBe(true);

      // Save
      act(() => {
        result.current.saveStart('manual');
      });
      act(() => {
        result.current.saveSuccess(proto);
      });

      expect(result.current.state.dirty).toBe(false);
    });

    it('should allow manual mark clean', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state via proper load flow and make dirty
      act(() => {
        result.current.loadPrototype('test-slug');
      });
      act(() => {
        result.current.prototypeLoaded(proto);
      });
      act(() => {
        result.current.editorReady();
      });
      act(() => {
        result.current.contentChanged();
      });

      expect(result.current.state.dirty).toBe(true);

      act(() => {
        result.current.markClean();
      });

      expect(result.current.state.dirty).toBe(false);
    });
  });

  // ============================================================================
  // Reset Tests
  // ============================================================================

  describe('reset', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to a complex state via proper load flow
      act(() => {
        result.current.loadPrototype('test-slug');
      });
      act(() => {
        result.current.prototypeLoaded(proto);
      });
      act(() => {
        result.current.editorReady();
      });
      act(() => {
        result.current.contentChanged();
      });

      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.prototype).not.toBeNull();
      expect(result.current.state.dirty).toBe(true);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toEqual(initialState);
    });

    it('should allow reset from any state', () => {
      const { result } = renderHook(() => useEditorStateMachine());

      // From loading
      act(() => {
        result.current.loadPrototype('test');
      });
      act(() => {
        result.current.reset();
      });
      expect(result.current.state.status).toBe('uninitialized');

      // From error
      act(() => {
        result.current.loadPrototype('test');
      });
      act(() => {
        result.current.prototypeLoadFailed('Error');
      });
      act(() => {
        result.current.reset();
      });
      expect(result.current.state.status).toBe('uninitialized');
    });
  });

  // ============================================================================
  // Guard Function Tests
  // ============================================================================

  describe('guard functions', () => {
    describe('canSave', () => {
      it('should only return true in ready state', () => {
        expect(canSave({ ...initialState, status: 'ready' })).toBe(true);
        expect(canSave({ ...initialState, status: 'uninitialized' })).toBe(false);
        expect(canSave({ ...initialState, status: 'loading_prototype' })).toBe(false);
        expect(canSave({ ...initialState, status: 'saving' })).toBe(false);
        expect(canSave({ ...initialState, status: 'page_switching' })).toBe(false);
      });
    });

    describe('canSwitchPage', () => {
      it('should only return true in ready state', () => {
        expect(canSwitchPage({ ...initialState, status: 'ready' })).toBe(true);
        expect(canSwitchPage({ ...initialState, status: 'page_switching' })).toBe(false);
      });
    });

    describe('canAutosave', () => {
      it('should require ready state, dirty flag, and prototype', () => {
        const proto = mockPrototype();

        // Missing dirty
        expect(
          canAutosave({ ...initialState, status: 'ready', prototype: proto, dirty: false })
        ).toBe(false);

        // Missing prototype
        expect(
          canAutosave({ ...initialState, status: 'ready', prototype: null, dirty: true })
        ).toBe(false);

        // Not ready
        expect(
          canAutosave({ ...initialState, status: 'saving', prototype: proto, dirty: true })
        ).toBe(false);

        // All conditions met
        expect(
          canAutosave({ ...initialState, status: 'ready', prototype: proto, dirty: true })
        ).toBe(true);
      });
    });

    describe('canModifyContent', () => {
      it('should return true in ready or initializing state', () => {
        expect(canModifyContent({ ...initialState, status: 'ready' })).toBe(true);
        expect(canModifyContent({ ...initialState, status: 'initializing_editor' })).toBe(true);
        expect(canModifyContent({ ...initialState, status: 'saving' })).toBe(false);
        expect(canModifyContent({ ...initialState, status: 'page_switching' })).toBe(false);
      });
    });

    describe('isLoading', () => {
      it('should return true for loading states', () => {
        expect(isLoading({ ...initialState, status: 'loading_prototype' })).toBe(true);
        expect(isLoading({ ...initialState, status: 'creating_prototype' })).toBe(true);
        // initializing_editor is NOT a loading state - editor needs to render so onReady can fire
        expect(isLoading({ ...initialState, status: 'initializing_editor' })).toBe(false);
        expect(isLoading({ ...initialState, status: 'ready' })).toBe(false);
        expect(isLoading({ ...initialState, status: 'saving' })).toBe(false);
      });
    });

    describe('isBusy', () => {
      it('should return true for busy states', () => {
        expect(isBusy({ ...initialState, status: 'loading_prototype' })).toBe(true);
        expect(isBusy({ ...initialState, status: 'creating_prototype' })).toBe(true);
        expect(isBusy({ ...initialState, status: 'saving' })).toBe(true);
        expect(isBusy({ ...initialState, status: 'restoring_version' })).toBe(true);
        expect(isBusy({ ...initialState, status: 'page_switching' })).toBe(true);
        expect(isBusy({ ...initialState, status: 'ready' })).toBe(false);
        expect(isBusy({ ...initialState, status: 'error' })).toBe(false);
      });
    });
  });

  // ============================================================================
  // Safety Net: LOAD_PROTOTYPE from initializing_editor
  // ============================================================================

  describe('initializing_editor re-load safety net', () => {
    it('should allow LOAD_PROTOTYPE from initializing_editor', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to initializing_editor state
      act(() => {
        result.current.loadPrototype('test-slug');
      });
      act(() => {
        result.current.prototypeLoaded(proto);
      });

      expect(result.current.state.status).toBe('initializing_editor');

      // Should be able to start a new load (safety net)
      act(() => {
        result.current.loadPrototype('new-slug');
      });

      expect(result.current.state.status).toBe('loading_prototype');
      expect(result.current.state.meta.slug).toBe('new-slug');
    });
  });

  // ============================================================================
  // Full Restore Version Flow (start → complete)
  // ============================================================================

  describe('restore version full flow', () => {
    it('should transition ready → restoring_version → ready with correct data', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype({ slug: 'my-proto' });
      const restoredProto = mockPrototype({
        slug: 'my-proto',
        htmlContent: '<div>Version 2 content</div>',
      });

      // Get to ready state
      act(() => {
        result.current.loadPrototype('my-proto');
      });
      act(() => {
        result.current.prototypeLoaded(proto);
      });
      act(() => {
        result.current.editorReady();
      });

      expect(result.current.state.status).toBe('ready');

      // Start version restore
      act(() => {
        result.current.restoreVersionStart(5);
      });

      expect(result.current.state.status).toBe('restoring_version');
      expect(result.current.state.meta.versionNumber).toBe(5);
      expect(result.current.state.previousStatus).toBe('ready');

      // Complete version restore
      act(() => {
        result.current.restoreVersionComplete(restoredProto);
      });

      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.prototype).toEqual(restoredProto);
      expect(result.current.state.dirty).toBe(false);
      expect(result.current.state.lastSavedAt).not.toBeNull();
      expect(result.current.state.meta.slug).toBe('my-proto');
    });

    it('should allow consecutive restores (ready → restoring → ready → restoring → ready)', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype({ slug: 'my-proto' });
      const v1 = mockPrototype({ slug: 'my-proto', htmlContent: '<div>V1</div>' });
      const v2 = mockPrototype({ slug: 'my-proto', htmlContent: '<div>V2</div>' });

      // Get to ready state
      act(() => {
        result.current.loadPrototype('my-proto');
      });
      act(() => {
        result.current.prototypeLoaded(proto);
      });
      act(() => {
        result.current.editorReady();
      });

      // First restore
      act(() => {
        result.current.restoreVersionStart(1);
      });
      act(() => {
        result.current.restoreVersionComplete(v1);
      });

      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.prototype).toEqual(v1);

      // Second restore (should not be stuck)
      act(() => {
        result.current.restoreVersionStart(2);
      });

      expect(result.current.state.status).toBe('restoring_version');

      act(() => {
        result.current.restoreVersionComplete(v2);
      });

      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.prototype).toEqual(v2);
    });
  });

  // ============================================================================
  // Reducer Direct Tests
  // ============================================================================

  describe('reducer', () => {
    it('should handle invalid transitions gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Try invalid transition
      const result = editorReducer(initialState, { type: 'SAVE_START', saveType: 'manual' });

      // Should return unchanged state
      expect(result).toEqual(initialState);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should preserve prototype data across states', () => {
      const proto = mockPrototype();

      let state = editorReducer(initialState, { type: 'LOAD_PROTOTYPE', slug: 'test' });
      state = editorReducer(state, { type: 'PROTOTYPE_LOADED', prototype: proto });
      state = editorReducer(state, { type: 'EDITOR_READY' });
      state = editorReducer(state, { type: 'SAVE_START', saveType: 'manual' });

      expect(state.prototype).toEqual(proto);
    });
  });
});
