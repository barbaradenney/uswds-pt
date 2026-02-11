/**
 * GrapesJS Setup Hook
 *
 * Handles editor initialization, event registration, and resource loading.
 * Returns a configured onReady callback for the GjsEditor component.
 */

import { useCallback, useRef, useEffect } from 'react';
import type { Prototype, GrapesJSSymbol } from '@uswds-pt/shared';
import { createDebugLogger } from '@uswds-pt/shared';
import { DEFAULT_CONTENT } from '@uswds-pt/adapter';
import { mergeGlobalSymbols } from './useGlobalSymbols';
import { loadUSWDSResources, addCardContainerCSS, addFieldsetSpacingCSS, addButtonGroupCSS, addTypographyCSS, addBannerCollapseCSS, addWrapperOverrideCSS, addStateDimmingCSS, clearGrapesJSStorage } from '../lib/grapesjs/resource-loader';
import { isExtractingPerPageHtml } from '../lib/grapesjs/data-extractor';
import {
  forceCanvasUpdate,
  setupCanvasEventHandlers,
  registerClearCommand,
  setupAllInteractiveHandlers,
  reinitInteractiveHandlers,
  syncPageLinkHrefs,
  exposeDebugHelpers,
  cleanupCanvasHelpers,
  setupConditionalFieldsWatcher,
  setupStateVisibilityWatcher,
} from '../lib/grapesjs/canvas-helpers';
import type { UseEditorStateMachineReturn } from './useEditorStateMachine';
import type { EditorInstance } from '../types/grapesjs';

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
}: UseGrapesJSSetupOptions): UseGrapesJSSetupReturn {
  // Track registered event listeners for cleanup
  const listenersRef = useRef<Array<{ event: string; handler: (...args: unknown[]) => void }>>([]);

  // Ref for project data — used in onReady as a safety-net fallback.
  // Stored as ref (not in onReady deps) to avoid recreating onReady on save.
  const projectDataRef = useRef<Record<string, any> | null>(projectData ?? null);
  projectDataRef.current = projectData ?? null;

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
      // This handles edge cases where onReady might be called multiple times
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
      // Uses onContentChangeRef (not onContentChange) so this handler always
      // calls the latest triggerChange, even though it's registered once at mount.
      const changeHandler = () => {
        debug('[Change detected]');
        onContentChangeRef.current();
      };

      registerListener(editor, 'component:add', changeHandler);
      registerListener(editor, 'component:remove', changeHandler);
      registerListener(editor, 'component:update', changeHandler);
      registerListener(editor, 'style:change', changeHandler);

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

      // Custom CSS (addCardContainerCSS, etc.) is injected in the
      // tryLoadResources retry loop below, after the canvas document is ready.

      // Set up spacing trait for all components
      setupSpacingTrait(editor, registerListener);

      // Remove default GrapesJS blocks that aren't ours
      removeDefaultBlocks(editor, blocks);

      // Set up canvas event handlers
      setupCanvasEventHandlers(editor, (event, handler) => registerListener(editor, event, handler));

      // Register custom clear command
      registerClearCommand(editor);

      // Set up page event handlers
      const pageHandlers = setupPageEventHandlers(editor, registerListener, stateMachine);

      // Set up interactive component handlers
      setupAllInteractiveHandlers(editor, (event, handler) => registerListener(editor, event, handler));

      // Set up conditional fields visibility watcher (re-applies when traits change)
      setupConditionalFieldsWatcher(editor, (event, handler) => registerListener(editor, event, handler));

      // Set up page link trait updates
      setupPageLinkTrait(editor, registerListener);

      // Set up conditional show/hide trait (dynamic component picker)
      setupConditionalShowHideTrait(editor, registerListener);

      // Set up state visibility trait (checkbox-group for multi-select state tagging)
      setupVisibilityTrait(editor, registerListener, {
        dataKey: 'states',
        traitName: 'state-visibility',
        traitLabel: 'Visible In States',
        dataAttribute: 'data-states',
        selectEvent: 'state:select',
        updateEvent: 'states:update',
      });

      // Set up user visibility trait (checkbox-group for multi-select user tagging)
      setupVisibilityTrait(editor, registerListener, {
        dataKey: 'users',
        traitName: 'user-visibility',
        traitLabel: 'Visible For Users',
        dataAttribute: 'data-users',
        selectEvent: 'user:select',
        updateEvent: 'users:update',
      });

      // Set up state visibility watcher (dimming in canvas)
      setupStateVisibilityWatcher(editor, (event, handler) => registerListener(editor, event, handler));

      // Set up proactive ID assignment for targetable components
      setupProactiveIdAssignment(editor, registerListener);

      // Clean up existing checkboxes/radios with IDs (causes duplicate ID issues)
      cleanupTriggerComponentIds(editor);

      // Load USWDS resources into canvas iframe.
      // The canvas:frame:load event may have already fired before onReady,
      // so we also poll for the canvas document as a fallback.
      registerListener(editor, 'canvas:frame:load', () => loadUSWDSResources(editor));
      registerListener(editor, 'canvas:frame:load', () => syncPageLinkHrefs(editor));

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

      // Expose debug helpers
      exposeDebugHelpers(editor);

      // Set up symbol creation interception
      if (onSymbolCreate) {
        setupSymbolCreationHandler(editor, registerListener, onSymbolCreate);
      }

      // Mark editor as ready in state machine
      stateMachine.editorReady();

      // Enable template injection for user-added pages.
      // Deferred so all initial page:add events (fired by GrapesJS during init)
      // complete first — the initial page already has content from
      // initialContent/projectData and must not be overwritten.
      setTimeout(() => pageHandlers.markInitialized(), 0);
    },
    [
      editorRef,
      // isDemoMode, slug, pendingPrototype, localPrototype, globalSymbols
      // intentionally omitted — project data is now loaded via projectData option
      // in EditorCanvas, not in onReady. This prevents recreating onReady
      // (and thus re-rendering EditorCanvas / reinitializing the editor) on save.
      // onContentChange intentionally omitted — accessed via onContentChangeRef
      // to avoid stale closures in GrapesJS event handlers.
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
 * Set up spacing trait for all components
 */
function setupSpacingTrait(
  editor: EditorInstance,
  registerListener: (editor: EditorInstance, event: string, handler: (...args: unknown[]) => void) => void
): void {
  const spacingOptions = [
    { id: '', label: 'None' },
    { id: 'margin-top-1', label: '8px (1 unit)' },
    { id: 'margin-top-2', label: '16px (2 units)' },
    { id: 'margin-top-3', label: '24px (3 units)' },
    { id: 'margin-top-4', label: '32px (4 units)' },
    { id: 'margin-top-5', label: '40px (5 units)' },
    { id: 'margin-top-6', label: '48px (6 units)' },
    { id: 'margin-top-8', label: '64px (8 units)' },
    { id: 'margin-top-10', label: '80px (10 units)' },
  ];

  const updateSpacingClass = (component: any, newClass: string) => {
    const el = component.getEl();
    if (!el) return;

    const currentClasses = component.getClasses();
    const classesToRemove = currentClasses.filter((cls: string) =>
      cls.startsWith('margin-top-')
    );
    classesToRemove.forEach((cls: string) => component.removeClass(cls));

    if (newClass) {
      component.addClass(newClass);
    }
  };

  registerListener(editor, 'component:selected', (component: any) => {
    const traits = component.get('traits');
    const hasSpacingTrait = traits.where({ name: 'top-spacing' }).length > 0;

    if (!hasSpacingTrait) {
      const currentClasses = component.getClasses();
      const currentMargin = currentClasses.find((cls: string) =>
        cls.startsWith('margin-top-')
      ) || '';

      traits.add({
        type: 'select',
        name: 'top-spacing',
        label: 'Top Spacing',
        default: currentMargin,
        options: spacingOptions,
        changeProp: false,
      });
    }
  });

  registerListener(editor, 'component:update', (component: any) => {
    const topSpacing = component.getTrait('top-spacing');
    if (topSpacing) {
      const value = topSpacing.getValue();
      updateSpacingClass(component, value);
    }
  });
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

/**
 * Wait for canvas frame to be ready, with timeout fallback
 * Uses event-based synchronization instead of hardcoded delays
 * @param signal - Optional AbortSignal for cancellation
 */
function waitForFrameReady(
  editor: EditorInstance,
  timeoutMs: number = 300,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already aborted
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      editor.off('canvas:frame:load', onFrameLoad);
    };

    // Handler for when frame is loaded
    const onFrameLoad = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      debug('Frame ready (event)');
      resolve();
    };

    // Handler for abort
    const onAbort = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    // Listen for frame load event
    editor.on('canvas:frame:load', onFrameLoad);

    // Fallback timeout in case event doesn't fire
    timeoutId = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      signal?.removeEventListener('abort', onAbort);
      cleanup();
      debug('Frame ready (timeout fallback)');
      resolve();
    }, timeoutMs);

    // Check if frame is already ready
    const frame = editor.Canvas?.getFrame?.();
    if (frame?.loaded || editor.Canvas?.getDocument?.()) {
      if (!resolved) {
        resolved = true;
        signal?.removeEventListener('abort', onAbort);
        cleanup();
        debug('Frame already ready');
        resolve();
      }
    }
  });
}

