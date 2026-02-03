/**
 * Editor State Machine
 *
 * A finite state machine that manages all editor lifecycle states.
 * Replaces scattered refs with explicit states and guarded transitions.
 */

import { useReducer, useCallback, useRef, useMemo } from 'react';
import type { Prototype } from '@uswds-pt/shared';

// Debug logging
const DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('debug') === 'true' ||
    localStorage.getItem('uswds_pt_debug') === 'true');

function debug(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[EditorStateMachine]', ...args);
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * All possible editor states
 */
export type EditorStatus =
  | 'uninitialized'
  | 'loading_prototype'
  | 'creating_prototype'
  | 'initializing_editor'
  | 'ready'
  | 'page_switching'
  | 'saving'
  | 'restoring_version'
  | 'error';

/**
 * Metadata associated with specific states
 */
export interface EditorStateMeta {
  slug?: string;
  saveType?: 'manual' | 'autosave';
  versionNumber?: number;
  errorMessage?: string;
}

/**
 * Complete editor state
 */
export interface EditorState {
  status: EditorStatus;
  prototype: Prototype | null;
  dirty: boolean;
  error: string | null;
  meta: EditorStateMeta;
  /** Timestamp of last successful save */
  lastSavedAt: number | null;
  /** Previous status (for recovery from error state) */
  previousStatus: EditorStatus | null;
}

/**
 * All possible actions that can trigger state transitions
 */
export type EditorAction =
  | { type: 'LOAD_PROTOTYPE'; slug: string }
  | { type: 'PROTOTYPE_LOADED'; prototype: Prototype }
  | { type: 'PROTOTYPE_LOAD_FAILED'; error: string }
  | { type: 'CREATE_PROTOTYPE' }
  | { type: 'PROTOTYPE_CREATED'; prototype: Prototype }
  | { type: 'PROTOTYPE_CREATE_FAILED'; error: string }
  | { type: 'EDITOR_INITIALIZING' }
  | { type: 'EDITOR_READY' }
  | { type: 'PAGE_SWITCH_START' }
  | { type: 'PAGE_SWITCH_COMPLETE' }
  | { type: 'CONTENT_CHANGED' }
  | { type: 'SAVE_START'; saveType: 'manual' | 'autosave' }
  | { type: 'SAVE_SUCCESS'; prototype: Prototype }
  | { type: 'SAVE_FAILED'; error: string }
  | { type: 'RESTORE_VERSION_START'; versionNumber: number }
  | { type: 'RESTORE_VERSION_COMPLETE'; prototype: Prototype }
  | { type: 'RESTORE_VERSION_FAILED'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'MARK_CLEAN' }
  | { type: 'RESET' };

// ============================================================================
// Initial State
// ============================================================================

const initialState: EditorState = {
  status: 'uninitialized',
  prototype: null,
  dirty: false,
  error: null,
  meta: {},
  lastSavedAt: null,
  previousStatus: null,
};

// ============================================================================
// State Transition Definitions
// ============================================================================

/**
 * Valid transitions from each state.
 * This explicitly defines what actions are allowed in each state.
 */
const validTransitions: Record<EditorStatus, EditorAction['type'][]> = {
  uninitialized: [
    'LOAD_PROTOTYPE',
    'CREATE_PROTOTYPE',
    'EDITOR_INITIALIZING',
    'EDITOR_READY', // Allow direct transition for new prototypes
    'RESET',
  ],
  loading_prototype: [
    'PROTOTYPE_LOADED',
    'PROTOTYPE_LOAD_FAILED',
    'RESET',
  ],
  creating_prototype: [
    'PROTOTYPE_CREATED',
    'PROTOTYPE_CREATE_FAILED',
    'RESET',
  ],
  initializing_editor: [
    'EDITOR_READY',
    'RESET',
  ],
  ready: [
    'LOAD_PROTOTYPE',
    'SAVE_START',
    'PAGE_SWITCH_START',
    'RESTORE_VERSION_START',
    'CONTENT_CHANGED',
    'MARK_CLEAN',
    'RESET',
  ],
  page_switching: [
    'PAGE_SWITCH_COMPLETE',
    'RESET',
  ],
  saving: [
    'SAVE_SUCCESS',
    'SAVE_FAILED',
    'RESET',
  ],
  restoring_version: [
    'RESTORE_VERSION_COMPLETE',
    'RESTORE_VERSION_FAILED',
    'RESET',
  ],
  error: [
    'CLEAR_ERROR',
    'LOAD_PROTOTYPE',
    'CREATE_PROTOTYPE',
    'RESET',
  ],
};

// ============================================================================
// Reducer
// ============================================================================

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  // Log all transitions in debug mode
  debug(`Action: ${action.type}`, 'Current status:', state.status, 'Action payload:', action);

  // Check if transition is valid
  const allowedActions = validTransitions[state.status];
  if (!allowedActions.includes(action.type)) {
    console.warn(
      `[EditorStateMachine] Invalid transition: ${action.type} from ${state.status}. ` +
      `Allowed actions: ${allowedActions.join(', ')}`
    );
    // Don't throw - just log warning and return current state
    return state;
  }

  switch (action.type) {
    case 'LOAD_PROTOTYPE':
      return {
        ...state,
        status: 'loading_prototype',
        error: null,
        meta: { slug: action.slug },
      };

    case 'PROTOTYPE_LOADED':
      return {
        ...state,
        status: 'initializing_editor',
        prototype: action.prototype,
        dirty: false,
        error: null,
        meta: { slug: action.prototype.slug },
      };

    case 'PROTOTYPE_LOAD_FAILED':
      return {
        ...state,
        status: 'error',
        error: action.error,
        previousStatus: state.status,
        meta: { ...state.meta, errorMessage: action.error },
      };

    case 'CREATE_PROTOTYPE':
      return {
        ...state,
        status: 'creating_prototype',
        error: null,
        meta: {},
      };

    case 'PROTOTYPE_CREATED':
      return {
        ...state,
        status: 'initializing_editor',
        prototype: action.prototype,
        dirty: false,
        error: null,
        meta: { slug: action.prototype.slug },
      };

    case 'PROTOTYPE_CREATE_FAILED':
      return {
        ...state,
        status: 'error',
        error: action.error,
        previousStatus: state.status,
        meta: { errorMessage: action.error },
      };

    case 'EDITOR_INITIALIZING':
      return {
        ...state,
        status: 'initializing_editor',
        error: null,
      };

    case 'EDITOR_READY':
      return {
        ...state,
        status: 'ready',
        error: null,
      };

    case 'PAGE_SWITCH_START':
      return {
        ...state,
        status: 'page_switching',
        previousStatus: 'ready',
      };

    case 'PAGE_SWITCH_COMPLETE':
      return {
        ...state,
        status: 'ready',
      };

    case 'CONTENT_CHANGED':
      return {
        ...state,
        dirty: true,
      };

    case 'SAVE_START':
      return {
        ...state,
        status: 'saving',
        previousStatus: 'ready',
        meta: { ...state.meta, saveType: action.saveType },
      };

    case 'SAVE_SUCCESS':
      return {
        ...state,
        status: 'ready',
        prototype: action.prototype,
        dirty: false,
        error: null,
        lastSavedAt: Date.now(),
        meta: { slug: action.prototype.slug },
      };

    case 'SAVE_FAILED':
      return {
        ...state,
        status: 'ready', // Return to ready, not error - save failures shouldn't block editing
        error: action.error,
        meta: { ...state.meta, errorMessage: action.error },
      };

    case 'RESTORE_VERSION_START':
      return {
        ...state,
        status: 'restoring_version',
        previousStatus: 'ready',
        meta: { ...state.meta, versionNumber: action.versionNumber },
      };

    case 'RESTORE_VERSION_COMPLETE':
      return {
        ...state,
        status: 'ready',
        prototype: action.prototype,
        dirty: false,
        error: null,
        lastSavedAt: Date.now(),
        meta: { slug: action.prototype.slug },
      };

    case 'RESTORE_VERSION_FAILED':
      return {
        ...state,
        status: 'ready', // Return to ready on restore failure
        error: action.error,
        meta: { ...state.meta, errorMessage: action.error },
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        status: state.previousStatus || 'ready',
        error: null,
        meta: { ...state.meta, errorMessage: undefined },
      };

    case 'MARK_CLEAN':
      return {
        ...state,
        dirty: false,
      };

    case 'RESET':
      return {
        ...initialState,
      };

    default:
      return state;
  }
}

