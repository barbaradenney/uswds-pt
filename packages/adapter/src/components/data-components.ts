/**
 * Data Display Components
 *
 * Registers data display components:
 * usa-card, usa-tag, usa-table, usa-icon, usa-list, usa-collection, usa-summary-box
 */

import type { ComponentRegistration, UnifiedTrait, TraitValue } from './shared-utils.js';
import {
  coerceBoolean,
  hasAttributeTrue,
  createBooleanTrait,
  traitStr,
} from './shared-utils.js';
import type { GrapesComponentModel } from '../types.js';
import { escapeHtml, createDebugLogger } from '@uswds-pt/shared';
import type { USWDSElement } from '@uswds-pt/shared';

const debug = createDebugLogger('DataComponents');

/**
 * Registry interface to avoid circular imports.
 */
interface RegistryLike {
  register(registration: ComponentRegistration): void;
}

export function registerDataComponents(registry: RegistryLike): void {
// ============================================================================

/**
 * USA Card Component
 *
 * A flexible card component for displaying content with optional media.
 */
registry.register({
  tagName: 'usa-card',
  droppable: false,

  traits: {
    // Heading - card title
    heading: {
      definition: {
        name: 'heading',
        label: 'Heading',
        type: 'text',
        default: 'Card Title',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value);
          element.setAttribute('heading', text);
          (element as USWDSElement).heading = text;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).heading || element.getAttribute('heading') || '';
        },
      },
    },

    // Text - card body content
    text: {
      definition: {
        name: 'text',
        label: 'Body Text',
        type: 'textarea',
        default: 'Card content goes here.',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value);
          element.setAttribute('text', text);
          (element as USWDSElement).text = text;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).text || element.getAttribute('text') || '';
        },
      },
    },

    // Heading level
    'heading-level': {
      definition: {
        name: 'heading-level',
        label: 'Heading Level',
        type: 'select',
        default: '3',
        options: [
          { id: '1', label: 'H1' },
          { id: '2', label: 'H2' },
          { id: '3', label: 'H3' },
          { id: '4', label: 'H4' },
          { id: '5', label: 'H5' },
          { id: '6', label: 'H6' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const level = traitStr(value, '3');
          element.setAttribute('heading-level', level);
          (element as USWDSElement).headingLevel = level;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).headingLevel || element.getAttribute('heading-level') || '3';
        },
      },
    },

    // Media type - with auto-placeholder when switching types
    'media-type': {
      definition: {
        name: 'media-type',
        label: 'Media Type',
        type: 'select',
        default: 'none',
        options: [
          { id: 'none', label: 'None' },
          { id: 'image', label: 'Image' },
          { id: 'video', label: 'Video' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const mediaType = traitStr(value, 'none');
          element.setAttribute('media-type', mediaType);
          (element as USWDSElement).mediaType = mediaType;

          // Auto-set placeholder media when switching to image/video if no src set
          const currentSrc = element.getAttribute('media-src') || '';
          if (mediaType === 'image' && !currentSrc) {
            const placeholderImage = 'https://picsum.photos/800/450';
            element.setAttribute('media-src', placeholderImage);
            (element as USWDSElement).mediaSrc = placeholderImage;
            element.setAttribute('media-alt', 'Placeholder image');
            (element as USWDSElement).mediaAlt = 'Placeholder image';
          } else if (mediaType === 'video' && !currentSrc) {
            // Use a public domain sample video
            const placeholderVideo = 'https://www.w3schools.com/html/mov_bbb.mp4';
            element.setAttribute('media-src', placeholderVideo);
            (element as USWDSElement).mediaSrc = placeholderVideo;
            element.setAttribute('media-alt', 'Sample video');
            (element as USWDSElement).mediaAlt = 'Sample video';
          }

          // Trigger re-render
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('media-type') || 'none';
        },
      },
    },

    // Media source URL
    'media-src': {
      definition: {
        name: 'media-src',
        label: 'Media URL',
        type: 'text',
        default: '',
        placeholder: 'https://example.com/image.jpg',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute('media-src', traitStr(value));
          (element as USWDSElement).mediaSrc = traitStr(value);
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('media-src') || '';
        },
      },
    },

    // Media alt text
    'media-alt': {
      definition: {
        name: 'media-alt',
        label: 'Media Alt Text',
        type: 'text',
        default: '',
        placeholder: 'Image description',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute('media-alt', traitStr(value));
          (element as USWDSElement).mediaAlt = traitStr(value);
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('media-alt') || '';
        },
      },
    },

    // Media position
    'media-position': {
      definition: {
        name: 'media-position',
        label: 'Media Position',
        type: 'select',
        default: 'inset',
        options: [
          { id: 'inset', label: 'Inset' },
          { id: 'exdent', label: 'Exdent' },
          { id: 'right', label: 'Right (Flag)' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const position = traitStr(value, 'inset');
          element.setAttribute('media-position', position);
          (element as USWDSElement).mediaPosition = position;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).mediaPosition || element.getAttribute('media-position') || 'inset';
        },
      },
    },

    // Flag layout (horizontal)
    'flag-layout': {
      definition: {
        name: 'flag-layout',
        label: 'Flag Layout (Horizontal)',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('flag-layout', '');
          } else {
            element.removeAttribute('flag-layout');
          }
          (element as USWDSElement).flagLayout = isEnabled;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).flagLayout || element.hasAttribute('flag-layout');
        },
      },
    },

    // Header first
    'header-first': {
      definition: {
        name: 'header-first',
        label: 'Header Before Media',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('header-first', '');
          } else {
            element.removeAttribute('header-first');
          }
          (element as USWDSElement).headerFirst = isEnabled;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).headerFirst || element.hasAttribute('header-first');
        },
      },
    },

    // Footer text
    'footer-text': {
      definition: {
        name: 'footer-text',
        label: 'Footer Text',
        type: 'text',
        default: '',
        placeholder: 'Optional footer content',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value);
          element.setAttribute('footer-text', text);
          (element as USWDSElement).footerText = text;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).footerText || element.getAttribute('footer-text') || '';
        },
      },
    },

    // Actionable - entire card is clickable
    actionable: {
      definition: {
        name: 'actionable',
        label: 'Clickable Card',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('actionable', '');
          } else {
            element.removeAttribute('actionable');
          }
          (element as USWDSElement).actionable = isEnabled;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).actionable || element.hasAttribute('actionable');
        },
      },
    },

    // Link URL for actionable cards
    href: {
      definition: {
        name: 'href',
        label: 'Link URL',
        type: 'text',
        default: '',
        placeholder: 'https://...',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const url = traitStr(value);
          if (url) {
            element.setAttribute('href', url);
          } else {
            element.removeAttribute('href');
          }
          (element as USWDSElement).href = url;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).href || element.getAttribute('href') || '';
        },
      },
    },

    // Link target
    target: {
      definition: {
        name: 'target',
        label: 'Link Target',
        type: 'select',
        default: '_self',
        options: [
          { id: '_self', label: 'Same Window' },
          { id: '_blank', label: 'New Window' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const target = traitStr(value, '_self');
          if (target && target !== '_self') {
            element.setAttribute('target', target);
          } else {
            element.removeAttribute('target');
          }
          (element as USWDSElement).target = target;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).target || element.getAttribute('target') || '_self';
        },
      },
    },
  },
});