/**
 * Set up page event handlers
 */
function setupPageEventHandlers(
  editor: EditorInstance,
  registerListener: (editor: EditorInstance, event: string, handler: (...args: unknown[]) => void) => void,
  stateMachine: UseEditorStateMachineReturn
): { markInitialized: () => void } {
  // Track pages that need template
  const pagesNeedingTemplate = new Set<string>();

  // Don't mark pages for template during initial editor setup.
  // The initial page already has content from initialContent/projectData
  // and should not be overwritten with blank-template.
  let isInitialized = false;

  // Track pending operations to prevent race conditions
  let pendingPageSwitch: AbortController | null = null;

  // Consolidated page:select handler — handles resource loading, template
  // injection, canvas refresh, and page-link sync in a single sequential flow.
  // This eliminates the race condition that occurred when two separate handlers
  // ran async operations concurrently on the same page:select event.
  registerListener(editor, 'page:select', async (page: any) => {
    // Skip side effects when data extractor is cycling pages for HTML extraction
    if (isExtractingPerPageHtml()) return;

    const pageId = page?.getId?.() || page?.id;
    const pageName = page?.get?.('name') || page?.getName?.() || 'unnamed';
    debug('Page selected:', pageId, '-', pageName);

    // Cancel any pending page switch operation
    if (pendingPageSwitch) {
      pendingPageSwitch.abort();
      // Complete the previous switch in the state machine so it returns to "ready".
      // The aborted switch's finally block will skip pageSwitchComplete (signal.aborted),
      // so we must do it here to avoid getting stuck in "page_switching".
      // Safe to call even if already "ready" — invalid transitions are silently ignored.
      stateMachine.pageSwitchComplete();
    }
    pendingPageSwitch = new AbortController();
    const signal = pendingPageSwitch.signal;

    // Block saves during page transition
    stateMachine.pageSwitchStart();

    try {
      // Wait for frame to be ready using event-based approach
      // Pass signal to allow cancellation if user switches pages again
      await waitForFrameReady(editor, 300, signal);

      if (signal.aborted) {
        debug('Page switch aborted (new switch started)');
        return;
      }

      // Ensure USWDS resources are loaded
      // Pass signal to allow cancellation during resource loading
      await loadUSWDSResources(editor, signal);

      if (signal.aborted) return;

      // Inject template into newly added pages AFTER resources are loaded,
      // so USWDS CSS/JS applies to the injected content.
      if (pageId && pagesNeedingTemplate.has(pageId)) {
        pagesNeedingTemplate.delete(pageId);

        try {
          // Use getWrapper() which always returns the current page's wrapper
          // after page:select — simpler and more reliable than the multiple
          // fallback strategies used previously.
          const mainComponent = editor.DomComponents?.getWrapper?.();

          if (mainComponent) {
            const existingComponents = mainComponent.components?.();
            const componentCount = existingComponents?.length || 0;

            let shouldAddTemplate = componentCount === 0;

            if (!shouldAddTemplate && componentCount <= 3) {
              const componentTypes = existingComponents.map((c: any) =>
                c.get?.('tagName')?.toLowerCase() || c.get?.('type') || ''
              );

              const isDefaultContent = componentTypes.every((type: string) =>
                ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'text', 'default', 'heading-block', 'text-block'].includes(type)
              );

              if (isDefaultContent) {
                shouldAddTemplate = true;
              }
            }

            if (shouldAddTemplate) {
              const blankTemplate = DEFAULT_CONTENT['blank-template']?.replace('__FULL_HTML__', '') || '';
              if (blankTemplate) {
                mainComponent.components(blankTemplate);
                debug('Added default template to new page');
              }
            }
          }
        } catch (err) {
          debug('Error adding template to new page:', err);
        }
      }

      forceCanvasUpdate(editor);

      // Re-attach all interactive handlers (page links, banner, accordion,
      // modal) to the now-ready canvas document. setupAllInteractiveHandlers
      // only registers on canvas:frame:load; page:select is handled here
      // after the frame is confirmed ready.
      reinitInteractiveHandlers(editor);

      // Sync page-link hrefs after every page switch to ensure href attributes
      // match #page-{pageLink} — needed for both in-canvas nav and Preview.
      syncPageLinkHrefs(editor);

      debug('Page switch completed');
    } catch (err) {
      // Don't log abort errors - they're expected during rapid page switching
      if (err instanceof DOMException && err.name === 'AbortError') {
        debug('Page switch aborted');
        return;
      }
      if (!signal.aborted) {
        debug('Page switch warning:', err);
      }
    } finally {
      // Release the page-switch lock ONLY if this switch wasn't aborted.
      // If aborted, a new switch is already in progress — it called
      // pageSwitchComplete() (to release OUR lock) then pageSwitchStart()
      // (for itself). Calling pageSwitchComplete() here would release the
      // NEW switch's lock, allowing saves during its transition.
      if (!signal.aborted) {
        stateMachine.pageSwitchComplete();
        debug('Page switch lock released');
      }
    }
  });

  registerListener(editor, 'page:add', (page: any) => {
    const pageId = page?.getId?.() || page?.id;
    const pageName = page?.get?.('name') || page?.getName?.() || 'New Page';
    debug('Page added:', pageId, '-', pageName);
    // Only mark for template AFTER initial editor setup completes.
    // The initial page(s) already have content from initialContent/projectData.
    if (pageId && isInitialized) {
      pagesNeedingTemplate.add(pageId);
      debug('Marked page for template:', pageId);
    } else {
      debug('Skipping template mark for initial page:', pageId);
    }
  });

  registerListener(editor, 'page:remove', (page: any) => {
    const pageId = page?.getId?.() || page?.id;
    debug('Page removed:', pageId);
  });

  return {
    markInitialized: () => {
      isInitialized = true;
      debug('Page event handlers: init complete, template injection enabled');
    },
  };
}

