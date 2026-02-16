/**
 * Shared Utilities for Component Registry
 *
 * This module provides trait factory functions and component registration helpers
 * used by every USWDS component module (form-input-components, data-components,
 * structure-components, etc.) to define how GrapesJS traits map to web component
 * DOM attributes and properties.
 *
 * ## Trait Lifecycle
 *
 * Each trait has two parts — a **definition** (UI metadata for the GrapesJS traits
 * panel) and a **handler** (behavior callbacks). The lifecycle is:
 *
 * 1. **Registration** — A component module calls a factory (e.g., `createAttributeTrait`)
 *    and adds the returned `UnifiedTrait` to the component's `traits` map. The
 *    `ComponentRegistry` splits definitions from handlers and feeds them to GrapesJS.
 *
 * 2. **Mount / Init** — When a component is added to the canvas, `WebComponentTraitManager`
 *    calls `handler.onInit(element, defaultValue)` (if defined) or falls back to
 *    `handler.onChange(element, defaultValue)` to push the initial value into the DOM.
 *
 * 3. **User edits** — When the user changes a trait value in the traits panel, GrapesJS
 *    fires `change:attributes` / `change:value`. The trait manager calls
 *    `handler.onChange(element, newValue, oldValue, component)`, which writes the
 *    value to the DOM (e.g., `element.setAttribute(...)` or setting a JS property).
 *
 * 4. **Read-back** — When a component is selected, `handler.getValue(element)` reads
 *    the current value from the DOM so the traits panel shows the correct state.
 *
 * ## Value Flow: GrapesJS Model <-> HTML Element
 *
 * ```
 * Traits Panel (UI)
 *       |  user edits
 *       v
 * GrapesJS Component Model  (attributes map)
 *       |  change:attributes event
 *       v
 * handler.onChange(element, value)
 *       |
 *       v
 * DOM Element  (setAttribute / property / textContent)
 *       |
 *       v
 * handler.getValue(element)  -->  back to Traits Panel on select
 * ```
 *
 * ## Provided Utilities
 *
 * - **Trait factories**: `createAttributeTrait`, `createBooleanTrait`,
 *   `createInternalSyncTrait` — cover the three most common DOM-sync patterns.
 * - **Interval tracking**: `cancelPendingSync`, `cleanupElementIntervals`,
 *   `cleanupAllIntervals` — prevent memory leaks from retry-based sync.
 * - **Type coercion**: `coerceBoolean`, `hasAttributeTrue` — normalize the
 *   many representations of boolean values across HTML attributes and JS.
 */

import type { GrapesTrait, GrapesComponentModel } from '../types.js';
import { createDebugLogger } from '@uswds-pt/shared';
import type { USWDSElement } from '@uswds-pt/shared';

/**
 * Registry interface to avoid circular imports.
 * Component files receive this instead of the concrete ComponentRegistry class.
 */
export interface RegistryLike {
  register(registration: ComponentRegistration): void;
}

/**
 * Triggers a Lit re-render on a USWDS web component element, if the element
 * exposes a `requestUpdate()` method.
 *
 * Use this after setting properties/attributes on a web component to ensure
 * the Light DOM content updates to reflect the new values.
 *
 * @param element - The DOM element (typed as `unknown` so callers don't need to cast)
 */
export function triggerUpdate(element: unknown): void {
  if (typeof (element as USWDSElement).requestUpdate === 'function') {
    (element as USWDSElement).requestUpdate?.();
  }
}

/**
 * The value type that GrapesJS trait handlers receive.
 *
 * Trait values from GrapesJS can be:
 * - `string` — text, select, textarea, number (as string) trait types
 * - `boolean` — checkbox trait type
 * - `undefined` — when no value has been set yet
 *
 * Handlers that parse numeric values (e.g., `parseInt(value, 10)`) should
 * accept this union and coerce internally.
 */
export type TraitValue = string | boolean | undefined;

/**
 * Coerce a {@link TraitValue} to a string for use with `setAttribute` and
 * other DOM string APIs.
 *
 * Returns the value when it is a non-empty string; otherwise returns `fallback`.
 */
export function traitStr(value: TraitValue, fallback = ''): string {
  return typeof value === 'string' && value ? value : fallback;
}

const debug = createDebugLogger('ComponentRegistry');

