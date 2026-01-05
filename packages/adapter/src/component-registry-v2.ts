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
   * @param element - The DOM element
   * @param value - The new value
   * @param oldValue - The previous value (optional)
   * @param component - The GrapesJS component (optional, for advanced handlers that need to add/remove child components)
   */
  onChange: (element: HTMLElement, value: any, oldValue?: any, component?: any) => void;

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
// Interval Tracking for Memory Leak Prevention
// ============================================================================

/**
 * Track active intervals by element to prevent memory leaks.
 * Key format: element-id:trait-name
 */
const activeIntervals = new Map<string, ReturnType<typeof setInterval>>();

/**
 * WeakMap to track elements currently being assigned IDs (prevents infinite recursion)
 */
const settingIdElements = new WeakSet<HTMLElement>();

/**
 * Generate a unique key for tracking intervals per element/trait
 */
function getIntervalKey(element: HTMLElement, traitName: string): string {
  // Guard: check if element is a valid HTMLElement
  if (!element || typeof element.getAttribute !== 'function') {
    return `invalid-element:${traitName}`;
  }

  // Use a data attribute to give elements a stable ID for tracking
  let elementId = element.getAttribute('data-uswds-pt-id');
  if (!elementId) {
    // Prevent infinite recursion: if we're already setting ID for this element, use a temp ID
    if (settingIdElements.has(element)) {
      return `temp-${Date.now()}:${traitName}`;
    }

    settingIdElements.add(element);
    try {
      elementId = `uswds-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      element.setAttribute('data-uswds-pt-id', elementId);
    } finally {
      settingIdElements.delete(element);
    }
  }
  return `${elementId}:${traitName}`;
}

/**
 * Cancel any pending interval for a specific element/trait
 */
function cancelPendingSync(element: HTMLElement, traitName: string): void {
  const key = getIntervalKey(element, traitName);
  const existingInterval = activeIntervals.get(key);
  if (existingInterval) {
    clearInterval(existingInterval);
    activeIntervals.delete(key);
  }
}

/**
 * Clean up all intervals for a specific element (call on unmount)
 */
export function cleanupElementIntervals(element: HTMLElement): void {
  // Guard: check if element is a valid HTMLElement
  if (!element || typeof element.getAttribute !== 'function') {
    return;
  }

  const elementId = element.getAttribute('data-uswds-pt-id');
  if (!elementId) return;

  const keysToDelete: string[] = [];
  activeIntervals.forEach((interval, key) => {
    if (key.startsWith(`${elementId}:`)) {
      clearInterval(interval);
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => activeIntervals.delete(key));
}

/**
 * Clean up all active intervals (call on editor destroy)
 */
export function cleanupAllIntervals(): void {
  activeIntervals.forEach(interval => clearInterval(interval));
  activeIntervals.clear();
}

// ============================================================================
// Type Coercion Utilities
// ============================================================================

/**
 * Consistently coerce a value to boolean.
 * Handles all the ways a boolean can be represented:
 * - boolean true/false
 * - string 'true'/'false'
 * - empty string '' (truthy for HTML boolean attributes)
 * - null/undefined (falsy)
 *
 * @example
 * coerceBoolean(true)      // true
 * coerceBoolean('true')    // true
 * coerceBoolean('')        // true (HTML boolean attribute)
 * coerceBoolean(false)     // false
 * coerceBoolean('false')   // false
 * coerceBoolean(null)      // false
 * coerceBoolean(undefined) // false
 */
export function coerceBoolean(value: any): boolean {
  if (value === true || value === 'true' || value === '') {
    return true;
  }
  return false;
}

/**
 * Check if an element has a boolean attribute set to true.
 * Uses consistent coercion logic.
 */
export function hasAttributeTrue(element: HTMLElement, attributeName: string): boolean {
  if (!element.hasAttribute(attributeName)) {
    return false;
  }
  const value = element.getAttribute(attributeName);
  // For boolean attributes, presence means true (even with empty string or 'true')
  return value === '' || value === 'true' || value === attributeName;
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
  // Uses global coerceBoolean helper for consistent boolean handling

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
   * Consolidated retry logic - single implementation with proper cleanup
   */
  const syncWithRetry = (element: HTMLElement, value: string): void => {
    // Cancel any existing interval for this element/trait to prevent accumulation
    cancelPendingSync(element, traitName);

    const attemptSync = (): boolean => {
      // Check if element is still in DOM before attempting sync
      if (!element.isConnected) {
        cancelPendingSync(element, traitName);
        return true; // Return true to stop retrying
      }

      const internal = element.querySelector(config.internalSelector);
      if (internal instanceof HTMLElement) {
        (internal as any)[config.syncProperty] = value;
        return true;
      }
      return false;
    };

    // Try immediately
    if (attemptSync()) return;

    // Retry with interval (tracked for cleanup)
    let attempts = 0;
    const key = getIntervalKey(element, traitName);

    const intervalId = setInterval(() => {
      attempts++;
      if (attemptSync() || attempts >= retryConfig.maxAttempts) {
        clearInterval(intervalId);
        activeIntervals.delete(key);
        if (attempts >= retryConfig.maxAttempts && element.isConnected) {
          console.warn(
            `USWDS-PT: Could not sync '${traitName}' to '${config.internalSelector}' after ${retryConfig.maxAttempts} attempts`
          );
        }
      }
    }, retryConfig.delayMs);

    // Track the interval for cleanup
    activeIntervals.set(key, intervalId);
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
   * Note: Function-based properties (like 'visible') are stripped as they can't be serialized
   */
  getTraitDefinitions(tagName: string): GrapesTrait[] {
    const component = this.components.get(tagName);
    if (!component) return [];

    return Object.entries(component.traits).map(([name, trait]) => {
      // Create a clean copy of the definition without function properties
      const cleanDefinition: Record<string, any> = { name };

      for (const [key, value] of Object.entries(trait.definition)) {
        // Skip function-based properties that can't be serialized
        if (typeof value !== 'function') {
          cleanDefinition[key] = value;
        }
      }

      return cleanDefinition as GrapesTrait;
    });
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

  /**
   * Extract trait default values (for initialization)
   */
  getTraitDefaults(tagName: string): Record<string, any> {
    const component = this.components.get(tagName);
    if (!component) return {};

    const defaults: Record<string, any> = {};
    for (const [name, trait] of Object.entries(component.traits)) {
      if (trait.definition.default !== undefined) {
        defaults[name] = trait.definition.default;
      }
    }
    return defaults;
  }
}

export const componentRegistry = new ComponentRegistry();

// ============================================================================
// Page Link Traits
// ============================================================================

/**
 * Create page link traits for button/link components.
 * Allows users to easily link to other pages in the prototype.
 *
 * The page-link select options are populated dynamically by the Editor
 * when a component is selected (see Editor.tsx).
 */
function createPageLinkTraits(): Record<string, UnifiedTrait> {
  // Visibility for page-link: only when link-type is 'page'
  const pageLinkVisible = (component: any) => {
    try {
      if (!component?.get) return false;
      const attrs = component.get('attributes');
      return attrs?.['link-type'] === 'page';
    } catch {
      return false;
    }
  };

  // Visibility for href: only when link-type is 'external'
  const externalLinkVisible = (component: any) => {
    try {
      if (!component?.get) return false;
      const attrs = component.get('attributes');
      return attrs?.['link-type'] === 'external';
    } catch {
      return false;
    }
  };

  return {
    'link-type': {
      definition: {
        name: 'link-type',
        label: 'Link To',
        type: 'select',
        default: 'none',
        options: [
          { id: 'none', label: 'None (Button Only)' },
          { id: 'page', label: 'Page in Prototype' },
          { id: 'external', label: 'External URL' },
        ],
        category: { id: 'link', label: 'Link' },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const linkType = value || 'none';
          element.setAttribute('link-type', linkType);

          // Clear href when switching to 'none'
          if (linkType === 'none') {
            element.removeAttribute('href');
          }
        },
        getValue: (element: HTMLElement) => {
          // Infer link-type from existing href if not set
          const linkType = element.getAttribute('link-type');
          if (linkType) return linkType;

          const href = element.getAttribute('href');
          if (!href) return 'none';
          if (href.startsWith('#page-')) return 'page';
          return 'external';
        },
      },
    },

    'page-link': {
      definition: {
        name: 'page-link',
        label: 'Select Page',
        type: 'select',
        default: '',
        // Options are populated dynamically by Editor.tsx
        options: [
          { id: '', label: '-- Select a page --' },
        ],
        visible: pageLinkVisible,
        category: { id: 'link', label: 'Link' },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            // Set href to page anchor format
            element.setAttribute('href', `#page-${value}`);
            element.setAttribute('page-link', value);
          } else {
            element.removeAttribute('href');
            element.removeAttribute('page-link');
          }
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('page-link') || '';
        },
      },
    },

    href: {
      definition: {
        name: 'href',
        label: 'URL',
        type: 'text',
        default: '',
        placeholder: 'https://example.com',
        visible: externalLinkVisible,
        category: { id: 'link', label: 'Link' },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('href', value);
          } else {
            element.removeAttribute('href');
          }
        },
        getValue: (element: HTMLElement) => {
          const href = element.getAttribute('href') || '';
          // Only return href if it's not a page link
          if (href.startsWith('#page-')) return '';
          return href;
        },
      },
    },
  };
}

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

    // Page link traits - link to pages or external URLs
    ...createPageLinkTraits(),
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
 * USA File Input Component
 *
 * File upload input with USWDS styling.
 */
componentRegistry.register({
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
  },
});

/**
 * USA Range Slider Component
 *
 * Range slider input with USWDS styling.
 */
