/**
 * HTML Export Utilities — barrel re-export
 * Preserves the original public API so all existing imports continue to work.
 */

// HTML cleaning functions
export {
  cleanExport,
  fixButtonSlotContent,
  removeUSWDSScripts,
  removeGrapesAttrs,
  removeEmptyAttrs,
  cleanGrapesClasses,
  formatHtml,
} from './clean';
export type { CleanOptions } from './clean';

// Init script generation
export { generateInitScript, hasConditionalFields } from './init-script';

// Document generation, preview, and types
export {
  generateFullDocument,
  generateMultiPageDocument,
  openPreviewInNewTab,
  openMultiPagePreviewInNewTab,
} from './document';
export type { PageData } from './document';
