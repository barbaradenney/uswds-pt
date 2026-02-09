/**
 * UI Components
 *
 * Registers UI/navigation components:
 * usa-button-group, usa-search, usa-breadcrumb, usa-pagination, usa-side-navigation
 */

import type { ComponentRegistration, UnifiedTrait } from './shared-utils.js';
import {
  coerceBoolean,
  hasAttributeTrue,
  createAttributeTrait,
  createBooleanTrait,
} from './shared-utils.js';

/**
 * Registry interface to avoid circular imports.
 * Component files receive this instead of the concrete ComponentRegistry class.
 */
interface RegistryLike {
  register(registration: ComponentRegistration): void;
}

export function registerUIComponents(registry: RegistryLike): void {

/**
 * USA Button Group Component
 *
 * Groups multiple buttons together with proper spacing and optional segmented style.
 * Uses dynamic traits for easy editing of individual buttons.
 */

// Track which button groups we're observing to avoid duplicate observers
const buttonGroupObservers = new WeakMap<HTMLElement, MutationObserver>();
// Track when we're applying changes to avoid infinite loops
const buttonGroupApplying = new WeakSet<HTMLElement>();

// Helper function to rebuild button group buttons from individual traits
// Uses DOM methods instead of innerHTML to preserve event listeners
function rebuildButtonGroupButtons(element: HTMLElement, count: number): void {
  // Find the ul container (button group renders as ul > li > button)
  const ul = element.querySelector('ul.usa-button-group');

  // If no ul exists yet, the component may need to render first
  if (!ul) {
    // Try to trigger initial render and retry
    if (typeof (element as any).requestUpdate === 'function') {
      (element as any).requestUpdate();
    }
    // Retry after a delay to wait for web component to render
    setTimeout(() => rebuildButtonGroupButtons(element, count), 100);
    return;
  }

  // Set up a MutationObserver to re-apply changes when the web component re-renders
  if (!buttonGroupObservers.has(element)) {
    const observer = new MutationObserver((mutations) => {
      // Skip if we're currently applying changes (avoid infinite loop)
      if (buttonGroupApplying.has(element)) return;

      // Check if the mutation affected our button structure
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // The web component re-rendered, re-apply our changes
          const currentCount = parseInt(element.getAttribute('btn-count') || '2', 10) || 2;
          // Use setTimeout to let mutation finish first
          setTimeout(() => applyButtonGroupChanges(element, currentCount), 10);
          break;
        }
      }
    });
    observer.observe(element, { childList: true, subtree: true });
    buttonGroupObservers.set(element, observer);
  }

  applyButtonGroupChanges(element, count);
}

