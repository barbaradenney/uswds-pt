/**
 * Tests for useGrapesJSSetup hook
 *
 * Tests editor initialization, event registration, and cleanup.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGrapesJSSetup } from './useGrapesJSSetup';
import type { UseEditorStateMachineReturn } from './useEditorStateMachine';
import { mockPrototype } from '../test/fixtures/prototypes';

// Mock resource loader functions
const mockLoadUSWDSResources = vi.fn();
const mockAddCardContainerCSS = vi.fn();
const mockAddFieldsetSpacingCSS = vi.fn();
const mockAddButtonGroupCSS = vi.fn();
const mockAddTypographyCSS = vi.fn();
const mockClearGrapesJSStorage = vi.fn();
vi.mock('../lib/grapesjs/resource-loader', () => ({
  loadUSWDSResources: (...args: unknown[]) => mockLoadUSWDSResources(...args),
  addCardContainerCSS: (...args: unknown[]) => mockAddCardContainerCSS(...args),
  addFieldsetSpacingCSS: (...args: unknown[]) => mockAddFieldsetSpacingCSS(...args),
  addButtonGroupCSS: (...args: unknown[]) => mockAddButtonGroupCSS(...args),
  addTypographyCSS: (...args: unknown[]) => mockAddTypographyCSS(...args),
  clearGrapesJSStorage: (...args: unknown[]) => mockClearGrapesJSStorage(...args),
}));

// Mock data extractor
vi.mock('../lib/grapesjs/data-extractor', () => ({
  isExtractingPerPageHtml: () => false,
  extractPerPageHtml: vi.fn(),
}));

// Mock canvas helpers
const mockForceCanvasUpdate = vi.fn();
const mockSetupCanvasEventHandlers = vi.fn();
const mockRegisterClearCommand = vi.fn();
const mockSetupAllInteractiveHandlers = vi.fn();
const mockExposeDebugHelpers = vi.fn();
const mockCleanupCanvasHelpers = vi.fn();
vi.mock('../lib/grapesjs/canvas-helpers', () => ({
  forceCanvasUpdate: (...args: unknown[]) => mockForceCanvasUpdate(...args),
  setupCanvasEventHandlers: (...args: unknown[]) => mockSetupCanvasEventHandlers(...args),
  registerClearCommand: (...args: unknown[]) => mockRegisterClearCommand(...args),
  setupAllInteractiveHandlers: (...args: unknown[]) => mockSetupAllInteractiveHandlers(...args),
  exposeDebugHelpers: (...args: unknown[]) => mockExposeDebugHelpers(...args),
  cleanupCanvasHelpers: (...args: unknown[]) => mockCleanupCanvasHelpers(...args),
}));

// Mock adapter
vi.mock('@uswds-pt/adapter', () => ({
  DEFAULT_CONTENT: {
    'blank-template': '<div class="blank-template">__FULL_HTML__</div>',
  },
  COMPONENT_ICONS: {},
}));

/**
 * Create a mock state machine for testing
 */
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

/**
 * Create a mock GrapesJS editor with event tracking
 */
function createMockEditor() {
  const eventHandlers: Map<string, ((...args: unknown[]) => void)[]> = new Map();

  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      const handlers = eventHandlers.get(event) || [];
      handlers.push(handler);
      eventHandlers.set(event, handlers);
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      const handlers = eventHandlers.get(event) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
      eventHandlers.set(event, handlers);
    }),
    trigger: (event: string, ...args: unknown[]) => {
      const handlers = eventHandlers.get(event) || [];
      handlers.forEach((h) => h(...args));
    },
    getHtml: vi.fn(() => '<div>Test content</div>'),
    getProjectData: vi.fn(() => ({ pages: [], styles: [], assets: [] })),
    loadProjectData: vi.fn(),
    Pages: {
      getAll: vi.fn(() => []),
      getSelected: vi.fn(),
    },
    DomComponents: {
      getWrapper: vi.fn(() => ({
        components: vi.fn(() => []),
      })),
    },
    Canvas: {
      refresh: vi.fn(),
      getDocument: vi.fn(() => ({
        querySelectorAll: vi.fn(() => []),
      })),
    },
    Blocks: {
      getAll: vi.fn((): Array<{ get: (prop: string) => string }> => []),
      remove: vi.fn(),
    },
    Commands: {
      add: vi.fn(),
    },
    getSelected: vi.fn(),
    refresh: vi.fn(),
    _eventHandlers: eventHandlers,
  };
}

