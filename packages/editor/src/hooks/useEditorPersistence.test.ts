/**
 * Tests for useEditorPersistence hook
 *
 * Tests save/load/create operations with mocked dependencies.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEditorPersistence } from './useEditorPersistence';
import type { UseEditorStateMachineReturn } from './useEditorStateMachine';
import { mockPrototype, mockTeam } from '../test/fixtures/prototypes';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock useOrganization
const mockUseOrganization = vi.fn();
vi.mock('./useOrganization', () => ({
  useOrganization: () => mockUseOrganization(),
}));

// Mock useAuth
const mockAuthFetch = vi.fn();
vi.mock('./useAuth', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
}));

// Mock localStorage functions
const mockGetPrototype = vi.fn();
const mockCreateLocalPrototype = vi.fn();
const mockUpdateLocalPrototype = vi.fn();
vi.mock('../lib/localStorage', () => ({
  getPrototype: (...args: unknown[]) => mockGetPrototype(...args),
  createPrototype: (...args: unknown[]) => mockCreateLocalPrototype(...args),
  updatePrototype: (...args: unknown[]) => mockUpdateLocalPrototype(...args),
}));

// Mock data extractor
const mockIsEditorReadyForExtraction = vi.fn();
vi.mock('../lib/grapesjs/data-extractor', () => ({
  isEditorReadyForExtraction: (...args: unknown[]) => mockIsEditorReadyForExtraction(...args),
}));

// Mock adapter
vi.mock('@uswds-pt/adapter', () => ({
  DEFAULT_CONTENT: {
    'blank-template': '<div class="blank-template">__FULL_HTML__</div>',
  },
}));

// Mock retry utilities
vi.mock('../lib/retry', () => ({
  withRetry: vi.fn(async (fn: () => Promise<unknown>) => {
    try {
      const data = await fn();
      return { success: true, data, attempts: 1 };
    } catch (error) {
      return { success: false, error, attempts: 1 };
    }
  }),
  classifyError: vi.fn(() => 'retriable'),
  isOnline: vi.fn(() => true),
  subscribeToOnlineStatus: vi.fn(() => () => {}),
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
 * Create a mock GrapesJS editor
 */
function createMockEditor() {
  return {
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
    },
  };
}

