/**
 * List & Collection Components
 *
 * Registers list and collection components:
 * usa-list (ordered/unordered lists) and usa-collection (article/search result listings).
 */

import type { ComponentRegistration, UnifiedTrait, TraitValue } from './shared-utils.js';
import type { RegistryLike } from './shared-utils.js';
import {
  createBooleanTrait,
  traitStr,
  triggerUpdate,
} from './shared-utils.js';
import type { GrapesComponentModel } from '../types.js';
import { createDebugLogger } from '@uswds-pt/shared';
import type { USWDSElement } from '@uswds-pt/shared';

const debug = createDebugLogger('ListComponents');

// ============================================================================
// USA List Helpers
// ============================================================================

// Helper function to rebuild list items from individual traits
// Uses DOM methods instead of innerHTML to preserve event listeners
function rebuildListItems(element: HTMLElement, count: number): void {
  const type = element.getAttribute('type') || 'unordered';
  const listTag = type === 'ordered' ? 'ol' : 'ul';

  // Find the list element
  const list = element.querySelector(listTag);
  if (!list) {
    // Try to trigger initial render
    triggerUpdate(element);
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

// ============================================================================
// USA Collection Helpers
// ============================================================================

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
  triggerUpdate(element);
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

// ============================================================================
// Registration
// ============================================================================

export function registerListComponents(registry: RegistryLike): void {

/**
 * USA List Component
 *
 * Ordered or unordered list with USWDS styling.
 * Uses dynamic traits for easy editing of list items.
 */
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
          triggerUpdate(element);
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

    // Individual list item text traits
    item1: _createListItemTrait(1),
    item2: _createListItemTrait(2),
    item3: _createListItemTrait(3),
    item4: _createListItemTrait(4),
    item5: _createListItemTrait(5),
    item6: _createListItemTrait(6),
  },
});

/**
 * USA Collection Component
 *
 * A list of related items, like search results or article listings.
 * Uses dynamic traits for easy editing of collection items.
 */
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

    // Individual collection item traits (title, description, href, date for each item)
    'item1-title': _createCollectionItemTrait(1, 'title'),
    'item1-description': _createCollectionItemTrait(1, 'description'),
    'item1-href': _createCollectionItemTrait(1, 'href'),
    'item1-date': _createCollectionItemTrait(1, 'date'),
    'item2-title': _createCollectionItemTrait(2, 'title'),
    'item2-description': _createCollectionItemTrait(2, 'description'),
    'item2-href': _createCollectionItemTrait(2, 'href'),
    'item2-date': _createCollectionItemTrait(2, 'date'),
    'item3-title': _createCollectionItemTrait(3, 'title'),
    'item3-description': _createCollectionItemTrait(3, 'description'),
    'item3-href': _createCollectionItemTrait(3, 'href'),
    'item3-date': _createCollectionItemTrait(3, 'date'),
    'item4-title': _createCollectionItemTrait(4, 'title'),
    'item4-description': _createCollectionItemTrait(4, 'description'),
    'item4-href': _createCollectionItemTrait(4, 'href'),
    'item4-date': _createCollectionItemTrait(4, 'date'),
    'item5-title': _createCollectionItemTrait(5, 'title'),
    'item5-description': _createCollectionItemTrait(5, 'description'),
    'item5-href': _createCollectionItemTrait(5, 'href'),
    'item5-date': _createCollectionItemTrait(5, 'date'),
  },
});

}