componentRegistry.register({
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
        onChange: (element: HTMLElement, value: any) => {
          // Parse value as number, default to 0 for empty/invalid
          const parsed = parseFloat(value);
          const minValue = isNaN(parsed) ? 0 : parsed;

          // Set property directly on web component (Lit reactive property)
          (element as any).min = minValue;

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
            (element as any).value = clampedValue;
          }

          // Force Lit to re-render
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          // Read from Lit property first
          if ((element as any).min !== undefined) {
            return (element as any).min;
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
        onChange: (element: HTMLElement, value: any) => {
          // Parse value as number, default to 100 for empty/invalid
          const parsed = parseFloat(value);
          const maxValue = isNaN(parsed) ? 100 : parsed;

          // Set property directly on web component (Lit reactive property)
          (element as any).max = maxValue;

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
            (element as any).value = clampedValue;
          }

          // Force Lit to re-render
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          // Read from Lit property first
          if ((element as any).max !== undefined) {
            return (element as any).max;
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
        onChange: (element: HTMLElement, value: any) => {
          // Parse value as number, default to 1 for empty/invalid
          const parsed = parseFloat(value);
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
        onChange: (element: HTMLElement, value: any) => {
          // Parse value as number, default to 50 for empty/invalid
          const parsed = parseFloat(value);
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

    // Disabled - boolean flag
    disabled: createBooleanTrait('disabled', {
      label: 'Disabled',
      default: false,
      syncToInternal: 'input[type="range"]',
    }),
  },
});

/**
 * USA Date Picker Component
 *
 * Date input with calendar popup for date selection.
 */
componentRegistry.register({
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
          (element as any).label = label;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
          (element as any).name = name;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
          (element as any).hint = hint;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
            element.setAttribute('minDate', minDate);
          } else {
            element.removeAttribute('minDate');
          }
          (element as any).minDate = minDate;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
            element.setAttribute('maxDate', maxDate);
          } else {
            element.removeAttribute('maxDate');
          }
          (element as any).maxDate = maxDate;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
          (element as any).required = isRequired;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

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
          (element as any).disabled = isDisabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },
  },
});

/**
 * USA Time Picker Component
 *
 * Time input with dropdown for time selection.
 */
componentRegistry.register({
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
          (element as any).label = label;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
          (element as any).name = name;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
          (element as any).hint = hint;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
            element.setAttribute('minTime', minTime);
          } else {
            element.removeAttribute('minTime');
          }
          (element as any).minTime = minTime;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
            element.setAttribute('maxTime', maxTime);
          } else {
            element.removeAttribute('maxTime');
          }
          (element as any).maxTime = maxTime;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
          (element as any).step = step;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
          (element as any).required = isRequired;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

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
          (element as any).disabled = isDisabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },
  },
});

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
  (element as any).options = options;
  if (typeof (element as any).requestUpdate === 'function') {
    (element as any).requestUpdate();
  }
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
  const visibleFn = (component: any) => {
    const count = parseInt(component.get('attributes')?.['option-count'] || '3', 10);
    return optionNum <= count;
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
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('option-count') || '3', 10);
        if (optionNum <= count) {
          rebuildComboBoxOptions(element, count);
        }
      },
    },
  };
}

/**
 * USA Combo Box Component
 *
 * Searchable dropdown with typeahead filtering.
 */