/**
 * Set up page-link trait updates
 */
function setupPageLinkTrait(
  editor: EditorInstance,
  registerListener: (editor: EditorInstance, event: string, handler: (...args: unknown[]) => void) => void
): void {
  const updatePageLinkOptions = (component: any) => {
    if (!component) return;

    const pages = editor.Pages?.getAll?.() || [];
    const currentPage = editor.Pages?.getSelected?.() || null;

    const pageOptions = [
      { id: '', label: '-- Select a page --' },
      ...pages
        .filter((page: any) => !currentPage || page !== currentPage)
        .map((page: any) => ({
          id: page.getId?.() || page.id,
          label: page.get?.('name') || page.getName?.() || `Page ${page.getId?.() || page.id}`,
        })),
    ];

    // Update the main page-link trait (for usa-button, usa-link)
    const pageLinkTrait = component.getTrait?.('page-link');
    if (pageLinkTrait) {
      pageLinkTrait.set('options', pageOptions);
      debug('Updated page-link options:', pageOptions);
    }

    // Update button group page-link traits (btn1-page-link, btn2-page-link, etc.)
    for (let i = 1; i <= 4; i++) {
      const btnPageLinkTrait = component.getTrait?.(`btn${i}-page-link`);
      if (btnPageLinkTrait) {
        btnPageLinkTrait.set('options', pageOptions);
        debug(`Updated btn${i}-page-link options`);
      }
    }
  };

  registerListener(editor, 'component:selected', (component: any) => {
    updatePageLinkOptions(component);
  });

  registerListener(editor, 'page', () => {
    const selected = editor.getSelected?.();
    if (selected) {
      updatePageLinkOptions(selected);
    }
  });
}

