/**
 * Structure Components
 *
 * Registers structural/wrapping components:
 * form container, section container, fieldset, usa-link
 */

import type { ComponentRegistration } from './shared-utils.js';
import {
  coerceBoolean,
  createAttributeTrait,
  createBooleanTrait,
} from './shared-utils.js';
import { createPageLinkTraits } from './page-link-traits.js';

/**
 * Registry interface to avoid circular imports.
 * Component files receive this instead of the concrete ComponentRegistry class.
 */
interface RegistryLike {
  register(registration: ComponentRegistration): void;
}

export function registerStructureComponents(registry: RegistryLike): void {

/**
 * Form Container
 *
 * A proper HTML form element for wrapping form controls.
 * Provides accessible form structure with action, method, and validation attributes.
 */
registry.register({
  tagName: 'form',
  droppable: true, // Can contain form controls

  traits: {
    // Form action URL
    action: createAttributeTrait('action', {
      label: 'Action URL',
      type: 'text',
      default: '#',
      placeholder: '/submit or https://...',
    }),

    // Form method
    method: {
      definition: {
        name: 'method',
        label: 'Method',
        type: 'select',
        default: 'post',
        options: [
          { id: 'post', label: 'POST' },
          { id: 'get', label: 'GET' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          element.setAttribute('method', value || 'post');
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('method') ?? 'post';
        },
      },
    },

    // Form name
    name: createAttributeTrait('name', {
      label: 'Form Name',
      type: 'text',
      default: '',
      placeholder: 'contact-form',
    }),

    // Disable browser validation (use custom validation)
    novalidate: createBooleanTrait('novalidate', {
      label: 'Disable Browser Validation',
      default: true,
    }),

    // Element ID - for targeting
    id: createAttributeTrait('id', {
      label: 'Element ID (for show/hide)',
      type: 'text',
      default: '',
      placeholder: 'e.g., my-form',
    }),
  },
});

/**
 * Section Container
 *
 * A generic container for grouping content.
 * Can be targeted by show/hide conditional logic.
 */
registry.register({
  tagName: 'section',
  droppable: true, // Can contain any content

  traits: {
    // Element ID - essential for show/hide targeting
    id: createAttributeTrait('id', {
      label: 'Element ID (for show/hide)',
      type: 'text',
      default: '',
      placeholder: 'e.g., additional-info',
    }),

    // ARIA label for accessibility
    'aria-label': createAttributeTrait('aria-label', {
      label: 'Accessible Label',
      type: 'text',
      default: '',
      placeholder: 'Describe this section',
    }),

    // Hidden state - for initial visibility
    hidden: createBooleanTrait('hidden', {
      label: 'Initially Hidden',
      default: false,
    }),

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

    // Bottom Spacing
    'bottom-spacing': {
      definition: {
        type: 'select',
        label: 'Bottom Spacing',
        name: 'bottom-spacing',
        options: [
          { id: 'none', label: '- Select an option -' },
          { id: 'margin-bottom-1', label: 'Small (8px)' },
          { id: 'margin-bottom-2', label: 'Medium (16px)' },
          { id: 'margin-bottom-3', label: 'Large (24px)' },
          { id: 'margin-bottom-4', label: 'Extra Large (32px)' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: string) => {
          // Remove existing margin classes
          element.classList.remove('margin-bottom-1', 'margin-bottom-2', 'margin-bottom-3', 'margin-bottom-4');
          if (value && value !== 'none') {
            element.classList.add(value);
          }
        },
        getValue: (element: HTMLElement) => {
          if (element.classList.contains('margin-bottom-1')) return 'margin-bottom-1';
          if (element.classList.contains('margin-bottom-2')) return 'margin-bottom-2';
          if (element.classList.contains('margin-bottom-3')) return 'margin-bottom-3';
          if (element.classList.contains('margin-bottom-4')) return 'margin-bottom-4';
          return 'none';
        },
      },
    },
  },
});

/**
 * USA Fieldset Component
 *
 * A fieldset container for grouping form controls with a legend.
 * Used for checkbox groups, radio groups, and other related form fields.
 */
registry.register({
  tagName: 'fieldset',
  droppable: true, // Can contain checkboxes, radios, etc.

  traits: {
    // Legend - group label displayed at the top
    legend: {
      definition: {
        name: 'legend',
        label: 'Group Label',
        type: 'text',
        default: 'Group Label',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const legendText = value || 'Group Label';
          // Find or create the legend element
          let legend = element.querySelector('legend');
          if (!legend) {
            legend = document.createElement('legend');
            legend.className = 'usa-legend';
            element.insertBefore(legend, element.firstChild);
          }
          legend.textContent = legendText;
        },
        getValue: (element: HTMLElement) => {
          const legend = element.querySelector('legend');
          return legend?.textContent || 'Group Label';
        },
      },
    },

    // Required - shows required indicator on the legend
    required: {
      definition: {
        name: 'required',
        label: 'Required',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isRequired = coerceBoolean(value);
          const legend = element.querySelector('legend');

          if (!legend) return;

          // Find or manage the required indicator
          let requiredIndicator = legend.querySelector('.usa-hint--required');

          if (isRequired) {
            if (!requiredIndicator) {
              requiredIndicator = document.createElement('abbr');
              requiredIndicator.className = 'usa-hint usa-hint--required';
              requiredIndicator.setAttribute('title', 'required');
              requiredIndicator.textContent = '*';
              legend.appendChild(requiredIndicator);
            }
          } else {
            requiredIndicator?.remove();
          }
        },
        getValue: (element: HTMLElement) => {
          const legend = element.querySelector('legend');
          return !!legend?.querySelector('.usa-hint--required');
        },
      },
    },

    // Hint - optional hint text displayed below the legend
    hint: {
      definition: {
        name: 'hint',
        label: 'Hint Text',
        type: 'text',
        default: '',
        placeholder: 'Optional hint or instructions',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const hintText = value?.trim() || '';
          let hint = element.querySelector('.usa-hint');
          const legend = element.querySelector('legend');

          if (hintText) {
            // Create or update hint element
            if (!hint) {
              hint = document.createElement('span');
              hint.className = 'usa-hint';
              // Insert after legend, before form controls
              if (legend && legend.nextSibling) {
                element.insertBefore(hint, legend.nextSibling);
              } else if (legend) {
                element.appendChild(hint);
              } else {
                element.insertBefore(hint, element.firstChild);
              }
            }
            hint.textContent = hintText;
          } else {
            // Remove hint element if text is empty
            hint?.remove();
          }
        },
        getValue: (element: HTMLElement) => {
          const hint = element.querySelector('.usa-hint');
          return hint?.textContent || '';
        },
      },
    },

    // Count - number of options in the group
    count: {
      definition: {
        name: 'count',
        label: 'Number of Options',
        type: 'select',
        default: '3',
        options: [
          { id: '2', label: '2 Options' },
          { id: '3', label: '3 Options' },
          { id: '4', label: '4 Options' },
          { id: '5', label: '5 Options' },
          { id: '6', label: '6 Options' },
        ],
      },
      handler: {
        onInit: (element: HTMLElement) => {
          // Read current count from DOM
          const checkboxes = element.querySelectorAll('usa-checkbox');
          const radios = element.querySelectorAll('usa-radio');
          const count = Math.max(checkboxes.length, radios.length) || 3;
          element.setAttribute('count', String(count));
        },
        onChange: (element: HTMLElement, value: any, _oldValue?: any, component?: any) => {
          const targetCount = Math.max(1, Math.min(10, parseInt(value, 10) || 3));

          // Find existing checkboxes or radios
          const checkboxes = element.querySelectorAll('usa-checkbox');
          const radios = element.querySelectorAll('usa-radio');

          // Determine which type we're working with
          const isCheckbox = checkboxes.length > 0;
          const _isRadio = radios.length > 0;
          const existingItems = isCheckbox ? checkboxes : radios;
          const tagName = isCheckbox ? 'usa-checkbox' : 'usa-radio';

          // Get the group name from existing items
          const firstItem = existingItems[0] as HTMLElement | undefined;
          const groupName = firstItem?.getAttribute('name') || (isCheckbox ? 'checkbox-group' : 'radio-group');

          const currentCount = existingItems.length;

          if (targetCount > currentCount) {
            // Add more items using GrapesJS component API if available
            for (let i = currentCount + 1; i <= targetCount; i++) {
              if (component && component.components) {
                // Use GrapesJS API to add components - they'll be properly tracked
                // Must include 'type' so GrapesJS recognizes it and applies the correct traits
                component.components().add({
                  type: tagName,
                  tagName: tagName,
                  attributes: {
                    label: `Option ${i}`,
                    name: groupName,
                    value: `option${i}`,
                  },
                });
              } else {
                // Fallback to DOM manipulation if component not available
                const newItem = document.createElement(tagName);
                newItem.setAttribute('label', `Option ${i}`);
                newItem.setAttribute('name', groupName);
                newItem.setAttribute('value', `option${i}`);
                element.appendChild(newItem);
              }
            }
          } else if (targetCount < currentCount) {
            // Remove items from the end
            if (component && component.components) {
              // Use GrapesJS API to remove components
              const children = component.components();
              const childModels = children.models.filter((m: any) => {
                const tag = m.get('tagName')?.toLowerCase();
                return tag === 'usa-checkbox' || tag === 'usa-radio';
              });
              for (let i = childModels.length - 1; i >= targetCount; i--) {
                childModels[i]?.remove();
              }
            } else {
              // Fallback to DOM manipulation
              for (let i = currentCount - 1; i >= targetCount; i--) {
                existingItems[i]?.remove();
              }
            }
          }
        },
        getValue: (element: HTMLElement) => {
          const checkboxes = element.querySelectorAll('usa-checkbox');
          const radios = element.querySelectorAll('usa-radio');
          return Math.max(checkboxes.length, radios.length) || 3;
        },
      },
    },
  },
});

/**
 * USA Link Component
 *
 * Link/anchor element with USWDS styling.
 */
registry.register({
  tagName: 'usa-link',
  droppable: false,

  traits: {
    // Text - link text content (uses text property on web component)
    text: createAttributeTrait('text', {
      label: 'Link Text',
      type: 'text',
      default: 'Link',
    }),

    // Page link traits - link to pages or external URLs
    ...createPageLinkTraits(),

    // Variant - link variant
    variant: createAttributeTrait('variant', {
      label: 'Variant',
      type: 'select',
      default: '',
      removeDefaults: ['', 'default'],
      options: [
        { id: 'default', label: 'Default' },
        { id: 'external', label: 'External' },
        { id: 'unstyled', label: 'Unstyled' },
      ],
    }),

    // Target - link target
    target: createAttributeTrait('target', {
      label: 'Target',
      type: 'select',
      default: '_self',
      removeDefaults: ['_self'],
      options: [
        { id: '_self', label: 'Same Window' },
        { id: '_blank', label: 'New Window' },
      ],
    }),
  },
});

}
