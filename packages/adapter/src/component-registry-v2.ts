/**
 * Unified USWDS Component Registry
 * Single source of truth for component traits (UI definitions + behavior handlers)
 */

import type { GrapesTrait } from './types.js';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Trait handler interface - defines how trait changes propagate to web components
 */
export interface TraitHandler {
  /**
   * Called when a trait value changes in GrapesJS
   */
  onChange: (element: HTMLElement, value: any, oldValue?: any) => void;

  /**
   * Optional: Read the current value from the web component
   */
  getValue?: (element: HTMLElement) => any;

  /**
   * Optional: Initialize the trait when component is first created
   */
  onInit?: (element: HTMLElement, defaultValue: any) => void;
}

/**
 * Unified trait - combines UI definition and behavior handler
 */
export interface UnifiedTrait {
  /** UI definition for GrapesJS trait panel */
  definition: GrapesTrait;

  /** Handler for trait value changes */
  handler: TraitHandler;
}

/**
 * Component registration - single source of truth for a USWDS component
 */
export interface ComponentRegistration {
  /** Web component tag name (e.g., 'usa-button') */
  tagName: string;

  /** Map of trait name to unified trait (definition + handler) */
  traits: Record<string, UnifiedTrait>;

  /** Whether component accepts child elements */
  droppable?: boolean | string;
}

/**
 * Retry configuration for internal element synchronization
 */
export interface RetryConfig {
  maxAttempts?: number; // Default: 10
  delayMs?: number; // Default: 50
  timeoutMs?: number; // Default: 500
}

// ============================================================================
// Trait Handler Factories
// ============================================================================

/**
 * Factory 1: Simple attribute handler
 * Use for: variant, href, size, name, label, placeholder, etc.
 *
 * Handles:
 * - Set/remove attribute based on value
 * - Optional default value removal (e.g., size="default" → remove attribute)
 *
 * @example
 * variant: createAttributeTrait({
 *   label: 'Variant',
 *   type: 'select',
 *   default: 'default',
 *   removeDefaults: ['default', ''],
 *   options: [
 *     { id: 'default', label: 'Default' },
 *     { id: 'secondary', label: 'Secondary' },
 *   ],
 * })
 */
export function createAttributeTrait(
  traitName: string,
  config: {
    label: string;
    type: 'text' | 'select' | 'number' | 'textarea';
    default?: string | number;
    placeholder?: string;
    options?: Array<{ id: string; label: string }>;
    removeDefaults?: Array<string | number>; // Values that should remove the attribute
    min?: number;
    max?: number;
  }
): UnifiedTrait {
  return {
    definition: {
      name: traitName,
      label: config.label,
      type: config.type,
      default: config.default,
      placeholder: config.placeholder,
      options: config.options,
      min: config.min,
      max: config.max,
    },

    handler: {
      onChange: (element, value) => {
        const shouldRemove =
          value === null ||
          value === undefined ||
          (config.removeDefaults && config.removeDefaults.includes(value));

        if (shouldRemove) {
          element.removeAttribute(traitName);
        } else {
          element.setAttribute(traitName, String(value));
        }
      },

      getValue: (element) => {
        return element.getAttribute(traitName) || (config.default ?? '');
      },
    },
  };
}

/**
 * Factory 2: Boolean attribute handler
 * Use for: disabled, required, checked, readonly, multiple, etc.
 *
 * Handles:
 * - Boolean coercion (true, 'true', '' → true)
 * - Set/remove boolean attribute
 * - Optional sync to internal element (for Light DOM components)
 *
 * @example
 * disabled: createBooleanTrait({
 *   label: 'Disabled',
 *   default: false,
 *   syncToInternal: 'button' // Sync to <button> inside web component
 * })
 */
export function createBooleanTrait(
  traitName: string,
  config: {
    label: string;
    default?: boolean;
    syncToInternal?: string; // CSS selector for internal element (Light DOM)
  }
): UnifiedTrait {
  // Shared boolean coercion logic
  const coerceBoolean = (value: any): boolean => {
    return value === true || value === 'true' || value === '';
  };

  return {
    definition: {
      name: traitName,
      label: config.label,
      type: 'checkbox',
      default: config.default ?? false,
    },

    handler: {
      onChange: (element, value) => {
        const isEnabled = coerceBoolean(value);

        // Set on web component
        if (isEnabled) {
          element.setAttribute(traitName, '');
        } else {
          element.removeAttribute(traitName);
        }

        // Sync to internal element if specified (Light DOM only)
        if (config.syncToInternal) {
          const internal = element.querySelector(config.syncToInternal);
          if (internal instanceof HTMLElement) {
            if (isEnabled) {
              internal.setAttribute(traitName, '');
              (internal as any)[traitName] = true; // Set property too
            } else {
              internal.removeAttribute(traitName);
              (internal as any)[traitName] = false;
            }
          }
        }
      },

      getValue: (element) => {
        return element.hasAttribute(traitName);
      },

      onInit: (element, value) => {
        const isEnabled = coerceBoolean(value);
        if (isEnabled) {
          element.setAttribute(traitName, '');
        }
      },
    },
  };
}

