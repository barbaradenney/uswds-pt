/**
 * Canvas Helpers — Debug Utilities
 *
 * Exposes debug helpers to window for console debugging when debug mode is active.
 */

import { createDebugLogger } from '@uswds-pt/shared';
import type { EditorInstance } from '../../../types/grapesjs';
import { scheduleCanvasUpdate } from './canvas-events';

const debug = createDebugLogger('Canvas');

// Debug mode check
const DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('debug') === 'true' ||
    localStorage.getItem('uswds_pt_debug') === 'true');

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
