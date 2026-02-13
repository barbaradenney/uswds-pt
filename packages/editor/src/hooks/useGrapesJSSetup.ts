/**
 * GrapesJS Setup Hook
 *
 * Handles editor initialization, event registration, and resource loading.
 * Returns a configured onReady callback for the GjsEditor component.
 *
 * Setup logic is split across focused modules in lib/grapesjs/setup/:
 * - trait-setup.ts — spacing, conditional show/hide, visibility traits
 * - page-management.ts — page lifecycle, templates, frame sync, page-link
 * - component-ids.ts — ID generation, collection, proactive assignment
 * - symbol-setup.ts — symbol creation command + toolbar
 */

import { useCallback, useRef, useEffect } from 'react';
import type { Prototype, GrapesJSSymbol } from '@uswds-pt/shared';
import { createDebugLogger } from '@uswds-pt/shared';
import { mergeGlobalSymbols } from './useGlobalSymbols';
import { loadUSWDSResources, addCardContainerCSS, addFieldsetSpacingCSS, addButtonGroupCSS, addTypographyCSS, addBannerCollapseCSS, addWrapperOverrideCSS, addStateDimmingCSS, clearGrapesJSStorage } from '../lib/grapesjs/resource-loader';
import { isExtractingPerPageHtml } from '../lib/grapesjs/data-extractor';
import {
  forceCanvasUpdate,
  setupCanvasEventHandlers,
  registerClearCommand,
  setupAllInteractiveHandlers,
  syncPageLinkHrefs,
  exposeDebugHelpers,
  cleanupCanvasHelpers,
  setupConditionalFieldsWatcher,
  setupStateVisibilityWatcher,
} from '../lib/grapesjs/canvas-helpers';
import {
  setupSpacingTrait,
  setupConditionalShowHideTrait,
  setupVisibilityTrait,
  setupPageEventHandlers,
  setupPageLinkTrait,
  setupProactiveIdAssignment,
  cleanupTriggerComponentIds,
  setupSymbolCreationHandler,
} from '../lib/grapesjs/setup';
import type { UseEditorStateMachineReturn } from './useEditorStateMachine';
import type { EditorInstance } from '../types/grapesjs';
import { EDITOR_EVENTS, DATA_ATTRS } from '../lib/contracts';

const debug = createDebugLogger('GrapesJSSetup');

export interface UseGrapesJSSetupOptions {
  /** State machine for lifecycle management */
  stateMachine: UseEditorStateMachineReturn;
  /** Editor ref to store instance */
  editorRef: React.MutableRefObject<EditorInstance | null>;
  /** Whether in demo mode */
  isDemoMode: boolean;
  /** Current URL slug */
  slug?: string;
  /** Pending prototype data (loaded before editor mount) */
  pendingPrototype: Prototype | null;
  /** Local prototype for demo mode */
  localPrototype: {
    gjsData?: string;
    htmlContent?: string;
  } | null;
  /** Current prototype from state */
  prototype: Prototype | null;
  /** Callback when content changes (for autosave) */
  onContentChange: () => void;
  /** Block definitions for the editor */
  blocks: Array<{
    id: string;
    label: string;
    content: string | object;
    media: string;
    category: string;
  }>;
  /** Pre-loaded project data for safety-net loading in onReady */
  projectData?: Record<string, any> | null;
  /** Global symbols to merge into project data */
  globalSymbols?: GrapesJSSymbol[];
  /** Callback when a symbol is being created (to show scope dialog) */
  onSymbolCreate?: (symbolData: GrapesJSSymbol, selectedComponent: any) => void;
  /** Org-level state definitions (synced from useOrganization) */
  orgStates?: Array<{ id: string; name: string }>;
  /** Org-level user definitions (synced from useOrganization) */
  orgUsers?: Array<{ id: string; name: string }>;
}

export interface UseGrapesJSSetupReturn {
  /** Callback to pass to GjsEditor onReady prop */
  onReady: (editor: EditorInstance) => void;
  /** Clean up function for component unmount */
  cleanup: () => void;
  /** Force a canvas refresh */
  refreshCanvas: () => void;
}