/**
 * Factory 3: Internal element sync handler (with retry logic)
 * Use for: text content that syncs to internal button/span/etc.
 *
 * Handles:
 * - Set attribute on web component (source of truth)
 * - Wait for internal element to exist (retry with exponential backoff)
 * - Sync textContent/innerHTML to internal element
 *
 * @example
 * text: createInternalSyncTrait({
 *   label: 'Button Text',
 *   default: 'Click me',
 *   internalSelector: 'button',
 *   syncProperty: 'textContent',
 *   retry: { maxAttempts: 10, delayMs: 50 }
 * })
 */
export function createInternalSyncTrait(
  traitName: string,
  config: {
    label: string;
    type?: 'text' | 'textarea';
    default?: string;
    placeholder?: string;
    internalSelector: string; // CSS selector for internal element (e.g., 'button')
    syncProperty: 'textContent' | 'innerHTML'; // Which property to sync
    retry?: RetryConfig;
  }
): UnifiedTrait {
  const retryConfig = {
    maxAttempts: config.retry?.maxAttempts ?? 10,
    delayMs: config.retry?.delayMs ?? 50,
    timeoutMs: config.retry?.timeoutMs ?? 500,
  };

  /**
   * Consolidated retry logic - single implementation
   */
  const syncWithRetry = (element: HTMLElement, value: string): void => {
    const attemptSync = (): boolean => {
      const internal = element.querySelector(config.internalSelector);
      if (internal instanceof HTMLElement) {
        (internal as any)[config.syncProperty] = value;
        return true;
      }
      return false;
    };

    // Try immediately
    if (attemptSync()) return;

    // Retry with interval
    let attempts = 0;

    const intervalId = setInterval(() => {
      attempts++;
      if (attemptSync() || attempts >= retryConfig.maxAttempts) {
        clearInterval(intervalId);
        if (attempts >= retryConfig.maxAttempts) {
          console.warn(
            `USWDS-PT: Could not sync '${traitName}' to '${config.internalSelector}' after ${retryConfig.maxAttempts} attempts`
          );
        }
      }
    }, retryConfig.delayMs);
  };

  return {
    definition: {
      name: traitName,
      label: config.label,
      type: config.type ?? 'text',
      default: config.default,
      placeholder: config.placeholder,
    },

    handler: {
      onChange: (element, value) => {
        // Set attribute on web component (source of truth)
        element.setAttribute(traitName, value || '');

        // Sync to internal element
        syncWithRetry(element, value || '');
      },

      getValue: (element) => {
        return element.getAttribute(traitName) || (config.default ?? '');
      },
    },
  };
}

// ============================================================================
// Component Registry
// ============================================================================

/**
 * Global component registry - single source of truth
 */
class ComponentRegistry {
  private components = new Map<string, ComponentRegistration>();

  /**
   * Register a component with type-safe traits
   */
  register(registration: ComponentRegistration): void {
    this.components.set(registration.tagName, registration);
  }

  /**
   * Get component registration by tag name
   */
  get(tagName: string): ComponentRegistration | undefined {
    return this.components.get(tagName);
  }

  /**
   * Get all registered components
   */
  getAll(): ComponentRegistration[] {
    return Array.from(this.components.values());
  }

  /**
   * Extract trait definitions for GrapesJS (UI only)
   */
  getTraitDefinitions(tagName: string): GrapesTrait[] {
    const component = this.components.get(tagName);
    if (!component) return [];

    return Object.entries(component.traits).map(([name, trait]) => ({
      ...trait.definition,
      name, // Ensure name is set
    }));
  }

  /**
   * Extract trait handlers for WebComponentTraitManager (behavior only)
   */
  getTraitHandlers(tagName: string): Record<string, TraitHandler> {
    const component = this.components.get(tagName);
    if (!component) return {};

    const handlers: Record<string, TraitHandler> = {};
    for (const [name, trait] of Object.entries(component.traits)) {
      handlers[name] = trait.handler;
    }
    return handlers;
  }
}

export const componentRegistry = new ComponentRegistry();

// ============================================================================
// Component Definitions
// ============================================================================

/**
 * USA Button Component
 *
 * Example of declarative component registration using trait factories.
 * Adding a new component is now just 10-20 lines of configuration.
 */