/**
 * Get a friendly label for a component
 * Priority: Layer name > label attribute > name attribute > content > heading
 */
function getComponentLabel(component: any): string {
  // First priority: GrapesJS component name (layer name in the layers panel)
  // This allows users to rename components in layers and have those names appear
  // in the show/hide dropdowns
  const layerName = component.getName?.() || component.get?.('name');
  if (layerName && typeof layerName === 'string') {
    // Skip auto-generated names like "Box", "Text", etc. that match type names
    const tagName = component.get?.('tagName')?.toLowerCase() || '';
    const autoNames = ['box', 'text', 'section', 'container', 'wrapper', 'div', 'row', 'cell'];
    const isAutoName = autoNames.some(auto =>
      layerName.toLowerCase() === auto ||
      layerName.toLowerCase() === tagName.replace('usa-', '').replace(/-/g, ' ')
    );

    if (!isAutoName) {
      return layerName;
    }
  }

  // Second priority: label attribute (for form components)
  const label = component.getAttributes?.()?.label
    || component.get?.('attributes')?.label;

  if (label) return label;

  // Third priority: name attribute
  const name = component.getAttributes?.()?.name
    || component.get?.('attributes')?.name;

  if (name) return name;

  // Fourth priority: text content for simple components
  const text = component.get?.('content');
  if (text && text.length < 30) return text;

  // Fifth priority: heading attribute
  const heading = component.getAttributes?.()?.heading
    || component.get?.('attributes')?.heading;

  if (heading) return heading;

  return '';
}

/**
 * Get a friendly type name for a component
 */
function getComponentTypeName(tagName: string): string {
  const typeMap: Record<string, string> = {
    'usa-text-input': 'Text Input',
    'usa-textarea': 'Textarea',
    'usa-select': 'Select',
    'usa-checkbox': 'Checkbox',
    'usa-radio': 'Radio',
    'usa-date-picker': 'Date Picker',
    'usa-time-picker': 'Time Picker',
    'usa-file-input': 'File Input',
    'usa-combo-box': 'Combo Box',
    'usa-range-slider': 'Range Slider',
    'usa-card': 'Card',
    'usa-alert': 'Alert',
    'usa-accordion': 'Accordion',
    'fieldset': 'Fieldset',
    'form': 'Form',
    'div': 'Container',
    'section': 'Section',
    'article': 'Article',
    'aside': 'Aside',
    'main': 'Main',
    'nav': 'Navigation',
    'span': 'Span',
    'p': 'Paragraph',
    'h1': 'Heading 1',
    'h2': 'Heading 2',
    'h3': 'Heading 3',
    'h4': 'Heading 4',
    'h5': 'Heading 5',
    'h6': 'Heading 6',
  };

  return typeMap[tagName.toLowerCase()] || tagName.replace('usa-', '').replace(/-/g, ' ');
}

/**
 * Generate a unique ID for a component if it doesn't have one
 */