/**
 * USA Tag Component
 *
 * A small label for categorizing or marking items.
 */
registry.register({
  tagName: 'usa-tag',
  droppable: false,

  traits: {
    // Text content
    text: {
      definition: {
        name: 'text',
        label: 'Tag Text',
        type: 'text',
        default: 'Tag',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value, 'Tag');
          element.setAttribute('text', text);
          (element as USWDSElement).text = text;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).text || element.getAttribute('text') || 'Tag';
        },
      },
    },

    // Big variant
    big: {
      definition: {
        name: 'big',
        label: 'Large Size',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('big', '');
          } else {
            element.removeAttribute('big');
          }
          (element as USWDSElement).big = isEnabled;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).big || element.hasAttribute('big');
        },
      },
    },
  },
});

/**
 * USA Table Component
 *
 * Data table with USWDS styling. Supports striped, borderless, compact, and stacked variants.
 * Uses attribute-based header/row data (same pattern as usa-list).
 */

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

/**
 * USA Icon Component
 *
 * USWDS icons for visual communication.
 * Supports all USWDS icons with configurable size and accessibility options.
 */
registry.register({
  tagName: 'usa-icon',
  droppable: false,

  traits: {
    // Icon name - the USWDS icon identifier
    name: {
      definition: {
        name: 'name',
        label: 'Icon',
        type: 'select',
        default: 'info',
        options: [
          // Status & Feedback
          { id: 'info', label: 'Info' },
          { id: 'check_circle', label: 'Check Circle' },
          { id: 'error', label: 'Error' },
          { id: 'warning', label: 'Warning' },
          { id: 'help', label: 'Help' },
          { id: 'cancel', label: 'Cancel' },
          // Navigation & Actions
          { id: 'arrow_forward', label: 'Arrow Forward' },
          { id: 'arrow_back', label: 'Arrow Back' },
          { id: 'arrow_upward', label: 'Arrow Upward' },
          { id: 'arrow_downward', label: 'Arrow Downward' },
          { id: 'expand_more', label: 'Expand More' },
          { id: 'expand_less', label: 'Expand Less' },
          { id: 'navigate_next', label: 'Navigate Next' },
          { id: 'navigate_before', label: 'Navigate Before' },
          { id: 'first_page', label: 'First Page' },
          { id: 'last_page', label: 'Last Page' },
          // Common UI
          { id: 'search', label: 'Search' },
          { id: 'close', label: 'Close' },
          { id: 'menu', label: 'Menu' },
          { id: 'settings', label: 'Settings' },
          { id: 'home', label: 'Home' },
          { id: 'lock', label: 'Lock' },
          { id: 'lock_open', label: 'Lock Open' },
          { id: 'visibility', label: 'Visibility' },
          { id: 'visibility_off', label: 'Visibility Off' },
          { id: 'edit', label: 'Edit' },
          { id: 'delete', label: 'Delete' },
          { id: 'add', label: 'Add' },
          { id: 'remove', label: 'Remove' },
          // Files & Documents
          { id: 'file_download', label: 'File Download' },
          { id: 'file_upload', label: 'File Upload' },
          { id: 'file_present', label: 'File Present' },
          { id: 'attach_file', label: 'Attach File' },
          { id: 'content_copy', label: 'Content Copy' },
          { id: 'print', label: 'Print' },
          // Communication
          { id: 'mail', label: 'Mail' },
          { id: 'phone', label: 'Phone' },
          { id: 'chat', label: 'Chat' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'share', label: 'Share' },
          // People & Account
          { id: 'person', label: 'Person' },
          { id: 'people', label: 'People' },
          { id: 'account_circle', label: 'Account Circle' },
          { id: 'groups', label: 'Groups' },
          // Location & Maps
          { id: 'location_on', label: 'Location' },
          { id: 'directions', label: 'Directions' },
          { id: 'map', label: 'Map' },
          { id: 'near_me', label: 'Near Me' },
          // Time & Calendar
          { id: 'schedule', label: 'Schedule' },
          { id: 'event', label: 'Event' },
          { id: 'today', label: 'Today' },
          { id: 'access_time', label: 'Access Time' },
          // Data & Analytics
          { id: 'assessment', label: 'Assessment' },
          { id: 'trending_up', label: 'Trending Up' },
          { id: 'trending_down', label: 'Trending Down' },
          { id: 'bar_chart', label: 'Bar Chart' },
          // Government & Official
          { id: 'flag', label: 'Flag' },
          { id: 'account_balance', label: 'Account Balance' },
          { id: 'gavel', label: 'Gavel' },
          { id: 'verified', label: 'Verified' },
          { id: 'security', label: 'Security' },
          // Misc
          { id: 'favorite', label: 'Favorite' },
          { id: 'star', label: 'Star' },
          { id: 'thumb_up', label: 'Thumb Up' },
          { id: 'thumb_down', label: 'Thumb Down' },
          { id: 'link', label: 'Link' },
          { id: 'launch', label: 'Launch' },
          { id: 'logout', label: 'Logout' },
          { id: 'login', label: 'Login' },
        ],
        category: { id: 'icon', label: 'Icon' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const name = traitStr(value, 'info');
          element.setAttribute('name', name);
          (element as USWDSElement).name = name;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).name || element.getAttribute('name') || 'info';
        },
      },
    },

    // Size - USWDS icon size classes
    size: {
      definition: {
        name: 'size',
        label: 'Size',
        type: 'select',
        default: '',
        options: [
          { id: 'default', label: 'Default' },
          { id: '3', label: 'Size 3 (24px)' },
          { id: '4', label: 'Size 4 (32px)' },
          { id: '5', label: 'Size 5 (40px)' },
          { id: '6', label: 'Size 6 (48px)' },
          { id: '7', label: 'Size 7 (56px)' },
          { id: '8', label: 'Size 8 (64px)' },
          { id: '9', label: 'Size 9 (72px)' },
        ],
        category: { id: 'icon', label: 'Icon' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          if (value && value !== '') {
            element.setAttribute('size', traitStr(value));
          } else {
            element.removeAttribute('size');
          }
          (element as USWDSElement).size = traitStr(value);
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).size || element.getAttribute('size') || '';
        },
      },
    },

    // Aria Label - for accessible icons
    'aria-label': {
      definition: {
        name: 'aria-label',
        label: 'Accessible Label',
        type: 'text',
        default: '',
        placeholder: 'Describe the icon for screen readers',
        category: { id: 'accessibility', label: 'Accessibility' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const label = String(value ?? '').trim() || '';
          if (label) {
            element.setAttribute('aria-label', label);
          } else {
            element.removeAttribute('aria-label');
          }
          (element as USWDSElement).ariaLabel = label;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).ariaLabel || element.getAttribute('aria-label') || '';
        },
      },
    },

    // Decorative - mark icon as decorative (hidden from screen readers)
    decorative: {
      definition: {
        name: 'decorative',
        label: 'Decorative Only',
        type: 'checkbox',
        default: false,
        category: { id: 'accessibility', label: 'Accessibility' },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isDecorative = value === true || value === 'true';
          if (isDecorative) {
            element.setAttribute('decorative', 'true');
          } else {
            element.removeAttribute('decorative');
          }
          (element as USWDSElement).decorative = isDecorative ? 'true' : '';
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return hasAttributeTrue(element, 'decorative');
        },
      },
    },
  },
});