componentRegistry.register({
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
        onChange: (element: HTMLElement, value: any) => {
          const label = value || 'Select an option';
          element.setAttribute('label', label);
          (element as any).label = label;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
        onChange: (element: HTMLElement, value: any) => {
          const name = value || 'combo-box';
          element.setAttribute('name', name);
          (element as any).name = name;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
        onChange: (element: HTMLElement, value: any) => {
          const placeholder = value || '';
          if (placeholder) {
            element.setAttribute('placeholder', placeholder);
          } else {
            element.removeAttribute('placeholder');
          }
          (element as any).placeholder = placeholder;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
          (element as any).hint = hint;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
        onChange: (element: HTMLElement, value: any) => {
          const count = parseInt(value || '3', 10);
          element.setAttribute('option-count', String(count));
          rebuildComboBoxOptions(element, count);
        },
        onInit: (element: HTMLElement, value: any) => {
          setTimeout(() => {
            const count = parseInt(value || '3', 10);
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
        onChange: (element: HTMLElement, value: any) => {
          const isDisabled = coerceBoolean(value);
          if (isDisabled) {
            element.setAttribute('disableFiltering', '');
          } else {
            element.removeAttribute('disableFiltering');
          }
          (element as any).disableFiltering = isDisabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
          (element as any).required = isRequired;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

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
          (element as any).disabled = isDisabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
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
/**
 * USA Fieldset Component
 *
 * A fieldset container for grouping form controls with a legend.
 * Used for checkbox groups, radio groups, and other related form fields.
 */
componentRegistry.register({
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
        onChange: (element: HTMLElement, value: any, _oldValue?: any, component?: any) => {
          const targetCount = Math.max(1, Math.min(10, parseInt(value) || 3));

          // Find existing checkboxes or radios
          const checkboxes = element.querySelectorAll('usa-checkbox');
          const radios = element.querySelectorAll('usa-radio');

          // Determine which type we're working with
          const isCheckbox = checkboxes.length > 0;
          const isRadio = radios.length > 0;
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
                component.components().add({
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

componentRegistry.register({
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
        { id: '', label: 'Default' },
        { id: 'external', label: 'External' },
        { id: 'unstyled', label: 'Unstyled' },
      ],
    }),

    // Target - link target
    target: createAttributeTrait('target', {
      label: 'Target',
      type: 'select',
      default: '',
      removeDefaults: ['', '_self'],
      options: [
        { id: '', label: 'Same Window' },
        { id: '_blank', label: 'New Window' },
      ],
    }),
  },
});

/**
 * USA Button Group Component
 *
 * Groups multiple buttons together with proper spacing and optional segmented style.
 * Uses dynamic traits for easy editing of individual buttons.
 */

// Helper function to rebuild button group buttons from individual traits
// Uses DOM methods instead of innerHTML to preserve event listeners
function rebuildButtonGroupButtons(element: HTMLElement, count: number): void {
  // Find the ul container (button group renders as ul > li > button)
  let ul = element.querySelector('ul.usa-button-group');

  // If no ul exists yet, the component may need to render first
  if (!ul) {
    // Try to trigger initial render
    if (typeof (element as any).requestUpdate === 'function') {
      (element as any).requestUpdate();
    }
    return;
  }

  // Get existing list items
  const existingItems = ul.querySelectorAll('li.usa-button-group__item');
  const existingCount = existingItems.length;

  // Update existing buttons or create new ones
  for (let i = 1; i <= count; i++) {
    const text = element.getAttribute(`btn${i}-text`) || `Button ${i}`;
    const variant = element.getAttribute(`btn${i}-variant`) || '';

    if (i <= existingCount) {
      // Update existing button in place
      const li = existingItems[i - 1];
      const button = li.querySelector('button');
      if (button) {
        button.textContent = text;
        // Reset button classes and apply variant
        button.className = 'usa-button';
        if (variant && variant !== 'default') {
          button.classList.add(`usa-button--${variant}`);
        }
      }
    } else {
      // Create new button
      const li = document.createElement('li');
      li.className = 'usa-button-group__item';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'usa-button';
      if (variant && variant !== 'default') {
        button.classList.add(`usa-button--${variant}`);
      }
      button.textContent = text;

      li.appendChild(button);
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
}

// Helper to create a button group item trait
function createButtonGroupItemTrait(index: number, type: 'text' | 'variant') {
  const attrName = `btn${index}-${type}`;
  const isText = type === 'text';

  // Visibility function - only show if index <= btn-count
  const visibleFn = (component: any) => {
    const count = parseInt(component.get('attributes')?.['btn-count'] || '2', 10);
    return index <= count;
  };

  return {
    definition: {
      name: attrName,
      label: `Button ${index} ${isText ? 'Text' : 'Variant'}`,
      type: isText ? 'text' : 'select',
      default: isText ? `Button ${index}` : (index === 1 ? 'default' : 'outline'),
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
        const count = parseInt(element.getAttribute('btn-count') || '2') || 2;
        rebuildButtonGroupButtons(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) || '';
      },
    },
  };
}

componentRegistry.register({
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
          const count = Math.max(1, Math.min(4, parseInt(value) || 2));
          element.setAttribute('btn-count', String(count));
          setTimeout(() => rebuildButtonGroupButtons(element, count), 100);
        },
        onChange: (element: HTMLElement, value: any) => {
          const count = Math.max(1, Math.min(4, parseInt(value) || 2));
          element.setAttribute('btn-count', String(count));
          rebuildButtonGroupButtons(element, count);
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('btn-count') || '2';
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
componentRegistry.register({
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
  const items: Array<{ label: string; href: string; current?: boolean }> = [];

  for (let i = 1; i <= count; i++) {
    const label = element.getAttribute(`item${i}-label`) || `Item ${i}`;
    const href = element.getAttribute(`item${i}-href`) || '#';
    const isLast = i === count;

    items.push({
      label,
      href: isLast ? undefined! : href, // Last item doesn't need href
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
function createBreadcrumbItemTrait(index: number, type: 'label' | 'href') {
  const attrName = `item${index}-${type}`;
  const isLabel = type === 'label';

  // Visibility function - only show if index <= count
  const visibleFn = (component: any) => {
    const count = parseInt(component.get('attributes')?.['count'] || '3', 10);
    return index <= count;
  };

  return {
    definition: {
      name: attrName,
      label: `Item ${index} ${isLabel ? 'Label' : 'URL'}`,
      type: 'text',
      default: isLabel ? (index === 1 ? 'Home' : index === 2 ? 'Section' : 'Current Page') : '#',
      placeholder: isLabel ? 'Link text' : 'https://...',
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('count') || '3') || 3;
        rebuildBreadcrumbItems(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) || '';
      },
    },
  };
}

componentRegistry.register({
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
          const count = Math.max(1, Math.min(6, parseInt(value) || 3));
          element.setAttribute('count', String(count));
          setTimeout(() => rebuildBreadcrumbItems(element, count), 100);
        },
        onChange: (element: HTMLElement, value: any) => {
          const count = Math.max(1, Math.min(6, parseInt(value) || 3));
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
componentRegistry.register({
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
          const page = parseInt(value) || 1;
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
          const pages = parseInt(value) || 5;
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
function createSideNavItemTrait(index: number, type: 'label' | 'href' | 'current') {
  const attrName = `item${index}-${type}`;
  const isLabel = type === 'label';
  const isCurrent = type === 'current';

  // Visibility function - only show if index <= count
  const visibleFn = (component: any) => {
    const count = parseInt(component.get('attributes')?.['count'] || '4', 10);
    return index <= count;
  };

  if (isCurrent) {
    // Boolean trait for "current" (active page)
    return {
      definition: {
        name: attrName,
        label: `Item ${index} Current`,
        type: 'checkbox',
        default: index === 3, // Third item is current by default
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
          const count = parseInt(element.getAttribute('count') || '4') || 4;
          rebuildSideNavItems(element, count);
        },
        getValue: (element: HTMLElement) => {
          return hasAttributeTrue(element, attrName);
        },
      },
    };
  }

  return {
    definition: {
      name: attrName,
      label: `Item ${index} ${isLabel ? 'Label' : 'URL'}`,
      type: 'text',
      default: isLabel
        ? (index === 1 ? 'Home' : index === 2 ? 'About' : index === 3 ? 'Services' : 'Contact')
        : '#',
      placeholder: isLabel ? 'Link text' : 'https://...',
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('count') || '4') || 4;
        rebuildSideNavItems(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) || '';
      },
    },
  };
}

componentRegistry.register({
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
          const count = Math.max(1, Math.min(8, parseInt(value) || 4));
          element.setAttribute('count', String(count));
          setTimeout(() => rebuildSideNavItems(element, count), 100);
        },
        onChange: (element: HTMLElement, value: any) => {
          const count = Math.max(1, Math.min(8, parseInt(value) || 4));
          element.setAttribute('count', String(count));
          rebuildSideNavItems(element, count);
        },
        getValue: (element: HTMLElement) => {
          return parseInt(element.getAttribute('count') || '4') || 4;
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

// ============================================================================
// Data Display Components
// ============================================================================

/**
 * USA Card Component
 *
 * A flexible card component for displaying content with optional media.
 */
componentRegistry.register({
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('heading', text);
          (element as any).heading = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).heading || element.getAttribute('heading') || '';
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('text', text);
          (element as any).text = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).text || element.getAttribute('text') || '';
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
        onChange: (element: HTMLElement, value: any) => {
          const level = value || '3';
          element.setAttribute('heading-level', level);
          (element as any).headingLevel = level;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).headingLevel || element.getAttribute('heading-level') || '3';
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
        onChange: (element: HTMLElement, value: any) => {
          const mediaType = value || 'none';
          element.setAttribute('mediaType', mediaType);
          (element as any).mediaType = mediaType;

          // Auto-set placeholder media when switching to image/video if no src set
          const currentSrc = element.getAttribute('mediaSrc') || '';
          if (mediaType === 'image' && !currentSrc) {
            const placeholderImage = 'https://picsum.photos/800/450';
            element.setAttribute('mediaSrc', placeholderImage);
            (element as any).mediaSrc = placeholderImage;
            element.setAttribute('media-alt', 'Placeholder image');
            (element as any).mediaAlt = 'Placeholder image';
          } else if (mediaType === 'video' && !currentSrc) {
            // Use a public domain sample video
            const placeholderVideo = 'https://www.w3schools.com/html/mov_bbb.mp4';
            element.setAttribute('mediaSrc', placeholderVideo);
            (element as any).mediaSrc = placeholderVideo;
            element.setAttribute('media-alt', 'Sample video');
            (element as any).mediaAlt = 'Sample video';
          }

          // Trigger re-render
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('mediaType') || 'none';
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
        onChange: (element: HTMLElement, value: any) => {
          element.setAttribute('mediaSrc', value || '');
          (element as any).mediaSrc = value || '';
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return element.getAttribute('mediaSrc') || '';
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
        onChange: (element: HTMLElement, value: any) => {
          element.setAttribute('media-alt', value || '');
          (element as any).mediaAlt = value || '';
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
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
        onChange: (element: HTMLElement, value: any) => {
          const position = value || 'inset';
          element.setAttribute('mediaPosition', position);
          (element as any).mediaPosition = position;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).mediaPosition || element.getAttribute('mediaPosition') || 'inset';
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
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('flagLayout', '');
          } else {
            element.removeAttribute('flagLayout');
          }
          (element as any).flagLayout = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).flagLayout || element.hasAttribute('flagLayout');
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
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('headerFirst', '');
          } else {
            element.removeAttribute('headerFirst');
          }
          (element as any).headerFirst = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).headerFirst || element.hasAttribute('headerFirst');
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('footer-text', text);
          (element as any).footerText = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).footerText || element.getAttribute('footer-text') || '';
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
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('actionable', '');
          } else {
            element.removeAttribute('actionable');
          }
          (element as any).actionable = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).actionable || element.hasAttribute('actionable');
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
        onChange: (element: HTMLElement, value: any) => {
          const url = value || '';
          if (url) {
            element.setAttribute('href', url);
          } else {
            element.removeAttribute('href');
          }
          (element as any).href = url;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).href || element.getAttribute('href') || '';
        },
      },
    },

    // Link target
    target: {
      definition: {
        name: 'target',
        label: 'Link Target',
        type: 'select',
        default: '',
        options: [
          { id: '', label: 'Same Window' },
          { id: '_blank', label: 'New Window' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const target = value || '';
          if (target) {
            element.setAttribute('target', target);
          } else {
            element.removeAttribute('target');
          }
          (element as any).target = target;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).target || element.getAttribute('target') || '';
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
componentRegistry.register({
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Tag';
          element.setAttribute('text', text);
          (element as any).text = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).text || element.getAttribute('text') || 'Tag';
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
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('big', '');
          } else {
            element.removeAttribute('big');
          }
          (element as any).big = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).big || element.hasAttribute('big');
        },
      },
    },
  },
});

/**
 * USA Icon Component
 *
 * USWDS icons for visual communication.
 * Supports all USWDS icons with configurable size and accessibility options.
 */
componentRegistry.register({
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
        onChange: (element: HTMLElement, value: any) => {
          const name = value || 'info';
          element.setAttribute('name', name);
          (element as any).name = name;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).name || element.getAttribute('name') || 'info';
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
          { id: '', label: 'Default' },
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
        onChange: (element: HTMLElement, value: any) => {
          if (value && value !== '') {
            element.setAttribute('size', value);
          } else {
            element.removeAttribute('size');
          }
          (element as any).size = value || '';
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).size || element.getAttribute('size') || '';
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
        onChange: (element: HTMLElement, value: any) => {
          const label = value?.trim() || '';
          if (label) {
            element.setAttribute('aria-label', label);
          } else {
            element.removeAttribute('aria-label');
          }
          (element as any).ariaLabel = label;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).ariaLabel || element.getAttribute('aria-label') || '';
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
        onChange: (element: HTMLElement, value: any) => {
          const isDecorative = value === true || value === 'true';
          if (isDecorative) {
            element.setAttribute('decorative', 'true');
          } else {
            element.removeAttribute('decorative');
          }
          (element as any).decorative = isDecorative ? 'true' : '';
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
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
  let list = element.querySelector(listTag);
  if (!list) {
    // Try to trigger initial render
    if (typeof (element as any).requestUpdate === 'function') {
      (element as any).requestUpdate();
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
function createListItemTrait(index: number) {
  const attrName = `item${index}`;

  // Visibility function - only show if index <= count
  const visibleFn = (component: any) => {
    const count = parseInt(component.get('attributes')?.['count'] || '3', 10);
    return index <= count;
  };

  return {
    definition: {
      name: attrName,
      label: `Item ${index}`,
      type: 'text',
      default: `List item ${index}`,
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('count') || '3') || 3;
        rebuildListItems(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) || '';
      },
    },
  };
}

componentRegistry.register({
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
        onChange: (element: HTMLElement, value: any) => {
          element.setAttribute('type', value || 'unordered');
          // Trigger re-render to switch list type
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
          // Rebuild items after type change
          setTimeout(() => {
            const count = parseInt(element.getAttribute('count') || '3') || 3;
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
        onInit: (element: HTMLElement, value: any) => {
          const count = Math.max(1, Math.min(10, parseInt(value) || 3));
          element.setAttribute('count', String(count));
          setTimeout(() => rebuildListItems(element, count), 100);
        },
        onChange: (element: HTMLElement, value: any) => {
          const count = Math.max(1, Math.min(10, parseInt(value) || 3));
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
  (element as any).items = items;

  // Trigger Lit component re-render
  if (typeof (element as any).requestUpdate === 'function') {
    (element as any).requestUpdate();
  }
}

// Helper to create a collection item trait
function createCollectionItemTrait(index: number, type: 'title' | 'description' | 'href' | 'date') {
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

  // Visibility function - only show if index <= count
  const visibleFn = (component: any) => {
    const count = parseInt(component.get('attributes')?.['count'] || '3', 10);
    return index <= count;
  };

  return {
    definition: {
      name: attrName,
      label: `Item ${index} ${labels[type]}`,
      type: isDescription ? 'textarea' : 'text',
      default: defaults[type],
      placeholder: isTitle ? 'Item title' : isDescription ? 'Optional description' : type === 'href' ? 'https://...' : 'YYYY-MM-DD',
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('count') || '3') || 3;
        rebuildCollectionItems(element, count);
      },
      getValue: (element: HTMLElement) => {
        return element.getAttribute(attrName) || '';
      },
    },
  };
}

componentRegistry.register({
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
        onInit: (element: HTMLElement, value: any) => {
          const count = Math.max(1, Math.min(6, parseInt(value) || 3));
          element.setAttribute('count', String(count));
          setTimeout(() => rebuildCollectionItems(element, count), 100);
        },
        onChange: (element: HTMLElement, value: any) => {
          const count = Math.max(1, Math.min(6, parseInt(value) || 3));
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
componentRegistry.register({
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Key Information';
          element.setAttribute('heading', text);
          (element as any).heading = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).heading || element.getAttribute('heading') || 'Key Information';
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
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('content', text);
          (element as any).content = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).content || element.getAttribute('content') || '';
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
        onChange: (element: HTMLElement, value: any) => {
          const level = value || 'h3';
          element.setAttribute('heading-level', level);
          (element as any).headingLevel = level;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).headingLevel || element.getAttribute('heading-level') || 'h3';
        },
      },
    },
  },
});

// ============================================================================
// Feedback Components
// ============================================================================

/**
 * USA Alert Component
 *
 * Displays important messages to the user with different severity levels.
 */
componentRegistry.register({
  tagName: 'usa-alert',
  droppable: false,

  traits: {
    // Variant/type
    variant: {
      definition: {
        name: 'variant',
        label: 'Type',
        type: 'select',
        default: 'info',
        options: [
          { id: 'info', label: 'Info' },
          { id: 'success', label: 'Success' },
          { id: 'warning', label: 'Warning' },
          { id: 'error', label: 'Error' },
          { id: 'emergency', label: 'Emergency' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const variant = value || 'info';
          element.setAttribute('variant', variant);
          (element as any).variant = variant;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).variant || element.getAttribute('variant') || 'info';
        },
      },
    },

    // Heading
    heading: {
      definition: {
        name: 'heading',
        label: 'Heading',
        type: 'text',
        default: 'Alert heading',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('heading', text);
          (element as any).heading = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).heading || element.getAttribute('heading') || '';
        },
      },
    },

    // Text content
    text: {
      definition: {
        name: 'text',
        label: 'Message',
        type: 'textarea',
        default: 'This is an alert message.',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('text', text);
          (element as any).text = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).text || element.getAttribute('text') || '';
        },
      },
    },

    // Slim variant
    slim: {
      definition: {
        name: 'slim',
        label: 'Slim Style',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('slim', '');
          } else {
            element.removeAttribute('slim');
          }
          (element as any).slim = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).slim || element.hasAttribute('slim');
        },
      },
    },

    // No icon
    'no-icon': {
      definition: {
        name: 'no-icon',
        label: 'Hide Icon',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('no-icon', '');
          } else {
            element.removeAttribute('no-icon');
          }
          (element as any).noIcon = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).noIcon || element.hasAttribute('no-icon');
        },
      },
    },
  },
});

/**
 * USA Banner Component
 *
 * Official government website banner - required on all .gov websites.
 */
componentRegistry.register({
  tagName: 'usa-banner',
  droppable: false,

  traits: {
    // Header text
    'header-text': {
      definition: {
        name: 'header-text',
        label: 'Header Text',
        type: 'text',
        default: 'An official website of the United States government',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'An official website of the United States government';
          element.setAttribute('headerText', text);
          (element as any).headerText = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).headerText || 'An official website of the United States government';
        },
      },
    },

    // Action text
    'action-text': {
      definition: {
        name: 'action-text',
        label: 'Action Text',
        type: 'text',
        default: "Here's how you know",
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || "Here's how you know";
          element.setAttribute('actionText', text);
          (element as any).actionText = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).actionText || "Here's how you know";
        },
      },
    },

    // Expanded
    expanded: {
      definition: {
        name: 'expanded',
        label: 'Expanded',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('expanded', '');
          } else {
            element.removeAttribute('expanded');
          }
          (element as any).expanded = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).expanded || element.hasAttribute('expanded');
        },
      },
    },
  },
});