componentRegistry.register({
  tagName: 'usa-button',
  droppable: false,

  traits: {
    // Text content - syncs to internal <button> element
    text: createInternalSyncTrait('text', {
      label: 'Button Text',
      default: 'Click me',
      internalSelector: 'button',
      syncProperty: 'textContent',
    }),

    // Variant - simple attribute (removes 'default')
    variant: createAttributeTrait('variant', {
      label: 'Variant',
      type: 'select',
      default: 'default',
      removeDefaults: ['default', ''],
      options: [
        { id: 'default', label: 'Default' },
        { id: 'secondary', label: 'Secondary' },
        { id: 'accent-cool', label: 'Accent Cool' },
        { id: 'accent-warm', label: 'Accent Warm' },
        { id: 'base', label: 'Base' },
        { id: 'outline', label: 'Outline' },
        { id: 'inverse', label: 'Inverse' },
        { id: 'unstyled', label: 'Unstyled' },
      ],
    }),

    // Size - simple attribute (removes 'default')
    size: createAttributeTrait('size', {
      label: 'Size',
      type: 'select',
      default: 'default',
      removeDefaults: ['default', ''],
      options: [
        { id: 'default', label: 'Default' },
        { id: 'big', label: 'Big' },
      ],
    }),

    // Disabled - boolean with internal sync
    disabled: createBooleanTrait('disabled', {
      label: 'Disabled',
      default: false,
      syncToInternal: 'button',
    }),

    // Href - simple attribute
    href: createAttributeTrait('href', {
      label: 'Link URL',
      type: 'text',
      placeholder: 'https://...',
      removeDefaults: [''],
    }),
  },
});

/**
 * USA Text Input Component
 *
 * Standard text input field with USWDS styling and accessibility features.
 */
componentRegistry.register({
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
        { id: '', label: 'Default' },
        { id: '2xs', label: '2XS (5 characters)' },
        { id: 'xs', label: 'XS (9 characters)' },
        { id: 'sm', label: 'Small (13 characters)' },
        { id: 'md', label: 'Medium (20 characters)' },
        { id: 'lg', label: 'Large (30 characters)' },
        { id: 'xl', label: 'XL (40 characters)' },
        { id: '2xl', label: '2XL (50 characters)' },
      ],
    }),

    // Error - error state
    error: createBooleanTrait('error', {
      label: 'Error State',
      default: false,
    }),

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
  },
});

/**
 * USA Textarea Component
 *
 * Multi-line text input field with USWDS styling and accessibility features.
 */
componentRegistry.register({
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
        { id: '', label: 'Default' },
        { id: '2xs', label: '2XS (5 characters)' },
        { id: 'xs', label: 'XS (9 characters)' },
        { id: 'sm', label: 'Small (13 characters)' },
        { id: 'md', label: 'Medium (20 characters)' },
        { id: 'lg', label: 'Large (30 characters)' },
        { id: 'xl', label: 'XL (40 characters)' },
        { id: '2xl', label: '2XL (50 characters)' },
      ],
    }),

    // Error - error state
    error: createBooleanTrait('error', {
      label: 'Error State',
      default: false,
    }),

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
  },
});

/**
 * USA Checkbox Component
 *
 * Checkbox input with label and USWDS styling.
 */
componentRegistry.register({
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
      label: 'Name',
      type: 'text',
      default: 'field',
      placeholder: 'field-name',
    }),

    // Value - value when checked
    value: createAttributeTrait('value', {
      label: 'Value',
      type: 'text',
      default: 'on',
      placeholder: 'on',
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
  },
});

/**
 * USA Radio Component
 *
 * Radio button input with label and USWDS styling.
 */
componentRegistry.register({
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
      label: 'Name',
      type: 'text',
      default: 'radio-group',
      placeholder: 'radio-group',
    }),

    // Value - value when selected
    value: createAttributeTrait('value', {
      label: 'Value',
      type: 'text',
      default: '1',
      placeholder: 'value',
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
  },
});

/**
 * USA Select Component
 *
 * Dropdown select input with USWDS styling.
 */
componentRegistry.register({
  tagName: 'usa-select',
  droppable: false,

  traits: {
    // Label - displayed above select
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
  },
});

/**
 * USA Fieldset Component
 *
 * Semantic grouping container for related form controls (radio buttons, checkboxes).
 * Uses <fieldset> and <legend> for accessibility and proper form structure.
 */
componentRegistry.register({
  tagName: 'usa-fieldset',
  droppable: true, // Can contain other components

  traits: {
    // Legend - label for the group
    legend: createAttributeTrait('legend', {
      label: 'Legend',
      type: 'text',
      default: 'Select an option',
      placeholder: 'Group label',
    }),

    // Error - error state
    error: createBooleanTrait('error', {
      label: 'Error State',
      default: false,
    }),
  },
});
