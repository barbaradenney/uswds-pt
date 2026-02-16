/**
 * Selection Components
 *
 * Registers selection/choice components:
 * usa-checkbox, usa-radio, usa-select, usa-combo-box
 */

import type { ComponentRegistration, UnifiedTrait, TraitValue } from './shared-utils.js';
import {
  coerceBoolean,
  createAttributeTrait,
  createBooleanTrait,
  triggerUpdate,
  traitStr,
} from './shared-utils.js';
import type { RegistryLike } from './shared-utils.js';
import type { GrapesComponentModel } from '../types.js';
import type { USWDSElement } from '@uswds-pt/shared';
import { createFormHintTrait, createRadioHintTrait, createErrorMessageTrait } from './form-trait-factories.js';
import {
  rebuildSelectOptionsFromSource,
  createSelectOptionTrait,
} from './select-helpers.js';

/**
 * Helper to rebuild combo box options from individual traits
 */
function rebuildComboBoxOptions(element: HTMLElement, count: number): void {
  const options: Array<{ value: string; label: string }> = [];
  for (let i = 1; i <= count; i++) {
    const label = element.getAttribute(`option${i}-label`) || `Option ${i}`;
    const value = element.getAttribute(`option${i}-value`) || `option${i}`;
    options.push({ value, label });
  }
  (element as USWDSElement).options = options;
  triggerUpdate(element);
}

/**
 * Helper to create a combo box option trait
 */
function createComboBoxOptionTrait(
  optionNum: number,
  traitType: 'label' | 'value'
): UnifiedTrait {
  const attrName = `option${optionNum}-${traitType}`;
  const label = traitType === 'label' ? `Option ${optionNum} Label` : `Option ${optionNum} Value`;
  const defaultValue = traitType === 'label' ? `Option ${optionNum}` : `option${optionNum}`;

  // Visibility function - only show if optionNum <= option-count
  const visibleFn = (component: GrapesComponentModel) => {
    try {
      if (!component) return true;
      const attrs = component.getAttributes?.() ?? {};
      const count = parseInt(attrs['option-count'] || '3', 10);
      return optionNum <= count;
    } catch {
      return true;
    }
  };

  return {
    definition: {
      name: attrName,
      label,
      type: 'text',
      default: defaultValue,
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: TraitValue) => {
        element.setAttribute(attrName, traitStr(value));
        const count = parseInt(element.getAttribute('option-count') || '3', 10);
        if (optionNum <= count) {
          rebuildComboBoxOptions(element, count);
        }
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) ?? defaultValue;
      },
    },
  };
}