/**
 * USA Site Alert Component
 *
 * Site-wide alert for important announcements.
 */
componentRegistry.register({
  tagName: 'usa-site-alert',
  droppable: false,

  traits: {
    // Type/variant
    type: {
      definition: {
        name: 'type',
        label: 'Type',
        type: 'select',
        default: 'info',
        options: [
          { id: 'info', label: 'Info' },
          { id: 'emergency', label: 'Emergency' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const type = value || 'info';
          element.setAttribute('type', type);
          (element as any).type = type;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).type || element.getAttribute('type') || 'info';
        },
      },
    },

    // Heading
    heading: {
      definition: {
        name: 'heading',
        label: 'Heading',
        type: 'text',
        default: 'Site Alert',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('heading', text);
          (element as any).heading = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).heading || element.getAttribute('heading') || '';
        },
      },
    },

    // Content
    content: {
      definition: {
        name: 'content',
        label: 'Content',
        type: 'textarea',
        default: 'This is a site-wide alert message.',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('content', text);
          (element as any).content = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).content || element.getAttribute('content') || '';
        },
      },
    },

    // Slim
    slim: {
      definition: {
        name: 'slim',
        label: 'Slim Style',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('slim', '');
          } else {
            element.removeAttribute('slim');
          }
          (element as any).slim = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).slim || element.hasAttribute('slim');
        },
      },
    },
  },
});

/**
 * USA Modal Component
 *
 * Dialog/modal window for focused user interactions.
 */
componentRegistry.register({
  tagName: 'usa-modal',
  droppable: false,

  traits: {
    // Modal ID (for linking with buttons)
    id: {
      definition: {
        name: 'id',
        label: 'Modal ID',
        type: 'text',
        default: 'my-modal',
        placeholder: 'Unique ID for the modal',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const id = value || 'my-modal';
          element.id = id;
        },
        getValue: (element: HTMLElement) => {
          return element.id || 'my-modal';
        },
      },
    },

    // Heading
    heading: {
      definition: {
        name: 'heading',
        label: 'Heading',
        type: 'text',
        default: 'Modal Title',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('heading', text);
          (element as any).heading = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).heading || element.getAttribute('heading') || '';
        },
      },
    },

    // Description
    description: {
      definition: {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        default: 'Modal content goes here.',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('description', text);
          (element as any).description = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).description || element.getAttribute('description') || '';
        },
      },
    },

    // Trigger type (button, link, or icon)
    'trigger-type': {
      definition: {
        name: 'trigger-type',
        label: 'Trigger Type',
        type: 'select',
        default: 'button',
        options: [
          { id: 'button', label: 'Button' },
          { id: 'link', label: 'Link' },
          { id: 'icon', label: 'Icon' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const type = value || 'button';
          element.setAttribute('trigger-type', type);
          (element as any).triggerType = type;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).triggerType || element.getAttribute('trigger-type') || 'button';
        },
      },
    },

    // Trigger text
    'trigger-text': {
      definition: {
        name: 'trigger-text',
        label: 'Trigger Text',
        type: 'text',
        default: 'Open Modal',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Open Modal';
          element.setAttribute('trigger-text', text);
          (element as any).triggerText = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).triggerText || element.getAttribute('trigger-text') || 'Open Modal';
        },
      },
    },

    // Trigger icon (for icon trigger type)
    'trigger-icon': {
      definition: {
        name: 'trigger-icon',
        label: 'Trigger Icon',
        type: 'select',
        default: 'info',
        options: [
          { id: 'info', label: 'Info' },
          { id: 'help', label: 'Help' },
          { id: 'settings', label: 'Settings' },
          { id: 'more_vert', label: 'More (Vertical)' },
          { id: 'more_horiz', label: 'More (Horizontal)' },
          { id: 'launch', label: 'Launch' },
          { id: 'open_in_new', label: 'Open in New' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const icon = value || 'info';
          element.setAttribute('trigger-icon', icon);
          (element as any).triggerIcon = icon;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).triggerIcon || element.getAttribute('trigger-icon') || 'info';
        },
      },
    },

    // Show trigger
    'show-trigger': {
      definition: {
        name: 'show-trigger',
        label: 'Show Trigger',
        type: 'checkbox',
        default: true,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('show-trigger', '');
          } else {
            element.removeAttribute('show-trigger');
          }
          (element as any).showTrigger = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).showTrigger !== false;
        },
      },
    },

    // Large variant
    large: {
      definition: {
        name: 'large',
        label: 'Large Size',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('large', '');
          } else {
            element.removeAttribute('large');
          }
          (element as any).large = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).large || element.hasAttribute('large');
        },
      },
    },

    // Force action
    'force-action': {
      definition: {
        name: 'force-action',
        label: 'Force Action',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('force-action', '');
          } else {
            element.removeAttribute('force-action');
          }
          (element as any).forceAction = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).forceAction || element.hasAttribute('force-action');
        },
      },
    },

    // Primary button text
    'primary-button-text': {
      definition: {
        name: 'primary-button-text',
        label: 'Primary Button',
        type: 'text',
        default: 'Continue',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Continue';
          element.setAttribute('primary-button-text', text);
          (element as any).primaryButtonText = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).primaryButtonText || 'Continue';
        },
      },
    },

    // Secondary button text
    'secondary-button-text': {
      definition: {
        name: 'secondary-button-text',
        label: 'Secondary Button',
        type: 'text',
        default: 'Cancel',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Cancel';
          element.setAttribute('secondary-button-text', text);
          (element as any).secondaryButtonText = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).secondaryButtonText || 'Cancel';
        },
      },
    },

    // Show secondary button
    'show-secondary-button': {
      definition: {
        name: 'show-secondary-button',
        label: 'Show Secondary Button',
        type: 'checkbox',
        default: true,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isEnabled = coerceBoolean(value);
          if (isEnabled) {
            element.setAttribute('show-secondary-button', '');
          } else {
            element.removeAttribute('show-secondary-button');
          }
          (element as any).showSecondaryButton = isEnabled;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).showSecondaryButton !== false;
        },
      },
    },
  },
});

/**
 * USA Tooltip Component
 *
 * Displays additional information on hover.
 */
componentRegistry.register({
  tagName: 'usa-tooltip',
  droppable: false,

  traits: {
    // Tooltip text
    text: {
      definition: {
        name: 'text',
        label: 'Tooltip Text',
        type: 'text',
        default: 'Helpful information',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || '';
          element.setAttribute('text', text);
          (element as any).text = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).text || element.getAttribute('text') || '';
        },
      },
    },

    // Trigger type
    'trigger-type': {
      definition: {
        name: 'trigger-type',
        label: 'Trigger Type',
        type: 'select',
        default: 'text',
        options: [
          { id: 'text', label: 'Text' },
          { id: 'button', label: 'Button' },
          { id: 'link', label: 'Link' },
          { id: 'icon', label: 'Icon' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const type = value || 'text';
          element.setAttribute('trigger-type', type);
          (element as any).triggerType = type;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).triggerType || element.getAttribute('trigger-type') || 'text';
        },
      },
    },

    // Label (trigger text)
    label: {
      definition: {
        name: 'label',
        label: 'Trigger Label',
        type: 'text',
        default: 'Hover me',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Hover me';
          element.setAttribute('label', text);
          (element as any).label = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).label || element.getAttribute('label') || 'Hover me';
        },
      },
    },

    // Trigger icon (for icon trigger type)
    'trigger-icon': {
      definition: {
        name: 'trigger-icon',
        label: 'Trigger Icon',
        type: 'select',
        default: 'info',
        options: [
          { id: 'info', label: 'Info' },
          { id: 'help', label: 'Help' },
          { id: 'info_outline', label: 'Info Outline' },
          { id: 'help_outline', label: 'Help Outline' },
          { id: 'error', label: 'Error' },
          { id: 'warning', label: 'Warning' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const icon = value || 'info';
          element.setAttribute('trigger-icon', icon);
          (element as any).triggerIcon = icon;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).triggerIcon || element.getAttribute('trigger-icon') || 'info';
        },
      },
    },

    // Position
    position: {
      definition: {
        name: 'position',
        label: 'Position',
        type: 'select',
        default: 'top',
        options: [
          { id: 'top', label: 'Top' },
          { id: 'bottom', label: 'Bottom' },
          { id: 'left', label: 'Left' },
          { id: 'right', label: 'Right' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const position = value || 'top';
          element.setAttribute('position', position);
          (element as any).position = position;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).position || element.getAttribute('position') || 'top';
        },
      },
    },
  },
});

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

/**
 * Helper function to rebuild accordion items from individual traits
 */
