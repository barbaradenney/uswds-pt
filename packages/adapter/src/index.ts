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
  USWDS_WC_VERSION,
  LIT_VERSION,
  USWDS_VERSION,
  CDN_IMPORT_MAP,
  USWDS_WC_PACKAGES,
  CDN_STYLES,
  generateComponentLoaderScript,
} from './constants.js';

export type {
  GrapesBlock,
  GrapesBlockContent,
  GrapesTrait,
  GrapesTraitOption,
  GrapesComponentType,
  ComponentRegistryOptions,
} from './types.js';