describe('useEditorPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseOrganization.mockReturnValue({
      currentTeam: mockTeam(),
      teams: [mockTeam()],
      isLoading: false,
    });

    mockIsEditorReadyForExtraction.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Save Tests - API Mode
  // ============================================================================

  describe('save (API mode)', () => {
    it('should save successfully to API for existing prototype', async () => {
      const proto = mockPrototype();
      const stateMachine = createMockStateMachine({
        state: {
          status: 'ready',
          prototype: proto,
          dirty: true,
          error: null,
          meta: {},
          previousStatus: null,
          lastSavedAt: null,
        },
      });
      const editorRef = { current: createMockEditor() };

      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...proto, updatedAt: new Date() }),
      });

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: proto.slug,
          name: proto.name,
          htmlContent: '<div>Old content</div>',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      let savedProto: unknown;
      await act(async () => {
        savedProto = await result.current.save('manual');
      });

      expect(savedProto).toBeTruthy();
      expect(stateMachine.saveStart).toHaveBeenCalledWith('manual');
      expect(stateMachine.saveSuccess).toHaveBeenCalled();
      expect(mockAuthFetch).toHaveBeenCalledWith(
        `/api/prototypes/${proto.slug}`,
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('should create new prototype when no slug exists', async () => {
      const newProto = mockPrototype({ slug: 'new-proto-123' });
      const stateMachine = createMockStateMachine();
      const editorRef = { current: createMockEditor() };
      const onFirstSaveSlug = vi.fn();
      const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(newProto),
      });

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: undefined,
          name: 'New Prototype',
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
          onFirstSaveSlug,
        })
      );

      await act(async () => {
        await result.current.save('manual');
      });

      expect(mockAuthFetch).toHaveBeenCalledWith(
        '/api/prototypes',
        expect.objectContaining({
          method: 'POST',
        })
      );
      // saveSuccess should be called, URL updated via replaceState (not navigate)
      expect(stateMachine.saveSuccess).toHaveBeenCalled();
      expect(onFirstSaveSlug).toHaveBeenCalledWith(newProto.slug);
      expect(replaceStateSpy).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      replaceStateSpy.mockRestore();
    });

    it('should handle save errors gracefully', async () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: createMockEditor() };

      mockAuthFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error'),
      });

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          name: 'Test',
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      let savedProto: unknown;
      await act(async () => {
        savedProto = await result.current.save('manual');
      });

      expect(savedProto).toBeNull();
      expect(stateMachine.saveFailed).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save')
      );
    });

    it('should block save when canSave is false', async () => {
      const stateMachine = createMockStateMachine({
        canSave: false,
        state: {
          status: 'saving',
          prototype: null,
          dirty: true,
          error: null,
          meta: {},
          previousStatus: null,
          lastSavedAt: null,
        },
      });
      const editorRef = { current: createMockEditor() };

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          name: 'Test',
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      let savedProto: unknown;
      await act(async () => {
        savedProto = await result.current.save('manual');
      });

      expect(savedProto).toBeNull();
      expect(stateMachine.saveStart).not.toHaveBeenCalled();
      expect(mockAuthFetch).not.toHaveBeenCalled();
    });

    it('should block save when editor is not ready for extraction', async () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: createMockEditor() };

      mockIsEditorReadyForExtraction.mockReturnValue(false);

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test-slug',
          name: 'Test',
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      let savedProto: unknown;
      await act(async () => {
        savedProto = await result.current.save('manual');
      });

      expect(savedProto).toBeNull();
      expect(stateMachine.saveFailed).toHaveBeenCalledWith(
        'Editor is still loading. Please wait a moment.'
      );
    });

    it('should require team for new prototype creation', async () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: createMockEditor() };

      mockUseOrganization.mockReturnValue({
        currentTeam: null,
        teams: [],
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: undefined,
          name: 'New Prototype',
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      await act(async () => {
        await result.current.save('manual');
      });

      expect(stateMachine.saveFailed).toHaveBeenCalledWith(
        'No team available. Please go to Settings to create a team first.'
      );
    });
  });

  // ============================================================================
  // Save Tests - Demo Mode
  // ============================================================================

  describe('save (demo mode)', () => {
    it('should update existing local prototype', async () => {
      const localProto = {
        id: 'local-123',
        name: 'Local Prototype',
        htmlContent: '<div>Old</div>',
        gjsData: '{}',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedProto = { ...localProto, htmlContent: '<div>Updated</div>' };
      mockUpdateLocalPrototype.mockReturnValue(updatedProto);

      const stateMachine = createMockStateMachine();
      const editorRef = { current: createMockEditor() };
      const setLocalPrototype = vi.fn();
      const setHtmlContent = vi.fn();

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: true,
          slug: localProto.id,
          name: localProto.name,
          htmlContent: localProto.htmlContent,
          setHtmlContent,
          setLocalPrototype,
          localPrototype: localProto,
        })
      );

      let savedProto: unknown;
      await act(async () => {
        savedProto = await result.current.save('manual');
      });

      expect(savedProto).toBeTruthy();
      expect(mockUpdateLocalPrototype).toHaveBeenCalledWith(
        localProto.id,
        expect.objectContaining({ name: localProto.name })
      );
      expect(setLocalPrototype).toHaveBeenCalled();
      expect(stateMachine.saveSuccess).toHaveBeenCalled();
    });

    it('should create new local prototype when none exists', async () => {
      const newLocalProto = {
        id: 'new-local-123',
        name: 'New Local',
        htmlContent: '<div>New</div>',
        gjsData: '{}',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockCreateLocalPrototype.mockReturnValue(newLocalProto);

      const stateMachine = createMockStateMachine();
      const editorRef = { current: createMockEditor() };
      const setLocalPrototype = vi.fn();
      const onFirstSaveSlug = vi.fn();
      const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: true,
          slug: undefined,
          name: 'New Local',
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype,
          localPrototype: null,
          onFirstSaveSlug,
        })
      );

      await act(async () => {
        await result.current.save('manual');
      });

      expect(mockCreateLocalPrototype).toHaveBeenCalled();
      expect(setLocalPrototype).toHaveBeenCalledWith(newLocalProto);
      // saveSuccess should be called, URL updated via replaceState (not navigate)
      expect(stateMachine.saveSuccess).toHaveBeenCalled();
      expect(onFirstSaveSlug).toHaveBeenCalledWith(newLocalProto.id);
      expect(replaceStateSpy).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      replaceStateSpy.mockRestore();
    });
  });

  // ============================================================================
  // Load Tests
  // ============================================================================

  describe('load', () => {
    it('should load prototype from API successfully', async () => {
      const proto = mockPrototype();
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const onNameChange = vi.fn();
      const setHtmlContent = vi.fn();

      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(proto),
      });

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: proto.slug,
          name: '',
          htmlContent: '',
          setHtmlContent,
          setLocalPrototype: vi.fn(),
          localPrototype: null,
          onNameChange,
        })
      );

      let loadedProto: unknown;
      await act(async () => {
        loadedProto = await result.current.load(proto.slug);
      });

      expect(loadedProto).toEqual(proto);
      expect(stateMachine.loadPrototype).toHaveBeenCalledWith(proto.slug);
      expect(stateMachine.prototypeLoaded).toHaveBeenCalledWith(proto);
      expect(onNameChange).toHaveBeenCalledWith(proto.name);
      expect(setHtmlContent).toHaveBeenCalledWith(proto.htmlContent);
    });

    it('should handle 404 when prototype not found', async () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };

      mockAuthFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'not-found',
          name: '',
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      let loadedProto: unknown;
      await act(async () => {
        loadedProto = await result.current.load('not-found');
      });

      expect(loadedProto).toBeNull();
      expect(stateMachine.prototypeLoadFailed).toHaveBeenCalledWith('Prototype not found');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should load local prototype in demo mode', async () => {
      const localProto = {
        id: 'local-123',
        name: 'Local Prototype',
        htmlContent: '<div>Local</div>',
        gjsData: JSON.stringify({ pages: [], styles: [], assets: [] }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetPrototype.mockReturnValue(localProto);

      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };
      const setLocalPrototype = vi.fn();
      const onNameChange = vi.fn();
      const setHtmlContent = vi.fn();

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: true,
          slug: localProto.id,
          name: '',
          htmlContent: '',
          setHtmlContent,
          setLocalPrototype,
          localPrototype: null,
          onNameChange,
        })
      );

      let loadedProto: unknown;
      await act(async () => {
        loadedProto = await result.current.load(localProto.id);
      });

      expect(loadedProto).toBeTruthy();
      expect(mockGetPrototype).toHaveBeenCalledWith(localProto.id);
      expect(setLocalPrototype).toHaveBeenCalledWith(localProto);
      expect(onNameChange).toHaveBeenCalledWith(localProto.name);
      expect(stateMachine.prototypeLoaded).toHaveBeenCalled();
    });

    it('should handle missing local prototype in demo mode', async () => {
      mockGetPrototype.mockReturnValue(null);

      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: true,
          slug: 'missing',
          name: '',
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      let loadedProto: unknown;
      await act(async () => {
        loadedProto = await result.current.load('missing');
      });

      expect(loadedProto).toBeNull();
      expect(stateMachine.prototypeLoadFailed).toHaveBeenCalledWith('Prototype not found');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  // ============================================================================
  // Create Tests
  // ============================================================================

  describe('createNew', () => {
    it('should create new prototype via API', async () => {
      const newProto = mockPrototype({ slug: 'new-proto-123' });
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };

      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(newProto),
      });

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: undefined,
          name: 'New Prototype',
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      let slug: string | null;
      await act(async () => {
        slug = await result.current.createNew();
      });

      expect(slug!).toBe(newProto.slug);
      expect(stateMachine.createPrototype).toHaveBeenCalled();
      expect(stateMachine.prototypeCreated).toHaveBeenCalledWith(newProto);
      expect(mockNavigate).toHaveBeenCalledWith(`/edit/${newProto.slug}`, { replace: true });
    });

    it('should skip create in demo mode', async () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: true,
          slug: undefined,
          name: 'New',
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      let slug: string | null;
      await act(async () => {
        slug = await result.current.createNew();
      });

      expect(slug!).toBeNull();
      expect(stateMachine.createPrototype).not.toHaveBeenCalled();
      expect(mockAuthFetch).not.toHaveBeenCalled();
    });

    it('should skip create when no team available', async () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };

      mockUseOrganization.mockReturnValue({
        currentTeam: null,
        teams: [],
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: undefined,
          name: 'New',
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      let slug: string | null;
      await act(async () => {
        slug = await result.current.createNew();
      });

      expect(slug!).toBeNull();
      expect(stateMachine.createPrototype).not.toHaveBeenCalled();
    });

    it('should handle create failure', async () => {
      const stateMachine = createMockStateMachine();
      const editorRef = { current: null };

      mockAuthFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: undefined,
          name: 'New',
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      let slug: string | null;
      await act(async () => {
        slug = await result.current.createNew();
      });

      expect(slug!).toBeNull();
      expect(stateMachine.prototypeCreateFailed).toHaveBeenCalledWith('Failed to create prototype');
    });
  });

  // ============================================================================
  // Status Flags Tests
  // ============================================================================

  describe('status flags', () => {
    it('should report isSaving when status is saving', () => {
      const stateMachine = createMockStateMachine({
        state: {
          status: 'saving',
          prototype: null,
          dirty: false,
          error: null,
          meta: {},
          previousStatus: null,
          lastSavedAt: null,
        },
      });
      const editorRef = { current: null };

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test',
          name: 'Test',
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      expect(result.current.isSaving).toBe(true);
    });

    it('should report isOperating based on state machine isBusy', () => {
      const stateMachine = createMockStateMachine({
        isBusy: true,
      });
      const editorRef = { current: null };

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: 'test',
          name: 'Test',
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      expect(result.current.isOperating).toBe(true);
    });
  });

  // ============================================================================
  // Callback Tests
  // ============================================================================

  describe('callbacks', () => {
    it('should call onSaveComplete after successful save', async () => {
      const proto = mockPrototype();
      const stateMachine = createMockStateMachine({
        state: {
          status: 'ready',
          prototype: proto,
          dirty: true,
          error: null,
          meta: {},
          previousStatus: null,
          lastSavedAt: null,
        },
      });
      const editorRef = { current: createMockEditor() };
      const onSaveComplete = vi.fn();

      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(proto),
      });

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: proto.slug,
          name: proto.name,
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
          onSaveComplete,
        })
      );

      await act(async () => {
        await result.current.save('manual');
      });

      expect(onSaveComplete).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Concurrent Save Queueing Tests
  // ============================================================================

  describe('concurrent save queueing', () => {
    it('should queue a save and drain it after in-flight save completes', async () => {
      const proto = mockPrototype();
      const stateMachine = createMockStateMachine({
        state: {
          status: 'ready',
          prototype: proto,
          dirty: true,
          error: null,
          meta: {},
          previousStatus: null,
          lastSavedAt: null,
        },
      });
      const editorRef = { current: createMockEditor() };

      // Use a deferred promise so we can control when the first save resolves
      let resolveFirst!: (value: unknown) => void;
      const firstResponse = new Promise((resolve) => { resolveFirst = resolve; });

      let callCount = 0;
      mockAuthFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return firstResponse;
        }
        // Second call resolves immediately
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...proto, updatedAt: new Date() }),
        });
      });

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: proto.slug,
          name: proto.name,
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      // Start first save (will be in-flight)
      let firstResult: unknown;
      let secondResult: unknown;
      await act(async () => {
        const firstPromise = result.current.save('autosave');
        // Immediately queue a second save while first is in-flight
        const secondPromise = result.current.save('autosave');

        // Resolve first save
        resolveFirst({
          ok: true,
          json: () => Promise.resolve({ ...proto, updatedAt: new Date() }),
        });

        firstResult = await firstPromise;
        // Allow the setTimeout(0) drain to fire
        await vi.waitFor(() => {
          expect(callCount).toBe(2);
        });
        secondResult = await secondPromise;
      });

      expect(firstResult).toBeTruthy();
      expect(secondResult).toBeTruthy();
      // Two API calls total
      expect(callCount).toBe(2);
    });

    it('should upgrade pending save type to manual when manual arrives after autosave', async () => {
      const proto = mockPrototype();
      const stateMachine = createMockStateMachine({
        state: {
          status: 'ready',
          prototype: proto,
          dirty: true,
          error: null,
          meta: {},
          previousStatus: null,
          lastSavedAt: null,
        },
      });
      const editorRef = { current: createMockEditor() };

      let resolveFirst!: (value: unknown) => void;
      const firstResponse = new Promise((resolve) => { resolveFirst = resolve; });

      let callCount = 0;
      mockAuthFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return firstResponse;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...proto, updatedAt: new Date() }),
        });
      });

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: proto.slug,
          name: proto.name,
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      await act(async () => {
        const firstPromise = result.current.save('autosave');
        // Queue autosave, then manual — manual should upgrade the pending type
        result.current.save('autosave');
        const manualPromise = result.current.save('manual');

        resolveFirst({
          ok: true,
          json: () => Promise.resolve({ ...proto, updatedAt: new Date() }),
        });

        await firstPromise;
        await vi.waitFor(() => {
          expect(callCount).toBe(2);
        });
        const manualResult = await manualPromise;
        expect(manualResult).toBeTruthy();
      });

      // The drained save should have been called with 'manual' type
      // (saveStart is called with the type argument)
      const saveStartCalls = (stateMachine.saveStart as ReturnType<typeof vi.fn>).mock.calls;
      expect(saveStartCalls[saveStartCalls.length - 1][0]).toBe('manual');
    });

    it('should resolve superseded pending saves with null', async () => {
      const proto = mockPrototype();
      const stateMachine = createMockStateMachine({
        state: {
          status: 'ready',
          prototype: proto,
          dirty: true,
          error: null,
          meta: {},
          previousStatus: null,
          lastSavedAt: null,
        },
      });
      const editorRef = { current: createMockEditor() };

      let resolveFirst!: (value: unknown) => void;
      const firstResponse = new Promise((resolve) => { resolveFirst = resolve; });

      let callCount = 0;
      mockAuthFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return firstResponse;
        // Subsequent calls resolve immediately
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...proto, updatedAt: new Date() }),
        });
      });

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: proto.slug,
          name: proto.name,
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      await act(async () => {
        const firstPromise = result.current.save('autosave');
        // Queue two saves — the first should be superseded
        const supersededPromise = result.current.save('autosave');
        const finalPromise = result.current.save('autosave');

        resolveFirst({
          ok: true,
          json: () => Promise.resolve({ ...proto, updatedAt: new Date() }),
        });

        await firstPromise;
        const supersededResult = await supersededPromise;
        // Superseded save should resolve with null
        expect(supersededResult).toBeNull();

        // Final save should eventually complete
        await vi.waitFor(async () => {
          const finalResult = await finalPromise;
          expect(finalResult).toBeTruthy();
        });
      });
    });

    it('should resolve pending promise gracefully when drained save errors', async () => {
      const proto = mockPrototype();
      const stateMachine = createMockStateMachine({
        state: {
          status: 'ready',
          prototype: proto,
          dirty: true,
          error: null,
          meta: {},
          previousStatus: null,
          lastSavedAt: null,
        },
      });
      const editorRef = { current: createMockEditor() };

      let resolveFirst!: (value: unknown) => void;
      const firstResponse = new Promise((resolve) => { resolveFirst = resolve; });

      let callCount = 0;
      mockAuthFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return firstResponse;
        // Second call fails
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal server error'),
        });
      });

      const { result } = renderHook(() =>
        useEditorPersistence({
          stateMachine,
          editorRef,
          isDemoMode: false,
          slug: proto.slug,
          name: proto.name,
          htmlContent: '',
          setHtmlContent: vi.fn(),
          setLocalPrototype: vi.fn(),
          localPrototype: null,
        })
      );

      await act(async () => {
        const firstPromise = result.current.save('autosave');
        const queuedPromise = result.current.save('autosave');

        resolveFirst({
          ok: true,
          json: () => Promise.resolve({ ...proto, updatedAt: new Date() }),
        });

        await firstPromise;
        await vi.waitFor(() => {
          expect(callCount).toBe(2);
        });

        // Queued save should resolve with null (error case), not throw
        const queuedResult = await queuedPromise;
        expect(queuedResult).toBeNull();
      });

      expect(stateMachine.saveFailed).toHaveBeenCalled();
    });
  });
});