// ============================================================================
// Core Types
// ============================================================================

/**
 * Defines the behavior callbacks for a single trait.
 *
 * Every trait handler must provide at least `onChange`. The optional `getValue`
 * and `onInit` hooks allow traits to read back current DOM state and perform
 * one-time setup, respectively.
 *
 * These callbacks are invoked by {@link WebComponentTraitManager} in response
 * to GrapesJS component lifecycle events (mount, select, attribute change).
 */
export interface TraitHandler {
  /**
   * Called whenever the user changes the trait value in the GrapesJS traits panel,
   * or when the trait manager pushes a default value into the DOM during init.
   *
   * Implementations should write the value to the DOM element — typically via
   * `element.setAttribute(name, value)` for string attributes or
   * `element.removeAttribute(name)` / `element.setAttribute(name, '')` for booleans.
   *
   * @param element - The web component's DOM element in the GrapesJS canvas iframe
   * @param value - The new trait value (string, boolean, or undefined)
   * @param oldValue - The previous trait value, if available (may be undefined on first call)
   * @param component - The GrapesJS component model instance, for advanced handlers
   *   that need to update the model directly (e.g., usa-button text persistence)
   */
  onChange: (element: HTMLElement, value: TraitValue, oldValue?: TraitValue, component?: GrapesComponentModel) => void;

  /**
   * Reads the current trait value from the DOM element. Called when the user
   * selects a component to populate the traits panel with the live DOM state.
   *
   * If omitted, the trait panel falls back to the GrapesJS model's stored value.
   * Implement this when the canonical value lives on the DOM element (e.g.,
   * `element.getAttribute('heading')`) rather than in the GrapesJS model.
   *
   * @param element - The web component's DOM element
   * @returns The current value to display in the traits panel
   */
  getValue?: (element: HTMLElement) => unknown;

  /**
   * One-time initialization hook called when the component is first mounted
   * in the canvas (via `component:mount` event). Use for setup that differs
   * from normal `onChange` behavior, such as setting boolean attributes that
   * should only be present when explicitly enabled.
   *
   * If `onInit` is not provided, the trait manager falls back to calling
   * `onChange(element, defaultValue)` during mount.
   *
   * @param element - The web component's DOM element
   * @param defaultValue - The trait's default value from the definition or component attributes
   */
  onInit?: (element: HTMLElement, defaultValue: TraitValue) => void;
}

/**
 * A complete trait specification that pairs the GrapesJS UI definition with
 * the DOM synchronization handler.
 *
 * This is the return type of all trait factory functions (`createAttributeTrait`,
 * `createBooleanTrait`, `createInternalSyncTrait`). During component registration,
 * the `ComponentRegistry` splits this into:
 * - `definition` — added to the GrapesJS component type's `traits` array (controls
 *   what appears in the traits panel: label, input type, options, default value).
 * - `handler` — stored in a lookup map keyed by tag name + trait name, invoked by
 *   `WebComponentTraitManager` when trait values change or need to be read back.
 *
 * @example
 * ```ts
 * // In a component registration:
 * traits: {
 *   label: createAttributeTrait('label', { label: 'Label', type: 'text' }),
 *   disabled: createBooleanTrait('disabled', { label: 'Disabled' }),
 * }
 * ```
 */
export interface UnifiedTrait {
  /** GrapesJS trait panel metadata (name, label, type, default, options, etc.). */
  definition: GrapesTrait;
  /** Callbacks that sync trait values between the GrapesJS model and the DOM element. */
  handler: TraitHandler;
}

/**
 * The single source of truth for registering a USWDS web component with GrapesJS.
 *
 * Each component module (e.g., `form-input-components.ts`, `data-components.ts`)
 * calls `registry.register(registration)` with one of these objects. The
 * `ComponentRegistry` uses it to:
 * 1. Create a GrapesJS component type (with `isComponent`, tag matching, and traits).
 * 2. Create a GrapesJS block (the draggable item in the blocks panel).
 * 3. Store trait handlers for `WebComponentTraitManager` to invoke at runtime.
 *
 * @example
 * ```ts
 * registry.register({
 *   tagName: 'usa-button',
 *   droppable: false,
 *   traits: {
 *     text: createAttributeTrait('text', { label: 'Button Text', type: 'text' }),
 *     disabled: createBooleanTrait('disabled', { label: 'Disabled' }),
 *   },
 * });
 * ```
 */
