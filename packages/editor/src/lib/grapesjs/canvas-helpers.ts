/**
 * GrapesJS Canvas Helpers
 *
 * Utility functions for managing the GrapesJS canvas, including refresh,
 * event handling, and component interaction handlers.
 *
 * All timeouts and event listeners are tracked for proper cleanup.
 */

import { createDebugLogger } from '@uswds-pt/shared';
import type { EditorInstance } from '../../types/grapesjs';

const debug = createDebugLogger('Canvas');

// Debug mode check for exposeDebugHelpers
const DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('debug') === 'true' ||
    localStorage.getItem('uswds_pt_debug') === 'true');

// ============================================================================
// Timeout Management
// ============================================================================

/** Track active timeouts for cleanup */
const activeTimeouts = new Set<ReturnType<typeof setTimeout>>();

/**
 * Create a tracked timeout that will be automatically cleaned up
 */
function createTrackedTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
  const timeoutId = setTimeout(() => {
    activeTimeouts.delete(timeoutId);
    callback();
  }, delay);
  activeTimeouts.add(timeoutId);
  return timeoutId;
}

/**
 * Clear all active timeouts
 */
export function clearAllTimeouts(): void {
  activeTimeouts.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });
  activeTimeouts.clear();
  debug('Cleared', activeTimeouts.size, 'active timeouts');
}

// ============================================================================
// Document Event Listener Management
// ============================================================================

interface TrackedListener {
  doc: Document;
  type: string;
  handler: EventListener;
  options?: boolean | AddEventListenerOptions;
}

/** Track document event listeners for cleanup */
const documentListeners: TrackedListener[] = [];

/**
 * Add a tracked event listener to a document
 */
function addTrackedDocumentListener(
  doc: Document | null | undefined,
  type: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions
): void {
  // Validate document before adding listener
  if (!doc || typeof doc.addEventListener !== 'function') {
    debug('Cannot add listener: invalid document');
    return;
  }

  try {
    doc.addEventListener(type, handler, options);
    documentListeners.push({ doc, type, handler, options });
  } catch (err) {
    debug('Failed to add document listener:', err);
  }
}

/**
 * Remove all tracked document event listeners
 */
export function removeAllDocumentListeners(): void {
  let removed = 0;
  let skipped = 0;

  documentListeners.forEach(({ doc, type, handler, options }) => {
    // Check if document is still valid before trying to remove listener
    if (!doc || typeof doc.removeEventListener !== 'function') {
      skipped++;
      return;
    }

    try {
      doc.removeEventListener(type, handler, options);
      removed++;
    } catch {
      // Document may no longer be available (iframe destroyed, etc.)
      skipped++;
    }
  });

  const total = documentListeners.length;
  documentListeners.length = 0;
  debug('Document listeners cleanup: removed', removed, 'skipped', skipped, 'of', total);
}

// ============================================================================
// Canvas Update Functions
// ============================================================================

/**
 * Force canvas visual update
 *
 * GrapesJS's editor.refresh() only updates spots/tools positioning, not content.
 * This function performs a more thorough refresh.
 */
export function forceCanvasUpdate(editor: EditorInstance): void {
  debug('Forcing canvas update...');
  try {
    const canvas = editor.Canvas;

    // Check if canvas is ready before attempting refresh
    if (!canvas?.getFrame?.()) {
      debug('Canvas not ready, skipping refresh');
      return;
    }

    // Trigger events that help clear internal caches
    editor.trigger?.('frame:updated');

    // Use Canvas.refresh() with spots update
    if (canvas?.refresh) {
      canvas.refresh({ spots: true });
    }

    // Only call editor.refresh() if Canvas has a frame
    if (canvas?.getFrame?.()) {
      editor.refresh?.();
    }

    // Force iframe repaint by triggering reflow
    const frameEl = canvas?.getFrameEl?.();
    if (frameEl) {
      const doc = frameEl.contentDocument;
      if (doc?.body) {
        void doc.body.offsetHeight;
        debug('Iframe reflow triggered');
      }
    }

    debug('Canvas update complete');
  } catch (err) {
    // Silently ignore canvas update errors - they're usually timing issues
    debug('Canvas update skipped due to:', err);
  }
}