// Apply the actual button changes (separated to allow re-application)
function applyButtonGroupChanges(element: HTMLElement, count: number): void {
  // Prevent infinite loops
  if (buttonGroupApplying.has(element)) return;
  buttonGroupApplying.add(element);

  try {
    const ul = element.querySelector('ul.usa-button-group');
    if (!ul) return;

    // Get existing list items
    const existingItems = ul.querySelectorAll('li.usa-button-group__item');
    const existingCount = existingItems.length;

    // Update existing buttons or create new ones
    for (let i = 1; i <= count; i++) {
      const text = element.getAttribute(`btn${i}-text`) || `Button ${i}`;
      const variant = element.getAttribute(`btn${i}-variant`) || '';
      const href = element.getAttribute(`btn${i}-href`) || '';

      if (i <= existingCount) {
        // Update existing button/anchor in place
        const li = existingItems[i - 1];
        const existingButton = li.querySelector('button');
        const existingAnchor = li.querySelector('a');

        if (href) {
          // Need an anchor
          if (existingAnchor) {
            // Update existing anchor
            existingAnchor.textContent = text;
            existingAnchor.setAttribute('href', href);
            existingAnchor.className = 'usa-button';
            if (variant && variant !== 'default') {
              existingAnchor.classList.add(`usa-button--${variant}`);
            }
          } else {
            // Convert button to anchor (or create new if neither exists)
            const anchor = document.createElement('a');
            anchor.setAttribute('href', href);
            anchor.className = 'usa-button';
            if (variant && variant !== 'default') {
              anchor.classList.add(`usa-button--${variant}`);
            }
            anchor.textContent = text;
            if (existingButton) {
              existingButton.replaceWith(anchor);
            } else {
              li.appendChild(anchor);
            }
          }
        } else {
          // Need a button
          if (existingButton) {
            // Update existing button
            existingButton.textContent = text;
            existingButton.className = 'usa-button';
            if (variant && variant !== 'default') {
              existingButton.classList.add(`usa-button--${variant}`);
            }
          } else if (existingAnchor) {
            // Convert anchor to button
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'usa-button';
            if (variant && variant !== 'default') {
              button.classList.add(`usa-button--${variant}`);
            }
            button.textContent = text;
            existingAnchor.replaceWith(button);
          }
        }
      } else {
        // Create new button or anchor
        const li = document.createElement('li');
        li.className = 'usa-button-group__item';

        if (href) {
          const anchor = document.createElement('a');
          anchor.setAttribute('href', href);
          anchor.className = 'usa-button';
          if (variant && variant !== 'default') {
            anchor.classList.add(`usa-button--${variant}`);
          }
          anchor.textContent = text;
          li.appendChild(anchor);
        } else {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'usa-button';
          if (variant && variant !== 'default') {
            button.classList.add(`usa-button--${variant}`);
          }
          button.textContent = text;
          li.appendChild(button);
        }

        ul.appendChild(li);
      }
    }

    // Remove extra buttons if count decreased
    for (let i = existingCount; i > count; i--) {
      const li = existingItems[i - 1];
      if (li && li.parentNode) {
        li.parentNode.removeChild(li);
      }
    }
  } finally {
    // Release the lock after a short delay to allow DOM to settle
    setTimeout(() => buttonGroupApplying.delete(element), 50);
  }
}