describe('useGrapesJSSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // onReady Tests
  // ============================================================================

  describe('onReady', () => {
    it('should store editor instance in ref', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      expect(editorRef.current).toBe(mockEditor);
    });

    it('should mark editor as ready in state machine', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      expect(stateMachine.editorReady).toHaveBeenCalled();
    });

    it('should clear GrapesJS storage on ready', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      expect(mockClearGrapesJSStorage).toHaveBeenCalled();
    });

    it('should register change event listeners', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();
      const onContentChange = vi.fn();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange,
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      // Check that event listeners were registered
      expect(mockEditor.on).toHaveBeenCalledWith('component:add', expect.any(Function));
      expect(mockEditor.on).toHaveBeenCalledWith('component:remove', expect.any(Function));
      expect(mockEditor.on).toHaveBeenCalledWith('component:update', expect.any(Function));
      expect(mockEditor.on).toHaveBeenCalledWith('style:change', expect.any(Function));
    });

    it('should trigger onContentChange when content changes', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();
      const onContentChange = vi.fn();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange,
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      // Trigger a component change event
      act(() => {
        mockEditor.trigger('component:add');
      });

      expect(onContentChange).toHaveBeenCalled();
    });

    it('should add custom CSS to canvas', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      expect(mockAddCardContainerCSS).toHaveBeenCalledWith(mockEditor);
    });

    it('should register clear command', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      expect(mockRegisterClearCommand).toHaveBeenCalledWith(mockEditor);
    });

    it('should load USWDS resources', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      expect(mockLoadUSWDSResources).toHaveBeenCalledWith(mockEditor);
    });

    it('should expose debug helpers', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      expect(mockExposeDebugHelpers).toHaveBeenCalledWith(mockEditor);
    });
  });

  // ============================================================================
  // Project Data Loading Tests
  // ============================================================================

  describe('project data loading', () => {
    // Project data is loaded via SDK's storage.project config in EditorCanvas,
    // AND as a safety-net fallback via loadProjectData() in onReady.
    // When projectData is provided, onReady calls loadProjectData as a redundant
    // safety net. When null, it does not.

    it('should not call loadProjectData when projectData is null (new prototype)', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: undefined,
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          projectData: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      expect(mockEditor.loadProjectData).not.toHaveBeenCalled();
    });

    it('should call loadProjectData as safety-net when projectData is provided', () => {
      const proto = mockPrototype();
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: proto.slug,
          pendingPrototype: proto,
          localPrototype: null,
          prototype: null,
          projectData: proto.grapesData as Record<string, any>,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      // Safety-net: loadProjectData called with the provided project data
      expect(mockEditor.loadProjectData).toHaveBeenCalledWith(proto.grapesData);
    });

    it('should call loadProjectData in demo mode when projectData is provided', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();
      const projectData = {
        pages: [{ id: 'page-1', name: 'Test' }],
        styles: [],
        assets: [],
      };

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: true,
          slug: 'local-123',
          pendingPrototype: null,
          localPrototype: {
            gjsData: JSON.stringify(projectData),
            htmlContent: '<div>Local content</div>',
          },
          prototype: null,
          projectData,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      expect(mockEditor.loadProjectData).toHaveBeenCalledWith(projectData);
    });

    it('should not call loadProjectData when projectData is not provided', () => {
      const proto = mockPrototype();
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: proto.slug,
          pendingPrototype: null,
          localPrototype: null,
          prototype: proto,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      // No projectData provided — should NOT call loadProjectData
      expect(mockEditor.loadProjectData).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Cleanup Tests
  // ============================================================================

  describe('cleanup', () => {
    it('should remove all event listeners on cleanup', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result, unmount } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      // Unmount should trigger cleanup
      unmount();

      // Verify off was called for cleanup
      expect(mockEditor.off).toHaveBeenCalled();
    });

    it('should call cleanupDebugHelpers on cleanup', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result, unmount } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      unmount();

      expect(mockCleanupCanvasHelpers).toHaveBeenCalled();
    });

    it('should set editorRef to null on cleanup', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result, unmount } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      expect(editorRef.current).toBe(mockEditor);

      unmount();

      expect(editorRef.current).toBeNull();
    });

    it('should handle cleanup when editor not initialized', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };

      const { unmount } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      // Should not throw when cleaning up without editor
      expect(() => unmount()).not.toThrow();
    });
  });

  // ============================================================================
  // refreshCanvas Tests
  // ============================================================================

  describe('refreshCanvas', () => {
    it('should call forceCanvasUpdate with editor', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      act(() => {
        result.current.refreshCanvas();
      });

      expect(mockForceCanvasUpdate).toHaveBeenCalledWith(mockEditor);
    });

    it('should not throw when editor is not initialized', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      // Should not throw when editor is null
      expect(() => {
        act(() => {
          result.current.refreshCanvas();
        });
      }).not.toThrow();
    });
  });

  // ============================================================================
  // Block Removal Tests
  // ============================================================================

  describe('block removal', () => {
    it('should remove default blocks not in our list', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      // Set up default blocks that should be removed
      mockEditor.Blocks.getAll.mockReturnValue([
        { get: vi.fn().mockReturnValue('default-block') },
        { get: vi.fn().mockReturnValue('our-block') },
      ]);

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [{ id: 'our-block', label: 'Our Block', content: '', media: '', category: '' }],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      // default-block should be removed since it's not in our blocks list
      expect(mockEditor.Blocks.remove).toHaveBeenCalledWith('default-block');
    });

    it('should keep blocks that are in our list', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      mockEditor.Blocks.getAll.mockReturnValue([
        { get: vi.fn().mockReturnValue('our-block') },
      ]);

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [{ id: 'our-block', label: 'Our Block', content: '', media: '', category: '' }],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      // our-block should NOT be removed
      expect(mockEditor.Blocks.remove).not.toHaveBeenCalledWith('our-block');
    });
  });

  // ============================================================================
  // Setup Canvas Event Handlers Tests
  // ============================================================================

  describe('canvas event handlers', () => {
    it('should setup canvas event handlers', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      expect(mockSetupCanvasEventHandlers).toHaveBeenCalledWith(
        mockEditor,
        expect.any(Function)
      );
    });

    it('should setup interactive handlers', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      expect(mockSetupAllInteractiveHandlers).toHaveBeenCalledWith(
        mockEditor,
        expect.any(Function)
      );
    });
  });

  // ============================================================================
  // Symbol Creation Handler Tests
  // ============================================================================

  describe('symbol creation handler', () => {
    it('should register create-symbol command when onSymbolCreate provided', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();
      const onSymbolCreate = vi.fn();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
          onSymbolCreate,
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      expect(mockEditor.Commands.add).toHaveBeenCalledWith('create-symbol', expect.objectContaining({
        run: expect.any(Function),
      }));
    });

    it('should not register create-symbol command when onSymbolCreate not provided', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      expect(mockEditor.Commands.add).not.toHaveBeenCalled();
    });

    it('should add symbol button to toolbar on component:selected', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();
      const onSymbolCreate = vi.fn();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
          onSymbolCreate,
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      const mockTraits = { where: vi.fn().mockReturnValue([]), add: vi.fn() };
      const componentData: Record<string, any> = { traits: mockTraits, toolbar: [], tagName: 'div' };
      const mockComponent = {
        get: vi.fn((key: string) => componentData[key]),
        set: vi.fn(),
        getClasses: vi.fn().mockReturnValue([]),
        getSymbolInfo: vi.fn().mockReturnValue(null),
      };

      act(() => {
        mockEditor.trigger('component:selected', mockComponent);
      });

      expect(mockComponent.set).toHaveBeenCalledWith('toolbar', expect.arrayContaining([
        expect.objectContaining({ command: 'create-symbol' }),
      ]));
    });

    it('should not add symbol button if already present', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();
      const onSymbolCreate = vi.fn();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
          onSymbolCreate,
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      const mockTraits = { where: vi.fn().mockReturnValue([]), add: vi.fn() };
      const componentData: Record<string, any> = {
        traits: mockTraits,
        toolbar: [{ command: 'create-symbol', label: 'existing' }],
        tagName: 'div',
      };
      const mockComponent = {
        get: vi.fn((key: string) => componentData[key]),
        set: vi.fn(),
        getClasses: vi.fn().mockReturnValue([]),
        getSymbolInfo: vi.fn().mockReturnValue(null),
      };

      act(() => {
        mockEditor.trigger('component:selected', mockComponent);
      });

      expect(mockComponent.set).not.toHaveBeenCalledWith('toolbar', expect.anything());
    });

    it('should not add symbol button for symbol instances', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();
      const onSymbolCreate = vi.fn();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
          onSymbolCreate,
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      const mockTraits = { where: vi.fn().mockReturnValue([]), add: vi.fn() };
      const componentData: Record<string, any> = { traits: mockTraits, toolbar: [], tagName: 'div' };
      const mockComponent = {
        get: vi.fn((key: string) => componentData[key]),
        set: vi.fn(),
        getClasses: vi.fn().mockReturnValue([]),
        getSymbolInfo: vi.fn().mockReturnValue({ isSymbol: true }),
      };

      act(() => {
        mockEditor.trigger('component:selected', mockComponent);
      });

      expect(mockComponent.set).not.toHaveBeenCalled();
    });

    it('should call onSymbolCreate with serialized data when command runs', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();
      const onSymbolCreate = vi.fn();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
          onSymbolCreate,
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      // Get the command object passed to Commands.add
      const commandObj = mockEditor.Commands.add.mock.calls[0][1];

      const mockSelected = {
        getId: vi.fn().mockReturnValue('comp-1'),
        getName: vi.fn().mockReturnValue('My Component'),
        get: vi.fn().mockReturnValue('My Component'),
        getSymbolInfo: vi.fn().mockReturnValue(null),
        toJSON: vi.fn().mockReturnValue({
          icon: 'icon-test',
          components: [{ type: 'div' }],
        }),
      };

      mockEditor.getSelected.mockReturnValue(mockSelected);

      act(() => {
        commandObj.run(mockEditor);
      });

      expect(onSymbolCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'My Component',
          components: [{ type: 'div' }],
        }),
        mockSelected
      );
    });

    it('should not call onSymbolCreate when no component selected', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();
      const onSymbolCreate = vi.fn();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
          onSymbolCreate,
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      const commandObj = mockEditor.Commands.add.mock.calls[0][1];

      mockEditor.getSelected.mockReturnValue(null);

      act(() => {
        commandObj.run(mockEditor);
      });

      expect(onSymbolCreate).not.toHaveBeenCalled();
    });

    it('should not call onSymbolCreate for existing symbol instances', () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const mockEditor = createMockEditor();
      const onSymbolCreate = vi.fn();

      const { result } = renderHook(() =>
        useGrapesJSSetup({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          pendingPrototype: null,
          localPrototype: null,
          prototype: null,
          onContentChange: vi.fn(),
          blocks: [],
          onSymbolCreate,
        })
      );

      act(() => {
        result.current.onReady(mockEditor);
      });

      const commandObj = mockEditor.Commands.add.mock.calls[0][1];

      const mockSelected = {
        getId: vi.fn().mockReturnValue('comp-1'),
        getSymbolInfo: vi.fn().mockReturnValue({ isSymbol: true }),
      };

      mockEditor.getSelected.mockReturnValue(mockSelected);

      act(() => {
        commandObj.run(mockEditor);
      });

      expect(onSymbolCreate).not.toHaveBeenCalled();
    });
  });
});
