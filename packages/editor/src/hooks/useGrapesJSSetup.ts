/**
 * GrapesJS Setup Hook
 *
 * Handles editor initialization, event registration, and resource loading.
 * Returns a configured onReady callback for the StudioEditor component.
 */

import { useCallback, useRef, useEffect } from 'react';
import type { Prototype } from '@uswds-pt/shared';
import { DEFAULT_CONTENT, COMPONENT_ICONS } from '@uswds-pt/adapter';
import { loadUSWDSResources, addCardContainerCSS, clearGrapesJSStorage } from '../lib/grapesjs/resource-loader';
import {
  forceCanvasUpdate,
  setupCanvasEventHandlers,
  registerClearCommand,
  setupAllInteractiveHandlers,
  exposeDebugHelpers,
  cleanupCanvasHelpers,
} from '../lib/grapesjs/canvas-helpers';
import type { UseEditorStateMachineReturn } from './useEditorStateMachine';

// Debug logging
const DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('debug') === 'true' ||
    localStorage.getItem('uswds_pt_debug') === 'true');

function debug(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[GrapesJSSetup]', ...args);
  }
}

// GrapesJS editor type
type EditorInstance = any;

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

      // Clean up existing checkboxes/radios with IDs (causes duplicate ID issues)
      cleanupTriggerComponentIds(editor);

      // Load USWDS resources
      registerListener(editor, 'canvas:frame:load', () => loadUSWDSResources(editor));
      registerListener(editor, 'canvas:frame:load', () => syncPageLinkHrefs(editor));
      registerListener(editor, 'page:select', () => syncPageLinkHrefs(editor));
      loadUSWDSResources(editor);

      // Expose debug helpers
      exposeDebugHelpers(editor);

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
        console.warn('Failed to load project data:', e);
      }
    } else if (!isDemoMode) {
      // API mode: check both pendingPrototype and state prototype
      const prototypeData = pendingPrototype || prototype;
      if (prototypeData?.grapesData) {
        try {
          const projectData = prototypeData.grapesData as any;
          debug('Loading project data from API');

          // Check if grapesData has actual content
          const firstPageComponents = projectData.pages?.[0]?.frames?.[0]?.component?.components;
          const hasActualContent = Array.isArray(firstPageComponents) && firstPageComponents.length > 0;

          if (!hasActualContent) {
            debug('grapesData is empty, using htmlContent instead');
            // Don't load empty grapesData - the htmlContent will be parsed from project config
          } else {
            editor.loadProjectData(projectData);
            debug('Loaded project data, pages:', projectData.pages?.length);
          }
        } catch (e) {
          console.warn('Failed to load project data:', e);
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
        console.warn('[USWDS-PT] Error adding template to new page:', err);
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
    console.warn('USWDS-PT: Error syncing page-link hrefs:', err);
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
function ensureComponentId(component: any, allIds: Set<string>): string {
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

  // Set the ID on the component model
  component.addAttributes({ id: finalId });
  allIds.add(finalId);

  // Also sync to the actual DOM element in the canvas
  const el = component.getEl?.();
  if (el && !el.id) {
    el.id = finalId;
  }

  debug('Generated ID for component:', finalId);
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

  // Second pass: collect targetable components
  const collectComponents = (comp: any) => {
    const tagName = comp.get?.('tagName')?.toLowerCase() || '';

    if (targetableTypes.includes(tagName)) {
      const id = ensureComponentId(comp, allIds);
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

    // Get all targetable components
    const targetables = collectTargetableComponents(editor);

    const options = [
      { id: '', label: '-- None --' },
      ...targetables.map(t => ({ id: t.id, label: t.label })),
    ];

    // Update the data-reveals trait
    const revealsTrait = component.getTrait?.('data-reveals');
    if (revealsTrait) {
      revealsTrait.set('type', 'select');
      revealsTrait.set('options', options);
    }

    // Update the data-hides trait
    const hidesTrait = component.getTrait?.('data-hides');
    if (hidesTrait) {
      hidesTrait.set('type', 'select');
      hidesTrait.set('options', options);
    }

    debug('Updated conditional traits with', options.length - 1, 'options');
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