export interface ComponentRegistration {
  /** The custom element tag name (e.g., `'usa-button'`, `'usa-card'`). */
  tagName: string;
  /** Map of trait name to its unified definition + handler. */
  traits: Record<string, UnifiedTrait>;
  /**
   * Whether other components can be dropped inside this one.
   * - `false` — leaf component, no children allowed (e.g., usa-button).
   * - `true` — accepts any droppable children (e.g., form container).
   * - CSS selector string — restricts which children are accepted.
   */
  droppable?: boolean | string;
}

/**
 * Configuration for the retry logic used by {@link createInternalSyncTrait}.
 *
 * USWDS web components render their Light DOM content asynchronously (via Lit's
 * update lifecycle). When a trait value changes, the internal element targeted by
 * `internalSelector` may not exist yet. The retry mechanism polls at fixed
 * intervals until the element appears or the attempt limit is reached.
 *
 * Default values (if not specified): 10 attempts, 50ms delay, 500ms timeout.
 */
export interface RetryConfig {
  /** Maximum number of polling attempts before giving up. Default: 10. */
  maxAttempts?: number;
  /** Milliseconds between each polling attempt. Default: 50. */
  delayMs?: number;
  /** Overall timeout in milliseconds (currently informational). Default: 500. */
  timeoutMs?: number;
}

// ============================================================================
// Interval Tracking for Memory Leak Prevention
// ============================================================================

const activeIntervals = new Map<string, ReturnType<typeof setInterval>>();
const settingIdElements = new WeakSet<HTMLElement>();

