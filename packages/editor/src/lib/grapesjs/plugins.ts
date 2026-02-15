/**
 * GrapesJS Plugins for USWDS Web Components
 *
 * This module contains the main GrapesJS plugin that registers USWDS component types
 * and configures how they behave in the editor.
 *
 * Component definitions are organized into separate modules:
 * - grid-components.ts: Grid layout (grid-container, grid-row, grid-col)
 * - card-components.ts: Card layouts (card-container, card-inner-container, card-body)
 * - text-components.ts: Text content (text-block, heading-block)
 */

import {
  componentRegistry,
  WebComponentTraitManager,
} from '@uswds-pt/adapter';
import { createDebugLogger } from '@uswds-pt/shared';
import type { EditorInstance } from '../../types/grapesjs';
import {
  registerGridComponents,
  registerCardComponents,
  registerTextComponents,
} from './components';
import { baseDefaults } from './component-defaults';

const debug = createDebugLogger('Plugins');

/**
 * GrapesJS plugin to register USWDS component types
 *
 * Plugins are loaded before the editor parses content, ensuring our types are available.
 * This handles:
 * - USWDS web components (usa-button, usa-alert, etc.) via componentRegistry
 * - Grid layout components (grid-container, grid-row, grid-col)
 * - Card components
 * - Text blocks (p, h1-h6)
 */
export function uswdsComponentsPlugin(editor: EditorInstance): void {
  const Components = editor.Components || editor.DomComponents;

  if (!Components) {
    debug('Could not find Components API on editor');
    return;
  }

  debug('Registering component types via plugin...');

  // Register USWDS web component types from componentRegistry
  registerUswdsWebComponents(Components);

  // Register layout and content component types
  registerGridComponents(Components);
  registerCardComponents(Components);
  registerTextComponents(Components);

  // Override default component type for better selectability
  overrideDefaultComponent(Components);

  debug('Component types registered successfully');

  // Initialize WebComponentTraitManager to handle trait ↔ web component sync
  debug('Initializing WebComponentTraitManager...');
  const _traitManager = new WebComponentTraitManager(editor);
  debug('WebComponentTraitManager initialized (using componentRegistry)');

  // Handle the special case of select options
  setupSelectOptionsHandler(editor);
}

/**
 * Register USWDS web component types from the component registry
 *
 * This reads component definitions from the adapter's componentRegistry
 * and creates GrapesJS component types for each.
 */
function registerUswdsWebComponents(Components: ComponentsAPI): void {
  const registeredComponents = componentRegistry.getAll();

  for (const registration of registeredComponents) {
    // Get trait definitions for GrapesJS
    const traitDefinitions = componentRegistry.getTraitDefinitions(registration.tagName) || [];

    // Build default values from trait defaults
    const traitDefaults: Record<string, unknown> = {};
    traitDefinitions.forEach((trait) => {
      if (trait.default !== undefined) {
        traitDefaults[trait.name] = trait.default;
      }
    });

    Components.addType(registration.tagName, {
      // Match any element with this tag name
      isComponent: (el: HTMLElement) => el.tagName?.toLowerCase() === registration.tagName,

      model: {
        defaults: {
          tagName: registration.tagName,
          ...baseDefaults,
          droppable: registration.droppable ?? false,
          // Define the traits that will show in the properties panel
          traits: traitDefinitions,
          // Set default attribute values from traits (must be in attributes object)
          attributes: traitDefaults,
          // Web components handle their own rendering
          components: false,
        },
      },
    });
  }
}

/**
 * Override default component type to ensure children are selectable
 */
function overrideDefaultComponent(Components: ComponentsAPI): void {
  const defaultType = Components.getType('default');
  if (defaultType) {
    Components.addType('default', {
      ...defaultType,
      model: {
        defaults: {
          ...defaultType.model?.prototype?.defaults,
          ...baseDefaults,
        },
      },
    });
  }
}

/**
 * Set up handler for select component options JSON
 */
function setupSelectOptionsHandler(editor: EditorInstance): void {
  editor.on('component:update:options-json', (model: ComponentModel) => {
    try {
      const jsonStr = model.get('attributes')['options-json'];
      if (typeof jsonStr === 'string' && jsonStr) {
        const options = JSON.parse(jsonStr);
        const el = model.getEl();
        if (el) {
          (el as SelectElement).options = options;
        }
      }
    } catch (e) {
      debug('Invalid options JSON:', e);
    }
  });
}

/**
 * Type definitions for GrapesJS APIs
 */
interface ComponentsAPI {
  addType(name: string, config: unknown): void;
  getType(name: string): ComponentType | undefined;
}

interface ComponentType {
  model?: {
    prototype?: {
      defaults?: Record<string, unknown>;
    };
  };
}

interface ComponentModel {
  get(key: string): Record<string, unknown>;
  getEl(): HTMLElement | null;
}

interface SelectElement extends HTMLElement {
  options: unknown;
}
