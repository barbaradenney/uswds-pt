/**
 * Component Registry
 * Registers USWDS components with GrapesJS editor
 */

import type { CEMManifest, ParsedComponent } from '@uswds-pt/shared';
import type { GrapesComponentType, GrapesTrait, ComponentRegistryOptions } from './types.js';
import { parseCustomElementsManifest, isContainer, formatLabel } from './cem-parser.js';
import { generateTraits } from './trait-generator.js';
import { generateBlocks, generateBlockCategories } from './block-generator.js';
import { COMPONENT_ICONS, DEFAULT_CONTENT } from './constants.js';

/**
 * GrapesJS Editor interface (minimal typing for our needs)
 */
interface GrapesEditor {
  DomComponents: {
    addType: (type: string, definition: GrapesComponentType) => void;
    getType: (type: string) => GrapesComponentType | undefined;
  };
  BlockManager: {
    add: (id: string, block: Record<string, unknown>) => void;
    remove: (id: string) => void;
    getAll: () => Array<{ getId: () => string }>;
    getConfig: () => { category?: Array<Record<string, unknown>> };
  };
  on: (event: string, callback: (...args: unknown[]) => void) => void;
}

/**
 * Register all USWDS components with a GrapesJS editor
 */
export function registerUSWDSComponents(
  editor: GrapesEditor,
  manifest: CEMManifest,
  options: ComponentRegistryOptions = {}
): void {
  const components = parseCustomElementsManifest(manifest);

  // Register block categories
  const categories = generateBlockCategories();
  for (const category of categories) {
    const config = editor.BlockManager.getConfig();
    if (config.category) {
      config.category.push(category);
    }
  }

  // Register each component
  for (const component of components) {
    registerComponent(editor, component, options);
  }

  // Generate and add blocks
  const blocks = generateBlocks(components);
  for (const block of blocks) {
    editor.BlockManager.add(block.id, {
      label: block.label,
      category: block.category,
      content: block.content,
      media: block.media,
      select: block.select,
      activate: block.activate,
    });
  }
}

/**
 * Register a single component with GrapesJS
 */
function registerComponent(
  editor: GrapesEditor,
  component: ParsedComponent,
  options: ComponentRegistryOptions
): void {
  const componentType = createComponentType(component, options);
  editor.DomComponents.addType(component.tagName, componentType);
}

/**
 * Create a GrapesJS component type definition
 */
export function createComponentType(
  component: ParsedComponent,
  options: ComponentRegistryOptions = {}
): GrapesComponentType {
  const traits = generateTraits(component);
  const droppable = isContainer(component);

  return {
    isComponent: (el: HTMLElement) => {
      return el.tagName?.toLowerCase() === component.tagName;
    },

    model: {
      defaults: {
        tagName: component.tagName,
        draggable: true,
        droppable: droppable ? getAllowedChildren(component) : false,
        traits,
        attributes: {},
        'custom-name': formatLabel(component.tagName),
        // Disable inline styles - USWDS handles all styling
        stylable: options.disableStyles === false,
      },
    },

    view: {
      // Light DOM components render naturally
      // No special view configuration needed
    },
  };
}

/**
 * Get allowed children for a container component
 */
function getAllowedChildren(component: ParsedComponent): string | boolean {
  // Define specific parent-child relationships
  const childRules: Record<string, string[]> = {
    'usa-button-group': ['usa-button'],
    'usa-accordion': ['usa-accordion-item'],
    'usa-nav': ['usa-nav-item', 'a'],
    'usa-list': ['li'],
    'usa-table': ['thead', 'tbody', 'tfoot', 'tr'],
  };

  const allowedChildren = childRules[component.tagName];
  if (allowedChildren) {
    return allowedChildren.join(',');
  }

  // Default: allow any component
  return true;
}

/**
 * Remove all default GrapesJS blocks
 */
export function removeDefaultBlocks(editor: GrapesEditor): void {
  const blocks = editor.BlockManager.getAll();
  for (const block of blocks) {
    editor.BlockManager.remove(block.getId());
  }
}

/**
 * Create a GrapesJS plugin for USWDS components
 */
export function createUSWDSPlugin(
  manifest: CEMManifest,
  options: ComponentRegistryOptions = {}
) {
  return (editor: GrapesEditor) => {
    // Remove default blocks
    removeDefaultBlocks(editor);

    // Register USWDS components
    registerUSWDSComponents(editor, manifest, options);

    // Add design mode toggle command
    editor.on('load', () => {
      // Editor is ready
    });
  };
}

/**
 * Get component icon
 */
export function getComponentIcon(tagName: string): string {
  return COMPONENT_ICONS[tagName] || COMPONENT_ICONS['default'];
}

/**
 * Get default content for a component
 */
export function getDefaultContent(tagName: string): string {
  return DEFAULT_CONTENT[tagName] || `<${tagName}></${tagName}>`;
}
