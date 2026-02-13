/**
 * GrapesJS Setup — Barrel Export
 *
 * Re-exports all setup modules for use by the main useGrapesJSSetup hook.
 */

export { setupSpacingTrait, setupConditionalShowHideTrait, setupVisibilityTrait } from './trait-setup';
export type { VisibilityTraitConfig } from './trait-setup';
export { waitForFrameReady, buildTemplateFromExistingPage, setupPageEventHandlers, setupPageLinkTrait } from './page-management';
export { getComponentLabel, getComponentTypeName, ensureComponentId, collectTargetableComponents, cleanupTriggerComponentIds, setupProactiveIdAssignment } from './component-ids';
export { setupSymbolCreationHandler } from './symbol-setup';
export type { RegisterListener, EditorInstance } from './types';