export function registerSelectionComponents(registry: RegistryLike): void {

/**
 * USA Checkbox Component
 *
 * Checkbox input with label and USWDS styling.
 */
registry.register({
  tagName: 'usa-checkbox',
  droppable: false,

  traits: {
    // Label - displayed next to checkbox
    label: createAttributeTrait('label', {
      label: 'Label',
      type: 'text',
      default: 'Checkbox label',
    }),

    // Name - form field name
    name: createAttributeTrait('name', {
      label: 'Name (same name groups checkboxes)',
      type: 'text',
      default: 'field',
      placeholder: 'e.g., "interests" or "options"',
    }),

    // Value - value when checked
    value: createAttributeTrait('value', {
      label: 'Value (unique for each checkbox)',
      type: 'text',
      default: 'on',
      placeholder: 'e.g., "sports", "music", "art"',
    }),

    // Checked - initial checked state
    checked: createBooleanTrait('checked', {
      label: 'Checked',
      default: false,
      syncToInternal: 'input[type="checkbox"]',
    }),

    // Tile - tile variant for larger touch targets
    tile: createBooleanTrait('tile', {
      label: 'Tile Variant',
      default: false,
    }),

    // Required - boolean flag
    required: createBooleanTrait('required', {
      label: 'Required',
      default: false,
      syncToInternal: 'input[type="checkbox"]',
    }),

    // Disabled - boolean flag
    disabled: createBooleanTrait('disabled', {
      label: 'Disabled',
      default: false,
      syncToInternal: 'input[type="checkbox"]',
    }),

    // Hint - help text displayed below the label
    hint: {
      definition: {
        name: 'hint',
        label: 'Help Text',
        type: 'text',
        default: '',
        placeholder: 'Optional help text',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const hintText = String(value ?? '').trim() || '';
          element.setAttribute('hint', hintText);

          // Find the label inside the checkbox
          const label = element.querySelector('.usa-checkbox__label');
          if (!label) return;

          // Find or manage the description span
          let descSpan = label.querySelector('.usa-checkbox__label-description');

          if (hintText) {
            if (!descSpan) {
              descSpan = document.createElement('span');
              descSpan.className = 'usa-checkbox__label-description';
              label.appendChild(descSpan);
            }
            descSpan.textContent = hintText;
          } else {
            descSpan?.remove();
          }
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('hint') || '';
        },
        onInit: (element: HTMLElement, value: TraitValue) => {
          const hintText = String(value ?? '').trim() || element.getAttribute('hint') || '';
          if (hintText) {
            // Wait for component to render
            setTimeout(() => {
              const label = element.querySelector('.usa-checkbox__label');
              if (label && !label.querySelector('.usa-checkbox__label-description')) {
                const descSpan = document.createElement('span');
                descSpan.className = 'usa-checkbox__label-description';
                descSpan.textContent = hintText;
                label.appendChild(descSpan);
              }
            }, 100);
          }
        },
      },
    },

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
        onChange: (element: HTMLElement, value: TraitValue) => {
          const cls = traitStr(value);
          // Remove existing margin classes
          element.classList.remove('margin-top-1', 'margin-top-2', 'margin-top-3', 'margin-top-4');
          if (cls && cls !== 'none') {
            element.classList.add(cls);
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

    // Error - error state
    error: createBooleanTrait('error', {
      label: 'Error State',
      default: false,
    }),

    // Error Message - displayed when in error state
    'error-message': createErrorMessageTrait(),

    // Element ID - for conditional show/hide targeting
    id: createAttributeTrait('id', {
      label: 'Element ID (for show/hide)',
      type: 'text',
      default: '',
      placeholder: 'e.g., my-checkbox',
    }),

    // Conditional: Show Element when checked (dropdown populated dynamically)
    'data-reveals': createAttributeTrait('data-reveals', {
      label: 'When checked, show',
      type: 'select',
      default: 'none',
      options: [{ id: 'none', label: '-- None --' }],
      removeDefaults: ['none'],
    }),

    // Conditional: Hide Element when checked (dropdown populated dynamically)
    'data-hides': createAttributeTrait('data-hides', {
      label: 'When checked, hide',
      type: 'select',
      default: 'none',
      options: [{ id: 'none', label: '-- None --' }],
      removeDefaults: ['none'],
    }),
  },
});

/**
 * USA Radio Component
 *
 * Radio button input with label and USWDS styling.
 */
registry.register({
  tagName: 'usa-radio',
  droppable: false,

  traits: {
    // Label - displayed next to radio button
    label: createAttributeTrait('label', {
      label: 'Label',
      type: 'text',
      default: 'Radio label',
    }),

    // Name - form field name (groups radios together)
    name: createAttributeTrait('name', {
      label: 'Name (use same name to group radios)',
      type: 'text',
      default: 'radio-group',
      placeholder: 'e.g., "size" or "color"',
    }),

    // Value - value when selected
    value: createAttributeTrait('value', {
      label: 'Value (unique for each radio)',
      type: 'text',
      default: '1',
      placeholder: 'e.g., "small", "medium", "large"',
    }),

    // Checked - initial checked state
    checked: createBooleanTrait('checked', {
      label: 'Checked',
      default: false,
      syncToInternal: 'input[type="radio"]',
    }),

    // Tile - tile variant for larger touch targets
    tile: createBooleanTrait('tile', {
      label: 'Tile Variant',
      default: false,
    }),

    // Required - boolean flag
    required: createBooleanTrait('required', {
      label: 'Required',
      default: false,
      syncToInternal: 'input[type="radio"]',
    }),

    // Disabled - boolean flag
    disabled: createBooleanTrait('disabled', {
      label: 'Disabled',
      default: false,
      syncToInternal: 'input[type="radio"]',
    }),

    // Hint - help text displayed below the label
    hint: createRadioHintTrait(),

    // Error - error state
    error: createBooleanTrait('error', {
      label: 'Error State',
      default: false,
    }),

    // Error Message - displayed when in error state
    'error-message': createErrorMessageTrait(),

    // Element ID - for conditional show/hide targeting
    id: createAttributeTrait('id', {
      label: 'Element ID (for show/hide)',
      type: 'text',
      default: '',
      placeholder: 'e.g., my-radio',
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
        onChange: (element: HTMLElement, value: TraitValue) => {
          const cls = traitStr(value);
          // Remove existing margin classes
          element.classList.remove('margin-top-1', 'margin-top-2', 'margin-top-3', 'margin-top-4');
          if (cls && cls !== 'none') {
            element.classList.add(cls);
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

    // Conditional: Show Element when selected (dropdown populated dynamically)
    'data-reveals': createAttributeTrait('data-reveals', {
      label: 'When selected, show',
      type: 'select',
      default: 'none',
      options: [{ id: 'none', label: '-- None --' }],
      removeDefaults: ['none'],
    }),

    // Conditional: Hide Element when selected (dropdown populated dynamically)
    'data-hides': createAttributeTrait('data-hides', {
      label: 'When selected, hide',
      type: 'select',
      default: 'none',
      options: [{ id: 'none', label: '-- None --' }],
      removeDefaults: ['none'],
    }),
  },
});

/**
 * USA Select Component
 *
 * Dropdown select input with USWDS styling.
 */
registry.register({
  tagName: 'usa-select',
  droppable: false,

  traits: {
    // Label - displayed above select
    label: createAttributeTrait('label', {
      label: 'Label',
      type: 'text',
      default: 'Select',
    }),

    // Name - form field name
    name: createAttributeTrait('name', {
      label: 'Name',
      type: 'text',
      default: 'select-field',
      placeholder: 'field-name',
    }),

    // Options preset - quick selection of common option lists
    'options-preset': {
      definition: {
        name: 'options-preset',
        label: 'Options Source',
        type: 'select',
        default: 'manual',
        options: [
          { id: 'manual', label: 'Manual Entry' },
          { id: 'us-states', label: 'US States & Territories' },
          { id: 'countries', label: 'Countries' },
          { id: 'months', label: 'Months' },
          { id: 'years', label: 'Years (last 100)' },
          { id: 'yes-no', label: 'Yes / No' },
          { id: 'custom', label: 'Custom List (bulk)' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute('options-preset', traitStr(value, 'manual'));
          rebuildSelectOptionsFromSource(element);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('options-preset') ?? 'manual';
        },
        onInit: (element: HTMLElement, _value: TraitValue) => {
          // Wait for the web component to render its internal <select>
          const initOptions = () => {
            rebuildSelectOptionsFromSource(element);

            // If internal select wasn't found, retry after a delay
            if (!element.querySelector('select')) {
              setTimeout(() => rebuildSelectOptionsFromSource(element), 200);
              setTimeout(() => rebuildSelectOptionsFromSource(element), 500);
            }
          };
          requestAnimationFrame(initOptions);
        },
      },
    },

    // Custom options textarea - for bulk entry (shown when preset = 'custom')
    'custom-options': {
      definition: {
        name: 'custom-options',
        label: 'Custom Options (one per line)',
        type: 'text', // GrapesJS doesn't have textarea, but we can style it
        placeholder: 'value|label or just label\nOne option per line',
        visible: (component: GrapesComponentModel) => {
          try {
            return (component?.getAttributes?.() ?? {})['options-preset'] === 'custom';
          } catch {
            return false;
          }
        },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute('custom-options', traitStr(value));
          rebuildSelectOptionsFromSource(element);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('custom-options') ?? '';
        },
      },
    },

    // Option count - number of options for manual mode
    'option-count': {
      definition: {
        name: 'option-count',
        label: 'Number of Options',
        type: 'select',
        default: '3',
        options: [
          { id: '1', label: '1 Option' },
          { id: '2', label: '2 Options' },
          { id: '3', label: '3 Options' },
          { id: '4', label: '4 Options' },
          { id: '5', label: '5 Options' },
          { id: '6', label: '6 Options' },
          { id: '7', label: '7 Options' },
          { id: '8', label: '8 Options' },
          { id: '9', label: '9 Options' },
          { id: '10', label: '10 Options' },
        ],
        visible: (component: GrapesComponentModel) => {
          try {
            const preset = (component?.getAttributes?.() ?? {})['options-preset'] || 'manual';
            return preset === 'manual';
          } catch {
            return true;
          }
        },
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          element.setAttribute('option-count', traitStr(value, '3'));
          rebuildSelectOptionsFromSource(element);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('option-count') ?? '3';
        },
      },
    },

    // Manual option traits (1-10)
    'option1-label': createSelectOptionTrait(1, 'label'),
    'option1-value': createSelectOptionTrait(1, 'value'),
    'option2-label': createSelectOptionTrait(2, 'label'),
    'option2-value': createSelectOptionTrait(2, 'value'),
    'option3-label': createSelectOptionTrait(3, 'label'),
    'option3-value': createSelectOptionTrait(3, 'value'),
    'option4-label': createSelectOptionTrait(4, 'label'),
    'option4-value': createSelectOptionTrait(4, 'value'),
    'option5-label': createSelectOptionTrait(5, 'label'),
    'option5-value': createSelectOptionTrait(5, 'value'),
    'option6-label': createSelectOptionTrait(6, 'label'),
    'option6-value': createSelectOptionTrait(6, 'value'),
    'option7-label': createSelectOptionTrait(7, 'label'),
    'option7-value': createSelectOptionTrait(7, 'value'),
    'option8-label': createSelectOptionTrait(8, 'label'),
    'option8-value': createSelectOptionTrait(8, 'value'),
    'option9-label': createSelectOptionTrait(9, 'label'),
    'option9-value': createSelectOptionTrait(9, 'value'),
    'option10-label': createSelectOptionTrait(10, 'label'),
    'option10-value': createSelectOptionTrait(10, 'value'),

    // Hint - help text
    hint: createFormHintTrait(),

    // Error - error state
    error: createBooleanTrait('error', {
      label: 'Error State',
      default: false,
    }),

    // Error Message - displayed when in error state
    'error-message': createErrorMessageTrait(),

    // Success - success state
    success: createBooleanTrait('success', {
      label: 'Success State',
      default: false,
    }),

    // Required - boolean flag
    required: createBooleanTrait('required', {
      label: 'Required',
      default: false,
      syncToInternal: 'select',
    }),

    // Disabled - boolean flag
    disabled: createBooleanTrait('disabled', {
      label: 'Disabled',
      default: false,
      syncToInternal: 'select',
    }),

    // Element ID - for conditional show/hide targeting
    id: createAttributeTrait('id', {
      label: 'Element ID (for show/hide)',
      type: 'text',
      default: '',
      placeholder: 'e.g., my-select',
    }),
  },
});

/**
 * USA Combo Box Component
 *
 * Searchable dropdown with typeahead filtering.
 */
registry.register({
  tagName: 'usa-combo-box',
  droppable: false,

  traits: {
    // Label
    label: {
      definition: {
        name: 'label',
        label: 'Label',
        type: 'text',
        default: 'Select an option',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const label = traitStr(value, 'Select an option');
          element.setAttribute('label', label);
          (element as USWDSElement).label = label;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).label || element.getAttribute('label') || 'Select an option';
        },
      },
    },

    // Name
    name: {
      definition: {
        name: 'name',
        label: 'Field Name',
        type: 'text',
        default: 'combo-box',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const name = traitStr(value, 'combo-box');
          element.setAttribute('name', name);
          (element as USWDSElement).name = name;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).name || element.getAttribute('name') || 'combo-box';
        },
      },
    },

    // Placeholder
    placeholder: {
      definition: {
        name: 'placeholder',
        label: 'Placeholder',
        type: 'text',
        default: 'Select...',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const placeholder = traitStr(value);
          if (placeholder) {
            element.setAttribute('placeholder', placeholder);
          } else {
            element.removeAttribute('placeholder');
          }
          (element as USWDSElement).placeholder = placeholder;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).placeholder || element.getAttribute('placeholder') || '';
        },
      },
    },

    // Hint
    hint: {
      definition: {
        name: 'hint',
        label: 'Hint Text',
        type: 'text',
        default: '',
        placeholder: 'Optional helper text',
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const hint = traitStr(value);
          if (hint) {
            element.setAttribute('hint', hint);
          } else {
            element.removeAttribute('hint');
          }
          (element as USWDSElement).hint = hint;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).hint || element.getAttribute('hint') || '';
        },
      },
    },

    // Option count
    'option-count': {
      definition: {
        name: 'option-count',
        label: 'Number of Options',
        type: 'select',
        default: '3',
        options: [
          { id: '1', label: '1 Option' },
          { id: '2', label: '2 Options' },
          { id: '3', label: '3 Options' },
          { id: '4', label: '4 Options' },
          { id: '5', label: '5 Options' },
          { id: '6', label: '6 Options' },
          { id: '7', label: '7 Options' },
          { id: '8', label: '8 Options' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const count = parseInt(traitStr(value, '3'), 10);
          element.setAttribute('option-count', String(count));
          rebuildComboBoxOptions(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('option-count') ?? '3';
        },
        onInit: (element: HTMLElement, value: TraitValue) => {
          setTimeout(() => {
            const count = parseInt(traitStr(value, '3'), 10);
            rebuildComboBoxOptions(element, count);
          }, 100);
        },
      },
    },

    // Option 1
    'option1-label': createComboBoxOptionTrait(1, 'label'),
    'option1-value': createComboBoxOptionTrait(1, 'value'),

    // Option 2
    'option2-label': createComboBoxOptionTrait(2, 'label'),
    'option2-value': createComboBoxOptionTrait(2, 'value'),

    // Option 3
    'option3-label': createComboBoxOptionTrait(3, 'label'),
    'option3-value': createComboBoxOptionTrait(3, 'value'),

    // Option 4
    'option4-label': createComboBoxOptionTrait(4, 'label'),
    'option4-value': createComboBoxOptionTrait(4, 'value'),

    // Option 5
    'option5-label': createComboBoxOptionTrait(5, 'label'),
    'option5-value': createComboBoxOptionTrait(5, 'value'),

    // Option 6
    'option6-label': createComboBoxOptionTrait(6, 'label'),
    'option6-value': createComboBoxOptionTrait(6, 'value'),

    // Option 7
    'option7-label': createComboBoxOptionTrait(7, 'label'),
    'option7-value': createComboBoxOptionTrait(7, 'value'),

    // Option 8
    'option8-label': createComboBoxOptionTrait(8, 'label'),
    'option8-value': createComboBoxOptionTrait(8, 'value'),

    // Disable Filtering
    'disable-filtering': {
      definition: {
        name: 'disable-filtering',
        label: 'Disable Filtering',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isDisabled = coerceBoolean(value);
          if (isDisabled) {
            element.setAttribute('disable-filtering', '');
          } else {
            element.removeAttribute('disable-filtering');
          }
          (element as USWDSElement).disableFiltering = isDisabled;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).disableFiltering || element.hasAttribute('disable-filtering');
        },
      },
    },

    // Required
    required: {
      definition: {
        name: 'required',
        label: 'Required',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isRequired = coerceBoolean(value);
          if (isRequired) {
            element.setAttribute('required', '');
          } else {
            element.removeAttribute('required');
          }
          (element as USWDSElement).required = isRequired;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).required || element.hasAttribute('required');
        },
      },
    },

    // Error - error state
    error: createBooleanTrait('error', {
      label: 'Error State',
      default: false,
    }),

    // Error Message - displayed when in error state
    'error-message': createErrorMessageTrait(),

    // Disabled
    disabled: {
      definition: {
        name: 'disabled',
        label: 'Disabled',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          const isDisabled = coerceBoolean(value);
          if (isDisabled) {
            element.setAttribute('disabled', '');
          } else {
            element.removeAttribute('disabled');
          }
          (element as USWDSElement).disabled = isDisabled;
          triggerUpdate(element);
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).disabled || element.hasAttribute('disabled');
        },
      },
    },

    // Element ID - for conditional show/hide targeting
    id: createAttributeTrait('id', {
      label: 'Element ID (for show/hide)',
      type: 'text',
      default: '',
      placeholder: 'e.g., my-combo-box',
    }),
  },
});

}
