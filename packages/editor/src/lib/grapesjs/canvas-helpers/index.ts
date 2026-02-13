/**
 * Canvas Helpers — Barrel Export
 *
 * Re-exports all canvas helper functions from focused sub-modules.
 * This file also contains the master cleanup function.
 */

import { createDebugLogger } from '@uswds-pt/shared';
import { clearAllTimeouts, removeAllDocumentListeners } from './tracking';
import { cleanupDebugHelpers } from './debug';

const debug = createDebugLogger('Canvas');

// Tracking infrastructure
export { clearAllTimeouts, removeAllDocumentListeners } from './tracking';

// Canvas update & event handlers
export { forceCanvasUpdate, setupCanvasEventHandlers, registerClearCommand } from './canvas-events';

// Interactive component handlers
export {
  setupPageLinkHandler,
  setupBannerClickHandler,
  setupAccordionClickHandler,
  setupModalClickHandler,
  setupConditionalFieldsHandler,
  setupConditionalFieldsWatcher,
  reinitInteractiveHandlers,
  setupAllInteractiveHandlers,
} from './interactive-handlers';

// State & user visibility
export { applyStateVisibility, setupStateVisibilityWatcher } from './state-visibility';

// Page link sync
export { syncPageLinkHrefs } from './page-links';

// Debug helpers
export { exposeDebugHelpers, cleanupDebugHelpers } from './debug';

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
