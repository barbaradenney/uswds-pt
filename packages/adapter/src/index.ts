/**
 * USWDS-PT Adapter
 * Converts Custom Elements Manifest to GrapesJS blocks and components
 */

export { parseCustomElementsManifest, extractCategory } from './cem-parser.js';
export { generateBlocks, generateBlock } from './block-generator.js';
export { generateTraits, mapAttributeToTrait } from './trait-generator.js';
export {
  BLOCK_CATEGORIES,
  COMPONENT_ICONS,
  DEFAULT_CONTENT,
  USWDS_WC_VERSIONS,
  LIT_VERSION,
  USWDS_VERSION,
  USWDS_WC_BUNDLE_VERSION,
  USWDS_WC_PACKAGES,
  CDN_URLS,
  CDN_STYLES,
  generateComponentLoaderScript,
  CONDITIONAL_FIELDS_SCRIPT,
  STARTER_TEMPLATES,
} from './constants.js';
export { WebComponentTraitManager } from './WebComponentTraitManager.js';

// Unified component registry exports:
export {
  componentRegistry,
  createAttributeTrait,
  createBooleanTrait,
  createInternalSyncTrait,
  cleanupElementIntervals,
  cleanupAllIntervals,
} from './component-registry-v2.js';

export type {
  GrapesBlock,
  GrapesBlockContent,
  GrapesTrait,
  GrapesTraitOption,
  GrapesComponentType,
  ComponentRegistryOptions,
} from './types.js';
export type { ComponentConfig, TraitHandler } from './WebComponentTraitManager.js';
export type { StarterTemplate } from './constants.js';
export type {
  UnifiedTrait,
  ComponentRegistration,
  RetryConfig,
} from './component-registry-v2.js';