// Helper to create button group link traits
function createButtonGroupLinkTrait(index: number, type: 'link-type' | 'page-link' | 'href'): UnifiedTrait {
  const attrName = `btn${index}-${type}`;

  // Base visibility - only show if index <= btn-count
  const baseVisibleFn = (component: any) => {
    try {
      if (!component) return true;
      const count = parseInt(component.get?.('attributes')?.['btn-count'] || '2', 10);
      return index <= count;
    } catch {
      return true;
    }
  };

  // Additional visibility for page-link (only when link-type is 'page')
  const pageLinkVisibleFn = (component: any) => {
    if (!baseVisibleFn(component)) return false;
    try {
      const attrs = component.get?.('attributes') || {};
      return attrs[`btn${index}-link-type`] === 'page';
    } catch {
      return false;
    }
  };

  // Additional visibility for href (only when link-type is 'external')
  const hrefVisibleFn = (component: any) => {
    if (!baseVisibleFn(component)) return false;
    try {
      const attrs = component.get?.('attributes') || {};
      return attrs[`btn${index}-link-type`] === 'external';
    } catch {
      return false;
    }
  };

  if (type === 'link-type') {
    return {
      definition: {
        name: attrName,
        label: `Button ${index} Link To`,
        type: 'select',
        default: 'none',
        visible: baseVisibleFn,
        options: [
          { id: 'none', label: 'None (Button Only)' },
          { id: 'page', label: 'Page in Prototype' },
          { id: 'external', label: 'External URL' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any, _oldValue?: any, component?: any) => {
          const linkType = value || 'none';
          element.setAttribute(attrName, linkType);

          // Clear href when switching to none or page
          if (linkType === 'none' || linkType === 'page') {
            element.removeAttribute(`btn${index}-href`);
            if (component?.addAttributes) {
              component.addAttributes({ [`btn${index}-href`]: '' });
            }
          }
          // Clear page-link when switching to none or external
          if (linkType === 'none' || linkType === 'external') {
            element.removeAttribute(`btn${index}-page-link`);
            if (component?.addAttributes) {
              component.addAttributes({ [`btn${index}-page-link`]: '' });
            }
          }

          const count = parseInt(element.getAttribute('btn-count') || '2', 10) || 2;
          rebuildButtonGroupButtons(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute(attrName) || 'none';
        },
      },
    };
  }

  if (type === 'page-link') {
    return {
      definition: {
        name: attrName,
        label: `Button ${index} Page`,
        type: 'select',
        default: '',
        visible: pageLinkVisibleFn,
        // Options are populated dynamically by Editor.tsx
        options: [
          { id: 'none', label: '-- Select a page --' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any, _oldValue?: any, component?: any) => {
          if (value && value !== 'none') {
            const href = `#page-${value}`;
            element.setAttribute(attrName, value);
            element.setAttribute(`btn${index}-href`, href);
            if (component?.addAttributes) {
              component.addAttributes({ [attrName]: value, [`btn${index}-href`]: href });
            }
          } else {
            element.removeAttribute(attrName);
            element.removeAttribute(`btn${index}-href`);
            if (component?.addAttributes) {
              component.addAttributes({ [attrName]: '', [`btn${index}-href`]: '' });
            }
          }
          const count = parseInt(element.getAttribute('btn-count') || '2', 10) || 2;
          rebuildButtonGroupButtons(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute(attrName) || '';
        },
      },
    };
  }

  // type === 'href'
  return {
    definition: {
      name: attrName,
      label: `Button ${index} URL`,
      type: 'text',
      default: '',
      visible: hrefVisibleFn,
      placeholder: 'https://example.com',
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        if (value) {
          element.setAttribute(attrName, value);
        } else {
          element.removeAttribute(attrName);
        }
        const count = parseInt(element.getAttribute('btn-count') || '2', 10) || 2;
        rebuildButtonGroupButtons(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) || '';
      },
    },
  };
}

// Helper to create a button group item trait
function createButtonGroupItemTrait(index: number, type: 'text' | 'variant'): UnifiedTrait {
  const attrName = `btn${index}-${type}`;
  const isText = type === 'text';
  const defaultValue = isText ? `Button ${index}` : (index === 1 ? 'default' : 'outline');

  // Visibility function - only show if index <= btn-count
  const visibleFn = (component: any) => {
    try {
      if (!component) return true;
      const count = parseInt(component.get?.('attributes')?.['btn-count'] || '2', 10);
      return index <= count;
    } catch {
      return true;
    }
  };

  return {
    definition: {
      name: attrName,
      label: `Button ${index} ${isText ? 'Text' : 'Variant'}`,
      type: isText ? 'text' : 'select',
      default: defaultValue,
      visible: visibleFn,
      ...(isText ? {} : {
        options: [
          { id: 'default', label: 'Default' },
          { id: 'secondary', label: 'Secondary' },
          { id: 'accent-cool', label: 'Accent Cool' },
          { id: 'accent-warm', label: 'Accent Warm' },
          { id: 'base', label: 'Base' },
          { id: 'outline', label: 'Outline' },
        ],
      }),
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('btn-count') || '2', 10) || 2;
        rebuildButtonGroupButtons(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

registry.register({
  tagName: 'usa-button-group',
  droppable: false, // We manage buttons via traits now

  traits: {
    // Type - default or segmented
    type: createAttributeTrait('type', {
      label: 'Type',
      type: 'select',
      default: 'default',
      removeDefaults: ['default'],
      options: [
        { id: 'default', label: 'Default' },
        { id: 'segmented', label: 'Segmented' },
      ],
    }),

    // Count - number of buttons
    'btn-count': {
      definition: {
        name: 'btn-count',
        label: 'Number of Buttons',
        type: 'select',
        default: '2',
        options: [
          { id: '2', label: '2 Buttons' },
          { id: '3', label: '3 Buttons' },
          { id: '4', label: '4 Buttons' },
        ],
      },
      handler: {
        onInit: (element: HTMLElement, value: any) => {
          const count = Math.max(1, Math.min(4, parseInt(value, 10) || 2));
          element.setAttribute('btn-count', String(count));
          setTimeout(() => rebuildButtonGroupButtons(element, count), 100);
        },
        onChange: (element: HTMLElement, value: any) => {
          const count = Math.max(1, Math.min(4, parseInt(value, 10) || 2));
          element.setAttribute('btn-count', String(count));
          rebuildButtonGroupButtons(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('btn-count') || '2';
        },
      },
    },

    // Individual button traits (text, variant, and link for each button)
    // Button 1
    'btn1-text': createButtonGroupItemTrait(1, 'text'),
    'btn1-variant': createButtonGroupItemTrait(1, 'variant'),
    'btn1-link-type': createButtonGroupLinkTrait(1, 'link-type'),
    'btn1-page-link': createButtonGroupLinkTrait(1, 'page-link'),
    'btn1-href': createButtonGroupLinkTrait(1, 'href'),
    // Button 2
    'btn2-text': createButtonGroupItemTrait(2, 'text'),
    'btn2-variant': createButtonGroupItemTrait(2, 'variant'),
    'btn2-link-type': createButtonGroupLinkTrait(2, 'link-type'),
    'btn2-page-link': createButtonGroupLinkTrait(2, 'page-link'),
    'btn2-href': createButtonGroupLinkTrait(2, 'href'),
    // Button 3
    'btn3-text': createButtonGroupItemTrait(3, 'text'),
    'btn3-variant': createButtonGroupItemTrait(3, 'variant'),
    'btn3-link-type': createButtonGroupLinkTrait(3, 'link-type'),
    'btn3-page-link': createButtonGroupLinkTrait(3, 'page-link'),
    'btn3-href': createButtonGroupLinkTrait(3, 'href'),
    // Button 4
    'btn4-text': createButtonGroupItemTrait(4, 'text'),
    'btn4-variant': createButtonGroupItemTrait(4, 'variant'),
    'btn4-link-type': createButtonGroupLinkTrait(4, 'link-type'),
    'btn4-page-link': createButtonGroupLinkTrait(4, 'page-link'),
    'btn4-href': createButtonGroupLinkTrait(4, 'href'),

    // Spacing
    'top-spacing': {
      definition: {
        type: 'select',
        label: 'Top Spacing',
        name: 'top-spacing',
        options: [
          { id: 'none', label: '- Select an option -' },
          { id: 'margin-top-1', label: 'Small (8px)' },
          { id: 'margin-top-2', label: 'Medium (16px)' },
          { id: 'margin-top-3', label: 'Large (24px)' },
          { id: 'margin-top-4', label: 'Extra Large (32px)' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: string) => {
          // Remove existing margin classes
          element.classList.remove('margin-top-1', 'margin-top-2', 'margin-top-3', 'margin-top-4');
          if (value && value !== 'none') {
            element.classList.add(value);
          }
        },
        getValue: (element: HTMLElement) => {
          if (element.classList.contains('margin-top-1')) return 'margin-top-1';
          if (element.classList.contains('margin-top-2')) return 'margin-top-2';
          if (element.classList.contains('margin-top-3')) return 'margin-top-3';
          if (element.classList.contains('margin-top-4')) return 'margin-top-4';
          return 'none';
        },
      },
    },
  },
});

/**
 * USA Search Component
 *
 * Search input with button, available in multiple sizes.
 */
registry.register({
  tagName: 'usa-search',
  droppable: false,

  traits: {
    // Size - small, medium, or big
    size: createAttributeTrait('size', {
      label: 'Size',
      type: 'select',
      default: 'medium',
      removeDefaults: ['medium'],
      options: [
        { id: 'small', label: 'Small (icon only)' },
        { id: 'medium', label: 'Medium' },
        { id: 'big', label: 'Big' },
      ],
    }),

    // Placeholder text
    placeholder: {
      definition: {
        name: 'placeholder',
        label: 'Placeholder',
        type: 'text',
        default: 'Search',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Search';
          (element as any).placeholder = text;
          // Also update the internal input
          const input = element.querySelector('.usa-search__input') as HTMLInputElement;
          if (input) {
            input.placeholder = text;
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).placeholder || 'Search';
        },
      },
    },

    // Label for accessibility
    label: createAttributeTrait('label', {
      label: 'Label (accessibility)',
      type: 'text',
      default: '',
      placeholder: 'Search',
    }),

    // Button text - needs to set property directly (not attribute)
    'button-text': {
      definition: {
        name: 'button-text',
        label: 'Button Text',
        type: 'text',
        default: 'Search',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Search';
          // Set the Lit property directly
          (element as any).buttonText = text;
          // Also update the internal button text
          const buttonSpan = element.querySelector('.usa-search__submit-text');
          if (buttonSpan) {
            buttonSpan.textContent = text;
          }
          // Trigger re-render
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).buttonText || 'Search';
        },
      },
    },

    // Disabled state
    disabled: createBooleanTrait('disabled', {
      label: 'Disabled',
      default: false,
    }),
  },
});

/**
 * USA Breadcrumb Component
 *
 * Navigation breadcrumb trail showing the user's location in the site hierarchy.
 * Uses dynamic traits for easy editing of individual breadcrumb items.
 */

// Helper function to rebuild breadcrumb items from individual traits
function rebuildBreadcrumbItems(element: HTMLElement, count: number): void {
  const items: Array<{ label: string; href?: string; current?: boolean }> = [];

  for (let i = 1; i <= count; i++) {
    const label = element.getAttribute(`item${i}-label`) || `Item ${i}`;
    const href = element.getAttribute(`item${i}-href`) || '#';
    const isLast = i === count;

    items.push({
      label,
      href: isLast ? undefined : href, // Last item doesn't need href
      current: isLast,
    });
  }

  // Update the web component's items property
  (element as any).items = items;

  // Trigger Lit component re-render
  if (typeof (element as any).requestUpdate === 'function') {
    (element as any).requestUpdate();
  }
}

// Helper to create a breadcrumb item trait
function createBreadcrumbItemTrait(index: number, type: 'label' | 'href'): UnifiedTrait {
  const attrName = `item${index}-${type}`;
  const isLabel = type === 'label';
  const defaultValue = isLabel ? (index === 1 ? 'Home' : index === 2 ? 'Section' : 'Current Page') : '#';

  // Visibility function - only show if index <= count
  const visibleFn = (component: any) => {
    try {
      if (!component) return true;
      const count = parseInt(component.get?.('attributes')?.['count'] || '3', 10);
      return index <= count;
    } catch {
      return true;
    }
  };

  return {
    definition: {
      name: attrName,
      label: `Item ${index} ${isLabel ? 'Label' : 'URL'}`,
      type: 'text',
      default: defaultValue,
      placeholder: isLabel ? 'Link text' : 'https://...',
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('count') || '3', 10) || 3;
        rebuildBreadcrumbItems(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

registry.register({
  tagName: 'usa-breadcrumb',
  droppable: false,

  traits: {
    // Count - number of breadcrumb items
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
          { id: '6', label: '6 Items' },
        ],
      },
      handler: {
        onInit: (element: HTMLElement, value: any) => {
          const count = Math.max(1, Math.min(6, parseInt(value, 10) || 3));
          element.setAttribute('count', String(count));
          setTimeout(() => rebuildBreadcrumbItems(element, count), 100);
        },
        onChange: (element: HTMLElement, value: any) => {
          const count = Math.max(1, Math.min(6, parseInt(value, 10) || 3));
          element.setAttribute('count', String(count));
          rebuildBreadcrumbItems(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('count') || '3';
        },
      },
    },

    // Wrap - allow breadcrumbs to wrap to multiple lines
    wrap: createBooleanTrait('wrap', {
      label: 'Allow Wrapping',
      default: false,
    }),

    // Individual item traits (up to 6 items)
    'item1-label': createBreadcrumbItemTrait(1, 'label'),
    'item1-href': createBreadcrumbItemTrait(1, 'href'),
    'item2-label': createBreadcrumbItemTrait(2, 'label'),
    'item2-href': createBreadcrumbItemTrait(2, 'href'),
    'item3-label': createBreadcrumbItemTrait(3, 'label'),
    'item3-href': createBreadcrumbItemTrait(3, 'href'),
    'item4-label': createBreadcrumbItemTrait(4, 'label'),
    'item4-href': createBreadcrumbItemTrait(4, 'href'),
    'item5-label': createBreadcrumbItemTrait(5, 'label'),
    'item5-href': createBreadcrumbItemTrait(5, 'href'),
    'item6-label': createBreadcrumbItemTrait(6, 'label'),
    'item6-href': createBreadcrumbItemTrait(6, 'href'),
  },
});

/**
 * USA Pagination Component
 *
 * Page navigation with numbered pages and previous/next buttons.
 */
registry.register({
  tagName: 'usa-pagination',
  droppable: false,

  traits: {
    // Current page
    'current-page': {
      definition: {
        name: 'current-page',
        label: 'Current Page',
        type: 'select',
        default: '1',
        options: [
          { id: '1', label: '1' },
          { id: '2', label: '2' },
          { id: '3', label: '3' },
          { id: '4', label: '4' },
          { id: '5', label: '5' },
          { id: '6', label: '6' },
          { id: '7', label: '7' },
          { id: '8', label: '8' },
          { id: '9', label: '9' },
          { id: '10', label: '10' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const page = parseInt(value, 10) || 1;
          element.setAttribute('current-page', String(page));
          (element as any).currentPage = page;
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('current-page') || '1';
        },
      },
    },

    // Total pages
    'total-pages': {
      definition: {
        name: 'total-pages',
        label: 'Total Pages',
        type: 'select',
        default: '5',
        options: [
          { id: '3', label: '3' },
          { id: '5', label: '5' },
          { id: '7', label: '7' },
          { id: '10', label: '10' },
          { id: '15', label: '15' },
          { id: '20', label: '20' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const pages = parseInt(value, 10) || 5;
          element.setAttribute('total-pages', String(pages));
          (element as any).totalPages = pages;
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('total-pages') || '5';
        },
      },
    },
  },
});

/**
 * USA Side Navigation Component
 *
 * Vertical navigation menu for secondary navigation within a section.
 * Uses dynamic traits for easy editing of individual navigation items.
 */

// Helper function to rebuild side nav items from individual traits
function rebuildSideNavItems(element: HTMLElement, count: number): void {
  const items: Array<{ label: string; href: string; current?: boolean }> = [];

  for (let i = 1; i <= count; i++) {
    const label = element.getAttribute(`item${i}-label`) || `Nav Item ${i}`;
    const href = element.getAttribute(`item${i}-href`) || '#';
    const current = hasAttributeTrue(element, `item${i}-current`);

    items.push({
      label,
      href,
      current,
    });
  }

  // Update the web component's items property
  (element as any).items = items;

  // Trigger Lit component re-render
  if (typeof (element as any).requestUpdate === 'function') {
    (element as any).requestUpdate();
  }
}

// Helper to create a side nav item trait
function createSideNavItemTrait(index: number, type: 'label' | 'href' | 'current'): UnifiedTrait {
  const attrName = `item${index}-${type}`;
  const isLabel = type === 'label';
  const isCurrent = type === 'current';

  // Visibility function - only show if index <= count
  const visibleFn = (component: any) => {
    try {
      if (!component) return true;
      const count = parseInt(component.get?.('attributes')?.['count'] || '4', 10);
      return index <= count;
    } catch {
      return true;
    }
  };

  if (isCurrent) {
    const defaultCurrent = index === 3; // Third item is current by default
    // Boolean trait for "current" (active page)
    return {
      definition: {
        name: attrName,
        label: `Item ${index} Current`,
        type: 'checkbox',
        default: defaultCurrent,
        visible: visibleFn,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isCurrent = coerceBoolean(value);
          if (isCurrent) {
            element.setAttribute(attrName, 'true');
          } else {
            element.removeAttribute(attrName);
          }
          const count = parseInt(element.getAttribute('count') || '4', 10) || 4;
          rebuildSideNavItems(element, count);
        },
        getValue: (element: HTMLElement) => {
          return hasAttributeTrue(element, attrName);
        },
      },
    };
  }

  const defaultValue = isLabel
    ? (index === 1 ? 'Home' : index === 2 ? 'About' : index === 3 ? 'Services' : 'Contact')
    : '#';

  return {
    definition: {
      name: attrName,
      label: `Item ${index} ${isLabel ? 'Label' : 'URL'}`,
      type: 'text',
      default: defaultValue,
      placeholder: isLabel ? 'Link text' : 'https://...',
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('count') || '4', 10) || 4;
        rebuildSideNavItems(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

registry.register({
  tagName: 'usa-side-navigation',
  droppable: false,

  traits: {
    // Aria label
    'aria-label': createAttributeTrait('aria-label', {
      label: 'Aria Label',
      type: 'text',
      default: 'Secondary navigation',
    }),

    // Count - number of navigation items
    count: {
      definition: {
        name: 'count',
        label: 'Number of Items',
        type: 'select',
        default: '4',
        options: [
          { id: '2', label: '2 Items' },
          { id: '3', label: '3 Items' },
          { id: '4', label: '4 Items' },
          { id: '5', label: '5 Items' },
          { id: '6', label: '6 Items' },
        ],
      },
      handler: {
        onInit: (element: HTMLElement, value: any) => {
          const count = Math.max(1, Math.min(8, parseInt(value, 10) || 4));
          element.setAttribute('count', String(count));
          setTimeout(() => rebuildSideNavItems(element, count), 100);
        },
        onChange: (element: HTMLElement, value: any) => {
          const count = Math.max(1, Math.min(8, parseInt(value, 10) || 4));
          element.setAttribute('count', String(count));
          rebuildSideNavItems(element, count);
        },
        getValue: (element: HTMLElement) => {
          return parseInt(element.getAttribute('count') || '4', 10) || 4;
        },
      },
    },

    // Individual item traits
    'item1-label': createSideNavItemTrait(1, 'label'),
    'item1-href': createSideNavItemTrait(1, 'href'),
    'item1-current': createSideNavItemTrait(1, 'current'),
    'item2-label': createSideNavItemTrait(2, 'label'),
    'item2-href': createSideNavItemTrait(2, 'href'),
    'item2-current': createSideNavItemTrait(2, 'current'),
    'item3-label': createSideNavItemTrait(3, 'label'),
    'item3-href': createSideNavItemTrait(3, 'href'),
    'item3-current': createSideNavItemTrait(3, 'current'),
    'item4-label': createSideNavItemTrait(4, 'label'),
    'item4-href': createSideNavItemTrait(4, 'href'),
    'item4-current': createSideNavItemTrait(4, 'current'),
    'item5-label': createSideNavItemTrait(5, 'label'),
    'item5-href': createSideNavItemTrait(5, 'href'),
    'item5-current': createSideNavItemTrait(5, 'current'),
    'item6-label': createSideNavItemTrait(6, 'label'),
    'item6-href': createSideNavItemTrait(6, 'href'),
    'item6-current': createSideNavItemTrait(6, 'current'),
  },
});

}