/**
 * Schedule a canvas update with tracked timeout
 */
function scheduleCanvasUpdate(editor: EditorInstance, delay: number = 100): void {
  createTrackedTimeout(() => forceCanvasUpdate(editor), delay);
}

// ============================================================================
// Canvas Event Handlers
// ============================================================================

/**
 * Set up canvas event handlers for component removal and updates
 */
export function setupCanvasEventHandlers(
  editor: EditorInstance,
  registerListener: (event: string, handler: (...args: unknown[]) => void) => void
): void {
  // Force canvas refresh after component removal
  registerListener('component:remove', (component: any) => {
    const tagName = component?.get?.('tagName') || component?.get?.('type');
    debug('Component removed:', tagName);
    scheduleCanvasUpdate(editor);
  });

  // Force canvas refresh after component move/reorder
  registerListener('component:drag:end', () => {
    debug('Component drag ended');
    scheduleCanvasUpdate(editor);
  });

  registerListener('sorter:drag:end', () => {
    debug('Sorter drag ended');
    scheduleCanvasUpdate(editor);
  });

  // Listen for any component update that might affect ordering
  registerListener('component:update', () => {
    debug('Component updated');
    scheduleCanvasUpdate(editor);
  });

  // Handle DomComponents.clear() calls (used by Clear Page)
  const originalClear = editor.DomComponents?.clear?.bind(editor.DomComponents);
  if (originalClear && editor.DomComponents) {
    editor.DomComponents.clear = (...args: unknown[]) => {
      debug('DomComponents.clear() called');
      const result = originalClear(...args);
      scheduleCanvasUpdate(editor);
      // Close any open modal after clearing
      if (editor.Modal?.close) {
        editor.Modal.close();
        debug('Modal closed');
      }
      return result;
    };
  }

  // Listen for command execution (for core:canvas-clear and similar)
  registerListener('run:core:canvas-clear', () => {
    debug('core:canvas-clear command executed');
    scheduleCanvasUpdate(editor);
    // Close modal after clear command
    createTrackedTimeout(() => {
      if (editor.Modal?.close) {
        editor.Modal.close();
        debug('Modal closed after clear command');
      }
    }, 50);
  });

  // Log ALL commands being run for debugging
  registerListener('run', (...args: unknown[]) => {
    debug('Command run:', args[0]);
  });

  // Listen for any component deletion command
  registerListener('run:core:component-delete', () => {
    debug('core:component-delete command executed');
    scheduleCanvasUpdate(editor);
  });
}

/**
 * Register custom clear command that ensures proper clearing
 */
export function registerClearCommand(editor: EditorInstance): void {
  const Commands = editor.Commands;
  if (!Commands) return;

  Commands.add('core:canvas-clear', {
    run(editorInstance: EditorInstance) {
      debug('Running custom core:canvas-clear command');

      // Get the wrapper component (root of the canvas)
      const wrapper = editorInstance.DomComponents?.getWrapper();
      if (wrapper) {
        // Remove all children from the wrapper
        const components = wrapper.components();
        debug('Clearing', components.length, 'components from wrapper');
        components.reset();
      }

      // Also clear styles if needed
      const cssComposer = editorInstance.CssComposer;
      if (cssComposer?.clear) {
        cssComposer.clear();
        debug('CSS cleared');
      }

      // Force canvas update
      scheduleCanvasUpdate(editorInstance);

      // Close any modal
      if (editorInstance.Modal?.close) {
        editorInstance.Modal.close();
      }

      debug('Canvas cleared successfully');
    },
  });

  debug('Custom core:canvas-clear command registered');
}

// ============================================================================
// Interactive Component Handlers
// ============================================================================

// Track which documents have had handlers attached (using WeakMap to avoid memory leaks)
const handledDocs = new WeakMap<Document, Set<string>>();

