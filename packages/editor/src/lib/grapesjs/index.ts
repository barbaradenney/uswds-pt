/**
 * GrapesJS Utilities and Helpers
 *
 * Centralized exports for all GrapesJS-related functionality.
 */

export { uswdsComponentsPlugin } from './plugins';
export {
  loadUSWDSResources,
  addCardContainerCSS,
  clearGrapesJSStorage,
} from './resource-loader';
export {
  forceCanvasUpdate,
  setupCanvasEventHandlers,
  registerClearCommand,
  setupPageLinkHandler,
  setupBannerClickHandler,
  setupAccordionClickHandler,
  setupModalClickHandler,
  setupAllInteractiveHandlers,
  exposeDebugHelpers,
  cleanupDebugHelpers,
} from './canvas-helpers';
export {
  extractEditorData,
  isEditorReadyForExtraction,
  isExtractingPerPageHtml,
  hasActualContent,
  type ExtractionResult,
} from './data-extractor';
export type { GrapesProjectData } from '@uswds-pt/shared';
