/**
 * GrapesJS Setup Hook
 *
 * Handles editor initialization, event registration, and resource loading.
 * Returns a configured onReady callback for the StudioEditor component.
 */

import { useCallback, useRef, useEffect } from 'react';
import type { Prototype, SymbolScope, GrapesJSSymbol } from '@uswds-pt/shared';
import { createDebugLogger } from '@uswds-pt/shared';
import { DEFAULT_CONTENT, COMPONENT_ICONS } from '@uswds-pt/adapter';
import { mergeGlobalSymbols, extractLocalSymbols, GLOBAL_SYMBOL_PREFIX } from './useGlobalSymbols';
import { loadUSWDSResources, addCardContainerCSS, addFieldsetSpacingCSS, addButtonGroupCSS, clearGrapesJSStorage } from '../lib/grapesjs/resource-loader';
import {
  forceCanvasUpdate,
  setupCanvasEventHandlers,
  registerClearCommand,
  setupAllInteractiveHandlers,
  exposeDebugHelpers,
  cleanupCanvasHelpers,
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
  /** Global symbols to merge into project data */
  globalSymbols?: GrapesJSSymbol[];
  /** Callback when a symbol is being created (to show scope dialog) */
  onSymbolCreate?: (symbolData: GrapesJSSymbol, callback: (scope: SymbolScope, name: string) => void) => void;
}

export interface UseGrapesJSSetupReturn {
  /** Callback to pass to StudioEditor onReady prop */
  onReady: (editor: EditorInstance) => void;
  /** Clean up function for component unmount */
  cleanup: () => void;
  /** Force a canvas refresh */
  refreshCanvas: () => void;
}