function isDocumentHandled(doc: Document, handlerKey: string): boolean {
  const handled = handledDocs.get(doc);
  return handled?.has(handlerKey) ?? false;
}

function markDocumentHandled(doc: Document, handlerKey: string): void {
  let handled = handledDocs.get(doc);
  if (!handled) {
    handled = new Set();
    handledDocs.set(doc, handled);
  }
  handled.add(handlerKey);
}

/**
 * Set up page link click handler for navigation within prototypes
 */
export function setupPageLinkHandler(editor: EditorInstance): void {
  const canvas = editor.Canvas;
  const doc = canvas?.getDocument?.();
  if (!doc) return;

  const handlerKey = 'pageLink';
  if (isDocumentHandled(doc, handlerKey)) return;
  markDocumentHandled(doc, handlerKey);

  const handler = (e: Event) => {
    const mouseEvent = e as MouseEvent;
    // Only handle clicks in preview mode (not editing mode)
    const isPreviewMode = editor.Commands?.isActive?.('preview');
    if (!isPreviewMode) return;

    const target = mouseEvent.target as HTMLElement;
    const link = target.closest('[href^="#page-"]') as HTMLElement;
    if (link) {
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();
      const href = link.getAttribute('href');
      if (href) {
        const pageId = href.replace('#page-', '');
        const pages = editor.Pages;
        const targetPage = pages?.get?.(pageId);
        if (targetPage) {
          pages.select(targetPage);
          debug('Navigated to page:', pageId);
        }
      }
    }
  };

  addTrackedDocumentListener(doc, 'click', handler);
}

/**
 * Set up banner click handler to toggle "Here's how you know" section
 */
export function setupBannerClickHandler(editor: EditorInstance): void {
  const canvas = editor.Canvas;
  const doc = canvas?.getDocument?.();
  if (!doc) return;

  const handlerKey = 'banner';
  if (isDocumentHandled(doc, handlerKey)) return;
  markDocumentHandled(doc, handlerKey);

  const handler = (e: Event) => {
    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as HTMLElement;
    const banner = target.closest('usa-banner') as HTMLElement;
    if (!banner) return;

    const isActionButton = target.closest('.usa-banner__button') ||
      target.closest('.usa-banner__header-action') ||
      target.closest('[aria-controls]');

    if (isActionButton) {
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();

      const isCurrentlyExpanded = banner.hasAttribute('expanded');
      if (isCurrentlyExpanded) {
        banner.removeAttribute('expanded');
        (banner as any).expanded = false;
      } else {
        banner.setAttribute('expanded', '');
        (banner as any).expanded = true;
      }

      if (typeof (banner as any).requestUpdate === 'function') {
        (banner as any).requestUpdate();
      }

      // Update the GrapesJS component model
      const gjsComponent = editor.DomComponents?.getWrapper()?.find('usa-banner')?.[0];
      if (gjsComponent) {
        const attrs = gjsComponent.get('attributes') || {};
        if (isCurrentlyExpanded) {
          delete attrs.expanded;
        } else {
          attrs.expanded = true;
        }
        gjsComponent.set('attributes', { ...attrs });
      }

      debug('Toggled usa-banner expanded state:', !isCurrentlyExpanded);
    }
  };

  addTrackedDocumentListener(doc, 'click', handler, true);
}

/**
 * Set up accordion click handler
 */
export function setupAccordionClickHandler(editor: EditorInstance): void {
  const canvas = editor.Canvas;
  const doc = canvas?.getDocument?.();
  if (!doc) return;

  const handlerKey = 'accordion';
  if (isDocumentHandled(doc, handlerKey)) return;
  markDocumentHandled(doc, handlerKey);

  const handler = (e: Event) => {
    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as HTMLElement;
    const accordion = target.closest('usa-accordion') as HTMLElement;
    if (!accordion) return;

    const headerButton = target.closest('.usa-accordion__button') ||
      target.closest('[aria-controls^="accordion"]') ||
      target.closest('button[aria-expanded]');

    if (headerButton && headerButton.closest('usa-accordion') === accordion) {
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();

      const ariaControls = headerButton.getAttribute('aria-controls');
      const isExpanded = headerButton.getAttribute('aria-expanded') === 'true';

      headerButton.setAttribute('aria-expanded', String(!isExpanded));

      if (ariaControls) {
        const content = accordion.querySelector(`#${ariaControls}`) as HTMLElement;
        if (content) {
          content.hidden = isExpanded;
        }
      }

      if (typeof (accordion as any).requestUpdate === 'function') {
        (accordion as any).requestUpdate();
      }

      debug('Toggled usa-accordion section:', ariaControls, 'expanded:', !isExpanded);
    }
  };

  addTrackedDocumentListener(doc, 'click', handler, true);
}

