/**
 * Date/Time Components
 *
 * Registers date and time components:
 * usa-date-picker, usa-time-picker
 */

import type { ComponentRegistration } from './shared-utils.js';
import {
  coerceBoolean,
  createBooleanTrait,
  createAttributeTrait,
} from './shared-utils.js';
import type { USWDSElement } from '@uswds-pt/shared';
import { createErrorMessageTrait } from './form-trait-factories.js';

/**
 * Registry interface to avoid circular imports.
 * Component files receive this instead of the concrete ComponentRegistry class.
 */
interface RegistryLike {
  register(registration: ComponentRegistration): void;
}

export function registerDateTimeComponents(registry: RegistryLike): void {

/**
 * USA Date Picker Component
 *
 * Date input with calendar popup for date selection.
 */
registry.register({
  tagName: 'usa-date-picker',
  droppable: false,

  traits: {
    // Label
    label: {
      definition: {
        name: 'label',
        label: 'Label',
        type: 'text',
        default: 'Date',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const label = value || 'Date';
          element.setAttribute('label', label);
          (element as USWDSElement).label = label;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).label ?? element.getAttribute('label') ?? 'Date';
        },
      },
    },

    // Name
    name: {
      definition: {
        name: 'name',
        label: 'Field Name',
        type: 'text',
        default: 'date-picker',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const name = value || 'date-picker';
          element.setAttribute('name', name);
          (element as USWDSElement).name = name;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).name ?? element.getAttribute('name') ?? 'date-picker';
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
        onChange: (element: HTMLElement, value: any) => {
          const hint = value || '';
          if (hint) {
            element.setAttribute('hint', hint);
          } else {
            element.removeAttribute('hint');
          }
          (element as USWDSElement).hint = hint;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).hint ?? element.getAttribute('hint') ?? '';
        },
      },
    },

    // Min Date
    'min-date': {
      definition: {
        name: 'min-date',
        label: 'Minimum Date',
        type: 'text',
        default: '',
        placeholder: 'YYYY-MM-DD',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const minDate = value || '';
          if (minDate) {
            element.setAttribute('min-date', minDate);
          } else {
            element.removeAttribute('min-date');
          }
          (element as USWDSElement).minDate = minDate;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).minDate ?? element.getAttribute('min-date') ?? '';
        },
      },
    },

    // Max Date
    'max-date': {
      definition: {
        name: 'max-date',
        label: 'Maximum Date',
        type: 'text',
        default: '',
        placeholder: 'YYYY-MM-DD',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const maxDate = value || '';
          if (maxDate) {
            element.setAttribute('max-date', maxDate);
          } else {
            element.removeAttribute('max-date');
          }
          (element as USWDSElement).maxDate = maxDate;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).maxDate ?? element.getAttribute('max-date') ?? '';
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
        onChange: (element: HTMLElement, value: any) => {
          const isRequired = coerceBoolean(value);
          if (isRequired) {
            element.setAttribute('required', '');
          } else {
            element.removeAttribute('required');
          }
          (element as USWDSElement).required = isRequired;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).required ?? element.hasAttribute('required');
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
        onChange: (element: HTMLElement, value: any) => {
          const isDisabled = coerceBoolean(value);
          if (isDisabled) {
            element.setAttribute('disabled', '');
          } else {
            element.removeAttribute('disabled');
          }
          (element as USWDSElement).disabled = isDisabled;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).disabled ?? element.hasAttribute('disabled');
        },
      },
    },

    // Element ID - for conditional show/hide targeting
    id: createAttributeTrait('id', {
      label: 'Element ID (for show/hide)',
      type: 'text',
      default: '',
      placeholder: 'e.g., my-date-picker',
    }),
  },
});

/**
 * USA Time Picker Component
 *
 * Time input with dropdown for time selection.
 */
registry.register({
  tagName: 'usa-time-picker',
  droppable: false,

  traits: {
    // Label
    label: {
      definition: {
        name: 'label',
        label: 'Label',
        type: 'text',
        default: 'Time',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const label = value || 'Time';
          element.setAttribute('label', label);
          (element as USWDSElement).label = label;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).label ?? element.getAttribute('label') ?? 'Time';
        },
      },
    },

    // Name
    name: {
      definition: {
        name: 'name',
        label: 'Field Name',
        type: 'text',
        default: 'time-picker',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const name = value || 'time-picker';
          element.setAttribute('name', name);
          (element as USWDSElement).name = name;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).name ?? element.getAttribute('name') ?? 'time-picker';
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
        onChange: (element: HTMLElement, value: any) => {
          const hint = value || '';
          if (hint) {
            element.setAttribute('hint', hint);
          } else {
            element.removeAttribute('hint');
          }
          (element as USWDSElement).hint = hint;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).hint ?? element.getAttribute('hint') ?? '';
        },
      },
    },

    // Min Time
    'min-time': {
      definition: {
        name: 'min-time',
        label: 'Minimum Time',
        type: 'text',
        default: '',
        placeholder: 'e.g., 09:00',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const minTime = value || '';
          if (minTime) {
            element.setAttribute('min-time', minTime);
          } else {
            element.removeAttribute('min-time');
          }
          (element as USWDSElement).minTime = minTime;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).minTime ?? element.getAttribute('min-time') ?? '';
        },
      },
    },

    // Max Time
    'max-time': {
      definition: {
        name: 'max-time',
        label: 'Maximum Time',
        type: 'text',
        default: '',
        placeholder: 'e.g., 17:00',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const maxTime = value || '';
          if (maxTime) {
            element.setAttribute('max-time', maxTime);
          } else {
            element.removeAttribute('max-time');
          }
          (element as USWDSElement).maxTime = maxTime;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).maxTime ?? element.getAttribute('max-time') ?? '';
        },
      },
    },

    // Step (minutes)
    step: {
      definition: {
        name: 'step',
        label: 'Step (minutes)',
        type: 'select',
        default: '30',
        options: [
          { id: '15', label: '15 minutes' },
          { id: '30', label: '30 minutes' },
          { id: '60', label: '1 hour' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const step = value || '30';
          element.setAttribute('step', step);
          (element as USWDSElement).step = step;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).step ?? element.getAttribute('step') ?? '30';
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
        onChange: (element: HTMLElement, value: any) => {
          const isRequired = coerceBoolean(value);
          if (isRequired) {
            element.setAttribute('required', '');
          } else {
            element.removeAttribute('required');
          }
          (element as USWDSElement).required = isRequired;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).required ?? element.hasAttribute('required');
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
        onChange: (element: HTMLElement, value: any) => {
          const isDisabled = coerceBoolean(value);
          if (isDisabled) {
            element.setAttribute('disabled', '');
          } else {
            element.removeAttribute('disabled');
          }
          (element as USWDSElement).disabled = isDisabled;
          if (typeof (element as USWDSElement).requestUpdate === 'function') {
            (element as USWDSElement).requestUpdate?.();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as USWDSElement).disabled ?? element.hasAttribute('disabled');
        },
      },
    },

    // Element ID - for conditional show/hide targeting
    id: createAttributeTrait('id', {
      label: 'Element ID (for show/hide)',
      type: 'text',
      default: '',
      placeholder: 'e.g., my-time-picker',
    }),
  },
});

}