/**
 * USA List Component
 *
 * Ordered or unordered list with USWDS styling.
 * Uses dynamic traits for easy editing of list items.
 */

// Helper function to rebuild list items from individual traits
// Uses DOM methods instead of innerHTML to preserve event listeners
function rebuildListItems(element: HTMLElement, count: number): void {
  const type = element.getAttribute('type') || 'unordered';
  const listTag = type === 'ordered' ? 'ol' : 'ul';

  // Find the list element
  const list = element.querySelector(listTag);
  if (!list) {
    // Try to trigger initial render
    if (typeof (element as USWDSElement).requestUpdate === 'function') {
      (element as USWDSElement).requestUpdate?.();
    }
    return;
  }

  // Get existing list items
  const existingItems = list.querySelectorAll('li');
  const existingCount = existingItems.length;

  // Update existing items or create new ones
  for (let i = 1; i <= count; i++) {
    const text = element.getAttribute(`item${i}`) || `Item ${i}`;

    if (i <= existingCount) {
      // Update existing item in place
      existingItems[i - 1].textContent = text;
    } else {
      // Create new item
      const li = document.createElement('li');
      li.textContent = text;
      list.appendChild(li);
    }
  }

  // Remove extra items if count decreased
  for (let i = existingCount; i > count; i--) {
    const li = existingItems[i - 1];
    if (li && li.parentNode) {
      li.parentNode.removeChild(li);
    }
  }
}