// ============================================================================
// Guard Functions
// ============================================================================

/**
 * Check if save operation is allowed
 */
export function canSave(state: EditorState): boolean {
  return state.status === 'ready';
}

/**
 * Check if page switching is allowed
 */
export function canSwitchPage(state: EditorState): boolean {
  return state.status === 'ready';
}

/**
 * Check if autosave should run
 */
export function canAutosave(state: EditorState): boolean {
  return (
    state.status === 'ready' &&
    state.dirty &&
    state.prototype !== null
  );
}

/**
 * Check if content modification is allowed
 * (during ready state or while initializing)
 */
export function canModifyContent(state: EditorState): boolean {
  return state.status === 'ready' || state.status === 'initializing_editor';
}

/**
 * Check if the editor is in a loading state
 * Note: initializing_editor is NOT included because the editor component
 * needs to render during that state so GrapesJS can mount and call onReady
 */
export function isLoading(state: EditorState): boolean {
  return (
    state.status === 'loading_prototype' ||
    state.status === 'creating_prototype'
  );
}

/**
 * Check if the editor is in a busy state (loading, saving, etc.)
 */
export function isBusy(state: EditorState): boolean {
  return (
    state.status === 'loading_prototype' ||
    state.status === 'creating_prototype' ||
    state.status === 'saving' ||
    state.status === 'restoring_version' ||
    state.status === 'page_switching'
  );
}

// ============================================================================
// Hook
// ============================================================================

export interface UseEditorStateMachineReturn {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;

  // Guard function results (memoized)
  canSave: boolean;
  canSwitchPage: boolean;
  canAutosave: boolean;
  canModifyContent: boolean;
  isLoading: boolean;
  isBusy: boolean;