/**
 * Set up modal click handler
 */
export function setupModalClickHandler(editor: EditorInstance): void {
  const canvas = editor.Canvas;
  const doc = canvas?.getDocument?.();
  if (!doc) return;

  const handlerKey = 'modal';
  if (isDocumentHandled(doc, handlerKey)) return;
  markDocumentHandled(doc, handlerKey);

  const handler = (e: Event) => {
    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as HTMLElement;
    const modal = target.closest('usa-modal') as HTMLElement;
    if (!modal) return;

    const isTrigger = target.closest('.usa-modal__trigger') ||
      target.closest('[data-open-modal]') ||
      target.closest('.usa-button[aria-controls]');

    const isCloseButton = target.closest('[data-close-modal]') ||
      target.closest('.usa-modal__close');

    if (isTrigger) {
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();
      modal.setAttribute('open', '');
      (modal as any).open = true;

      if (typeof (modal as any).requestUpdate === 'function') {
        (modal as any).requestUpdate();
      }

      debug('Opened usa-modal');
    } else if (isCloseButton) {
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();
      modal.removeAttribute('open');
      (modal as any).open = false;

      if (typeof (modal as any).requestUpdate === 'function') {
        (modal as any).requestUpdate();
      }

      debug('Closed usa-modal');
    }
  };

  addTrackedDocumentListener(doc, 'click', handler, true);
}

/**
 * Set up all interactive component handlers
 */
export function setupAllInteractiveHandlers(
  editor: EditorInstance,
  registerListener: (event: string, handler: (...args: unknown[]) => void) => void
): void {
  const setupAll = () => {
    setupPageLinkHandler(editor);
    setupBannerClickHandler(editor);
    setupAccordionClickHandler(editor);
    setupModalClickHandler(editor);
  };

  // Set up handlers on canvas load and page changes
  registerListener('canvas:frame:load', setupAll);
  registerListener('page:select', setupAll);
}

// ============================================================================
// Debug Helpers
// ============================================================================

/**
 * Expose debug helpers to window for console debugging
 */
export function exposeDebugHelpers(editor: EditorInstance): void {
  if (!DEBUG) return;

  (window as any).__clearCanvas = () => {
    debug('Manual clear triggered from console');
    const wrapper = editor.DomComponents?.getWrapper();
    if (wrapper) {
      const components = wrapper.components() || [];
      debug('Found', components.length || 0, 'components');
      components.forEach?.((c: any) => debug('  -', c.get('tagName') || c.get('type')));
      components.reset?.();
      debug('Components cleared');
    }
    scheduleCanvasUpdate(editor);
  };

  (window as any).__editor = editor;
  debug('Debug helpers exposed: window.__clearCanvas(), window.__editor');
}

/**
 * Clean up debug helpers from window
 */
export function cleanupDebugHelpers(): void {
  if ((window as any).__clearCanvas) {
    delete (window as any).__clearCanvas;
  }
  if ((window as any).__editor) {
    delete (window as any).__editor;
  }
}

// ============================================================================
// Master Cleanup
// ============================================================================

/**
 * Clean up all canvas helpers resources
 * Call this when the editor is being destroyed
 */
export function cleanupCanvasHelpers(): void {
  debug('Cleaning up canvas helpers...');
  clearAllTimeouts();
  removeAllDocumentListeners();
  cleanupDebugHelpers();
  debug('Canvas helpers cleanup complete');
}