// Helper to create a list item trait
function _createListItemTrait(index: number): UnifiedTrait {
  const attrName = `item${index}`;
  const defaultValue = `List item ${index}`;

  // Visibility function - only show if index <= count
  const visibleFn = (component: GrapesComponentModel) => {
    try {
      if (!component) return true;
      const count = parseInt((component.getAttributes?.() ?? {})['count'] || '3', 10);
      return index <= count;
    } catch (e) {
      debug('Failed to check list item trait visibility:', e);
      return true;
    }
  };

  return {
    definition: {
      name: attrName,
      label: `Item ${index}`,
      type: 'text',
      default: defaultValue,
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: TraitValue) => {
        element.setAttribute(attrName, traitStr(value));
        const count = parseInt(element.getAttribute('count') || '3', 10) || 3;
        rebuildListItems(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

registry.register({
  tagName: 'usa-list',
  droppable: false,

  traits: {
    // List type
    type: {
      definition: {
        name: 'type',
        label: 'List Type',
        type: 'select',
        default: 'unordered',
        options: [
          { id: 'unordered', label: 'Bulleted' },
          { id: 'ordered', label: 'Numbered' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute('type', traitStr(value, 'unordered'));
          // Trigger re-render to switch list type
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
          // Rebuild items after type change
          setTimeout(() => {
            const count = parseInt(element.getAttribute('count') || '3', 10) || 3;
            rebuildListItems(element, count);
          }, 100);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('type') || 'unordered';
        },
      },
    },

    // Unstyled variant
    unstyled: createBooleanTrait('unstyled', {
      label: 'Unstyled',
      default: false,
    }),

    // Count - number of list items
    count: {
      definition: {
        name: 'count',
        label: 'Number of Items',
        type: 'select',
        default: '3',
        options: [
          { id: '3', label: '3 Items' },
          { id: '4', label: '4 Items' },
          { id: '5', label: '5 Items' },
          { id: '6', label: '6 Items' },
        ],
      },
      handler: {
        onInit: (element: HTMLElement, value: TraitValue) => {
          const count = Math.max(1, Math.min(10, parseInt(traitStr(value, '3'), 10) || 3));
          element.setAttribute('count', String(count));
          setTimeout(() => rebuildListItems(element, count), 100);
        },
        onChange: (element: HTMLElement, value: TraitValue) => {
          const count = Math.max(1, Math.min(10, parseInt(traitStr(value, '3'), 10) || 3));
          element.setAttribute('count', String(count));
          rebuildListItems(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('count') || '3';
        },
      },
    },
  },
});

/**
 * USA Collection Component
 *
 * A list of related items, like search results or article listings.
 * Uses dynamic traits for easy editing of collection items.
 */

// Helper function to rebuild collection items from individual traits
function rebuildCollectionItems(element: HTMLElement, count: number): void {
  const items: Array<{
    id: string;
    title: string;
    description?: string;
    href?: string;
    date?: string;
  }> = [];

  for (let i = 1; i <= count; i++) {
    const title = element.getAttribute(`item${i}-title`) || `Item ${i}`;
    const description = element.getAttribute(`item${i}-description`) || '';
    const href = element.getAttribute(`item${i}-href`) || '';
    const date = element.getAttribute(`item${i}-date`) || '';

    items.push({
      id: `item-${i}`,
      title,
      description: description || undefined,
      href: href || undefined,
      date: date || undefined,
    });
  }

  // Update the web component's items property
  (element as USWDSElement).items = items;

  // Trigger Lit component re-render
  if (typeof (element as USWDSElement).requestUpdate === 'function') {
    (element as USWDSElement).requestUpdate?.();
  }
}

// Helper to create a collection item trait
function _createCollectionItemTrait(index: number, type: 'title' | 'description' | 'href' | 'date'): UnifiedTrait {
  const attrName = `item${index}-${type}`;
  const isTitle = type === 'title';
  const isDescription = type === 'description';

  const labels: Record<string, string> = {
    title: 'Title',
    description: 'Description',
    href: 'URL',
    date: 'Date',
  };

  const defaults: Record<string, string> = {
    title: `Collection Item ${index}`,
    description: '',
    href: '',
    date: '',
  };

  const defaultValue = defaults[type];

  // Visibility function - only show if index <= count
  const visibleFn = (component: GrapesComponentModel) => {
    try {
      if (!component) return true;
      const count = parseInt((component.getAttributes?.() ?? {})['count'] || '3', 10);
      return index <= count;
    } catch (e) {
      debug('Failed to check collection item trait visibility:', e);
      return true;
    }
  };

  return {
    definition: {
      name: attrName,
      label: `Item ${index} ${labels[type]}`,
      type: isDescription ? 'textarea' : 'text',
      default: defaultValue,
      placeholder: isTitle ? 'Item title' : isDescription ? 'Optional description' : type === 'href' ? 'https://...' : 'YYYY-MM-DD',
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: TraitValue) => {
        element.setAttribute(attrName, traitStr(value));
        const count = parseInt(element.getAttribute('count') || '3', 10) || 3;
        rebuildCollectionItems(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

registry.register({
  tagName: 'usa-collection',
  droppable: false,

  traits: {
    // Count - number of collection items
    count: {
      definition: {
        name: 'count',
        label: 'Number of Items',
        type: 'select',
        default: '3',
        options: [
          { id: '2', label: '2 Items' },
          { id: '3', label: '3 Items' },
          { id: '4', label: '4 Items' },
          { id: '5', label: '5 Items' },
        ],
      },
      handler: {
        onInit: (element: HTMLElement, value: TraitValue) => {
          const count = Math.max(1, Math.min(6, parseInt(traitStr(value, '3'), 10) || 3));
          element.setAttribute('count', String(count));
          setTimeout(() => rebuildCollectionItems(element, count), 100);
        },
        onChange: (element: HTMLElement, value: TraitValue) => {
          const count = Math.max(1, Math.min(6, parseInt(traitStr(value, '3'), 10) || 3));
          element.setAttribute('count', String(count));
          rebuildCollectionItems(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('count') || '3';
        },
      },
    },
  },
});

/**
 * USA Summary Box Component
 *
 * A callout box for highlighting key information.
 */
registry.register({
  tagName: 'usa-summary-box',
  droppable: false,

  traits: {
    // Heading
    heading: {
      definition: {
        name: 'heading',
        label: 'Heading',
        type: 'text',
        default: 'Key Information',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value, 'Key Information');
          element.setAttribute('heading', text);
          (element as USWDSElement).heading = text;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).heading || element.getAttribute('heading') || 'Key Information';
        },
      },
    },

    // Content
    content: {
      definition: {
        name: 'content',
        label: 'Content',
        type: 'textarea',
        default: 'Summary content goes here.',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const text = traitStr(value);
          element.setAttribute('content', text);
          (element as USWDSElement).content = text;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).content || element.getAttribute('content') || '';
        },
      },
    },

    // Heading level
    'heading-level': {
      definition: {
        name: 'heading-level',
        label: 'Heading Level',
        type: 'select',
        default: 'h3',
        options: [
          { id: 'h1', label: 'H1' },
          { id: 'h2', label: 'H2' },
          { id: 'h3', label: 'H3' },
          { id: 'h4', label: 'H4' },
          { id: 'h5', label: 'H5' },
          { id: 'h6', label: 'H6' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const level = traitStr(value, 'h3');
          element.setAttribute('heading-level', level);
          (element as USWDSElement).headingLevel = level;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).headingLevel || element.getAttribute('heading-level') || 'h3';
        },
      },
    },
  },
});

}
