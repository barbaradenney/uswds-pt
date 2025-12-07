/**
 * USWDS-PT Adapter
 * Converts Custom Elements Manifest to GrapesJS blocks and components
 */

export { parseCustomElementsManifest, extractCategory } from './cem-parser.js';
export { generateBlocks, generateBlock } from './block-generator.js';
export { generateTraits, mapAttributeToTrait } from './trait-generator.js';
export { registerUSWDSComponents, createComponentType } from './component-registry.js';
export { BLOCK_CATEGORIES, COMPONENT_ICONS, DEFAULT_CONTENT } from './constants.js';

export type {
  GrapesBlock,
  GrapesBlockContent,
  GrapesTrait,
  GrapesTraitOption,
  GrapesComponentType,
  ComponentRegistryOptions,
} from './types.js';