function ensureComponentId(component: any, allIds: Set<string>, editor?: EditorInstance): string {
  const currentId = component.getAttributes?.()?.id || component.get?.('attributes')?.id;

  if (currentId && currentId.length > 0) {
    return currentId;
  }

  // Generate a meaningful ID based on the component type and label
  const tagName = component.get?.('tagName')?.toLowerCase() || 'element';
  const label = getComponentLabel(component);

  // Create base ID from label or tag
  let baseId = label
    ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : tagName.replace('usa-', '');

  // Ensure we have at least a basic ID
  if (!baseId) {
    baseId = 'element';
  }

  // Ensure uniqueness (bounded to prevent infinite loop)
  let finalId = baseId;
  let counter = 1;
  while (allIds.has(finalId) && counter <= 10000) {
    finalId = `${baseId}-${counter}`;
    counter++;
  }

  allIds.add(finalId);

  // Set the ID using multiple methods to ensure persistence
  try {
    // Method 1: Use addAttributes which is the standard GrapesJS way
    if (component.addAttributes) {
      component.addAttributes({ id: finalId });
    }

    // Method 2: Also set via the attributes object directly
    const currentAttrs = component.get?.('attributes') || {};
    if (!currentAttrs.id || currentAttrs.id !== finalId) {
      component.set?.('attributes', { ...currentAttrs, id: finalId }, { silent: false });
    }

    // Method 3: Update the DOM element directly
    const el = component.getEl?.();
    if (el) {
      el.setAttribute('id', finalId);
    }

    // Method 4: Update through the view if available
    const view = component.view;
    if (view && view.el) {
      view.el.setAttribute('id', finalId);
    }

    // Method 5: Update the trait value directly to ensure it stays in sync
    const idTrait = component.getTrait?.('id');
    if (idTrait) {
      idTrait.set('value', finalId);
    }

    // Method 6: Trigger component update to ensure GrapesJS tracks the change
    if (editor) {
      editor.trigger?.('component:update', component);
      editor.trigger?.('component:update:attributes', component);
    }

    debug('Generated and set ID for component:', finalId, '- tagName:', tagName);
  } catch (err) {
    debug('Failed to set component ID:', err);
  }

  return finalId;
}

/**
 * Collect all targetable components from the editor
 */
