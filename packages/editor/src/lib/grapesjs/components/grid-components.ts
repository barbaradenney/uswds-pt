/**
 * Grid Layout Component Types
 *
 * Registers GrapesJS component types for USWDS grid layout:
 * - grid-container: Outer container with max-width
 * - grid-row: Flexbox row container
 * - grid-col: Column with responsive width classes
 */

import { containerDefaults } from '../component-defaults';

interface ComponentsAPI {
  addType(name: string, config: unknown): void;
}

/**
 * Register grid layout component types
 */
export function registerGridComponents(Components: ComponentsAPI): void {
  // Grid container
  Components.addType('grid-container', {
    isComponent: (el: HTMLElement) => el.classList?.contains('grid-container'),
    model: {
      defaults: {
        tagName: 'div',
        name: 'Grid Container',
        ...containerDefaults,
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
        ...containerDefaults,
      },
    },
  });

  // Grid columns (match grid-col-* classes)
  Components.addType('grid-col', {
    isComponent: (el: HTMLElement) => {
      if (!el.classList) return false;
      return Array.from(el.classList).some((cls) => cls.startsWith('grid-col'));
    },
    model: {
      defaults: {
        tagName: 'div',
        name: 'Grid Column',
        ...containerDefaults,
        highlightable: true,
        layerable: true,
        editable: true,
      },
    },
  });
}
