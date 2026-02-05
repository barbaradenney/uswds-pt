/**
 * USWDS Table Plugin
 *
 * Extends the GrapesJS table component to add USWDS styling classes and traits.
 * Adds support for:
 * - Borderless variant
 * - Striped rows
 * - Compact spacing
 * - Stacked (mobile) layouts
 */

import { createDebugLogger } from '@uswds-pt/shared';
import type { EditorInstance } from '../../../types/grapesjs';

const debug = createDebugLogger('TablePlugin');

/**
 * Table variant options
 */
const tableVariantOptions = [
  { id: 'default', label: 'Default' },
  { id: 'borderless', label: 'Borderless' },
];

/**
 * Table stacked options for mobile layouts
 */
const tableStackedOptions = [
  { id: 'none', label: 'None' },
  { id: 'stacked', label: 'Always Stacked' },
  { id: 'stacked-header', label: 'Stacked with Header' },
];

/**
 * USWDS table traits configuration
 */
const tableTraits = [
  {
    name: 'table-variant',
    label: 'Variant',
    type: 'select',
    default: 'default',
    options: tableVariantOptions,
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
    options: tableStackedOptions,
  },
];

/**
 * GrapesJS plugin to apply USWDS styling to tables
 *
 * Extends the tableComponent plugin to add USWDS classes and traits.
 */
export function uswdsTablePlugin(editor: EditorInstance): void {
  const Components = editor.Components || editor.DomComponents;

  // Extend the table component type to add USWDS class and traits
  const originalTableType = Components.getType('table');
  if (!originalTableType) {
    debug('Table component type not found, skipping USWDS table plugin');
    return;
  }

  Components.addType('table', {
    model: {
      defaults: {
        ...originalTableType.model?.prototype?.defaults,
        classes: ['usa-table'],
        traits: tableTraits,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      init(this: any) {
        // Apply USWDS class on init
        this.addClass('usa-table');

        // Listen for trait changes
        this.on('change:attributes:table-variant', this.updateTableClasses);
        this.on('change:attributes:table-striped', this.updateTableClasses);
        this.on('change:attributes:table-compact', this.updateTableClasses);
        this.on('change:attributes:table-stacked', this.updateTableClasses);
      },
      /**
       * Update table classes based on trait values
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  debug('USWDS table styling plugin initialized');
}

/**
 * Table component model interface
 */
interface TableComponentModel {
  addClass(className: string): void;
  setClass(classes: string[]): void;
  getAttributes(): Record<string, unknown>;
  on(event: string, handler: () => void): void;
}
