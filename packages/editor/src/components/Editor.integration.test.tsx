/**
 * Editor Integration Tests
 *
 * Tests the save/load cycle and state machine integration
 * using MSW for API mocking and a mock GrapesJS editor.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEditorStateMachine } from '../hooks/useEditorStateMachine';
import { useEditorAutosave } from '../hooks/useEditorAutosave';
import { extractEditorData, isEditorReadyForExtraction } from '../lib/grapesjs/data-extractor';
import { createMockEditor, setMockEditorContent } from '../test/mocks/grapesjs';
import { mockPrototype } from '../test/fixtures/prototypes';
import { server, resetMockStore, useHandlers } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('Editor Integration', () => {
  beforeEach(() => {
    resetMockStore();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ============================================================================
  // State Machine Integration Tests
  // ============================================================================

  describe('state machine integration', () => {
    it('should manage the complete lifecycle of loading and saving', async () => {
      const { result } = renderHook(() => useEditorStateMachine());

      // 1. Start in uninitialized state
      expect(result.current.state.status).toBe('uninitialized');

      // 2. Load a prototype
      act(() => {
        result.current.loadPrototype('test-proto');
      });
      expect(result.current.state.status).toBe('loading_prototype');
      expect(result.current.isLoading).toBe(true);

      // 3. Prototype loaded
      const proto = mockPrototype();
      act(() => {
        result.current.prototypeLoaded(proto);
      });
      expect(result.current.state.status).toBe('initializing_editor');

      // 4. Editor ready
      act(() => {
        result.current.editorReady();
      });
      expect(result.current.state.status).toBe('ready');
      expect(result.current.canSave).toBe(true);

      // 5. Content changed
      act(() => {
        result.current.contentChanged();
      });
      expect(result.current.state.dirty).toBe(true);
      expect(result.current.canAutosave).toBe(true);

      // 6. Start save
      act(() => {
        result.current.saveStart('manual');
      });
      expect(result.current.state.status).toBe('saving');
      expect(result.current.canSave).toBe(false);

      // 7. Save success
      const updatedProto = mockPrototype({ name: 'Updated' });
      act(() => {
        result.current.saveSuccess(updatedProto);
      });
      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.dirty).toBe(false);
      expect(result.current.state.prototype?.name).toBe('Updated');
    });

    it('should handle page switching correctly', async () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state
      act(() => {
        result.current.loadPrototype('test');
        result.current.prototypeLoaded(proto);
        result.current.editorReady();
      });

      expect(result.current.canSwitchPage).toBe(true);

      // Start page switch
      act(() => {
        result.current.pageSwitchStart();
      });

      expect(result.current.state.status).toBe('page_switching');
      expect(result.current.canSave).toBe(false);
      expect(result.current.canSwitchPage).toBe(false);

      // Complete page switch
      act(() => {
        result.current.pageSwitchComplete();
      });

      expect(result.current.state.status).toBe('ready');
      expect(result.current.canSave).toBe(true);
    });
  });

  // ============================================================================
  // Autosave Integration Tests
  // ============================================================================

  describe('autosave integration', () => {
    it('should set pending status when change is triggered', async () => {
      const { result: stateMachineResult } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();
      const onSave = vi.fn().mockResolvedValue(true);

      // Get to ready state with prototype
      act(() => {
        stateMachineResult.current.loadPrototype('test');
        stateMachineResult.current.prototypeLoaded(proto);
        stateMachineResult.current.editorReady();
      });

      const { result: autosaveResult } = renderHook(() =>
        useEditorAutosave({
          enabled: true,
          stateMachine: stateMachineResult.current,
          onSave,
          debounceMs: 1000,
          maxWaitMs: 5000,
        })
      );

      // Trigger a change
      act(() => {
        autosaveResult.current.triggerChange();
      });

      // Status should be pending, and state machine should be dirty
      expect(autosaveResult.current.status).toBe('pending');
      expect(stateMachineResult.current.state.dirty).toBe(true);
      expect(stateMachineResult.current.canAutosave).toBe(true);
    });

    it('should pause and resume correctly', async () => {
      const { result: stateMachineResult } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();
      const onSave = vi.fn().mockResolvedValue(true);

      // Get to ready state with prototype
      act(() => {
        stateMachineResult.current.loadPrototype('test');
        stateMachineResult.current.prototypeLoaded(proto);
        stateMachineResult.current.editorReady();
      });

      const { result: autosaveResult } = renderHook(() =>
        useEditorAutosave({
          enabled: true,
          stateMachine: stateMachineResult.current,
          onSave,
          debounceMs: 1000,
          maxWaitMs: 5000,
        })
      );

      // Pause autosave
      act(() => {
        autosaveResult.current.pause();
      });

      // Trigger change - should be ignored while paused
      act(() => {
        autosaveResult.current.triggerChange();
      });

      // Advance time
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(onSave).not.toHaveBeenCalled();

      // Resume autosave
      act(() => {
        autosaveResult.current.resume();
      });
    });

    it('should mark as saved after manual save', () => {
      const { result: stateMachineResult } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();
      const onSave = vi.fn().mockResolvedValue(true);

      // Get to ready state
      act(() => {
        stateMachineResult.current.loadPrototype('test');
        stateMachineResult.current.prototypeLoaded(proto);
        stateMachineResult.current.editorReady();
      });

      const { result: autosaveResult } = renderHook(() =>
        useEditorAutosave({
          enabled: true,
          stateMachine: stateMachineResult.current,
          onSave,
          debounceMs: 1000,
          maxWaitMs: 5000,
        })
      );

      // Mark as saved
      act(() => {
        autosaveResult.current.markSaved();
      });

      expect(autosaveResult.current.status).toBe('saved');
      expect(autosaveResult.current.lastSavedAt).not.toBeNull();
    });
  });

  // ============================================================================
  // Data Extractor Integration Tests
  // ============================================================================

  describe('data extractor integration', () => {
    it('should extract data from mock editor', () => {
      const mockEditor = createMockEditor();
      setMockEditorContent(mockEditor, '<div>Test Content</div>');

      expect(isEditorReadyForExtraction(mockEditor)).toBe(true);

      const result = extractEditorData(mockEditor, '');
      expect(result.html).toBe('<div>Test Content</div>');
      expect(result.projectData.pages).toBeDefined();
    });

    it('should use fallback when editor is not ready', () => {
      const result = extractEditorData(null, '<div>Fallback</div>');

      expect(result.html).toBe('<div>Fallback</div>');
      expect(result.success).toBe(false);
      expect(result.warnings).toContain('Editor not initialized');
    });

    it('should report readiness correctly', () => {
      const mockEditor = createMockEditor();

      // Mock editor is ready by default
      expect(isEditorReadyForExtraction(mockEditor)).toBe(true);

      // Make pages return empty
      mockEditor.Pages.getAll.mockReturnValue([]);
      expect(isEditorReadyForExtraction(mockEditor)).toBe(false);

      // Null editor
      expect(isEditorReadyForExtraction(null)).toBe(false);
    });
  });

  // ============================================================================
  // Full Cycle Tests (Mock-based, no actual API calls)
  // ============================================================================

  describe('full save/load cycle', () => {
    it('should handle complete save cycle with state machine', async () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const mockEditor = createMockEditor();
      const proto = mockPrototype();

      // 1. Load prototype
      act(() => {
        result.current.loadPrototype(proto.slug);
      });

      act(() => {
        result.current.prototypeLoaded(proto);
      });

      act(() => {
        result.current.editorReady();
      });

      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.prototype).toEqual(proto);

      // 2. Make changes
      setMockEditorContent(mockEditor, '<div>Updated Content</div>');
      act(() => {
        result.current.contentChanged();
      });

      expect(result.current.state.dirty).toBe(true);

      // 3. Verify extraction works
      const extracted = extractEditorData(mockEditor, '');
      expect(extracted.html).toBe('<div>Updated Content</div>');

      // 4. Start save
      act(() => {
        result.current.saveStart('manual');
      });

      expect(result.current.state.status).toBe('saving');

      // 5. Complete save
      const updatedProto = mockPrototype({
        ...proto,
        htmlContent: '<div>Updated Content</div>',
        updatedAt: new Date(),
      });

      act(() => {
        result.current.saveSuccess(updatedProto);
      });

      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.dirty).toBe(false);
      expect(result.current.state.lastSavedAt).not.toBeNull();
    });

    it('should handle save failure gracefully', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state and start save
      act(() => {
        result.current.loadPrototype('test');
        result.current.prototypeLoaded(proto);
        result.current.editorReady();
        result.current.contentChanged();
        result.current.saveStart('manual');
      });

      // Fail the save
      act(() => {
        result.current.saveFailed('Network error');
      });

      // Should return to ready state (not error) so user can continue
      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.error).toBe('Network error');
      expect(result.current.canSave).toBe(true); // Can retry
    });

    it('should handle version restore cycle', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();
      const restoredProto = mockPrototype({
        htmlContent: '<div>Restored Content</div>',
      });

      // Get to ready state
      act(() => {
        result.current.loadPrototype('test');
        result.current.prototypeLoaded(proto);
        result.current.editorReady();
      });

      // Start version restore
      act(() => {
        result.current.restoreVersionStart(3);
      });

      expect(result.current.state.status).toBe('restoring_version');
      expect(result.current.state.meta.versionNumber).toBe(3);

      // Complete restore
      act(() => {
        result.current.restoreVersionComplete(restoredProto);
      });

      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.prototype?.htmlContent).toBe('<div>Restored Content</div>');
      expect(result.current.state.dirty).toBe(false);
    });
  });

  // ============================================================================
  // Guard Function Tests
  // ============================================================================

  describe('guard functions', () => {
    it('should prevent save during page switching', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to page_switching state
      act(() => {
        result.current.loadPrototype('test');
        result.current.prototypeLoaded(proto);
        result.current.editorReady();
        result.current.pageSwitchStart();
      });

      expect(result.current.canSave).toBe(false);
      expect(result.current.canAutosave).toBe(false);
    });

    it('should prevent operations during loading', () => {
      const { result } = renderHook(() => useEditorStateMachine());

      act(() => {
        result.current.loadPrototype('test');
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.canSave).toBe(false);
      expect(result.current.canSwitchPage).toBe(false);
      expect(result.current.canModifyContent).toBe(false);
    });

    it('should allow content modification during initialization', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      act(() => {
        result.current.loadPrototype('test');
        result.current.prototypeLoaded(proto);
      });

      expect(result.current.state.status).toBe('initializing_editor');
      expect(result.current.canModifyContent).toBe(true);
    });
  });

  // ============================================================================
  // Error Recovery Tests
  // ============================================================================

  describe('error recovery', () => {
    it('should clear error on successful save after failure', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state with an error
      act(() => {
        result.current.loadPrototype('test');
        result.current.prototypeLoaded(proto);
        result.current.editorReady();
        result.current.contentChanged();
        result.current.saveStart('manual');
        result.current.saveFailed('Network error');
      });

      expect(result.current.state.error).toBe('Network error');
      expect(result.current.state.status).toBe('ready');

      // Retry save - error should be cleared on success
      act(() => {
        result.current.saveStart('manual');
      });

      // Error persists during save attempt
      expect(result.current.state.status).toBe('saving');

      // Successful save clears the error
      act(() => {
        result.current.saveSuccess(proto);
      });

      expect(result.current.state.error).toBeNull();
      expect(result.current.state.status).toBe('ready');
    });

    it('should recover from failed prototype load', () => {
      const { result } = renderHook(() => useEditorStateMachine());

      // Start loading
      act(() => {
        result.current.loadPrototype('test');
      });

      expect(result.current.state.status).toBe('loading_prototype');

      // Fail the load
      act(() => {
        result.current.prototypeLoadFailed('Not found');
      });

      expect(result.current.state.status).toBe('error');
      expect(result.current.state.error).toBe('Not found');

      // Reset to try again
      act(() => {
        result.current.reset();
      });

      expect(result.current.state.status).toBe('uninitialized');
      expect(result.current.state.error).toBeNull();
    });

    it('should handle version restore failure', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state
      act(() => {
        result.current.loadPrototype('test');
        result.current.prototypeLoaded(proto);
        result.current.editorReady();
      });

      // Start version restore
      act(() => {
        result.current.restoreVersionStart(3);
      });

      expect(result.current.state.status).toBe('restoring_version');

      // Fail the restore
      act(() => {
        result.current.restoreVersionFailed('Version not found');
      });

      // Should return to ready state with error
      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.error).toBe('Version not found');
      expect(result.current.canSave).toBe(true);
    });

    it('should preserve dirty state on save failure', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state with unsaved changes
      act(() => {
        result.current.loadPrototype('test');
        result.current.prototypeLoaded(proto);
        result.current.editorReady();
        result.current.contentChanged();
      });

      expect(result.current.state.dirty).toBe(true);

      // Try to save
      act(() => {
        result.current.saveStart('autosave');
        result.current.saveFailed('Server error');
      });

      // Dirty state should be preserved so autosave can retry
      expect(result.current.state.dirty).toBe(true);
    });
  });

  // ============================================================================
  // Multi-page Prototype Tests
  // ============================================================================

  describe('multi-page prototypes', () => {
    it('should handle rapid page switching', async () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state
      act(() => {
        result.current.loadPrototype('test');
        result.current.prototypeLoaded(proto);
        result.current.editorReady();
      });

      // Rapid page switching - second switch should be blocked
      act(() => {
        result.current.pageSwitchStart();
      });

      expect(result.current.canSwitchPage).toBe(false);

      // Complete first switch
      act(() => {
        result.current.pageSwitchComplete();
      });

      expect(result.current.canSwitchPage).toBe(true);

      // Now can switch again
      act(() => {
        result.current.pageSwitchStart();
      });

      expect(result.current.state.status).toBe('page_switching');
    });

    it('should block autosave during page switch', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state with dirty content
      act(() => {
        result.current.loadPrototype('test');
        result.current.prototypeLoaded(proto);
        result.current.editorReady();
        result.current.contentChanged();
      });

      expect(result.current.canAutosave).toBe(true);

      // Start page switch
      act(() => {
        result.current.pageSwitchStart();
      });

      // Autosave should be blocked
      expect(result.current.canAutosave).toBe(false);

      // Complete switch
      act(() => {
        result.current.pageSwitchComplete();
      });

      // Autosave should work again
      expect(result.current.canAutosave).toBe(true);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle double save attempts', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to saving state
      act(() => {
        result.current.loadPrototype('test');
        result.current.prototypeLoaded(proto);
        result.current.editorReady();
        result.current.contentChanged();
        result.current.saveStart('manual');
      });

      expect(result.current.state.status).toBe('saving');
      expect(result.current.canSave).toBe(false);

      // Attempting another save should be blocked by canSave guard
      expect(result.current.canSave).toBe(false);
    });

    it('should handle state transitions in correct order', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Cannot go to saving without being ready first
      act(() => {
        result.current.saveStart('manual');
      });

      // Should still be uninitialized (invalid transition ignored)
      expect(result.current.state.status).toBe('uninitialized');

      // Proper sequence
      act(() => {
        result.current.loadPrototype('test');
        result.current.prototypeLoaded(proto);
        result.current.editorReady();
        result.current.saveStart('manual');
      });

      expect(result.current.state.status).toBe('saving');
    });

    it('should track save type metadata', () => {
      const { result } = renderHook(() => useEditorStateMachine());
      const proto = mockPrototype();

      // Get to ready state
      act(() => {
        result.current.loadPrototype('test');
        result.current.prototypeLoaded(proto);
        result.current.editorReady();
      });

      // Manual save
      act(() => {
        result.current.saveStart('manual');
      });

      expect(result.current.state.meta.saveType).toBe('manual');

      // Complete and start autosave
      act(() => {
        result.current.saveSuccess(proto);
        result.current.contentChanged();
        result.current.saveStart('autosave');
      });

      expect(result.current.state.meta.saveType).toBe('autosave');
    });
  });
});