function rebuildAccordionItems(element: HTMLElement, count: number): void {
  const items: Array<{ title: string; content: string; expanded?: boolean }> = [];
  for (let i = 1; i <= count; i++) {
    const title = element.getAttribute(`section${i}-title`) || `Section ${i}`;
    const content = element.getAttribute(`section${i}-content`) || `Content for section ${i}`;
    const expanded = hasAttributeTrue(element, `section${i}-expanded`);
    items.push({ title, content, expanded });
  }
  (element as any).items = items;
  if (typeof (element as any).requestUpdate === 'function') {
    (element as any).requestUpdate();
  }
}

/**
 * Helper to create an accordion section trait (title, content, or expanded)
 */
function createAccordionSectionTrait(
  sectionNum: number,
  traitType: 'title' | 'content' | 'expanded',
  maxSections: number = 8
): UnifiedTrait {
  const attrName = `section${sectionNum}-${traitType}`;

  // Visibility function - only show if sectionNum <= section-count
  const visibleFn = (component: any) => {
    const count = parseInt(component.get('attributes')?.['section-count'] || '3', 10);
    return sectionNum <= count;
  };

  if (traitType === 'expanded') {
    return {
      definition: {
        name: attrName,
        label: `Section ${sectionNum} Expanded`,
        type: 'checkbox',
        default: sectionNum === 1, // First section expanded by default
        visible: visibleFn,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isExpanded = coerceBoolean(value);
          element.setAttribute(attrName, String(isExpanded));
          const count = parseInt(element.getAttribute('section-count') || '3', 10);
          if (sectionNum <= count) {
            rebuildAccordionItems(element, count);
          }
        },
      },
    };
  }

  const label = traitType === 'title' ? `Section ${sectionNum} Title` : `Section ${sectionNum} Content`;
  const defaultValue = traitType === 'title' ? `Section ${sectionNum}` : `Content for section ${sectionNum}`;

  return {
    definition: {
      name: attrName,
      label,
      type: 'text',
      default: defaultValue,
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('section-count') || '3', 10);
        if (sectionNum <= count) {
          rebuildAccordionItems(element, count);
        }
      },
    },
  };
}

/**
 * USA Accordion Component
 *
 * Expandable/collapsible content sections.
 */
