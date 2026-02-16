/**
 * Text Input Components
 *
 * Registers text entry components:
 * usa-text-input, usa-textarea
 */

import type { ComponentRegistration } from './shared-utils.js';
import {
  createAttributeTrait,
  createBooleanTrait,
} from './shared-utils.js';
import type { RegistryLike } from './shared-utils.js';
import { createFormHintTrait, createErrorMessageTrait } from './form-trait-factories.js';

export function registerTextInputComponents(registry: RegistryLike): void {

/**
 * USA Text Input Component
 *
 * Standard text input field with USWDS styling and accessibility features.
 */
registry.register({
  tagName: 'usa-text-input',
  droppable: false,

  traits: {
    // Label - displayed above input
    label: createAttributeTrait('label', {
      label: 'Label',
      type: 'text',
      default: 'Label',
    }),

    // Name - form field name
    name: createAttributeTrait('name', {
      label: 'Name',
      type: 'text',
      default: 'field',
      placeholder: 'field-name',
    }),

    // Placeholder - hint text inside input
    placeholder: createAttributeTrait('placeholder', {
      label: 'Placeholder',
      type: 'text',
      placeholder: 'Enter text...',
      removeDefaults: [''],
    }),

    // Type - input type
    type: createAttributeTrait('type', {
      label: 'Input Type',
      type: 'select',
      default: 'text',
      removeDefaults: ['text'],
      options: [
        { id: 'text', label: 'Text' },
        { id: 'email', label: 'Email' },
        { id: 'tel', label: 'Telephone' },
        { id: 'url', label: 'URL' },
        { id: 'number', label: 'Number' },
        { id: 'password', label: 'Password' },
      ],
    }),

    // Value - default value
    value: createAttributeTrait('value', {
      label: 'Default Value',
      type: 'text',
      placeholder: '',
      removeDefaults: [''],
    }),

    // Width - responsive width option
    width: createAttributeTrait('width', {
      label: 'Width',
      type: 'select',
      default: '',
      removeDefaults: ['', 'default'],
      options: [
        { id: 'default', label: 'Default' },
        { id: '2xs', label: '2XS (5 characters)' },
        { id: 'xs', label: 'XS (9 characters)' },
        { id: 'sm', label: 'Small (13 characters)' },
        { id: 'md', label: 'Medium (20 characters)' },
        { id: 'lg', label: 'Large (30 characters)' },
        { id: 'xl', label: 'XL (40 characters)' },
        { id: '2xl', label: '2XL (50 characters)' },
      ],
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

    // Success - success state
    success: createBooleanTrait('success', {
      label: 'Success State',
      default: false,
    }),

    // Required - boolean flag
    required: createBooleanTrait('required', {
      label: 'Required',
      default: false,
      syncToInternal: 'input',
    }),

    // Disabled - boolean flag
    disabled: createBooleanTrait('disabled', {
      label: 'Disabled',
      default: false,
      syncToInternal: 'input',
    }),

    // Readonly - boolean flag
    readonly: createBooleanTrait('readonly', {
      label: 'Read Only',
      default: false,
      syncToInternal: 'input',
    }),

    // Element ID - for conditional show/hide targeting
    id: createAttributeTrait('id', {
      label: 'Element ID (for show/hide)',
      type: 'text',
      default: '',
      placeholder: 'e.g., my-text-field',
    }),
  },
});

/**
 * USA Textarea Component
 *
 * Multi-line text input field with USWDS styling and accessibility features.
 */
registry.register({
  tagName: 'usa-textarea',
  droppable: false,

  traits: {
    // Label - displayed above textarea
    label: createAttributeTrait('label', {
      label: 'Label',
      type: 'text',
      default: 'Label',
    }),

    // Name - form field name
    name: createAttributeTrait('name', {
      label: 'Name',
      type: 'text',
      default: 'field',
      placeholder: 'field-name',
    }),

    // Placeholder - hint text inside textarea
    placeholder: createAttributeTrait('placeholder', {
      label: 'Placeholder',
      type: 'text',
      placeholder: 'Enter text...',
      removeDefaults: [''],
    }),

    // Rows - number of visible text lines
    rows: createAttributeTrait('rows', {
      label: 'Rows',
      type: 'number',
      default: 5,
      min: 1,
      max: 20,
      removeDefaults: [5],
    }),

    // Value - default value
    value: createAttributeTrait('value', {
      label: 'Default Value',
      type: 'textarea',
      placeholder: '',
      removeDefaults: [''],
    }),

    // Width - responsive width option
    width: createAttributeTrait('width', {
      label: 'Width',
      type: 'select',
      default: '',
      removeDefaults: ['', 'default'],
      options: [
        { id: 'default', label: 'Default' },
        { id: '2xs', label: '2XS (5 characters)' },
        { id: 'xs', label: 'XS (9 characters)' },
        { id: 'sm', label: 'Small (13 characters)' },
        { id: 'md', label: 'Medium (20 characters)' },
        { id: 'lg', label: 'Large (30 characters)' },
        { id: 'xl', label: 'XL (40 characters)' },
        { id: '2xl', label: '2XL (50 characters)' },
      ],
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

    // Success - success state
    success: createBooleanTrait('success', {
      label: 'Success State',
      default: false,
    }),

    // Required - boolean flag
    required: createBooleanTrait('required', {
      label: 'Required',
      default: false,
      syncToInternal: 'textarea',
    }),

    // Disabled - boolean flag
    disabled: createBooleanTrait('disabled', {
      label: 'Disabled',
      default: false,
      syncToInternal: 'textarea',
    }),

    // Readonly - boolean flag
    readonly: createBooleanTrait('readonly', {
      label: 'Read Only',
      default: false,
      syncToInternal: 'textarea',
    }),

    // Element ID - for conditional show/hide targeting
    id: createAttributeTrait('id', {
      label: 'Element ID (for show/hide)',
      type: 'text',
      default: '',
      placeholder: 'e.g., my-textarea',
    }),
  },
});

}