function collectTargetableComponents(editor: EditorInstance): Array<{ id: string; label: string; component: any }> {
  const result: Array<{ id: string; label: string; component: any }> = [];
  const allIds = new Set<string>();

  // Components that can be shown/hidden
  // NOTE: usa-checkbox and usa-radio are excluded because they have internal inputs
  // that inherit the ID, causing duplicate ID issues that break functionality
  const targetableTypes = [
    'usa-text-input',
    'usa-textarea',
    'usa-select',
    // 'usa-checkbox', // Excluded - causes duplicate ID issues
    // 'usa-radio',    // Excluded - causes duplicate ID issues
    'usa-date-picker',
    'usa-time-picker',
    'usa-file-input',
    'usa-combo-box',
    'usa-range-slider',
    'usa-card',
    'usa-alert',
    'usa-accordion',
    'fieldset',
    'form',
    'div',
    'section',
    'article',
    'aside',
    'main',
    'nav',
    'p',
    'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  ];

  // Helper to check if a component has a custom layer name
  const hasCustomLayerName = (comp: any): boolean => {
    const layerName = comp.getName?.() || comp.get?.('name');
    if (!layerName || typeof layerName !== 'string') return false;

    // Skip auto-generated names
    const tagName = comp.get?.('tagName')?.toLowerCase() || '';
    const autoNames = ['box', 'text', 'section', 'container', 'wrapper', 'div', 'row', 'cell', 'body', 'form'];
    const isAutoName = autoNames.some(auto =>
      layerName.toLowerCase() === auto ||
      layerName.toLowerCase() === tagName.replace('usa-', '').replace(/-/g, ' ')
    );

    return !isAutoName;
  };

  // First pass: collect all existing IDs
  const wrapper = editor.DomComponents?.getWrapper?.();
  if (!wrapper) return result;

  const collectExistingIds = (comp: any) => {
    const id = comp.getAttributes?.()?.id || comp.get?.('attributes')?.id;
    if (id) allIds.add(id);

    const children = comp.components?.();
    if (children) {
      children.forEach((child: any) => collectExistingIds(child));
    }
  };
  collectExistingIds(wrapper);

  // Second pass: collect targetable components and ensure they have IDs
  const collectComponents = (comp: any) => {
    const tagName = comp.get?.('tagName')?.toLowerCase() || '';

    // Include if: tag is in targetable types OR component has a custom layer name
    const isTargetableType = targetableTypes.includes(tagName);
    const hasCustomName = hasCustomLayerName(comp);

    if (isTargetableType || hasCustomName) {
      const id = ensureComponentId(comp, allIds, editor);
      const label = getComponentLabel(comp);
      const typeName = getComponentTypeName(tagName);

      const displayLabel = label
        ? `${typeName} - ${label}`
        : typeName;

      result.push({
        id,
        label: displayLabel,
        component: comp,
      });
    }

    // Recurse into children
    const children = comp.components?.();
    if (children) {
      children.forEach((child: any) => collectComponents(child));
    }
  };

  collectComponents(wrapper);

  return result;
}

/**
 * Set up conditional show/hide trait with dynamic component picker
 */
function setupConditionalShowHideTrait(
  editor: EditorInstance,
  registerListener: (editor: EditorInstance, event: string, handler: (...args: unknown[]) => void) => void
): void {
  const updateConditionalTraits = (component: any) => {
    if (!component) return;

    const tagName = component.get?.('tagName')?.toLowerCase() || '';

    // Only apply to checkboxes and radios
    if (tagName !== 'usa-checkbox' && tagName !== 'usa-radio') return;

    // IMPORTANT: Remove any ID from checkboxes/radios acting as triggers
    // USWDS web components copy the outer ID to internal elements (input, label)
    // causing duplicate IDs that break checkbox functionality
    const currentId = component.getAttributes?.()?.id || component.get?.('attributes')?.id;
    if (currentId) {
      component.removeAttributes(['id']);
      const el = component.getEl?.();
      if (el) {
        el.removeAttribute('id');
      }
      debug('Removed ID from trigger component to prevent duplicate IDs');
    }

    // Collect all targetable components
    const targetables = collectTargetableComponents(editor);

    // Build options array for the select dropdown
    const options = [
      { id: '', label: '-- None --' },
      ...targetables.map(t => ({ id: t.id, label: t.label })),
    ];

    // Update the data-reveals trait options
    const revealsTrait = component.getTrait?.('data-reveals');
    if (revealsTrait) {
      revealsTrait.set('options', options);
    }

    // Update the data-hides trait options
    const hidesTrait = component.getTrait?.('data-hides');
    if (hidesTrait) {
      hidesTrait.set('options', options);
    }

    debug('Updated conditional traits with', targetables.length, 'targetable components');
  };

  // Update traits when a checkbox or radio is selected
  registerListener(editor, 'component:selected', (component: any) => {
    updateConditionalTraits(component);
  });

  // Also update when components are added (in case new targetable components are added)
  registerListener(editor, 'component:add', () => {
    const selected = editor.getSelected?.();
    if (selected) {
      updateConditionalTraits(selected);
    }
  });

  // Update when a component is renamed (in layers panel)
  // This ensures the dropdown options reflect the new name
  registerListener(editor, 'component:update', (...args: unknown[]) => {
    const property = args[1] as string | undefined;
    // Only refresh if the 'name' property changed (layer name)
    if (property === 'name') {
      const selected = editor.getSelected?.();
      if (selected) {
        updateConditionalTraits(selected);
      }
    }
  });
}

/**
 * Config for a generic visibility trait (states or users).
 */
interface VisibilityTraitConfig {
  /** Key in projectData (e.g. 'states' or 'users') */
  dataKey: string;
  /** Trait name (e.g. 'state-visibility' or 'user-visibility') */
  traitName: string;
  /** Trait label (e.g. 'Visible In States' or 'Visible For Users') */
  traitLabel: string;
  /** DOM attribute (e.g. 'data-states' or 'data-users') */
  dataAttribute: string;
  /** Editor event to listen for active selection changes (e.g. 'state:select' or 'user:select') */
  selectEvent: string;
  /** Editor event fired when items are added/renamed/removed (e.g. 'states:update' or 'users:update') */
  updateEvent: string;
}

/** Track whether the checkbox-group trait type has been registered */
let checkboxGroupRegistered = false;

/**
 * Set up a generic visibility trait for all components.
 * Registers the checkbox-group trait type once, then adds a visibility
 * trait per config (states, users, etc.).
 */
function setupVisibilityTrait(
  editor: EditorInstance,
  registerListener: (editor: EditorInstance, event: string, handler: (...args: unknown[]) => void) => void,
  config: VisibilityTraitConfig
): void {
  // Register the checkbox-group trait type only once
  if (!checkboxGroupRegistered) {
    checkboxGroupRegistered = true;

    editor.TraitManager.addType('checkbox-group', {
      createInput({ trait }: { trait: any }) {
        const el = document.createElement('div');
        el.className = 'trait-checkbox-group';
        const options: Array<{ id: string; label: string }> = trait.get('options') || [];

        options.forEach((opt: { id: string; label: string }) => {
          const label = document.createElement('label');
          label.className = 'trait-checkbox-group-item';
          label.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; color: var(--color-base); cursor: pointer; padding: 2px 0;';

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.value = opt.id;
          cb.style.cssText = 'width: 14px; height: 14px; accent-color: var(--color-primary);';

          label.appendChild(cb);
          label.appendChild(document.createTextNode(opt.label));
          el.appendChild(label);
        });

        return el;
      },

      onEvent({ elInput, component, trait }: { elInput: HTMLElement; component: any; trait: any }) {
        const dataAttr = trait.get?.('dataAttribute') || 'data-states';
        const checkboxes = elInput.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
        const checkedIds: string[] = [];
        checkboxes.forEach((cb) => {
          if (cb.checked) checkedIds.push(cb.value);
        });

        if (checkedIds.length === 0 || checkedIds.length === checkboxes.length) {
          component.removeAttributes?.([dataAttr]);
        } else {
          component.addAttributes?.({ [dataAttr]: checkedIds.join(',') });
        }
      },

      onUpdate({ elInput, component, trait }: { elInput: HTMLElement; component: any; trait: any }) {
        const dataAttr = trait.get?.('dataAttribute') || 'data-states';
        const dataValue = component.getAttributes?.()?.[ dataAttr] || '';
        const activeIds = dataValue ? dataValue.split(',').map((s: string) => s.trim()) : [];
        const checkboxes = elInput.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');

        checkboxes.forEach((cb) => {
          cb.checked = dataValue === '' || activeIds.includes(cb.value);
        });
      },
    });
  }

  const addVisibilityTrait = (component: any) => {
    if (!component) return;

    const items: Array<{ id: string; name: string }> = (() => {
      try {
        // Read from instance properties first (set by useEditorStates/useEditorUsers),
        // falling back to getProjectData() for initial load before hooks mount.
        const instanceKey = config.dataKey === 'states' ? '__projectStates' : '__projectUsers';
        const instanceArr = (editor as any)[instanceKey];
        if (Array.isArray(instanceArr)) return instanceArr;
        const data = editor.getProjectData?.();
        const arr = data?.[config.dataKey];
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    })();

    // Only show trait if items are defined
    if (items.length === 0) {
      const traits = component.get('traits');
      const existing = traits.where({ name: config.traitName });
      if (existing.length > 0) {
        existing.forEach((t: any) => traits.remove(t));
      }
      return;
    }

    const traits = component.get('traits');
    const hasTrait = traits.where({ name: config.traitName }).length > 0;

    if (hasTrait) {
      const existing = traits.where({ name: config.traitName })[0];
      if (existing) {
        existing.set('options', items.map(s => ({ id: s.id, label: s.name })));
      }
      return;
    }

    traits.add({
      type: 'checkbox-group',
      name: config.traitName,
      label: config.traitLabel,
      dataAttribute: config.dataAttribute,
      options: items.map(s => ({ id: s.id, label: s.name })),
      changeProp: false,
    });
  };

  registerListener(editor, 'component:selected', (component: any) => {
    addVisibilityTrait(component);
  });

  // Refresh trait when active selection changes
  registerListener(editor, config.selectEvent, () => {
    const selected = editor.getSelected?.();
    if (selected) {
      addVisibilityTrait(selected);
    }
  });

  // Refresh trait when items are added/renamed/removed
  registerListener(editor, config.updateEvent, () => {
    const selected = editor.getSelected?.();
    if (selected) {
      addVisibilityTrait(selected);
    }
  });
}

/**
 * Clean up IDs from existing checkbox/radio triggers on editor load
 * This fixes prototypes created before the duplicate ID fix
 */
function cleanupTriggerComponentIds(editor: EditorInstance): void {
  const wrapper = editor.DomComponents?.getWrapper?.();
  if (!wrapper) return;

  let cleanedCount = 0;

  const cleanupComponent = (comp: any) => {
    const tagName = comp.get?.('tagName')?.toLowerCase() || '';

    // Only clean checkboxes and radios that have conditional attributes
    if (tagName === 'usa-checkbox' || tagName === 'usa-radio') {
      const attrs = comp.getAttributes?.() || {};
      const hasConditional = attrs['data-reveals'] || attrs['data-hides'];
      const hasId = attrs.id;

      if (hasConditional && hasId) {
        comp.removeAttributes?.(['id']);
        const el = comp.getEl?.();
        if (el) {
          el.removeAttribute('id');
        }
        cleanedCount++;
      }
    }

    // Recurse into children
    const children = comp.components?.();
    if (children) {
      children.forEach((child: any) => cleanupComponent(child));
    }
  };

  cleanupComponent(wrapper);

  if (cleanedCount > 0) {
    debug('Cleaned up IDs from', cleanedCount, 'trigger components');
  }
}

/**
 * Set up proactive ID assignment for targetable components
 * This ensures components get IDs when they're added, not just when a checkbox/radio is selected
 */
function setupProactiveIdAssignment(
  editor: EditorInstance,
  registerListener: (editor: EditorInstance, event: string, handler: (...args: unknown[]) => void) => void
): void {
  // Components that should automatically get IDs for conditional show/hide
  const targetableTypes = [
    'usa-text-input',
    'usa-textarea',
    'usa-select',
    'usa-date-picker',
    'usa-time-picker',
    'usa-file-input',
    'usa-combo-box',
    'usa-range-slider',
    'usa-card',
    'usa-alert',
    'usa-accordion',
    'fieldset',
  ];

  // Collect all existing IDs in the editor
  const getAllExistingIds = (): Set<string> => {
    const ids = new Set<string>();
    const wrapper = editor.DomComponents?.getWrapper?.();
    if (!wrapper) return ids;

    const collectIds = (comp: any) => {
      const id = comp.getAttributes?.()?.id || comp.get?.('attributes')?.id;
      if (id) ids.add(id);
      const children = comp.components?.();
      if (children) {
        children.forEach((child: any) => collectIds(child));
      }
    };
    collectIds(wrapper);
    return ids;
  };

  // Assign ID to a component if it's targetable and doesn't have one
  const assignIdIfNeeded = (component: any) => {
    if (!component?.get) return; // guard against stale/destroyed component refs

    const tagName = component.get?.('tagName')?.toLowerCase() || '';

    if (!targetableTypes.includes(tagName)) return;

    const currentId = component.getAttributes?.()?.id || component.get?.('attributes')?.id;
    if (currentId && currentId.length > 0) return;

    // Get all existing IDs to ensure uniqueness
    const allIds = getAllExistingIds();

    // Generate and set the ID
    ensureComponentId(component, allIds, editor);
  };

  // Process all components in the wrapper and assign IDs
  const processAllComponents = () => {
    const wrapper = editor.DomComponents?.getWrapper?.();
    if (!wrapper) return;

    const processComponent = (comp: any) => {
      assignIdIfNeeded(comp);
      const children = comp.components?.();
      if (children) {
        children.forEach((child: any) => processComponent(child));
      }
    };

    processComponent(wrapper);
    debug('Processed all components for ID assignment');
  };

  // When a targetable component is added, assign it an ID
  registerListener(editor, 'component:add', (component: any) => {
    requestAnimationFrame(() => {
      if (!component?.get) return;
      assignIdIfNeeded(component);
    });
  });

  // Debounced rAF for bulk events to avoid redundant processing
  let pendingRaf: number | null = null;
  const scheduleIdProcessing = () => {
    if (pendingRaf !== null) cancelAnimationFrame(pendingRaf);
    pendingRaf = requestAnimationFrame(() => {
      pendingRaf = null;
      processAllComponents();
    });
  };

  // Assign IDs after project data is loaded
  registerListener(editor, 'load', scheduleIdProcessing);

  // Also run when canvas frame loads (catches page switches and initial render)
  registerListener(editor, 'canvas:frame:load', scheduleIdProcessing);

  // Run when page is selected (in case components were loaded from another page)
  registerListener(editor, 'page:select', scheduleIdProcessing);
}

/**
 * Set up symbol creation handler with dialog-first architecture.
 * Shows the scope dialog BEFORE creating any GrapesJS symbol.
 * Also adds a "Create Symbol" button to the component toolbar.
 */
function setupSymbolCreationHandler(
  editor: EditorInstance,
  registerListener: (editor: EditorInstance, event: string, handler: (...args: unknown[]) => void) => void,
  onSymbolCreate: (symbolData: any, selectedComponent: any) => void
): void {
  // Register the create-symbol command
  // Dialog-first: extract serialized data and pass component ref to dialog.
  // No symbol is created here — that happens after the user confirms scope.
  editor.Commands.add('create-symbol', {
    run(editor: EditorInstance) {
      const selected = editor.getSelected();
      if (!selected) {
        debug('No component selected for symbol creation');
        return;
      }

      // Check if this component is already a symbol instance (if method exists)
      try {
        const symbolInfo = selected.getSymbolInfo?.();
        if (symbolInfo?.isSymbol) {
          debug('Component is already a symbol');
          return;
        }
      } catch {
        // getSymbolInfo not available in core — proceed with creation
      }

      debug('Creating symbol from component:', selected.getId());

      // Extract serialized data via toJSON for clean snapshot
      const json = selected.toJSON?.() || {};
      const symbolData = {
        id: `symbol-${Date.now()}`,
        label: selected.getName?.() || selected.get?.('name') || 'New Symbol',
        icon: json.icon,
        components: json.components || [],
      };

      // Pass data and component ref to dialog — no addSymbol call yet
      onSymbolCreate(symbolData, selected);
    },
  });

  // Add "Create Symbol" button to toolbar when a component is selected
  registerListener(editor, 'component:selected', (component: any) => {
    if (!component) return;

    // Get current toolbar
    const toolbar = component.get('toolbar') || [];

    // Check if symbol button already exists
    const hasSymbolButton = toolbar.some((item: any) => item.command === 'create-symbol');
    if (hasSymbolButton) return;

    // Check if this component is already a symbol (don't show button for symbol instances)
    try {
      const symbolInfo = component.getSymbolInfo?.();
      if (symbolInfo?.isSymbol) return;
    } catch {
      // getSymbolInfo not available in core — show button
    }

    // Add the create symbol button with SVG icon
    const newToolbar = [
      ...toolbar,
      {
        attributes: { title: 'Create Symbol' },
        command: 'create-symbol',
        // Use SVG icon (cube/box shape to represent a reusable component)
        label: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="vertical-align: middle;">
          <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9zM12 4.15L6.04 7.5 12 10.85l5.96-3.35L12 4.15zM5 15.91l6 3.38v-6.71L5 9.21v6.7zm14 0v-6.7l-6 3.37v6.71l6-3.38z"/>
        </svg>`,
      },
    ];

    component.set('toolbar', newToolbar);
  });
}