export function useGrapesJSSetup({
  stateMachine,
  editorRef,
  isDemoMode,
  slug,
  pendingPrototype,
  localPrototype,
  prototype,
  onContentChange,
  blocks,
  globalSymbols = [],
  onSymbolCreate,
}: UseGrapesJSSetupOptions): UseGrapesJSSetupReturn {
  // Track registered event listeners for cleanup
  const listenersRef = useRef<Array<{ event: string; handler: (...args: unknown[]) => void }>>([]);

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
    if (!editor || globalSymbols.length === 0) return;

    // Check if editor is fully initialized
    if (!editor.getProjectData || !editor.loadProjectData) return;

    try {
      const currentData = editor.getProjectData();
      const existingSymbolIds = new Set(
        (currentData.symbols || []).map((s: any) => s.id)
      );

      // Only add symbols that aren't already in the editor
      const newSymbols = globalSymbols.filter(
        (s) => !existingSymbolIds.has(s.id)
      );

      if (newSymbols.length > 0) {
        debug('Injecting', newSymbols.length, 'new global symbols into editor');
        const mergedData = mergeGlobalSymbols(currentData, newSymbols);
        editor.loadProjectData(mergedData);
      }
    } catch (e) {
      console.warn('Failed to inject global symbols:', e);
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

      // Set up change event listeners for autosave
      const changeHandler = () => {
        debug('[Change detected]');
        onContentChange();
      };

      registerListener(editor, 'component:add', changeHandler);
      registerListener(editor, 'component:remove', changeHandler);
      registerListener(editor, 'component:update', changeHandler);
      registerListener(editor, 'style:change', changeHandler);

      // Load project data based on mode
      loadProjectData(editor);

      // Add custom CSS to canvas
      addCardContainerCSS(editor);
      addFieldsetSpacingCSS(editor);
      addButtonGroupCSS(editor);

      // Set up spacing trait for all components
      setupSpacingTrait(editor, registerListener);

      // Remove default GrapesJS blocks that aren't ours
      removeDefaultBlocks(editor, blocks);

      // Set up canvas event handlers
      setupCanvasEventHandlers(editor, (event, handler) => registerListener(editor, event, handler));

      // Register custom clear command
      registerClearCommand(editor);

      // Set up page event handlers
      setupPageEventHandlers(editor, registerListener, stateMachine);

      // Set up interactive component handlers
      setupAllInteractiveHandlers(editor, (event, handler) => registerListener(editor, event, handler));

      // Set up page link trait updates
      setupPageLinkTrait(editor, registerListener);

      // Set up conditional show/hide trait (dynamic component picker)
      setupConditionalShowHideTrait(editor, registerListener);

      // Set up proactive ID assignment for targetable components
      setupProactiveIdAssignment(editor, registerListener);

      // Clean up existing checkboxes/radios with IDs (causes duplicate ID issues)
      cleanupTriggerComponentIds(editor);

      // Load USWDS resources
      registerListener(editor, 'canvas:frame:load', () => loadUSWDSResources(editor));
      registerListener(editor, 'canvas:frame:load', () => syncPageLinkHrefs(editor));
      registerListener(editor, 'page:select', () => syncPageLinkHrefs(editor));
      loadUSWDSResources(editor);

      // Expose debug helpers
      exposeDebugHelpers(editor);

      // Set up symbol creation interception
      if (onSymbolCreate) {
        setupSymbolCreationHandler(editor, registerListener, onSymbolCreate);
      }

      // Mark editor as ready in state machine
      stateMachine.editorReady();
    },
    [
      editorRef,
      isDemoMode,
      slug,
      pendingPrototype,
      localPrototype,
      prototype,
      onContentChange,
      blocks,
      stateMachine,
      registerListener,
      globalSymbols,
      onSymbolCreate,
    ]
  );

  /**
   * Load project data into editor based on mode
   */
  function loadProjectData(editor: EditorInstance) {
    // For new prototypes (no slug), load the blank template
    if (!slug) {
      debug('New prototype - loading blank template');
      const wrapper = editor.DomComponents?.getWrapper();
      if (wrapper) {
        const blankTemplate = DEFAULT_CONTENT['blank-template']?.replace('__FULL_HTML__', '') || '';
        wrapper.components(blankTemplate);
      }
      // Even for new prototypes, merge global symbols if available
      if (globalSymbols.length > 0) {
        try {
          const currentData = editor.getProjectData?.() || {};
          const mergedData = mergeGlobalSymbols(currentData, globalSymbols);
          if (mergedData.symbols?.length > 0) {
            editor.loadProjectData(mergedData);
            debug('Merged', globalSymbols.length, 'global symbols into new prototype');
          }
        } catch (e) {
          console.warn('Failed to merge global symbols:', e);
        }
      }
      return;
    }

    if (isDemoMode && localPrototype?.gjsData) {
      // Demo mode: load from localStorage
      try {
        const projectData = JSON.parse(localPrototype.gjsData);
        debug('Loading project data from localStorage');
        editor.loadProjectData(projectData);
        debug('Loaded project data from localStorage');
      } catch (e) {
        debug('Failed to load project data:', e);
      }
    } else if (!isDemoMode) {
      // API mode: check both pendingPrototype and state prototype
      const prototypeData = pendingPrototype || prototype;
      if (prototypeData?.grapesData) {
        try {
          let projectData = prototypeData.grapesData as any;
          debug('Loading project data from API');

          // Check if grapesData has actual content
          const firstPageComponents = projectData.pages?.[0]?.frames?.[0]?.component?.components;
          const hasActualContent = Array.isArray(firstPageComponents) && firstPageComponents.length > 0;

          if (!hasActualContent) {
            debug('grapesData is empty, using htmlContent instead');
            // Don't load empty grapesData - the htmlContent will be parsed from project config
          } else {
            // Merge global symbols into project data before loading
            if (globalSymbols.length > 0) {
              projectData = mergeGlobalSymbols(projectData, globalSymbols);
              debug('Merged', globalSymbols.length, 'global symbols into project data');
            }
            editor.loadProjectData(projectData);
            debug('Loaded project data, pages:', projectData.pages?.length);
          }
        } catch (e) {
          debug('Failed to load project data:', e);
        }
      } else if (globalSymbols.length > 0) {
        // No prototype data but we have global symbols - load them
        try {
          const currentData = editor.getProjectData?.() || {};
          const mergedData = mergeGlobalSymbols(currentData, globalSymbols);
          if (mergedData.symbols?.length > 0) {
            editor.loadProjectData(mergedData);
            debug('Loaded', globalSymbols.length, 'global symbols (no prototype data)');
          }
        } catch (e) {
          console.warn('Failed to load global symbols:', e);
        }
      }
    }
  }

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
): void {
  // Track pages that need template
  const pagesNeedingTemplate = new Set<string>();

  // Track pending operations to prevent race conditions
  let pendingPageSwitch: AbortController | null = null;

  registerListener(editor, 'page:select', async (page: any) => {
    const pageId = page?.getId?.() || page?.id;
    const pageName = page?.get?.('name') || page?.getName?.() || 'unnamed';
    debug('Page selected:', pageId, '-', pageName);

    // Cancel any pending page switch operation
    if (pendingPageSwitch) {
      pendingPageSwitch.abort();
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

      // Log page state
      const wrapper = editor.DomComponents?.getWrapper();
      if (wrapper) {
        const components = wrapper.components();
        debug('Page has', components?.length || 0, 'top-level components');
      }

      forceCanvasUpdate(editor);
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
      if (!signal.aborted) {
        // Use requestAnimationFrame for smoother timing with the render cycle
        requestAnimationFrame(() => {
          if (!signal.aborted) {
            stateMachine.pageSwitchComplete();
            debug('Page switch lock released');
          }
        });
      }
    }
  });

  registerListener(editor, 'page:add', (page: any) => {
    const pageId = page?.getId?.() || page?.id;
    const pageName = page?.get?.('name') || page?.getName?.() || 'New Page';
    debug('Page added:', pageId, '-', pageName);

    if (pageId) {
      pagesNeedingTemplate.add(pageId);
      debug('Marked page for template:', pageId);
    }
  });

  // Add template when new page is selected
  registerListener(editor, 'page:select', async (page: any) => {
    const pageId = page?.getId?.() || page?.id;

    if (pageId && pagesNeedingTemplate.has(pageId)) {
      pagesNeedingTemplate.delete(pageId);

      // Wait for frame to be ready before adding template
      await waitForFrameReady(editor, 200);

      try {
        let mainComponent = page.getMainComponent?.();

        if (!mainComponent) {
          const mainFrame = page.getMainFrame?.();
          mainComponent = mainFrame?.getComponent?.();
        }

        if (!mainComponent) {
          const frames = page.get?.('frames');
          if (frames && frames.length > 0) {
            mainComponent = frames.at?.(0)?.get?.('component');
          }
        }

        if (!mainComponent) {
          mainComponent = editor.DomComponents?.getWrapper?.();
        }

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
              // Use requestAnimationFrame for smoother refresh
              requestAnimationFrame(() => editor.refresh?.());
            }
          }
        }
      } catch (err) {
        debug('Error adding template to new page:', err);
      }
    }
  });

  registerListener(editor, 'page:remove', (page: any) => {
    const pageId = page?.getId?.() || page?.id;
    debug('Page removed:', pageId);
  });
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

    const pageLinkTrait = component.getTrait?.('page-link');
    if (!pageLinkTrait) return;

    const pages = editor.Pages?.getAll?.() || [];
    const currentPage = editor.Pages?.getSelected?.();

    const pageOptions = [
      { id: '', label: '-- Select a page --' },
      ...pages
        .filter((page: any) => page !== currentPage)
        .map((page: any) => ({
          id: page.getId?.() || page.id,
          label: page.get?.('name') || page.getName?.() || `Page ${page.getId?.() || page.id}`,
        })),
    ];

    pageLinkTrait.set('options', pageOptions);
    debug('Updated page-link options:', pageOptions);
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
 * Sync page-link hrefs for components
 */
