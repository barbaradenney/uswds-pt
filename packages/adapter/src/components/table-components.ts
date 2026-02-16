/**
 * Table Components
 *
 * Registers the usa-table component with all its traits:
 * caption, striped, borderless, compact, stacked, col-count, row-count,
 * dynamic header traits, and dynamic cell traits.
 */

import type { ComponentRegistration, UnifiedTrait, TraitValue } from './shared-utils.js';
import type { RegistryLike } from './shared-utils.js';
import { coerceBoolean, traitStr } from './shared-utils.js';
import type { GrapesComponentModel } from '../types.js';
import { escapeHtml, createDebugLogger } from '@uswds-pt/shared';

const debug = createDebugLogger('TableComponents');

// Helper to rebuild table HTML from attributes
function rebuildTable(element: HTMLElement): void {
  const colCount = Math.min(10, Math.max(1, parseInt(element.getAttribute('col-count') || '3', 10)));
  const rowCount = Math.min(20, Math.max(1, parseInt(element.getAttribute('row-count') || '3', 10)));
  const caption = element.getAttribute('caption') || '';
  const striped = element.hasAttribute('striped');
  const borderless = element.hasAttribute('borderless');
  const compact = element.hasAttribute('compact');
  const stacked = element.getAttribute('stacked') || 'none';

  // Build class list
  let className = 'usa-table';
  if (striped) className += ' usa-table--striped';
  if (borderless) className += ' usa-table--borderless';
  if (compact) className += ' usa-table--compact';
  if (stacked === 'header') className += ' usa-table--stacked-header';
  else if (stacked === 'default') className += ' usa-table--stacked';

  // Build header cells
  const headers: string[] = [];
  for (let c = 1; c <= colCount; c++) {
    headers.push(element.getAttribute(`header${c}`) || `Column ${c}`);
  }

  // Build data rows
  const rows: string[][] = [];
  for (let r = 1; r <= rowCount; r++) {
    const row: string[] = [];
    for (let c = 1; c <= colCount; c++) {
      row.push(element.getAttribute(`row${r}-col${c}`) || '');
    }
    rows.push(row);
  }

  // Render table HTML (escape user content to prevent XSS)
  const captionHtml = caption ? `<caption>${escapeHtml(caption)}</caption>` : '';
  const theadHtml = `<thead><tr>${headers.map(h => `<th scope="col">${escapeHtml(h)}</th>`).join('')}</tr></thead>`;
  const tbodyHtml = `<tbody>${rows.map(row =>
    `<tr>${row.map((cell, ci) => ci === 0 ? `<th scope="row">${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
  ).join('')}</tbody>`;

  element.innerHTML = `<div class="usa-table-container--scrollable" tabindex="0"><table class="${escapeHtml(className)}">${captionHtml}${theadHtml}${tbodyHtml}</table></div>`;
}

// Helper to create a header trait
function createTableHeaderTrait(colIndex: number): UnifiedTrait {
  const attrName = `header${colIndex}`;
  const defaultValue = `Column ${colIndex}`;

  const visibleFn = (component: GrapesComponentModel) => {
    try {
      if (!component) return true;
      const count = parseInt((component.getAttributes?.() ?? {})['col-count'] || '3', 10);
      return colIndex <= count;
    } catch (e) {
      debug('Failed to check table header trait visibility:', e);
      return true;
    }
  };

  return {
    definition: {
      name: attrName,
      label: `Header ${colIndex}`,
      type: 'text',
      default: defaultValue,
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: TraitValue) => {
        element.setAttribute(attrName, traitStr(value));
        rebuildTable(element);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

// Helper to create a cell trait
function createTableCellTrait(rowIndex: number, colIndex: number): UnifiedTrait {
  const attrName = `row${rowIndex}-col${colIndex}`;
  const defaultValue = '';

  const visibleFn = (component: GrapesComponentModel) => {
    try {
      if (!component) return true;
      const colCount = parseInt((component.getAttributes?.() ?? {})['col-count'] || '3', 10);
      const rowCount = parseInt((component.getAttributes?.() ?? {})['row-count'] || '3', 10);
      return rowIndex <= rowCount && colIndex <= colCount;
    } catch (e) {
      debug('Failed to check table cell trait visibility:', e);
      return true;
    }
  };

  return {
    definition: {
      name: attrName,
      label: `Row ${rowIndex}, Col ${colIndex}`,
      type: 'text',
      default: defaultValue,
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: TraitValue) => {
        element.setAttribute(attrName, traitStr(value));
        rebuildTable(element);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

export function registerTableComponents(registry: RegistryLike): void {
registry.register({
  tagName: 'usa-table',
  droppable: false,

  traits: {
    // Caption
    caption: {
      definition: {
        name: 'caption',
        label: 'Caption',
        type: 'text',
        default: 'Table caption',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute('caption', traitStr(value));
          rebuildTable(element);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('caption') || '';
        },
      },
    },

    // Striped rows
    striped: {
      definition: {
        name: 'striped',
        label: 'Striped Rows',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          if (coerceBoolean(value)) {
            element.setAttribute('striped', '');
          } else {
            element.removeAttribute('striped');
          }
          rebuildTable(element);
        },
        getValue: (element: HTMLElement) => {
          return element.hasAttribute('striped');
        },
      },
    },

    // Borderless
    borderless: {
      definition: {
        name: 'borderless',
        label: 'Borderless',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          if (coerceBoolean(value)) {
            element.setAttribute('borderless', '');
          } else {
            element.removeAttribute('borderless');
          }
          rebuildTable(element);
        },
        getValue: (element: HTMLElement) => {
          return element.hasAttribute('borderless');
        },
      },
    },

    // Compact
    compact: {
      definition: {
        name: 'compact',
        label: 'Compact',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          if (coerceBoolean(value)) {
            element.setAttribute('compact', '');
          } else {
            element.removeAttribute('compact');
          }
          rebuildTable(element);
        },
        getValue: (element: HTMLElement) => {
          return element.hasAttribute('compact');
        },
      },
    },

    // Stacked variant
    stacked: {
      definition: {
        name: 'stacked',
        label: 'Stacked (Mobile)',
        type: 'select',
        default: 'none',
        options: [
          { id: 'none', label: 'None' },
          { id: 'header', label: 'Stacked Header' },
          { id: 'default', label: 'Stacked' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute('stacked', traitStr(value, 'none'));
          rebuildTable(element);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('stacked') || 'none';
        },
      },
    },

    // Column count
    'col-count': {
      definition: {
        name: 'col-count',
        label: 'Columns',
        type: 'select',
        default: '3',
        options: [
          { id: '2', label: '2' },
          { id: '3', label: '3' },
          { id: '4', label: '4' },
          { id: '5', label: '5' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute('col-count', traitStr(value, '3'));
          rebuildTable(element);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('col-count') || '3';
        },
      },
    },

    // Row count
    'row-count': {
      definition: {
        name: 'row-count',
        label: 'Rows',
        type: 'select',
        default: '3',
        options: [
          { id: '2', label: '2' },
          { id: '3', label: '3' },
          { id: '4', label: '4' },
          { id: '5', label: '5' },
          { id: '6', label: '6' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute('row-count', traitStr(value, '3'));
          rebuildTable(element);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('row-count') || '3';
        },
      },
    },

    // Header traits (up to 5 columns)
    header1: createTableHeaderTrait(1),
    header2: createTableHeaderTrait(2),
    header3: createTableHeaderTrait(3),
    header4: createTableHeaderTrait(4),
    header5: createTableHeaderTrait(5),

    // Row data traits (up to 6 rows x 5 cols)
    'row1-col1': createTableCellTrait(1, 1),
    'row1-col2': createTableCellTrait(1, 2),
    'row1-col3': createTableCellTrait(1, 3),
    'row1-col4': createTableCellTrait(1, 4),
    'row1-col5': createTableCellTrait(1, 5),
    'row2-col1': createTableCellTrait(2, 1),
    'row2-col2': createTableCellTrait(2, 2),
    'row2-col3': createTableCellTrait(2, 3),
    'row2-col4': createTableCellTrait(2, 4),
    'row2-col5': createTableCellTrait(2, 5),
    'row3-col1': createTableCellTrait(3, 1),
    'row3-col2': createTableCellTrait(3, 2),
    'row3-col3': createTableCellTrait(3, 3),
    'row3-col4': createTableCellTrait(3, 4),
    'row3-col5': createTableCellTrait(3, 5),
    'row4-col1': createTableCellTrait(4, 1),
    'row4-col2': createTableCellTrait(4, 2),
    'row4-col3': createTableCellTrait(4, 3),
    'row4-col4': createTableCellTrait(4, 4),
    'row4-col5': createTableCellTrait(4, 5),
    'row5-col1': createTableCellTrait(5, 1),
    'row5-col2': createTableCellTrait(5, 2),
    'row5-col3': createTableCellTrait(5, 3),
    'row5-col4': createTableCellTrait(5, 4),
    'row5-col5': createTableCellTrait(5, 5),
    'row6-col1': createTableCellTrait(6, 1),
    'row6-col2': createTableCellTrait(6, 2),
    'row6-col3': createTableCellTrait(6, 3),
    'row6-col4': createTableCellTrait(6, 4),
    'row6-col5': createTableCellTrait(6, 5),
  },
});

}
