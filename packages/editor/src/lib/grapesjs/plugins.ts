/**
 * GrapesJS Plugins for USWDS Web Components
 *
 * This module contains the GrapesJS plugins that register USWDS component types
 * and configure how they behave in the editor.
 */

import {
  componentRegistry,
  WebComponentTraitManager,
} from '@uswds-pt/adapter';
import { createDebugLogger } from '@uswds-pt/shared';
import type { EditorInstance } from '../../types/grapesjs';

const debug = createDebugLogger('Plugins');

/**
 * GrapesJS plugin to register USWDS component types
 *
 * Plugins are loaded before the editor parses content, ensuring our types are available.
 * This handles:
 * - USWDS web components (usa-button, usa-alert, etc.)
 * - Grid layout components (grid-container, grid-row, grid-col)
 * - Card components
 * - Text blocks (p, h1-h6)
 */
export function uswdsComponentsPlugin(editor: EditorInstance): void {
  const Components = editor.Components || editor.DomComponents;

  if (!Components) {
    console.error('USWDS-PT: Could not find Components API on editor');
    return;
  }

  debug('Registering component types via plugin...');

  // Register component types from componentRegistry
  const registeredComponents = componentRegistry.getAll();

  for (const registration of registeredComponents) {
    // Get trait definitions for GrapesJS
    const traitDefinitions = componentRegistry.getTraitDefinitions(registration.tagName) || [];

    // Build default values from trait defaults
    const traitDefaults: Record<string, unknown> = {};
    traitDefinitions.forEach(trait => {
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
          draggable: true,
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

  debug('Component types registered successfully');

  // Register grid layout component types (plain HTML divs with specific classes)
  registerGridComponents(Components);

  // Register card components
  registerCardComponents(Components);

  // Register text components
  registerTextComponents(Components);

  // Override default component type
  overrideDefaultComponent(Components);

  debug('Grid layout component types registered');

  // Initialize WebComponentTraitManager to handle trait ↔ web component sync
  debug('Initializing WebComponentTraitManager...');
  const _traitManager = new WebComponentTraitManager(editor);

  debug('WebComponentTraitManager initialized (using componentRegistry)');

  // Handle the special case of select options
  editor.on('component:update:options-json', (model: any) => {
    try {
      const jsonStr = model.get('attributes')['options-json'];
      if (jsonStr) {
        const options = JSON.parse(jsonStr);
        const el = model.getEl();
        if (el) {
          el.options = options;
        }
      }
    } catch (e) {
      console.warn('Invalid options JSON:', e);
    }
  });
}

/**
 * Register grid layout components (grid-container, grid-row, grid-col)
 */
function registerGridComponents(Components: any): void {
  // Grid container
  Components.addType('grid-container', {
    isComponent: (el: HTMLElement) => el.classList?.contains('grid-container'),
    model: {
      defaults: {
        tagName: 'div',
        name: 'Grid Container',
        draggable: true,
        droppable: true,
        removable: true,
        copyable: true,
        resizable: true,
      },
    },
  });

  // Grid row
  Components.addType('grid-row', {
    isComponent: (el: HTMLElement) => el.classList?.contains('grid-row'),
    model: {
      defaults: {
        tagName: 'div',
        name: 'Grid Row',
        draggable: true,
        droppable: true,
        removable: true,
        copyable: true,
        resizable: true,
      },
    },
  });

  // Grid columns (match grid-col-* classes)
  Components.addType('grid-col', {
    isComponent: (el: HTMLElement) => {
      if (!el.classList) return false;
      return Array.from(el.classList).some(cls => cls.startsWith('grid-col'));
    },
    model: {
      defaults: {
        tagName: 'div',
        name: 'Grid Column',
        draggable: true,
        droppable: true,
        removable: true,
        copyable: true,
        resizable: true,
        selectable: true,
        hoverable: true,
        highlightable: true,
        layerable: true,
        editable: true,
      },
    },
  });
}

/**
 * Register card container components
 */
function registerCardComponents(Components: any): void {
  // Card container - a droppable USWDS card that can contain any content
  Components.addType('card-container', {
    extend: 'default',
    isComponent: (el: HTMLElement) => el.classList?.contains('uswds-card-container'),
    model: {
      defaults: {
        tagName: 'div',
        type: 'card-container',
        name: 'Card Container',
        draggable: true,
        droppable: true,
        removable: true,
        copyable: true,
        resizable: true,
        classes: ['usa-card', 'uswds-card-container'],
      },
    },
  });

  // Card inner container
  Components.addType('card-inner-container', {
    extend: 'default',
    isComponent: (el: HTMLElement) => el.classList?.contains('usa-card__container'),
    model: {
      defaults: {
        tagName: 'div',
        type: 'card-inner-container',
        name: 'Card Inner Container',
        draggable: false,
        droppable: true,
        removable: false,
        copyable: false,
        classes: ['usa-card__container'],
      },
    },
  });

  // Card body
  Components.addType('card-body', {
    extend: 'default',
    isComponent: (el: HTMLElement) => el.classList?.contains('usa-card__body'),
    model: {
      defaults: {
        tagName: 'div',
        type: 'card-body',
        name: 'Card Body',
        draggable: false,
        droppable: true,
        removable: false,
        copyable: false,
        classes: ['usa-card__body'],
      },
    },
  });
}

/**
 * Register text block components (paragraphs, headings)
 */
function registerTextComponents(Components: any): void {
  // Paragraph - extends built-in 'text' type for proper RTE support
  Components.addType('text-block', {
    extend: 'text',
    isComponent: (el: HTMLElement) => el.tagName === 'P',
    model: {
      defaults: {
        tagName: 'p',
        name: 'Text',
        draggable: true,
        droppable: false,
        removable: true,
        copyable: true,
        editable: true,
        selectable: true,
        hoverable: true,
        textable: true,
      },
    },
  });

  // Headings - extends built-in 'text' type for proper RTE support
  Components.addType('heading-block', {
    extend: 'text',
    isComponent: (el: HTMLElement) => /^H[1-6]$/.test(el.tagName),
    model: {
      defaults: {
        tagName: 'h2',
        name: 'Heading',
        draggable: true,
        droppable: false,
        removable: true,
        copyable: true,
        editable: true,
        selectable: true,
        hoverable: true,
        textable: true,
        traits: [
          {
            type: 'select',
            name: 'heading-level',
            label: 'Heading Size',
            default: 'h2',
            options: [
              { id: 'h1', label: 'Heading 1 (Largest)' },
              { id: 'h2', label: 'Heading 2' },
              { id: 'h3', label: 'Heading 3' },
              { id: 'h4', label: 'Heading 4' },
              { id: 'h5', label: 'Heading 5' },
              { id: 'h6', label: 'Heading 6 (Smallest)' },
            ],
          },
        ],
      },
      init(this: any) {
        // Set initial heading level based on actual tagName
        const tagName = this.get('tagName')?.toLowerCase() || 'h2';
        this.set('heading-level', tagName);

        // Listen for heading-level trait changes
        this.on('change:heading-level', this.handleHeadingLevelChange);
      },
      handleHeadingLevelChange(this: any) {
        const newLevel = this.get('heading-level');
        if (newLevel && /^h[1-6]$/.test(newLevel)) {
          // Update the tagName
          this.set('tagName', newLevel);

          // Force re-render by replacing the element
          const el = this.getEl();
          if (el && el.parentNode) {
            const newEl = document.createElement(newLevel);
            newEl.innerHTML = el.innerHTML;
            // Copy classes
            newEl.className = el.className;
            // Copy attributes
            for (let i = 0; i < el.attributes.length; i++) {
              const attr = el.attributes[i];
              if (attr.name !== 'class') {
                newEl.setAttribute(attr.name, attr.value);
              }
            }
            el.parentNode.replaceChild(newEl, el);
            // Update the component's element reference
            this.set('el', newEl);
          }
        }
      },
    },
  });
}

/**
 * Override default component type to ensure children are selectable
 */
function overrideDefaultComponent(Components: any): void {
  const defaultType = Components.getType('default');
  if (defaultType) {
    Components.addType('default', {
      ...defaultType,
      model: {
        defaults: {
          ...defaultType.model?.prototype?.defaults,
          selectable: true,
          hoverable: true,
          removable: true,
        },
      },
    });
  }
}

/**
 * GrapesJS plugin to apply USWDS styling to tables
 *
 * Extends the tableComponent plugin to add USWDS classes and traits.
 */
export function uswdsTablePlugin(editor: EditorInstance): void {
  const Components = editor.Components || editor.DomComponents;

  // Extend the table component type to add USWDS class and traits
  const originalTableType = Components.getType('table');
  if (originalTableType) {
    Components.addType('table', {
      model: {
        defaults: {
          ...originalTableType.model?.prototype?.defaults,
          classes: ['usa-table'],
          traits: [
            {
              name: 'table-variant',
              label: 'Variant',
              type: 'select',
              default: 'default',
              options: [
                { id: 'default', label: 'Default' },
                { id: 'borderless', label: 'Borderless' },
              ],
            },
            {
              name: 'table-striped',
              label: 'Striped Rows',
              type: 'checkbox',
              default: false,
            },
            {
              name: 'table-compact',
              label: 'Compact',
              type: 'checkbox',
              default: false,
            },
            {
              name: 'table-stacked',
              label: 'Stacked (Mobile)',
              type: 'select',
              default: 'none',
              options: [
                { id: 'none', label: 'None' },
                { id: 'stacked', label: 'Always Stacked' },
                { id: 'stacked-header', label: 'Stacked with Header' },
              ],
            },
          ],
        },
        init(this: any) {
          // Apply USWDS class on init
          this.addClass('usa-table');

          // Listen for trait changes
          this.on('change:attributes:table-variant', this.updateTableClasses);
          this.on('change:attributes:table-striped', this.updateTableClasses);
          this.on('change:attributes:table-compact', this.updateTableClasses);
          this.on('change:attributes:table-stacked', this.updateTableClasses);
        },
        updateTableClasses(this: any) {
          const attrs = this.getAttributes();
          const classes = ['usa-table'];

          if (attrs['table-variant'] === 'borderless') {
            classes.push('usa-table--borderless');
          }
          if (attrs['table-striped'] === true || attrs['table-striped'] === 'true') {
            classes.push('usa-table--striped');
          }
          if (attrs['table-compact'] === true || attrs['table-compact'] === 'true') {
            classes.push('usa-table--compact');
          }
          if (attrs['table-stacked'] === 'stacked') {
            classes.push('usa-table--stacked');
          } else if (attrs['table-stacked'] === 'stacked-header') {
            classes.push('usa-table--stacked-header');
          }

          // Update classes
          this.setClass(classes);
        },
      },
    });
  }

  debug('USWDS table styling plugin initialized');
}
