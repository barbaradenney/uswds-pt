/**
 * File & Range Components
 *
 * Registers file upload and range slider components:
 * usa-file-input, usa-range-slider
 */

import type { ComponentRegistration, TraitValue } from './shared-utils.js';
import {
  createAttributeTrait,
  createBooleanTrait,
} from './shared-utils.js';
import type { USWDSElement } from '@uswds-pt/shared';
import { createFormHintTrait, createErrorMessageTrait } from './form-trait-factories.js';

/**
 * Registry interface to avoid circular imports.
 * Component files receive this instead of the concrete ComponentRegistry class.
 */
interface RegistryLike {
  register(registration: ComponentRegistration): void;
}

export function registerFileRangeComponents(registry: RegistryLike): void {

/**
 * USA File Input Component
 *
 * File upload input with USWDS styling.
 */
registry.register({
  tagName: 'usa-file-input',
  droppable: false,

  traits: {
    // Label - displayed above file input
    label: createAttributeTrait('label', {
      label: 'Label',
      type: 'text',
      default: 'Upload file',
    }),

    // Name - form field name
    name: createAttributeTrait('name', {
      label: 'Name',
      type: 'text',
      default: 'file',
      placeholder: 'field-name',
    }),

    // Accept - allowed file types
    accept: createAttributeTrait('accept', {
      label: 'Accept (file types)',
      type: 'text',
      placeholder: 'e.g., ".pdf,.doc,.docx" or "image/*"',
      removeDefaults: [''],
    }),

    // Multiple - allow multiple files
    multiple: createBooleanTrait('multiple', {
      label: 'Multiple Files',
      default: false,
      syncToInternal: 'input[type="file"]',
    }),

    // Hint - help text
    hint: createFormHintTrait(),

    // Error - error state
    error: createBooleanTrait('error', {
      label: 'Error State',
      default: false,
    }),

    // Error Message - displayed when in error state
    'error-message': createErrorMessageTrait(),

    // Required - boolean flag
    required: createBooleanTrait('required', {
      label: 'Required',
      default: false,
      syncToInternal: 'input[type="file"]',
    }),

    // Disabled - boolean flag
    disabled: createBooleanTrait('disabled', {
      label: 'Disabled',
      default: false,
      syncToInternal: 'input[type="file"]',
    }),

    // Element ID - for conditional show/hide targeting
    id: createAttributeTrait('id', {
      label: 'Element ID (for show/hide)',
      type: 'text',
      default: '',
      placeholder: 'e.g., my-file-input',
    }),
  },
});

/**
 * USA Range Slider Component
 *
 * Range slider input with USWDS styling.
 */
registry.register({
  tagName: 'usa-range-slider',
  droppable: false,

  traits: {
    // Label - displayed above slider
    label: createAttributeTrait('label', {
      label: 'Label',
      type: 'text',
      default: 'Range',
    }),

    // Name - form field name
    name: createAttributeTrait('name', {
      label: 'Name',
      type: 'text',
      default: 'range',
      placeholder: 'field-name',
    }),

    // Min - minimum value (custom handler to sync to internal input)
    min: {
      definition: {
        name: 'min',
        label: 'Minimum',
        type: 'number',
        default: 0,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          // Parse value as number, default to 0 for empty/invalid
          const parsed = parseFloat(String(value));
          const minValue = isNaN(parsed) ? 0 : parsed;

          // Set property directly on web component (Lit reactive property)
          (element as USWDSElement).min = minValue;

          // Also set attribute for persistence
          element.setAttribute('min', String(minValue));

          // Sync to internal input and preserve value
          const input = element.querySelector('input[type="range"]');
          if (input instanceof HTMLInputElement) {
            const currentValue = parseFloat(input.value) || 50;
            input.min = String(minValue);

            // Clamp current value to new min/max range
            const max = parseFloat(input.max) || 100;
            const clampedValue = Math.max(minValue, Math.min(max, currentValue));

            // Update both input and web component
            input.value = String(clampedValue);
            (element as USWDSElement).value = clampedValue;
          }

          // Force Lit to re-render
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          // Read from Lit property first
          if ((element as USWDSElement).min !== undefined) {
            return (element as USWDSElement).min;
          }
          const attr = element.getAttribute('min');
          if (attr !== null) return parseFloat(attr) || 0;
          return 0;
        },
      },
    },

    // Max - maximum value (custom handler to sync to internal input)
    max: {
      definition: {
        name: 'max',
        label: 'Maximum',
        type: 'number',
        default: 100,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          // Parse value as number, default to 100 for empty/invalid
          const parsed = parseFloat(String(value));
          const maxValue = isNaN(parsed) ? 100 : parsed;

          // Set property directly on web component (Lit reactive property)
          (element as USWDSElement).max = maxValue;

          // Also set attribute for persistence
          element.setAttribute('max', String(maxValue));

          // Sync to internal input and preserve value
          const input = element.querySelector('input[type="range"]');
          if (input instanceof HTMLInputElement) {
            const currentValue = parseFloat(input.value) || 50;
            input.max = String(maxValue);

            // Clamp current value to new min/max range
            const min = parseFloat(input.min) || 0;
            const clampedValue = Math.max(min, Math.min(maxValue, currentValue));

            // Update both input and web component
            input.value = String(clampedValue);
            (element as USWDSElement).value = clampedValue;
          }

          // Force Lit to re-render
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          // Read from Lit property first
          if ((element as USWDSElement).max !== undefined) {
            return (element as USWDSElement).max;
          }
          const attr = element.getAttribute('max');
          if (attr !== null) return parseFloat(attr) || 100;
          return 100;
        },
      },
    },

    // Step - increment step (custom handler to sync to internal input)
    step: {
      definition: {
        name: 'step',
        label: 'Step',
        type: 'number',
        default: 1,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          // Parse value as number, default to 1 for empty/invalid
          const parsed = parseFloat(String(value));
          const stepValue = isNaN(parsed) || parsed <= 0 ? 1 : parsed;

          // Always set step attribute
          element.setAttribute('step', String(stepValue));

          // Sync to internal input
          const input = element.querySelector('input[type="range"]');
          if (input instanceof HTMLInputElement) {
            input.step = String(stepValue);
          }
        },
        getValue: (element: HTMLElement) => {
          const attr = element.getAttribute('step');
          if (attr !== null) return parseFloat(attr) || 1;
          const input = element.querySelector('input[type="range"]');
          if (input instanceof HTMLInputElement) {
            return parseFloat(input.step) || 1;
          }
          return 1;
        },
      },
    },

    // Value - default value (custom handler to sync to internal input)
    value: {
      definition: {
        name: 'value',
        label: 'Default Value',
        type: 'number',
        default: 50,
      },
      handler: {
        onChange: (element: HTMLElement, value: TraitValue) => {
          // Parse value as number, default to 50 for empty/invalid
          const parsed = parseFloat(String(value));
          const numValue = isNaN(parsed) ? 50 : parsed;

          // Set attribute on web component
          element.setAttribute('value', String(numValue));

          // Sync to internal input element
          const input = element.querySelector('input[type="range"]');
          if (input instanceof HTMLInputElement) {
            input.value = String(numValue);
          }
        },
        getValue: (element: HTMLElement) => {
          const attr = element.getAttribute('value');
          if (attr !== null) return parseFloat(attr) || 50;
          const input = element.querySelector('input[type="range"]');
          if (input instanceof HTMLInputElement) {
            return parseFloat(input.value) || 50;
          }
          return 50;
        },
      },
    },

    // Hint - help text
    hint: createFormHintTrait(),

    // Error - error state
    error: createBooleanTrait('error', {
      label: 'Error State',
      default: false,
    }),

    // Error Message - displayed when in error state
    'error-message': createErrorMessageTrait(),

    // Required - boolean flag
    required: createBooleanTrait('required', {
      label: 'Required',
      default: false,
      syncToInternal: 'input[type="range"]',
    }),

    // Disabled - boolean flag
    disabled: createBooleanTrait('disabled', {
      label: 'Disabled',
      default: false,
      syncToInternal: 'input[type="range"]',
    }),

    // Element ID - for conditional show/hide targeting
    id: createAttributeTrait('id', {
      label: 'Element ID (for show/hide)',
      type: 'text',
      default: '',
      placeholder: 'e.g., my-range-slider',
    }),
  },
});

}
