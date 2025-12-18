/**
 * USWDS-PT Adapter
 * Converts Custom Elements Manifest to GrapesJS blocks and components
 */

export { parseCustomElementsManifest, extractCategory } from './cem-parser.js';
export { generateBlocks, generateBlock } from './block-generator.js';
export { generateTraits, mapAttributeToTrait } from './trait-generator.js';
export { registerUSWDSComponents, createComponentType } from './component-registry.js';
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
} from './constants.js';
export { COMPONENT_TRAITS, registerComponentTraits } from './component-traits.js';
export { WebComponentTraitManager } from './WebComponentTraitManager.js';
export { getAllComponentConfigs, usaButtonConfig } from './component-configs.js';

export type {
  GrapesBlock,
  GrapesBlockContent,
  GrapesTrait,
  GrapesTraitOption,
  GrapesComponentType,
  ComponentRegistryOptions,
} from './types.js';
export type { ComponentConfig, TraitHandler } from './WebComponentTraitManager.js';
