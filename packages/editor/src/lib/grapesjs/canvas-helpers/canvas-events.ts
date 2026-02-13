/**
 * Canvas Helpers — Canvas Update & Event Handlers
 *
 * Functions for forcing canvas visual updates, scheduling debounced refreshes,
 * and setting up GrapesJS event handlers for component lifecycle events.
 */

import { createDebugLogger } from '@uswds-pt/shared';
import type { EditorInstance } from '../../../types/grapesjs';
import { activeTimeouts, createTrackedTimeout } from './tracking';

const debug = createDebugLogger('Canvas');

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
 * Uses debouncing to prevent multiple updates from rapid event firing
 */
let pendingCanvasUpdate: ReturnType<typeof setTimeout> | null = null;

export function scheduleCanvasUpdate(editor: EditorInstance, delay: number = 100): void {
  // Cancel any pending update to debounce rapid calls
  if (pendingCanvasUpdate !== null) {
    clearTimeout(pendingCanvasUpdate);
    activeTimeouts.delete(pendingCanvasUpdate);
  }

  pendingCanvasUpdate = createTrackedTimeout(() => {
    pendingCanvasUpdate = null;
    forceCanvasUpdate(editor);
  }, delay);
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