componentRegistry.register({
  tagName: 'usa-accordion',
  droppable: false,

  traits: {
    // Number of sections
    'section-count': {
      definition: {
        name: 'section-count',
        label: 'Number of Sections',
        type: 'select',
        default: '3',
        options: [
          { id: '1', label: '1 Section' },
          { id: '2', label: '2 Sections' },
          { id: '3', label: '3 Sections' },
          { id: '4', label: '4 Sections' },
          { id: '5', label: '5 Sections' },
          { id: '6', label: '6 Sections' },
          { id: '7', label: '7 Sections' },
          { id: '8', label: '8 Sections' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const count = parseInt(value || '3', 10);
          element.setAttribute('section-count', String(count));
          rebuildAccordionItems(element, count);
        },
        onInit: (element: HTMLElement, value: any) => {
          setTimeout(() => {
            const count = parseInt(value || '3', 10);
            rebuildAccordionItems(element, count);
          }, 100);
        },
      },
    },

    // Multiselectable
    multiselectable: {
      definition: {
        name: 'multiselectable',
        label: 'Allow Multiple Open',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isMulti = coerceBoolean(value);
          if (isMulti) {
            element.setAttribute('multiselectable', '');
          } else {
            element.removeAttribute('multiselectable');
          }
          (element as any).multiselectable = isMulti;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Bordered
    bordered: {
      definition: {
        name: 'bordered',
        label: 'Bordered Style',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isBordered = coerceBoolean(value);
          if (isBordered) {
            element.setAttribute('bordered', '');
          } else {
            element.removeAttribute('bordered');
          }
          (element as any).bordered = isBordered;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Section traits
    'section1-title': createAccordionSectionTrait(1, 'title'),
    'section1-content': createAccordionSectionTrait(1, 'content'),
    'section1-expanded': createAccordionSectionTrait(1, 'expanded'),
    'section2-title': createAccordionSectionTrait(2, 'title'),
    'section2-content': createAccordionSectionTrait(2, 'content'),
    'section2-expanded': createAccordionSectionTrait(2, 'expanded'),
    'section3-title': createAccordionSectionTrait(3, 'title'),
    'section3-content': createAccordionSectionTrait(3, 'content'),
    'section3-expanded': createAccordionSectionTrait(3, 'expanded'),
    'section4-title': createAccordionSectionTrait(4, 'title'),
    'section4-content': createAccordionSectionTrait(4, 'content'),
    'section4-expanded': createAccordionSectionTrait(4, 'expanded'),
    'section5-title': createAccordionSectionTrait(5, 'title'),
    'section5-content': createAccordionSectionTrait(5, 'content'),
    'section5-expanded': createAccordionSectionTrait(5, 'expanded'),
    'section6-title': createAccordionSectionTrait(6, 'title'),
    'section6-content': createAccordionSectionTrait(6, 'content'),
    'section6-expanded': createAccordionSectionTrait(6, 'expanded'),
  },
});

/**
 * Helper function to rebuild step indicator steps from individual traits
 */
function rebuildStepIndicatorSteps(element: HTMLElement, count: number): void {
  const steps: Array<{ label: string; status?: 'complete' | 'current' | 'incomplete' }> = [];
  for (let i = 1; i <= count; i++) {
    const label = element.getAttribute(`step${i}-label`) || `Step ${i}`;
    const status = element.getAttribute(`step${i}-status`) as 'complete' | 'current' | 'incomplete' || 'incomplete';
    steps.push({ label, status });
  }
  (element as any).steps = steps;
  if (typeof (element as any).requestUpdate === 'function') {
    (element as any).requestUpdate();
  }
}

/**
 * Helper to create a step indicator step trait
 */
function createStepTrait(
  stepNum: number,
  traitType: 'label' | 'status'
): UnifiedTrait {
  const attrName = `step${stepNum}-${traitType}`;

  // Visibility function - only show if stepNum <= step-count
  const visibleFn = (component: any) => {
    const count = parseInt(component.get('attributes')?.['step-count'] || '4', 10);
    return stepNum <= count;
  };

  if (traitType === 'status') {
    return {
      definition: {
        name: attrName,
        label: `Step ${stepNum} Status`,
        type: 'select',
        default: stepNum === 1 ? 'current' : 'incomplete',
        options: [
          { id: 'incomplete', label: 'Incomplete' },
          { id: 'current', label: 'Current' },
          { id: 'complete', label: 'Complete' },
        ],
        visible: visibleFn,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          element.setAttribute(attrName, value || 'incomplete');
          const count = parseInt(element.getAttribute('step-count') || '4', 10);
          if (stepNum <= count) {
            rebuildStepIndicatorSteps(element, count);
          }
        },
      },
    };
  }

  return {
    definition: {
      name: attrName,
      label: `Step ${stepNum} Label`,
      type: 'text',
      default: `Step ${stepNum}`,
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('step-count') || '4', 10);
        if (stepNum <= count) {
          rebuildStepIndicatorSteps(element, count);
        }
      },
    },
  };
}

/**
 * USA Step Indicator Component
 *
 * Shows progress through a multi-step process.
 */
componentRegistry.register({
  tagName: 'usa-step-indicator',
  droppable: false,

  traits: {
    // Number of steps
    'step-count': {
      definition: {
        name: 'step-count',
        label: 'Number of Steps',
        type: 'select',
        default: '4',
        options: [
          { id: '2', label: '2 Steps' },
          { id: '3', label: '3 Steps' },
          { id: '4', label: '4 Steps' },
          { id: '5', label: '5 Steps' },
          { id: '6', label: '6 Steps' },
          { id: '7', label: '7 Steps' },
          { id: '8', label: '8 Steps' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const count = parseInt(value || '4', 10);
          element.setAttribute('step-count', String(count));
          rebuildStepIndicatorSteps(element, count);
        },
        onInit: (element: HTMLElement, value: any) => {
          setTimeout(() => {
            const count = parseInt(value || '4', 10);
            rebuildStepIndicatorSteps(element, count);
          }, 100);
        },
      },
    },

    // Show labels
    'show-labels': {
      definition: {
        name: 'show-labels',
        label: 'Show Labels',
        type: 'checkbox',
        default: true,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const showLabels = coerceBoolean(value);
          if (showLabels) {
            element.setAttribute('show-labels', '');
          } else {
            element.removeAttribute('show-labels');
          }
          (element as any).showLabels = showLabels;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Counters style
    counters: {
      definition: {
        name: 'counters',
        label: 'Counter Style',
        type: 'select',
        default: '',
        options: [
          { id: '', label: 'None' },
          { id: 'default', label: 'Numbers' },
          { id: 'small', label: 'Small Numbers' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('counters', value);
          } else {
            element.removeAttribute('counters');
          }
          (element as any).counters = value || '';
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Centered
    centered: {
      definition: {
        name: 'centered',
        label: 'Center Align',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isCentered = coerceBoolean(value);
          if (isCentered) {
            element.setAttribute('centered', '');
          } else {
            element.removeAttribute('centered');
          }
          (element as any).centered = isCentered;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Small variant
    small: {
      definition: {
        name: 'small',
        label: 'Small Size',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isSmall = coerceBoolean(value);
          if (isSmall) {
            element.setAttribute('small', '');
          } else {
            element.removeAttribute('small');
          }
          (element as any).small = isSmall;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Step traits
    'step1-label': createStepTrait(1, 'label'),
    'step1-status': createStepTrait(1, 'status'),
    'step2-label': createStepTrait(2, 'label'),
    'step2-status': createStepTrait(2, 'status'),
    'step3-label': createStepTrait(3, 'label'),
    'step3-status': createStepTrait(3, 'status'),
    'step4-label': createStepTrait(4, 'label'),
    'step4-status': createStepTrait(4, 'status'),
    'step5-label': createStepTrait(5, 'label'),
    'step5-status': createStepTrait(5, 'status'),
    'step6-label': createStepTrait(6, 'label'),
    'step6-status': createStepTrait(6, 'status'),
  },
});

/**
 * Helper function to rebuild process list items from individual traits
 */
function rebuildProcessListItems(element: HTMLElement, count: number): void {
  const items: Array<{ heading: string; content: string }> = [];
  for (let i = 1; i <= count; i++) {
    const heading = element.getAttribute(`item${i}-heading`) || `Step ${i}`;
    const content = element.getAttribute(`item${i}-content`) || `Description for step ${i}`;
    items.push({ heading, content });
  }
  (element as any).items = items;
  if (typeof (element as any).requestUpdate === 'function') {
    (element as any).requestUpdate();
  }
}

/**
 * Helper to create a process list item trait
 */
function createProcessListItemTrait(
  itemNum: number,
  traitType: 'heading' | 'content'
): UnifiedTrait {
  const attrName = `item${itemNum}-${traitType}`;
  const label = traitType === 'heading' ? `Step ${itemNum} Heading` : `Step ${itemNum} Content`;
  const defaultValue = traitType === 'heading' ? `Step ${itemNum}` : `Description for step ${itemNum}`;

  // Visibility function - only show if itemNum <= item-count
  const visibleFn = (component: any) => {
    const count = parseInt(component.get('attributes')?.['item-count'] || '3', 10);
    return itemNum <= count;
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
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('item-count') || '3', 10);
        if (itemNum <= count) {
          rebuildProcessListItems(element, count);
        }
      },
    },
  };
}

/**
 * USA Process List Component
 *
 * Displays a numbered list of steps in a process.
 */
componentRegistry.register({
  tagName: 'usa-process-list',
  droppable: false,

  traits: {
    // Number of items
    'item-count': {
      definition: {
        name: 'item-count',
        label: 'Number of Steps',
        type: 'select',
        default: '3',
        options: [
          { id: '1', label: '1 Step' },
          { id: '2', label: '2 Steps' },
          { id: '3', label: '3 Steps' },
          { id: '4', label: '4 Steps' },
          { id: '5', label: '5 Steps' },
          { id: '6', label: '6 Steps' },
          { id: '7', label: '7 Steps' },
          { id: '8', label: '8 Steps' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const count = parseInt(value || '3', 10);
          element.setAttribute('item-count', String(count));
          rebuildProcessListItems(element, count);
        },
        onInit: (element: HTMLElement, value: any) => {
          setTimeout(() => {
            const count = parseInt(value || '3', 10);
            rebuildProcessListItems(element, count);
          }, 100);
        },
      },
    },

    // Heading level
    'heading-level': {
      definition: {
        name: 'heading-level',
        label: 'Heading Level',
        type: 'select',
        default: 'h4',
        options: [
          { id: 'h2', label: 'H2' },
          { id: 'h3', label: 'H3' },
          { id: 'h4', label: 'H4' },
          { id: 'h5', label: 'H5' },
          { id: 'h6', label: 'H6' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const level = value || 'h4';
          element.setAttribute('heading-level', level);
          (element as any).headingLevel = level;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Item traits
    'item1-heading': createProcessListItemTrait(1, 'heading'),
    'item1-content': createProcessListItemTrait(1, 'content'),
    'item2-heading': createProcessListItemTrait(2, 'heading'),
    'item2-content': createProcessListItemTrait(2, 'content'),
    'item3-heading': createProcessListItemTrait(3, 'heading'),
    'item3-content': createProcessListItemTrait(3, 'content'),
    'item4-heading': createProcessListItemTrait(4, 'heading'),
    'item4-content': createProcessListItemTrait(4, 'content'),
    'item5-heading': createProcessListItemTrait(5, 'heading'),
    'item5-content': createProcessListItemTrait(5, 'content'),
    'item6-heading': createProcessListItemTrait(6, 'heading'),
    'item6-content': createProcessListItemTrait(6, 'content'),
  },
});

/**
 * USA Prose Component
 *
 * Typography wrapper for long-form content.
 */
componentRegistry.register({
  tagName: 'usa-prose',
  droppable: true, // Allow dropping content inside

  traits: {
    // Content (for slotted content)
    content: {
      definition: {
        name: 'content',
        label: 'Content',
        type: 'text',
        default: 'Enter your prose content here...',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const content = value || '';
          // For prose, we update the innerHTML/textContent
          element.textContent = content;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },
  },
});

/**
 * USA Identifier Component
 *
 * Agency identifier footer that displays parent agency info and required federal links.
 * Used at the bottom of government websites.
 */
componentRegistry.register({
  tagName: 'usa-identifier',
  droppable: false,

  traits: {
    // Domain name
    domain: {
      definition: {
        name: 'domain',
        label: 'Domain Name',
        type: 'text',
        default: 'domain.gov',
        placeholder: 'example.gov',
        category: { id: 'identity', label: 'Identity' },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const domain = value || 'domain.gov';
          element.setAttribute('domain', domain);
          (element as any).domain = domain;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).domain || element.getAttribute('domain') || 'domain.gov';
        },
      },
    },

    // Parent Agency name
    'parent-agency': {
      definition: {
        name: 'parent-agency',
        label: 'Parent Agency',
        type: 'text',
        default: 'Parent Agency',
        placeholder: 'e.g., Department of Example',
        category: { id: 'identity', label: 'Identity' },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const agency = value || 'Parent Agency';
          element.setAttribute('parent-agency', agency);
          (element as any).parentAgency = agency;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).parentAgency || element.getAttribute('parent-agency') || 'Parent Agency';
        },
      },
    },

    // Parent Agency URL
    'parent-agency-href': {
      definition: {
        name: 'parent-agency-href',
        label: 'Parent Agency URL',
        type: 'text',
        default: '#',
        placeholder: 'https://agency.gov',
        category: { id: 'identity', label: 'Identity' },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const href = value || '#';
          element.setAttribute('parent-agency-href', href);
          (element as any).parentAgencyHref = href;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).parentAgencyHref || element.getAttribute('parent-agency-href') || '#';
        },
      },
    },

    // Masthead Logo Alt Text
    'masthead-logo-alt': {
      definition: {
        name: 'masthead-logo-alt',
        label: 'Logo Alt Text',
        type: 'text',
        default: '',
        placeholder: 'Agency logo',
        category: { id: 'identity', label: 'Identity' },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const alt = value || '';
          if (alt) {
            element.setAttribute('masthead-logo-alt', alt);
          } else {
            element.removeAttribute('masthead-logo-alt');
          }
          (element as any).mastheadLogoAlt = alt;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).mastheadLogoAlt || element.getAttribute('masthead-logo-alt') || '';
        },
      },
    },

    // Show Required Links toggle
    'show-required-links': {
      definition: {
        name: 'show-required-links',
        label: 'Show Required Links',
        type: 'checkbox',
        default: true,
        category: { id: 'display', label: 'Display' },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const show = value === true || value === 'true';
          if (show) {
            element.setAttribute('show-required-links', '');
          } else {
            element.removeAttribute('show-required-links');
          }
          (element as any).showRequiredLinks = show;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).showRequiredLinks !== false;
        },
      },
    },

    // Show Logos toggle
    'show-logos': {
      definition: {
        name: 'show-logos',
        label: 'Show Logos',
        type: 'checkbox',
        default: true,
        category: { id: 'display', label: 'Display' },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const show = value === true || value === 'true';
          if (show) {
            element.setAttribute('show-logos', '');
          } else {
            element.removeAttribute('show-logos');
          }
          (element as any).showLogos = show;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        getValue: (element: HTMLElement) => {
          return (element as any).showLogos !== false;
        },
      },
    },
  },
});

// ============================================================================
// Header & Footer Components
// ============================================================================

/**
 * WORKAROUND: usa-header blocks re-renders after USWDS JavaScript initializes.
 *
 * The USWDS JavaScript (accordion behavior, etc.) sets up event listeners and
 * modifies the DOM. After this initialization, the Lit component's shouldUpdate
 * returns false to prevent the USWDS JavaScript state from being lost.
 *
 * This means we need to manipulate the DOM directly for visual changes.
 * This helper function encapsulates this pattern and ensures we try both
 * the Lit way (requestUpdate) and direct DOM manipulation as a fallback.
 *
 * @param element The usa-header element
 * @param callback Function to perform direct DOM manipulation
 */
function updateHeaderWithFallback(
  element: HTMLElement,
  callback: () => void
): void {
  // First, try to update via Lit
  if (typeof (element as any).requestUpdate === 'function') {
    (element as any).requestUpdate();
  }

  // Then, perform direct DOM manipulation as a fallback
  // This ensures the visual state is correct even if Lit's update is blocked
  callback();

  // Schedule another requestUpdate in case the component becomes responsive
  setTimeout(() => {
    if (typeof (element as any).requestUpdate === 'function') {
      (element as any).requestUpdate();
    }
  }, 50);
}

/**
 * Helper function to update/create/remove skip link for header
 * The skip link is inserted as a sibling before the usa-header element
 */
function updateHeaderSkipLink(element: HTMLElement): void {
  const showSkipLink = element.getAttribute('show-skip-link') !== 'false';
  const skipLinkText = element.getAttribute('skip-link-text') || 'Skip to main content';
  const skipLinkHref = element.getAttribute('skip-link-href') || '#main-content';

  // Find existing skip link (look for sibling with data-header-skip-link attribute)
  const existingSkipLink = element.previousElementSibling?.hasAttribute('data-header-skip-link')
    ? element.previousElementSibling as HTMLElement
    : null;

  if (showSkipLink) {
    if (existingSkipLink) {
      // Update existing skip link
      existingSkipLink.textContent = skipLinkText;
      existingSkipLink.setAttribute('href', skipLinkHref);
    } else {
      // Create new skip link
      const skipLink = document.createElement('a');
      skipLink.className = 'usa-skipnav';
      skipLink.setAttribute('href', skipLinkHref);
      skipLink.setAttribute('data-header-skip-link', 'true');
      skipLink.textContent = skipLinkText;

      // Insert before the header element
      element.parentNode?.insertBefore(skipLink, element);
    }
  } else {
    // Remove skip link if it exists
    if (existingSkipLink) {
      existingSkipLink.remove();
    }
  }
}

/**
 * Helper function to rebuild header nav items array from attributes
 */
function rebuildHeaderNavItems(element: HTMLElement, count: number): void {
  const navItems: Array<{ label: string; href: string; current?: boolean }> = [];

  for (let i = 1; i <= count; i++) {
    const label = element.getAttribute(`nav${i}-label`) || `Link ${i}`;
    const href = element.getAttribute(`nav${i}-href`) || '#';
    const current = element.hasAttribute(`nav${i}-current`);

    navItems.push({ label, href, current: current || undefined });
  }

  // Set the navItems property on the Lit component
  (element as any).navItems = navItems;

  if (typeof (element as any).requestUpdate === 'function') {
    (element as any).requestUpdate();
  }
}

/**
 * Initialize header nav items with retry logic
 * Waits for the Lit component to be ready before setting navItems
 */
function initHeaderNavItems(element: HTMLElement): void {
  const count = parseInt(element.getAttribute('nav-count') || '4', 10);

  // Build nav items from attributes
  const navItems: Array<{ label: string; href: string; current?: boolean }> = [];
  for (let i = 1; i <= count; i++) {
    const label = element.getAttribute(`nav${i}-label`) || `Link ${i}`;
    const href = element.getAttribute(`nav${i}-href`) || '#';
    const current = element.hasAttribute(`nav${i}-current`);
    navItems.push({ label, href, current: current || undefined });
  }

  const trySetNavItems = (attempt: number = 0): void => {
    // Set navItems property directly
    (element as any).navItems = navItems;

    // Also try to trigger update if available
    if (typeof (element as any).requestUpdate === 'function') {
      (element as any).requestUpdate();
    }

    // If component isn't ready yet, retry
    if (!(element as any).navItems?.length && attempt < 30) {
      setTimeout(() => trySetNavItems(attempt + 1), 100);
    }
  };

  // Try immediately, then retry
  trySetNavItems();

  // Also try after a longer delay to catch late initialization
  setTimeout(() => {
    if (!(element as any).navItems?.length) {
      (element as any).navItems = navItems;
      if (typeof (element as any).requestUpdate === 'function') {
        (element as any).requestUpdate();
      }
    }
  }, 500);
}

/**
 * Helper function to create header nav item traits
 */
function createHeaderNavItemTrait(
  index: number,
  type: 'label' | 'href' | 'current'
): UnifiedTrait {
  const attrName = `nav${index}-${type}`;

  // Visibility function - only show if index <= nav-count
  const visibleFn = (component: any) => {
    try {
      if (!component) return true;
      const count = parseInt(component.get?.('attributes')?.['nav-count'] || '4', 10);
      return index <= count;
    } catch {
      return true;
    }
  };

  if (type === 'current') {
    return {
      definition: {
        name: attrName,
        label: `Nav ${index} Current`,
        type: 'checkbox',
        default: false,
        visible: visibleFn,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isCurrent = coerceBoolean(value);
          if (isCurrent) {
            element.setAttribute(attrName, '');
          } else {
            element.removeAttribute(attrName);
          }
          const count = parseInt(element.getAttribute('nav-count') || '4', 10);
          rebuildHeaderNavItems(element, count);
        },
      },
    };
  }

  const isLabel = type === 'label';
  return {
    definition: {
      name: attrName,
      label: `Nav ${index} ${isLabel ? 'Label' : 'URL'}`,
      type: 'text',
      default: isLabel ? `Link ${index}` : '#',
      placeholder: isLabel ? 'Link text' : 'URL',
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('nav-count') || '4', 10);
        rebuildHeaderNavItems(element, count);
      },
    },
  };
}

/**
 * USA Header Component
 *
 * Site header with logo, navigation, and optional search.
 */
componentRegistry.register({
  tagName: 'usa-header',
  droppable: false,

  traits: {
    // Skip Link - Include skip navigation for accessibility
    'show-skip-link': {
      definition: {
        name: 'show-skip-link',
        label: 'Include Skip Link',
        type: 'checkbox',
        default: true,
        category: { id: 'accessibility', label: 'Accessibility' },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const showSkipLink = value === true || value === 'true';
          element.setAttribute('show-skip-link', showSkipLink ? 'true' : 'false');
          updateHeaderSkipLink(element);
        },
        onInit: (element: HTMLElement, value: any) => {
          const showSkipLink = value === true || value === 'true' || value === undefined;
          if (showSkipLink) {
            // Delay to ensure element is in DOM
            setTimeout(() => updateHeaderSkipLink(element), 100);
          }
        },
      },
    },

    'skip-link-text': {
      definition: {
        name: 'skip-link-text',
        label: 'Skip Link Text',
        type: 'text',
        default: 'Skip to main content',
        placeholder: 'Skip to main content',
        visible: (component: any) => {
          try {
            if (!component) return false;
            const showSkipLink = component.get?.('attributes')?.['show-skip-link'];
            return showSkipLink === true || showSkipLink === 'true' || showSkipLink === undefined;
          } catch {
            return true;
          }
        },
        category: { id: 'accessibility', label: 'Accessibility' },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Skip to main content';
          element.setAttribute('skip-link-text', text);
          updateHeaderSkipLink(element);
        },
      },
    },

    'skip-link-href': {
      definition: {
        name: 'skip-link-href',
        label: 'Skip Link Target',
        type: 'text',
        default: '#main-content',
        placeholder: '#main-content',
        visible: (component: any) => {
          try {
            if (!component) return false;
            const showSkipLink = component.get?.('attributes')?.['show-skip-link'];
            return showSkipLink === true || showSkipLink === 'true' || showSkipLink === undefined;
          } catch {
            return true;
          }
        },
        category: { id: 'accessibility', label: 'Accessibility' },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const href = value || '#main-content';
          element.setAttribute('skip-link-href', href);
          updateHeaderSkipLink(element);
        },
      },
    },

    // Logo Text
    'logo-text': {
      definition: {
        name: 'logo-text',
        label: 'Logo Text',
        type: 'text',
        default: 'Site Name',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const text = value || 'Site Name';
          element.setAttribute('logoText', text);
          (element as any).logoText = text;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
        // Also initialize nav items when logo-text initializes (backup entry point)
        onInit: (element: HTMLElement, value: any) => {
          const text = value || 'Site Name';
          (element as any).logoText = text;
          // Initialize nav items as well
          initHeaderNavItems(element);
        },
      },
    },

    // Logo URL
    'logo-href': {
      definition: {
        name: 'logo-href',
        label: 'Logo URL',
        type: 'text',
        default: '/',
        placeholder: 'URL when logo is clicked',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const href = value || '/';
          element.setAttribute('logoHref', href);
          (element as any).logoHref = href;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Logo Image Source (optional)
    'logo-image-src': {
      definition: {
        name: 'logo-image-src',
        label: 'Logo Image URL',
        type: 'text',
        default: '',
        placeholder: 'Optional image URL',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('logoImageSrc', value);
            (element as any).logoImageSrc = value;
          } else {
            element.removeAttribute('logoImageSrc');
            (element as any).logoImageSrc = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Logo Image Alt Text
    'logo-image-alt': {
      definition: {
        name: 'logo-image-alt',
        label: 'Logo Image Alt',
        type: 'text',
        default: '',
        placeholder: 'Alt text for logo image',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('logoImageAlt', value);
            (element as any).logoImageAlt = value;
          } else {
            element.removeAttribute('logoImageAlt');
            (element as any).logoImageAlt = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Extended header style (uses workaround for USWDS init blocking)
    extended: {
      definition: {
        name: 'extended',
        label: 'Extended Style',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const isExtended = coerceBoolean(value);
          if (isExtended) {
            element.setAttribute('extended', '');
          } else {
            element.removeAttribute('extended');
          }
          (element as any).extended = isExtended;

          // Use workaround helper for header DOM updates
          updateHeaderWithFallback(element, () => {
            const header = element.querySelector('.usa-header');
            if (header) {
              header.classList.toggle('usa-header--extended', isExtended);
              header.classList.toggle('usa-header--basic', !isExtended);
            }
          });
        },
      },
    },

    // Show Search (uses workaround for USWDS init blocking)
    'show-search': {
      definition: {
        name: 'show-search',
        label: 'Show Search',
        type: 'checkbox',
        default: false,
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const showSearch = coerceBoolean(value);
          if (showSearch) {
            element.setAttribute('showSearch', '');
          } else {
            element.removeAttribute('showSearch');
          }
          (element as any).showSearch = showSearch;

          // Use workaround helper for header DOM updates
          updateHeaderWithFallback(element, () => {
            const secondaryDiv = element.querySelector('.usa-nav__secondary');
            if (secondaryDiv) {
              (secondaryDiv as HTMLElement).style.display = showSearch ? '' : 'none';
            }
          });
        },
      },
    },

    // Search Placeholder
    'search-placeholder': {
      definition: {
        name: 'search-placeholder',
        label: 'Search Placeholder',
        type: 'text',
        default: 'Search',
        placeholder: 'Search placeholder text',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const placeholder = value || 'Search';
          element.setAttribute('searchPlaceholder', placeholder);
          (element as any).searchPlaceholder = placeholder;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Navigation item count
    'nav-count': {
      definition: {
        name: 'nav-count',
        label: 'Number of Nav Items',
        type: 'select',
        default: '4',
        options: [
          { id: '1', label: '1 Item' },
          { id: '2', label: '2 Items' },
          { id: '3', label: '3 Items' },
          { id: '4', label: '4 Items' },
          { id: '5', label: '5 Items' },
          { id: '6', label: '6 Items' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const count = parseInt(value || '4', 10);
          element.setAttribute('nav-count', String(count));
          rebuildHeaderNavItems(element, count);
        },
        onInit: (element: HTMLElement, _value: any) => {
          // Use retry logic to wait for Lit component to be ready
          initHeaderNavItems(element);
        },
      },
    },

    // Nav item traits (up to 6)
    'nav1-label': createHeaderNavItemTrait(1, 'label'),
    'nav1-href': createHeaderNavItemTrait(1, 'href'),
    'nav1-current': createHeaderNavItemTrait(1, 'current'),
    'nav2-label': createHeaderNavItemTrait(2, 'label'),
    'nav2-href': createHeaderNavItemTrait(2, 'href'),
    'nav2-current': createHeaderNavItemTrait(2, 'current'),
    'nav3-label': createHeaderNavItemTrait(3, 'label'),
    'nav3-href': createHeaderNavItemTrait(3, 'href'),
    'nav3-current': createHeaderNavItemTrait(3, 'current'),
    'nav4-label': createHeaderNavItemTrait(4, 'label'),
    'nav4-href': createHeaderNavItemTrait(4, 'href'),
    'nav4-current': createHeaderNavItemTrait(4, 'current'),
    'nav5-label': createHeaderNavItemTrait(5, 'label'),
    'nav5-href': createHeaderNavItemTrait(5, 'href'),
    'nav5-current': createHeaderNavItemTrait(5, 'current'),
    'nav6-label': createHeaderNavItemTrait(6, 'label'),
    'nav6-href': createHeaderNavItemTrait(6, 'href'),
    'nav6-current': createHeaderNavItemTrait(6, 'current'),
  },
});

/**
 * Helper function to rebuild footer sections array from attributes
 */
function rebuildFooterSections(element: HTMLElement, count: number): void {
  const sections: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [];

  for (let i = 1; i <= count; i++) {
    const title = element.getAttribute(`section${i}-title`) || `Section ${i}`;

    // Get links for this section (up to 4 links per section)
    const links: Array<{ label: string; href: string }> = [];
    for (let j = 1; j <= 4; j++) {
      const linkLabel = element.getAttribute(`section${i}-link${j}-label`);
      const linkHref = element.getAttribute(`section${i}-link${j}-href`) || '#';

      if (linkLabel) {
        links.push({ label: linkLabel, href: linkHref });
      }
    }

    sections.push({ title, links });
  }

  // Set the sections property on the Lit component
  (element as any).sections = sections;

  if (typeof (element as any).requestUpdate === 'function') {
    (element as any).requestUpdate();
  }
}

/**
 * Initialize footer sections with retry logic
 * Waits for the Lit component to be ready before setting sections
 */
function initFooterSections(element: HTMLElement): void {
  const variant = element.getAttribute('variant') || 'medium';

  // Only initialize sections for 'big' variant
  if (variant !== 'big') return;

  const count = parseInt(element.getAttribute('section-count') || '3', 10);

  const trySetSections = (attempt: number = 0): void => {
    // Check if the component is ready (has requestUpdate method)
    if (typeof (element as any).requestUpdate === 'function') {
      rebuildFooterSections(element, count);
    } else if (attempt < 20) {
      // Retry up to 20 times with 50ms delay (1 second total)
      setTimeout(() => trySetSections(attempt + 1), 50);
    }
  };

  // Try immediately
  trySetSections();
}

/**
 * Helper function to create footer section title trait
 */
function createFooterSectionTitleTrait(sectionNum: number): UnifiedTrait {
  const attrName = `section${sectionNum}-title`;

  // Visibility function - only show if sectionNum <= section-count
  const visibleFn = (component: any) => {
    try {
      if (!component) return false;
      const variant = component.get?.('attributes')?.['variant'] || 'medium';
      // Only 'big' variant shows sections
      if (variant !== 'big') return false;
      const count = parseInt(component.get?.('attributes')?.['section-count'] || '3', 10);
      return sectionNum <= count;
    } catch {
      return false;
    }
  };

  return {
    definition: {
      name: attrName,
      label: `Section ${sectionNum} Title`,
      type: 'text',
      default: `Section ${sectionNum}`,
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        element.setAttribute(attrName, value || '');
        const count = parseInt(element.getAttribute('section-count') || '3', 10);
        rebuildFooterSections(element, count);
      },
    },
  };
}

/**
 * Helper function to create footer section link traits
 */
function createFooterSectionLinkTrait(
  sectionNum: number,
  linkNum: number,
  type: 'label' | 'href'
): UnifiedTrait {
  const attrName = `section${sectionNum}-link${linkNum}-${type}`;

  // Visibility function - only show if sectionNum <= section-count and variant is 'big'
  const visibleFn = (component: any) => {
    try {
      if (!component) return false;
      const variant = component.get?.('attributes')?.['variant'] || 'medium';
      if (variant !== 'big') return false;
      const count = parseInt(component.get?.('attributes')?.['section-count'] || '3', 10);
      return sectionNum <= count;
    } catch {
      return false;
    }
  };

  const isLabel = type === 'label';
  return {
    definition: {
      name: attrName,
      label: `S${sectionNum} Link ${linkNum} ${isLabel ? 'Text' : 'URL'}`,
      type: 'text',
      default: isLabel ? (linkNum === 1 ? 'Link 1' : '') : '#',
      placeholder: isLabel ? 'Link text' : 'URL',
      visible: visibleFn,
    },
    handler: {
      onChange: (element: HTMLElement, value: any) => {
        if (value) {
          element.setAttribute(attrName, value);
        } else {
          element.removeAttribute(attrName);
        }
        const count = parseInt(element.getAttribute('section-count') || '3', 10);
        rebuildFooterSections(element, count);
      },
    },
  };
}

/**
 * USA Footer Component
 *
 * Site footer with agency info and optional link sections.
 */
componentRegistry.register({
  tagName: 'usa-footer',
  droppable: false,

  traits: {
    // Variant
    variant: {
      definition: {
        name: 'variant',
        label: 'Variant',
        type: 'select',
        default: 'medium',
        options: [
          { id: 'slim', label: 'Slim' },
          { id: 'medium', label: 'Medium' },
          { id: 'big', label: 'Big (with sections)' },
        ],
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const variant = value || 'medium';
          element.setAttribute('variant', variant);
          (element as any).variant = variant;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Agency Name
    'agency-name': {
      definition: {
        name: 'agency-name',
        label: 'Agency Name',
        type: 'text',
        default: 'Agency Name',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const name = value || 'Agency Name';
          element.setAttribute('agencyName', name);
          (element as any).agencyName = name;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Agency URL
    'agency-url': {
      definition: {
        name: 'agency-url',
        label: 'Agency URL',
        type: 'text',
        default: '#',
        placeholder: 'Agency website URL',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const url = value || '#';
          element.setAttribute('agencyUrl', url);
          (element as any).agencyUrl = url;
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Logo Source (optional)
    'logo-src': {
      definition: {
        name: 'logo-src',
        label: 'Logo Image URL',
        type: 'text',
        default: '',
        placeholder: 'Optional footer logo URL',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('logoSrc', value);
            (element as any).logoSrc = value;
          } else {
            element.removeAttribute('logoSrc');
            (element as any).logoSrc = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Logo Alt Text
    'logo-alt': {
      definition: {
        name: 'logo-alt',
        label: 'Logo Alt Text',
        type: 'text',
        default: '',
        placeholder: 'Alt text for logo',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('logoAlt', value);
            (element as any).logoAlt = value;
          } else {
            element.removeAttribute('logoAlt');
            (element as any).logoAlt = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Contact Phone
    'contact-phone': {
      definition: {
        name: 'contact-phone',
        label: 'Contact Phone',
        type: 'text',
        default: '',
        placeholder: '(555) 555-5555',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('contactPhone', value);
            (element as any).contactPhone = value;
          } else {
            element.removeAttribute('contactPhone');
            (element as any).contactPhone = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Contact Email
    'contact-email': {
      definition: {
        name: 'contact-email',
        label: 'Contact Email',
        type: 'text',
        default: '',
        placeholder: 'contact@agency.gov',
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          if (value) {
            element.setAttribute('contactEmail', value);
            (element as any).contactEmail = value;
          } else {
            element.removeAttribute('contactEmail');
            (element as any).contactEmail = '';
          }
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        },
      },
    },

    // Section count (for 'big' variant)
    'section-count': {
      definition: {
        name: 'section-count',
        label: 'Number of Sections',
        type: 'select',
        default: '3',
        options: [
          { id: '1', label: '1 Section' },
          { id: '2', label: '2 Sections' },
          { id: '3', label: '3 Sections' },
          { id: '4', label: '4 Sections' },
        ],
        visible: (component: any) => {
          try {
            if (!component) return false;
            const variant = component.get?.('attributes')?.['variant'] || 'medium';
            return variant === 'big';
          } catch {
            return false;
          }
        },
      },
      handler: {
        onChange: (element: HTMLElement, value: any) => {
          const count = parseInt(value || '3', 10);
          element.setAttribute('section-count', String(count));
          rebuildFooterSections(element, count);
        },
        onInit: (element: HTMLElement, _value: any) => {
          // Use retry logic to wait for Lit component to be ready
          initFooterSections(element);
        },
      },
    },

    // Section 1 traits
    'section1-title': createFooterSectionTitleTrait(1),
    'section1-link1-label': createFooterSectionLinkTrait(1, 1, 'label'),
    'section1-link1-href': createFooterSectionLinkTrait(1, 1, 'href'),
    'section1-link2-label': createFooterSectionLinkTrait(1, 2, 'label'),
    'section1-link2-href': createFooterSectionLinkTrait(1, 2, 'href'),
    'section1-link3-label': createFooterSectionLinkTrait(1, 3, 'label'),
    'section1-link3-href': createFooterSectionLinkTrait(1, 3, 'href'),
    'section1-link4-label': createFooterSectionLinkTrait(1, 4, 'label'),
    'section1-link4-href': createFooterSectionLinkTrait(1, 4, 'href'),

    // Section 2 traits
    'section2-title': createFooterSectionTitleTrait(2),
    'section2-link1-label': createFooterSectionLinkTrait(2, 1, 'label'),
    'section2-link1-href': createFooterSectionLinkTrait(2, 1, 'href'),
    'section2-link2-label': createFooterSectionLinkTrait(2, 2, 'label'),
    'section2-link2-href': createFooterSectionLinkTrait(2, 2, 'href'),
    'section2-link3-label': createFooterSectionLinkTrait(2, 3, 'label'),
    'section2-link3-href': createFooterSectionLinkTrait(2, 3, 'href'),
    'section2-link4-label': createFooterSectionLinkTrait(2, 4, 'label'),
    'section2-link4-href': createFooterSectionLinkTrait(2, 4, 'href'),

    // Section 3 traits
    'section3-title': createFooterSectionTitleTrait(3),
    'section3-link1-label': createFooterSectionLinkTrait(3, 1, 'label'),
    'section3-link1-href': createFooterSectionLinkTrait(3, 1, 'href'),
    'section3-link2-label': createFooterSectionLinkTrait(3, 2, 'label'),
    'section3-link2-href': createFooterSectionLinkTrait(3, 2, 'href'),
    'section3-link3-label': createFooterSectionLinkTrait(3, 3, 'label'),
    'section3-link3-href': createFooterSectionLinkTrait(3, 3, 'href'),
    'section3-link4-label': createFooterSectionLinkTrait(3, 4, 'label'),
    'section3-link4-href': createFooterSectionLinkTrait(3, 4, 'href'),

    // Section 4 traits
    'section4-title': createFooterSectionTitleTrait(4),
    'section4-link1-label': createFooterSectionLinkTrait(4, 1, 'label'),
    'section4-link1-href': createFooterSectionLinkTrait(4, 1, 'href'),
    'section4-link2-label': createFooterSectionLinkTrait(4, 2, 'label'),
    'section4-link2-href': createFooterSectionLinkTrait(4, 2, 'href'),
    'section4-link3-label': createFooterSectionLinkTrait(4, 3, 'label'),
    'section4-link3-href': createFooterSectionLinkTrait(4, 3, 'href'),
    'section4-link4-label': createFooterSectionLinkTrait(4, 4, 'label'),
    'section4-link4-href': createFooterSectionLinkTrait(4, 4, 'href'),
  },
});