export function useGrapesJSSetup({
  stateMachine,
  editorRef,
  // isDemoMode, slug, pendingPrototype, localPrototype, prototype are accepted
  // for interface compatibility but no longer used in onReady — project data is
  // now loaded via projectData option in EditorCanvas.
  projectData,
  onContentChange,
  blocks,
  globalSymbols = [],
  onSymbolCreate,
  orgStates = [],
  orgUsers = [],
}: UseGrapesJSSetupOptions): UseGrapesJSSetupReturn {
  // Track registered event listeners for cleanup
  const listenersRef = useRef<Array<{ event: string; handler: (...args: unknown[]) => void }>>([]);

  // Ref for project data — used in onReady as a safety-net fallback.
  // Stored as ref (not in onReady deps) to avoid recreating onReady on save.
  const projectDataRef = useRef<Record<string, any> | null>(projectData ?? null);
  projectDataRef.current = projectData ?? null;

  // Refs for org-level state/user definitions — read by onReady to seed instance properties
  const orgStatesRef = useRef(orgStates);
  orgStatesRef.current = orgStates;
  const orgUsersRef = useRef(orgUsers);
  orgUsersRef.current = orgUsers;

  // Ref for onContentChange — the GrapesJS event handlers registered in onReady
  // capture this ref once and always call the latest triggerChange through it,
  // avoiding stale closures when autosave state (enabled, canAutosave, etc.) changes.
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  // Helper to register editor event listeners with automatic tracking
  const registerListener = useCallback(
    (editor: EditorInstance, event: string, handler: (...args: unknown[]) => void) => {
      editor.on(event, handler);
      listenersRef.current.push({ event, handler });
    },
    []
  );

  // Cleanup function
  const cleanup = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      listenersRef.current.forEach(({ event, handler }) => {
        try {
          editor.off(event, handler);
        } catch {
          // Ignore errors during cleanup
        }
      });
      debug('Cleaned up', listenersRef.current.length, 'editor event listeners');
    }
    listenersRef.current = [];
    // Clean up all canvas helpers (timeouts, document listeners, debug helpers)
    cleanupCanvasHelpers();
    editorRef.current = null;
  }, [editorRef]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Inject global symbols into editor when they become available
  // This handles the case where symbols load after the editor is ready
  useEffect(() => {
    const editor = editorRef.current;
    debug('Global symbols effect triggered, count:', globalSymbols.length);

    if (!editor || globalSymbols.length === 0) {
      debug('Skipping injection: editor=', !!editor, 'symbols=', globalSymbols.length);
      return;
    }

    // Check if editor is fully initialized
    if (!editor.getProjectData || !editor.loadProjectData) {
      debug('Editor not fully initialized yet');
      return;
    }

    try {
      const currentData = editor.getProjectData();
      const existingSymbolIds = new Set(
        (currentData.symbols || []).map((s: any) => s.id)
      );
      debug('Existing symbol IDs:', [...existingSymbolIds]);

      // Only add symbols that aren't already in the editor
      const newSymbols = globalSymbols.filter(
        (s) => !existingSymbolIds.has(s.id)
      );

      debug('New symbols to inject:', newSymbols.length, newSymbols.map(s => s.id));

      if (newSymbols.length > 0) {
        debug('Injecting', newSymbols.length, 'new global symbols into editor');
        const mergedData = mergeGlobalSymbols(currentData, newSymbols);
        debug('Merged data symbols:', mergedData.symbols?.length);
        editor.loadProjectData(mergedData);
        debug('Injection complete');
      }
    } catch (e) {
      debug('Failed to inject global symbols:', e);
    }
  }, [globalSymbols, editorRef]);

  // Refresh canvas helper
  const refreshCanvas = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      forceCanvasUpdate(editor);
    }
  }, [editorRef]);

  // Main onReady callback
  const onReady = useCallback(
    (editor: EditorInstance) => {
      // Clean up any previous editor instance before setting up new one
      const previousEditor = editorRef.current;
      if (previousEditor && previousEditor !== editor) {
        debug('Cleaning up previous editor instance');
        listenersRef.current.forEach(({ event, handler }) => {
          try {
            previousEditor.off(event, handler);
          } catch {
            // Ignore errors during cleanup
          }
        });
      }

      editorRef.current = editor;
      debug('Editor ready');

      // Clear any GrapesJS internal storage to prevent state bleeding
      clearGrapesJSStorage();

      // Clear registered listeners array (old ones were cleaned up above)
      listenersRef.current = [];

      // Set up change event listeners for autosave.
      const changeHandler = () => {
        debug('[Change detected]');
        onContentChangeRef.current();
      };

      registerListener(editor, 'component:add', changeHandler);
      registerListener(editor, 'component:remove', changeHandler);
      registerListener(editor, 'component:update', changeHandler);
      registerListener(editor, 'style:change', changeHandler);

      // Seed org-level state/user definitions into editor instance properties.
      (editor as any).__projectStates = orgStatesRef.current;
      (editor as any).__projectUsers = orgUsersRef.current;

      // Safety-net: redundant when projectData option loads correctly,
      // but critical fallback when it doesn't (e.g., silent init failure).
      if (projectDataRef.current) {
        try {
          debug('Safety-net: loading project data via loadProjectData');
          editor.loadProjectData(projectDataRef.current);
        } catch (e) {
          debug('Safety-net loadProjectData failed (non-fatal):', e);
        }
      }

      // --- Setup modules ---

      setupSpacingTrait(editor, registerListener);
      removeDefaultBlocks(editor, blocks);
      setupCanvasEventHandlers(editor, (event, handler) => registerListener(editor, event, handler));
      registerClearCommand(editor);

      const pageHandlers = setupPageEventHandlers(editor, registerListener, stateMachine);
      setupAllInteractiveHandlers(editor, (event, handler) => registerListener(editor, event, handler));
      setupConditionalFieldsWatcher(editor, (event, handler) => registerListener(editor, event, handler));
      setupPageLinkTrait(editor, registerListener);
      setupConditionalShowHideTrait(editor, registerListener);

      setupVisibilityTrait(editor, registerListener, {
        dataKey: 'states',
        traitName: 'state-visibility',
        traitLabel: 'Visible In States',
        dataAttribute: DATA_ATTRS.STATES,
        selectEvent: EDITOR_EVENTS.STATE_SELECT,
        updateEvent: 'states:update',
      });

      setupVisibilityTrait(editor, registerListener, {
        dataKey: 'users',
        traitName: 'user-visibility',
        traitLabel: 'Visible For Users',
        dataAttribute: DATA_ATTRS.USERS,
        selectEvent: EDITOR_EVENTS.USER_SELECT,
        updateEvent: 'users:update',
      });

      setupStateVisibilityWatcher(editor, (event, handler) => registerListener(editor, event, handler));
      setupProactiveIdAssignment(editor, registerListener);
      cleanupTriggerComponentIds(editor);

      // Load USWDS resources into canvas iframe
      registerListener(editor, 'canvas:frame:load', () => {
        if (!isExtractingPerPageHtml()) loadUSWDSResources(editor);
      });
      registerListener(editor, 'canvas:frame:load', () => {
        if (!isExtractingPerPageHtml()) syncPageLinkHrefs(editor);
      });

      // Try immediately, then retry with increasing delays if canvas isn't ready
      const tryLoadResources = (attempt: number) => {
        const doc = editor.Canvas?.getDocument();
        if (doc) {
          loadUSWDSResources(editor);
          addCardContainerCSS(editor);
          addFieldsetSpacingCSS(editor);
          addButtonGroupCSS(editor);
          addTypographyCSS(editor);
          addBannerCollapseCSS(editor);
          addWrapperOverrideCSS(editor);
          addStateDimmingCSS(editor);
        } else if (attempt < 10) {
          debug(`Canvas document not ready, retrying (attempt ${attempt + 1})...`);
          setTimeout(() => tryLoadResources(attempt + 1), 200);
        }
      };
      tryLoadResources(0);

      exposeDebugHelpers(editor);

      if (onSymbolCreate) {
        setupSymbolCreationHandler(editor, registerListener, onSymbolCreate);
      }

      stateMachine.editorReady();
      setTimeout(() => pageHandlers.markInitialized(), 0);
    },
    [
      editorRef,
      blocks,
      stateMachine,
      registerListener,
      onSymbolCreate,
    ]
  );

  return {
    onReady,
    cleanup,
    refreshCanvas,
  };
}

/**
 * Remove default GrapesJS blocks that aren't in our list
 */
function removeDefaultBlocks(editor: EditorInstance, blocks: Array<{ id: string }>): void {
  const blockManager = editor.Blocks;
  if (!blockManager) return;

  const allBlocks = blockManager.getAll();
  const ourBlockIds = new Set(blocks.map((b) => b.id));

  const blocksToRemove = allBlocks.filter((block: any) => {
    const blockId = block.get('id');
    return !ourBlockIds.has(blockId);
  });

  blocksToRemove.forEach((block: any) => {
    const blockId = block.get('id');
    debug('Removing default block:', blockId);
    blockManager.remove(blockId);
  });
}
