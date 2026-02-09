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
  // Grid container — classes must be in defaults so GrapesJS persists
  // them through serialization and editor.getHtml() includes them.
  Components.addType('grid-container', {
    isComponent: (el: HTMLElement) => el.classList?.contains('grid-container'),
    model: {
      defaults: {
        tagName: 'div',
        name: 'Grid Container',
        classes: ['grid-container'],
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
        classes: ['grid-row'],
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
      // Preserve grid-col-* classes from the parsed element
      init(this: any) {
        const el = this.getEl?.();
        if (el?.classList) {
          const gridClasses = Array.from(el.classList as Iterable<string>).filter((cls) => cls.startsWith('grid-col'));
          if (gridClasses.length > 0) {
            gridClasses.forEach((cls: string) => this.addClass(cls));
          }
        }
      },
    },
  });
}
