/**
 * Component Registry Modules
 *
 * Re-exports shared utilities and registration functions for component definitions.
 */

export {
  // Types
  type TraitHandler,
  type UnifiedTrait,
  type ComponentRegistration,
  type RetryConfig,
  // Interval management
  cancelPendingSync,
  cleanupElementIntervals,
  cleanupAllIntervals,
  // Type coercion
  coerceBoolean,
  hasAttributeTrue,
  // Trait factories
  createAttributeTrait,
  createBooleanTrait,
  createInternalSyncTrait,
  // Debug logger
  debug,
} from './shared-utils.js';

// Helper modules
export { SELECT_PRESETS, parseCustomOptions, renderSelectOptions, rebuildSelectOptionsFromSource, createSelectOptionTrait } from './select-helpers.js';
export { updateButtonInnerElement, createPageLinkTraits } from './page-link-traits.js';
export { createFormHintTrait, createRadioHintTrait, createErrorMessageTrait } from './form-trait-factories.js';

// Component registration functions
export { registerFormComponents } from './form-components.js';
export { registerFormInputComponents } from './form-input-components.js';
export { registerButtonComponents } from './button-components.js';
export { registerTextInputComponents } from './text-input-components.js';
export { registerSelectionComponents } from './selection-components.js';
export { registerDateTimeComponents } from './date-time-components.js';
export { registerFileRangeComponents } from './file-range-components.js';
export { registerStructureComponents } from './structure-components.js';
export { registerUIComponents } from './ui-components.js';
export { registerDataComponents } from './data-components.js';
export { registerCardComponents } from './card-components.js';
export { registerTableComponents } from './table-components.js';
export { registerListComponents } from './list-components.js';
export { registerTagIconComponents } from './tag-icon-components.js';
export { registerFeedbackComponents } from './feedback-components.js';
export { registerLayoutComponents } from './layout-components.js';
export { registerHeaderComponents } from './header-components.js';
export { registerFooterComponents } from './footer-components.js';
export { registerNavigationComponents } from './navigation-components.js';
export {
  registerPatternComponents,
  rebuildNamePattern,
  rebuildAddressPattern,
  rebuildPhoneNumberPattern,
  rebuildEmailAddressPattern,
  rebuildDateOfBirthPattern,
  rebuildSSNPattern,
  rebuildAllPatterns,
  PATTERN_REBUILDERS,
} from './pattern-components.js';