  // Convenience action dispatchers
  loadPrototype: (slug: string) => void;
  prototypeLoaded: (prototype: Prototype) => void;
  prototypeLoadFailed: (error: string) => void;
  createPrototype: () => void;
  prototypeCreated: (prototype: Prototype) => void;
  prototypeCreateFailed: (error: string) => void;
  editorInitializing: () => void;
  editorReady: () => void;
  pageSwitchStart: () => void;
  pageSwitchComplete: () => void;
  contentChanged: () => void;
  saveStart: (saveType: 'manual' | 'autosave') => void;
  saveSuccess: (prototype: Prototype) => void;
  saveFailed: (error: string) => void;
  restoreVersionStart: (versionNumber: number) => void;
  restoreVersionComplete: (prototype: Prototype) => void;
  restoreVersionFailed: (error: string) => void;
  clearError: () => void;
  markClean: () => void;
  reset: () => void;
}

export function useEditorStateMachine(): UseEditorStateMachineReturn {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  // Track previous state for debugging
  const prevStateRef = useRef(state);
  if (prevStateRef.current.status !== state.status) {
    debug(`Status transition: ${prevStateRef.current.status} -> ${state.status}`);
    prevStateRef.current = state;
  }

  // Memoized guard results
  const guardResults = useMemo(
    () => ({
      canSave: canSave(state),
      canSwitchPage: canSwitchPage(state),
      canAutosave: canAutosave(state),
      canModifyContent: canModifyContent(state),
      isLoading: isLoading(state),
      isBusy: isBusy(state),
    }),
    [state]
  );

  // Convenience action dispatchers
  const loadPrototype = useCallback(
    (slug: string) => dispatch({ type: 'LOAD_PROTOTYPE', slug }),
    []
  );

  const prototypeLoaded = useCallback(
    (prototype: Prototype) => dispatch({ type: 'PROTOTYPE_LOADED', prototype }),
    []
  );

  const prototypeLoadFailed = useCallback(
    (error: string) => dispatch({ type: 'PROTOTYPE_LOAD_FAILED', error }),
    []
  );

  const createPrototype = useCallback(
    () => dispatch({ type: 'CREATE_PROTOTYPE' }),
    []
  );

  const prototypeCreated = useCallback(
    (prototype: Prototype) => dispatch({ type: 'PROTOTYPE_CREATED', prototype }),
    []
  );

  const prototypeCreateFailed = useCallback(
    (error: string) => dispatch({ type: 'PROTOTYPE_CREATE_FAILED', error }),
    []
  );

  const editorInitializing = useCallback(
    () => dispatch({ type: 'EDITOR_INITIALIZING' }),
    []
  );

  const editorReady = useCallback(
    () => dispatch({ type: 'EDITOR_READY' }),
    []
  );

  const pageSwitchStart = useCallback(
    () => dispatch({ type: 'PAGE_SWITCH_START' }),
    []
  );

  const pageSwitchComplete = useCallback(
    () => dispatch({ type: 'PAGE_SWITCH_COMPLETE' }),
    []
  );

  const contentChanged = useCallback(
    () => dispatch({ type: 'CONTENT_CHANGED' }),
    []
  );

  const saveStart = useCallback(
    (saveType: 'manual' | 'autosave') => dispatch({ type: 'SAVE_START', saveType }),
    []
  );

  const saveSuccess = useCallback(
    (prototype: Prototype) => dispatch({ type: 'SAVE_SUCCESS', prototype }),
    []
  );

  const saveFailed = useCallback(
    (error: string) => dispatch({ type: 'SAVE_FAILED', error }),
    []
  );

  const restoreVersionStart = useCallback(
    (versionNumber: number) => dispatch({ type: 'RESTORE_VERSION_START', versionNumber }),
    []
  );

  const restoreVersionComplete = useCallback(
    (prototype: Prototype) => dispatch({ type: 'RESTORE_VERSION_COMPLETE', prototype }),
    []
  );

  const restoreVersionFailed = useCallback(
    (error: string) => dispatch({ type: 'RESTORE_VERSION_FAILED', error }),
    []
  );

  const clearError = useCallback(
    () => dispatch({ type: 'CLEAR_ERROR' }),
    []
  );

  const markClean = useCallback(
    () => dispatch({ type: 'MARK_CLEAN' }),
    []
  );

  const reset = useCallback(
    () => dispatch({ type: 'RESET' }),
    []
  );

  return {
    state,
    dispatch,
    ...guardResults,
    loadPrototype,
    prototypeLoaded,
    prototypeLoadFailed,
    createPrototype,
    prototypeCreated,
    prototypeCreateFailed,
    editorInitializing,
    editorReady,
    pageSwitchStart,
    pageSwitchComplete,
    contentChanged,
    saveStart,
    saveSuccess,
    saveFailed,
    restoreVersionStart,
    restoreVersionComplete,
    restoreVersionFailed,
    clearError,
    markClean,
    reset,
  };
}

// Export reducer and initial state for testing
export { editorReducer, initialState };