function syncPageLinkHrefs(editor: EditorInstance): void {
  try {
    const doc = editor.Canvas?.getDocument?.();
    if (!doc) return;

    const findComponent = (el: Element) => {
      const wrapper = editor.DomComponents?.getWrapper?.();
      if (!wrapper) return null;

      const findInChildren = (comp: any): any => {
        if (comp.getEl?.() === el) return comp;
        const children = comp.components?.() || [];
        for (const child of children.models || children) {
          const found = findInChildren(child);
          if (found) return found;
        }
        return null;
      };

      return findInChildren(wrapper);
    };

    // Fix page links
    const elementsWithPageLink = doc.querySelectorAll('usa-button[page-link], usa-link[page-link]');
    elementsWithPageLink.forEach((el: Element) => {
      const pageLink = el.getAttribute('page-link');
      const linkType = el.getAttribute('link-type');
      const currentHref = el.getAttribute('href');

      if (pageLink && (linkType === 'page' || !linkType)) {
        const expectedHref = `#page-${pageLink}`;
        if (currentHref !== expectedHref) {
          el.setAttribute('href', expectedHref);
          (el as any).href = expectedHref;
          const innerAnchor = el.querySelector('a');
          if (innerAnchor) {
            innerAnchor.setAttribute('href', expectedHref);
          }
          const component = findComponent(el);
          if (component?.addAttributes) {
            component.addAttributes({ href: expectedHref, 'link-type': 'page' });
          }
          debug('Fixed page-link href:', pageLink, '->', expectedHref);
        }
      }
    });

    // Fix external URLs without protocol
    const elementsWithExternalLink = doc.querySelectorAll('usa-button[link-type="external"], usa-link[link-type="external"]');
    elementsWithExternalLink.forEach((el: Element) => {
      const href = el.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('/') && !href.includes('://')) {
        const normalizedHref = 'https://' + href;
        el.setAttribute('href', normalizedHref);
        (el as any).href = normalizedHref;
        const innerAnchor = el.querySelector('a');
        if (innerAnchor) {
          innerAnchor.setAttribute('href', normalizedHref);
        }
        const component = findComponent(el);
        if (component?.addAttributes) {
          component.addAttributes({ href: normalizedHref });
        }
        debug('Normalized external href:', href, '->', normalizedHref);
      }
    });
  } catch (err) {
    debug('Error syncing page-link hrefs:', err);
  }
}

/**
 * Get a friendly label for a component
 */
