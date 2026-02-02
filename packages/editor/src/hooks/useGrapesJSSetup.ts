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
      editorRef.current = editor;
      debug('Editor ready');

      // Clear any GrapesJS internal storage to prevent state bleeding
      clearGrapesJSStorage();

      // Clear registered listeners from previous session
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
 */
function waitForFrameReady(
  editor: EditorInstance,
  timeoutMs: number = 300
): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Handler for when frame is loaded
    const onFrameLoad = () => {
      if (resolved) return;
      resolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      editor.off('canvas:frame:load', onFrameLoad);
      debug('Frame ready (event)');
      resolve();
    };

    // Listen for frame load event
    editor.on('canvas:frame:load', onFrameLoad);

    // Fallback timeout in case event doesn't fire
    timeoutId = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      editor.off('canvas:frame:load', onFrameLoad);
      debug('Frame ready (timeout fallback)');
      resolve();
    }, timeoutMs);

    // Check if frame is already ready
    const frame = editor.Canvas?.getFrame?.();
    if (frame?.loaded || editor.Canvas?.getDocument?.()) {
      if (!resolved) {
        resolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        editor.off('canvas:frame:load', onFrameLoad);
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
      await waitForFrameReady(editor, 300);

      if (signal.aborted) {
        debug('Page switch aborted (new switch started)');
        return;
      }

      // Ensure USWDS resources are loaded
      await loadUSWDSResources(editor);

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