function getIntervalKey(element: HTMLElement, traitName: string): string {
  if (!element || typeof element.getAttribute !== 'function') {
    return `invalid-element:${traitName}`;
  }

  let elementId = element.getAttribute('data-uswds-pt-id');
  if (!elementId) {
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
 * Cancels any in-flight retry interval for a specific element + trait combination.
 *
 * Called internally by {@link createInternalSyncTrait} before starting a new
 * sync attempt, and by {@link cleanupElementIntervals} during component removal.
 * Prevents stale intervals from writing to elements that have been re-rendered
 * or removed from the DOM.
 *
 * @param element - The web component DOM element whose sync should be cancelled
 * @param traitName - The trait name identifying which sync interval to cancel
 */
export function cancelPendingSync(element: HTMLElement, traitName: string): void {
  const key = getIntervalKey(element, traitName);
  const existingInterval = activeIntervals.get(key);
  if (existingInterval) {
    clearInterval(existingInterval);
    activeIntervals.delete(key);
  }
}

/**
 * Clears all pending retry intervals associated with a given DOM element.
 *
 * Called by `WebComponentTraitManager.handleComponentRemove()` when a component
 * is deleted from the canvas. This is critical for preventing memory leaks —
 * without cleanup, `setInterval` callbacks would continue running against
 * detached DOM nodes.
 *
 * Identifies intervals by the element's `data-uswds-pt-id` attribute, which is
 * assigned automatically by the interval tracking system.
 *
 * @param element - The web component DOM element being removed
 */
export function cleanupElementIntervals(element: HTMLElement): void {
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

  keysToDelete.forEach((key) => activeIntervals.delete(key));
}

/**
 * Clears every active retry interval across all elements and traits.
 *
 * Called by `WebComponentTraitManager.destroy()` when the GrapesJS editor is
 * torn down (e.g., page navigation, editor unmount). Acts as a global safety
 * net to ensure no orphaned intervals survive editor destruction.
 */
export function cleanupAllIntervals(): void {
  activeIntervals.forEach((interval) => clearInterval(interval));
  activeIntervals.clear();
}

// ============================================================================
// Type Coercion Utilities
// ============================================================================

/**
 * Normalizes a trait value to a strict boolean.
 *
 * GrapesJS trait values for checkboxes can arrive as `true`, `'true'`, or `''`
 * (empty string — the HTML attribute form of a boolean). This function treats
 * all three as `true` and everything else as `false`.
 *
 * Used internally by {@link createBooleanTrait} and by component modules that
 * define custom boolean-like handlers (e.g., usa-alert's `no-icon` trait).
 *
 * @param value - The raw trait value from GrapesJS (boolean, string, or any)
 * @returns `true` if the value represents an enabled boolean attribute, `false` otherwise
 */
export function coerceBoolean(value: unknown): boolean {
  if (value === true || value === 'true' || value === '') {
    return true;
  }
  return false;
}

/**
 * Checks whether an HTML boolean attribute is present and set to a truthy value.
 *
 * HTML boolean attributes can take several forms: `<el disabled>` (empty string),
 * `<el disabled="true">`, or `<el disabled="disabled">`. This function returns
 * `true` for all three and `false` if the attribute is absent. It does NOT
 * return `true` for `disabled="false"` (which is technically still "present" in
 * HTML but semantically falsy).
 *
 * Prefer this over `element.hasAttribute(name)` when the attribute may contain
 * an explicit `"false"` value that should be treated as disabled.
 *
 * @param element - The DOM element to inspect
 * @param attributeName - The attribute name to check (e.g., `'disabled'`, `'striped'`)
 * @returns `true` if the attribute is present with a truthy value
 */
export function hasAttributeTrue(element: HTMLElement, attributeName: string): boolean {
  if (!element.hasAttribute(attributeName)) {
    return false;
  }
  const value = element.getAttribute(attributeName);
  return value === '' || value === 'true' || value === attributeName;
}

// ============================================================================
// Trait Handler Factories
// ============================================================================

/**
 * Creates a trait that syncs a string (or numeric) attribute between the
 * GrapesJS traits panel and the web component's DOM attribute.
 *
 * **onChange behavior**: Sets `element.setAttribute(traitName, value)`. If the
 * value is `null`, `undefined`, or included in `config.removeDefaults`, the
 * attribute is removed instead (useful for cleaning up default/empty values
 * from the serialized HTML).
 *
 * **getValue behavior**: Reads `element.getAttribute(traitName)`, falling back
 * to the configured default value.
 *
 * Use this factory for simple string attributes like `heading`, `label`,
 * `placeholder`, `action`, and for `select` dropdowns where the value is a
 * string identifier. For boolean (present/absent) attributes like `disabled`
 * or `striped`, use {@link createBooleanTrait} instead. For traits that need
 * to update an internal child element (e.g., setting `textContent` on a nested
 * `<span>` or `<button>`), use {@link createInternalSyncTrait}.
 *
 * @param traitName - The DOM attribute name (e.g., `'heading'`, `'action'`, `'variant'`)
 * @param config - Trait configuration
 * @param config.label - Display label shown in the GrapesJS traits panel
 * @param config.type - Input type: `'text'`, `'select'`, `'number'`, `'textarea'`, or custom
 * @param config.default - Default value shown when no attribute is set
 * @param config.placeholder - Placeholder text for text/textarea inputs
 * @param config.options - Dropdown options for `'select'` type traits
 * @param config.removeDefaults - Values that should cause the attribute to be removed
 *   from the DOM rather than set (e.g., removing a `'default'` variant to keep HTML clean)
 * @param config.min - Minimum value for `'number'` type traits
 * @param config.max - Maximum value for `'number'` type traits
 * @returns A {@link UnifiedTrait} with definition and handler ready for component registration
 *
 * @example
 * ```ts
 * // Simple text attribute
 * heading: createAttributeTrait('heading', {
 *   label: 'Heading',
 *   type: 'text',
 *   default: 'Card Title',
 * })
 *
 * // Select dropdown with removeDefaults
 * variant: createAttributeTrait('variant', {
 *   label: 'Variant',
 *   type: 'select',
 *   default: 'default',
 *   options: [
 *     { id: 'default', label: 'Default' },
 *     { id: 'secondary', label: 'Secondary' },
 *   ],
 *   removeDefaults: ['default'],
 * })
 * ```
 */
export function createAttributeTrait(
  traitName: string,
  config: {
    label: string;
    type: 'text' | 'select' | 'number' | 'textarea' | 'multiselect-targets' | string;
    default?: string | number;
    placeholder?: string;
    options?: Array<{ id: string; label: string }>;
    removeDefaults?: Array<string | number>;
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
          (config.removeDefaults && typeof value !== 'boolean' && config.removeDefaults.includes(value));

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
 * Creates a trait for HTML boolean attributes (present = enabled, absent = disabled).
 *
 * Renders a checkbox in the GrapesJS traits panel. The trait follows the HTML
 * boolean attribute convention: when enabled, the attribute is set as an empty
 * string (`element.setAttribute(name, '')`); when disabled, the attribute is
 * removed entirely (`element.removeAttribute(name)`).
 *
 * **onChange behavior**: Coerces the value via {@link coerceBoolean}, then
 * adds/removes the attribute. If `syncToInternal` is specified, also mirrors
 * the attribute and JS property to a child element matching that CSS selector
 * (useful for web components where the outer custom element attribute must be
 * forwarded to an inner `<input>` or `<button>`).
 *
 * **getValue behavior**: Returns `element.hasAttribute(traitName)` — a simple
 * presence check.
 *
 * **onInit behavior**: Only sets the attribute if the default value is truthy,
 * avoiding spurious empty attributes on freshly created components.
 *
 * Use this for attributes like `disabled`, `required`, `striped`, `borderless`,
 * `compact`, `no-icon`, etc. For string-valued attributes, use
 * {@link createAttributeTrait}. For attributes that need to update nested
 * element text, use {@link createInternalSyncTrait}.
 *
 * @param traitName - The DOM attribute name (e.g., `'disabled'`, `'required'`, `'striped'`)
 * @param config - Trait configuration
 * @param config.label - Display label shown in the GrapesJS traits panel
 * @param config.default - Whether the checkbox starts checked. Default: `false`
 * @param config.syncToInternal - Optional CSS selector for a child element that
 *   should receive the same attribute and JS property update (e.g., `'input'`
 *   to forward `disabled` to the inner `<input>` element)
 * @returns A {@link UnifiedTrait} with definition and handler ready for component registration
 *
 * @example
 * ```ts
 * disabled: createBooleanTrait('disabled', {
 *   label: 'Disabled',
 *   syncToInternal: 'input',
 * })
 *
 * striped: createBooleanTrait('striped', {
 *   label: 'Striped Rows',
 *   default: false,
 * })
 * ```
 */
export function createBooleanTrait(
  traitName: string,
  config: {
    label: string;
    default?: boolean;
    syncToInternal?: string;
  }
): UnifiedTrait {
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

        if (isEnabled) {
          element.setAttribute(traitName, '');
        } else {
          element.removeAttribute(traitName);
        }

        if (config.syncToInternal) {
          const internal = element.querySelector(config.syncToInternal);
          if (internal instanceof HTMLElement) {
            const uswdsInternal = internal as USWDSElement;
            if (isEnabled) {
              internal.setAttribute(traitName, '');
              uswdsInternal[traitName] = true;
            } else {
              internal.removeAttribute(traitName);
              uswdsInternal[traitName] = false;
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
 * Creates a trait that syncs a value to both the web component's DOM attribute
 * AND an internal child element's text content or innerHTML — with automatic
 * retry logic to handle asynchronous Lit rendering.
 *
 * This is the most complex trait factory. It handles the common pattern where
 * a USWDS web component stores a value as an attribute on the custom element
 * (for serialization) but also needs to push that value into a nested Light DOM
 * element that may not exist yet when the trait change fires (because the web
 * component re-renders asynchronously via Lit's `requestUpdate` / `updateComplete`).
 *
 * **onChange behavior**:
 * 1. Sets the attribute and JS property on the custom element.
 * 2. If the element has a `requestUpdate()` method (Lit), calls it and waits
 *    for `updateComplete` before syncing the internal element.
 * 3. Queries `element.querySelector(internalSelector)` to find the target child.
 * 4. Sets `child[syncProperty] = value` (either `textContent` or `innerHTML`).
 * 5. If the child is not found (not yet rendered), starts a polling interval
 *    that retries up to `maxAttempts` times at `delayMs` intervals.
 * 6. Cancels any previous pending sync for the same element + trait to prevent
 *    stale writes.
 *
 * **getValue behavior**: Reads the JS property first (`element[traitName]`),
 * falling back to `element.getAttribute(traitName)`, then to the default.
 * This priority ensures that Lit-managed properties (which may be more current
 * than attributes) are preferred.
 *
 * Use this when you need to keep a nested element's content in sync with a
 * trait — for example, updating the `<legend>` text inside a `<usa-fieldset>`,
 * or the label text inside a form input component. For simple attribute-only
 * traits, use {@link createAttributeTrait}. For boolean toggles, use
 * {@link createBooleanTrait}.
 *
 * @param traitName - The DOM attribute name (e.g., `'legend'`, `'label'`)
 * @param config - Trait configuration
 * @param config.label - Display label shown in the GrapesJS traits panel
 * @param config.type - Input type in the panel: `'text'` (default) or `'textarea'`
 * @param config.default - Default value when no attribute is set
 * @param config.placeholder - Placeholder text for the input field
 * @param config.internalSelector - CSS selector for the child element to sync
 *   (e.g., `'legend'`, `'.usa-label'`, `'h2'`)
 * @param config.syncProperty - Which property to set on the child element:
 *   `'textContent'` for plain text, `'innerHTML'` for HTML content
 * @param config.retry - Optional {@link RetryConfig} to customize polling behavior
 * @returns A {@link UnifiedTrait} with definition and handler ready for component registration
 *
 * @example
 * ```ts
 * legend: createInternalSyncTrait('legend', {
 *   label: 'Legend',
 *   internalSelector: 'legend',
 *   syncProperty: 'textContent',
 *   default: 'Fieldset legend',
 * })
 *
 * label: createInternalSyncTrait('label', {
 *   label: 'Label',
 *   internalSelector: '.usa-label',
 *   syncProperty: 'textContent',
 *   placeholder: 'Enter label text',
 *   retry: { maxAttempts: 20, delayMs: 100 },
 * })
 * ```
 */
export function createInternalSyncTrait(
  traitName: string,
  config: {
    label: string;
    type?: 'text' | 'textarea';
    default?: string;
    placeholder?: string;
    internalSelector: string;
    syncProperty: 'textContent' | 'innerHTML';
    retry?: RetryConfig;
  }
): UnifiedTrait {
  const retryConfig = {
    maxAttempts: config.retry?.maxAttempts ?? 10,
    delayMs: config.retry?.delayMs ?? 50,
    timeoutMs: config.retry?.timeoutMs ?? 500,
  };

  const syncWithRetry = (element: HTMLElement, value: string): void => {
    cancelPendingSync(element, traitName);

    const attemptSync = (): boolean => {
      if (!element.isConnected) {
        cancelPendingSync(element, traitName);
        return true;
      }

      const internal = element.querySelector(config.internalSelector);
      if (internal instanceof HTMLElement) {
        (internal as USWDSElement)[config.syncProperty] = value;
        return true;
      }
      return false;
    };

    if (attemptSync()) return;

    let attempts = 0;
    const key = getIntervalKey(element, traitName);

    const intervalId = setInterval(() => {
      attempts++;
      if (attemptSync() || attempts >= retryConfig.maxAttempts) {
        clearInterval(intervalId);
        activeIntervals.delete(key);
        if (attempts >= retryConfig.maxAttempts && element.isConnected) {
          debug(
            `Could not sync '${traitName}' to '${config.internalSelector}' after ${retryConfig.maxAttempts} attempts`
          );
        }
      }
    }, retryConfig.delayMs);

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
        const textValue = String(value ?? '');
        const el = element as USWDSElement;

        element.setAttribute(traitName, textValue);
        el[traitName] = textValue;

        if (typeof el.requestUpdate === 'function') {
          el.requestUpdate();

          const { updateComplete } = el;
          if (updateComplete instanceof Promise) {
            updateComplete
              .then(() => {
                syncWithRetry(element, textValue);
              })
              .catch(() => {
                syncWithRetry(element, textValue);
              });
            return;
          }
        }

        syncWithRetry(element, textValue);
      },
      getValue: (element) => {
        const propValue = (element as USWDSElement)[traitName];
        if (propValue !== undefined && propValue !== null) {
          return propValue;
        }
        return element.getAttribute(traitName) || (config.default ?? '');
      },
    },
  };
}

/**
 * Debug logger instance for the ComponentRegistry namespace.
 *
 * Re-exported for use in component modules that need to log trait-related
 * debug messages under the same `ComponentRegistry` namespace. Enabled
 * by setting `localStorage.debug = 'uswds-pt:ComponentRegistry'` in the
 * browser console.
 */
export { debug };

// Re-export types that component modules need
export type { GrapesComponentModel } from '../types.js';