function getComponentLabel(component: any): string {
  // Try to get label from various attributes
  const label = component.getAttributes?.()?.label
    || component.get?.('attributes')?.label;

  if (label) return label;

  // Try to get name attribute
  const name = component.getAttributes?.()?.name
    || component.get?.('attributes')?.name;

  if (name) return name;

  // Try to get text content for simple components
  const text = component.get?.('content');
  if (text && text.length < 30) return text;

  // Try to get heading text
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
    'div': 'Container',
    'section': 'Section',
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

  // Ensure uniqueness
  let finalId = baseId;
  let counter = 1;
  while (allIds.has(finalId)) {
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
    'div',
    'section',
    'p',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  ];

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

    if (targetableTypes.includes(tagName)) {
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
        comp.removeAttributes(['id']);
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
    // Use a small delay to ensure the component is fully initialized
    setTimeout(() => {
      assignIdIfNeeded(component);
    }, 100);
  });

  // Assign IDs after project data is loaded
  registerListener(editor, 'load', () => {
    // Use multiple delays to catch different loading scenarios
    setTimeout(processAllComponents, 300);
    setTimeout(processAllComponents, 1000);
  });

  // Also run when canvas frame loads (catches page switches and initial render)
  registerListener(editor, 'canvas:frame:load', () => {
    setTimeout(processAllComponents, 200);
  });

  // Run when page is selected (in case components were loaded from another page)
  registerListener(editor, 'page:select', () => {
    setTimeout(processAllComponents, 300);
  });
}

/**
 * Set up symbol creation handler to intercept new symbols
 * and prompt the user to choose between local and global scope.
 * Also adds a "Create Symbol" button to the component toolbar.
 */
function setupSymbolCreationHandler(
  editor: EditorInstance,
  registerListener: (editor: EditorInstance, event: string, handler: (...args: unknown[]) => void) => void,
  onSymbolCreate: (symbolData: any, callback: (scope: 'local' | 'global', name: string) => void) => void
): void {
  // Track pending symbol creation to avoid duplicate handling
  let isPendingSymbolCreation = false;

  // Register the create-symbol command
  editor.Commands.add('create-symbol', {
    run(editor: EditorInstance) {
      const selected = editor.getSelected();
      if (!selected) {
        debug('No component selected for symbol creation');
        return;
      }

      // Check if this component is already a symbol instance
      const symbolInfo = selected.getSymbolInfo?.();
      if (symbolInfo?.isSymbol) {
        debug('Component is already a symbol');
        return;
      }

      debug('Creating symbol from component:', selected.getId());

      // Use the Components API to create a symbol
      // This will trigger the 'symbol:add' event which we intercept below
      try {
        const Components = editor.Components;
        if (Components?.addSymbol) {
          Components.addSymbol(selected);
        } else {
          console.warn('Components.addSymbol not available');
        }
      } catch (e) {
        console.warn('Failed to create symbol:', e);
      }
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
    const symbolInfo = component.getSymbolInfo?.();
    if (symbolInfo?.isSymbol) return;

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

  // GrapesJS fires symbol events when a symbol is created
  // We intercept this to show our scope selection dialog
  // Try multiple event names since different GrapesJS versions use different names
  const handleSymbolAdd = (symbol: any) => {
    if (isPendingSymbolCreation) return;

    debug('Symbol creation detected:', symbol);

    // Extract symbol data
    const symbolData = {
      id: symbol.getId?.() || symbol.get?.('id') || `symbol-${Date.now()}`,
      label: symbol.get?.('label') || symbol.getName?.() || 'New Symbol',
      icon: symbol.get?.('icon'),
      components: symbol.get?.('components') || [],
    };

    // Show the scope dialog
    isPendingSymbolCreation = true;

    onSymbolCreate(symbolData, (scope, name) => {
      isPendingSymbolCreation = false;

      if (scope === 'local') {
        // For local symbols, update the symbol name/label if changed
        try {
          if (symbol.set && name !== symbolData.label) {
            symbol.set('label', name);
          }
        } catch (e) {
          console.warn('Failed to update symbol label:', e);
        }
        debug('Local symbol created:', name);
      } else {
        // For global symbols, the parent component handles API creation
        // We might want to remove the local symbol that was just created
        // since it will be replaced by the global one
        try {
          const symbols = editor.Symbols;
          if (symbols?.remove) {
            symbols.remove(symbol);
            debug('Removed local symbol to replace with global');
          }
        } catch (e) {
          console.warn('Failed to remove local symbol:', e);
        }
      }
    });
  };

  // Register the handler for multiple possible event names
  registerListener(editor, 'symbol:add', handleSymbolAdd);
  registerListener(editor, 'symbol:main:add', handleSymbolAdd);
  registerListener(editor, 'symbols:add', handleSymbolAdd);
}
