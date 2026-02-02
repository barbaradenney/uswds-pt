/**
 * GrapesJS Canvas Helpers
 *
 * Utility functions for managing the GrapesJS canvas, including refresh,
 * event handling, and component interaction handlers.
 */

// Debug logging
const DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('debug') === 'true' ||
    localStorage.getItem('uswds_pt_debug') === 'true');

function debug(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[USWDS-PT]', ...args);
  }
}

// GrapesJS editor type
type EditorInstance = any;

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
    setTimeout(() => forceCanvasUpdate(editor), 100);
  });

  // Force canvas refresh after component move/reorder
  registerListener('component:drag:end', () => {
    debug('Component drag ended');
    setTimeout(() => forceCanvasUpdate(editor), 100);
  });

  registerListener('sorter:drag:end', () => {
    debug('Sorter drag ended');
    setTimeout(() => forceCanvasUpdate(editor), 100);
  });

  // Listen for any component update that might affect ordering
  registerListener('component:update', () => {
    debug('Component updated');
    setTimeout(() => forceCanvasUpdate(editor), 100);
  });

  // Handle DomComponents.clear() calls (used by Clear Page)
  const originalClear = editor.DomComponents?.clear?.bind(editor.DomComponents);
  if (originalClear && editor.DomComponents) {
    editor.DomComponents.clear = (...args: unknown[]) => {
      debug('DomComponents.clear() called');
      const result = originalClear(...args);
      setTimeout(() => forceCanvasUpdate(editor), 100);
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
    setTimeout(() => forceCanvasUpdate(editor), 100);
    // Close modal after clear command
    setTimeout(() => {
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
    setTimeout(() => forceCanvasUpdate(editor), 100);
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
      setTimeout(() => forceCanvasUpdate(editorInstance), 100);

      // Close any modal
      if (editorInstance.Modal?.close) {
        editorInstance.Modal.close();
      }

      debug('Canvas cleared successfully');
    },
  });

  debug('Custom core:canvas-clear command registered');
}

/**
 * Set up page link click handler for navigation within prototypes
 */
export function setupPageLinkHandler(editor: EditorInstance): void {
  const canvas = editor.Canvas;
  const doc = canvas?.getDocument?.();
  if (!doc) return;

  // Use WeakSet to track which documents have handlers
  const key = '__pageLinkHandled';
  if ((doc as any)[key]) return;
  (doc as any)[key] = true;

  doc.addEventListener('click', (e: MouseEvent) => {
    // Only handle clicks in preview mode (not editing mode)
    const isPreviewMode = editor.Commands?.isActive?.('preview');
    if (!isPreviewMode) return;

    const target = e.target as HTMLElement;
    const link = target.closest('[href^="#page-"]') as HTMLElement;
    if (link) {
      e.preventDefault();
      e.stopPropagation();
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
  });
}

/**
 * Set up banner click handler to toggle "Here's how you know" section
 */
export function setupBannerClickHandler(editor: EditorInstance): void {
  const canvas = editor.Canvas;
  const doc = canvas?.getDocument?.();
  if (!doc) return;

  const key = '__bannerHandled';
  if ((doc as any)[key]) return;
  (doc as any)[key] = true;

  doc.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const banner = target.closest('usa-banner') as HTMLElement;
    if (!banner) return;

    const isActionButton = target.closest('.usa-banner__button') ||
      target.closest('.usa-banner__header-action') ||
      target.closest('[aria-controls]');

    if (isActionButton) {
      e.preventDefault();
      e.stopPropagation();

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
  }, true);
}

/**
 * Set up accordion click handler
 */
export function setupAccordionClickHandler(editor: EditorInstance): void {
  const canvas = editor.Canvas;
  const doc = canvas?.getDocument?.();
  if (!doc) return;

  const key = '__accordionHandled';
  if ((doc as any)[key]) return;
  (doc as any)[key] = true;

  doc.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const accordion = target.closest('usa-accordion') as HTMLElement;
    if (!accordion) return;

    const headerButton = target.closest('.usa-accordion__button') ||
      target.closest('[aria-controls^="accordion"]') ||
      target.closest('button[aria-expanded]');

    if (headerButton && headerButton.closest('usa-accordion') === accordion) {
      e.preventDefault();
      e.stopPropagation();

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
  }, true);
}

/**
 * Set up modal click handler
 */
export function setupModalClickHandler(editor: EditorInstance): void {
  const canvas = editor.Canvas;
  const doc = canvas?.getDocument?.();
  if (!doc) return;

  const key = '__modalHandled';
  if ((doc as any)[key]) return;
  (doc as any)[key] = true;

  doc.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const modal = target.closest('usa-modal') as HTMLElement;
    if (!modal) return;

    const isTrigger = target.closest('.usa-modal__trigger') ||
      target.closest('[data-open-modal]') ||
      target.closest('.usa-button[aria-controls]');

    const isCloseButton = target.closest('[data-close-modal]') ||
      target.closest('.usa-modal__close');

    if (isTrigger) {
      e.preventDefault();
      e.stopPropagation();
      modal.setAttribute('open', '');
      (modal as any).open = true;

      if (typeof (modal as any).requestUpdate === 'function') {
        (modal as any).requestUpdate();
      }

      debug('Opened usa-modal');
    } else if (isCloseButton) {
      e.preventDefault();
      e.stopPropagation();
      modal.removeAttribute('open');
      (modal as any).open = false;

      if (typeof (modal as any).requestUpdate === 'function') {
        (modal as any).requestUpdate();
      }

      debug('Closed usa-modal');
    }
  }, true);
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
    setTimeout(() => forceCanvasUpdate(editor), 100);
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
