/**
 * Shared block generation for GrapesJS editor panels.
 *
 * Used by both the prototype Editor and the isolated SymbolEditor
 * to produce the drag-and-drop component blocks from the adapter's
 * DEFAULT_CONTENT and COMPONENT_ICONS registries.
 */

import { DEFAULT_CONTENT, COMPONENT_ICONS } from '@uswds-pt/adapter';

/**
 * Static mapping from block-panel category name to the component tag names
 * it contains. Allocated once at module scope.
 */
const CATEGORY_MAP: Record<string, string[]> = {
  'Basics': ['heading', 'text'],
  'Containers': ['form-container', 'section-container', 'fieldset'],
  'Actions': ['usa-button', 'usa-button-group', 'usa-link', 'usa-search'],
  'Form Controls': ['usa-text-input', 'usa-textarea', 'usa-select', 'usa-checkbox', 'checkbox-group', 'usa-radio', 'radio-group', 'usa-date-picker', 'usa-time-picker', 'usa-file-input', 'usa-combo-box', 'usa-range-slider', 'usa-character-count', 'usa-memorable-date'],
  'Navigation': ['usa-breadcrumb', 'usa-pagination', 'usa-side-navigation', 'usa-header', 'usa-footer', 'usa-skip-link', 'usa-in-page-navigation', 'usa-language-selector'],
  'Data Display': ['usa-card', 'usa-table', 'usa-tag', 'usa-list', 'usa-icon', 'usa-collection', 'usa-summary-box'],
  'Feedback': ['usa-alert', 'usa-banner', 'usa-site-alert', 'usa-modal', 'usa-tooltip'],
  'Page Layouts': ['grid-2-col', 'grid-3-col', 'grid-4-col', 'grid-sidebar-left', 'grid-sidebar-right'],
  'Layout': ['usa-accordion', 'usa-step-indicator', 'usa-process-list', 'usa-identifier', 'usa-prose'],
  'Patterns': ['usa-name-pattern', 'usa-address-pattern', 'usa-phone-number-pattern', 'usa-email-address-pattern', 'usa-date-of-birth-pattern', 'usa-ssn-pattern'],
  'Templates': ['blank-template', 'landing-template', 'form-template', 'sign-in-template', 'error-template'],
};

/**
 * Friendly display labels for component tag names that don't follow the
 * standard `usa-*` naming convention.
 */
const LABEL_MAP: Record<string, string> = {
  'heading': 'Heading',
  'text': 'Text',
  'form-container': 'Form',
  'section-container': 'Section',
  'grid-2-col': '2 Columns',
  'grid-3-col': '3 Columns',
  'grid-4-col': '4 Columns',
  'grid-sidebar-left': 'Sidebar Left',
  'grid-sidebar-right': 'Sidebar Right',
  'grid-container': 'Container',
  'grid-row': 'Row',
};

/**
 * Maps a component tag name (e.g., "usa-button") to its block-panel category
 * (e.g., "Actions"). Falls back to "Components" for any unrecognized tag.
 */
function getCategoryForComponent(tagName: string): string {
  for (const [category, components] of Object.entries(CATEGORY_MAP)) {
    if (components.includes(tagName)) {
      return category;
    }
  }
  return 'Components';
}

export interface EditorBlock {
  id: string;
  label: string;
  content: string;
  media: string;
  category: string;
}

/**
 * Generate the full list of USWDS component blocks for the editor.
 *
 * This is a pure function with no dependencies — safe to call in useMemo
 * with an empty dependency array.
 */
export function generateBlocks(): EditorBlock[] {
  return Object.entries(DEFAULT_CONTENT).map(([tagName, content]) => {
    const isFullHtml = content.startsWith('__FULL_HTML__');
    const blockContent = isFullHtml
      ? content.replace('__FULL_HTML__', '')
      : `<${tagName}>${content}</${tagName}>`;

    const label = LABEL_MAP[tagName] || tagName.replace('usa-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return {
      id: tagName,
      label,
      content: blockContent,
      media: COMPONENT_ICONS[tagName] || COMPONENT_ICONS['default'],
      category: getCategoryForComponent(tagName),
    };
  });
}
