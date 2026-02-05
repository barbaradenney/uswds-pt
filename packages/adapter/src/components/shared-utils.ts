/**
 * Shared Utilities for Component Registry
 *
 * Common utilities used across all component modules:
 * - Interval tracking for memory leak prevention
 * - Type coercion utilities
 * - Common trait factories
 */

import type { GrapesTrait } from '../types.js';
import { createDebugLogger } from '@uswds-pt/shared';

const debug = createDebugLogger('ComponentRegistry');

// ============================================================================
// Core Types
// ============================================================================

/**
 * Trait handler interface - defines how trait changes propagate to web components
 */
export interface TraitHandler {
  onChange: (element: HTMLElement, value: any, oldValue?: any, component?: any) => void;
  getValue?: (element: HTMLElement) => any;
  onInit?: (element: HTMLElement, defaultValue: any) => void;
}

/**
 * Unified trait - combines UI definition and behavior handler
 */
export interface UnifiedTrait {
  definition: GrapesTrait;
  handler: TraitHandler;
}

/**
 * Component registration - single source of truth for a USWDS component
 */
export interface ComponentRegistration {
  tagName: string;
  traits: Record<string, UnifiedTrait>;
  droppable?: boolean | string;
}

/**
 * Retry configuration for internal element synchronization
 */
export interface RetryConfig {
  maxAttempts?: number;
  delayMs?: number;
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

export function cancelPendingSync(element: HTMLElement, traitName: string): void {
  const key = getIntervalKey(element, traitName);
  const existingInterval = activeIntervals.get(key);
  if (existingInterval) {
    clearInterval(existingInterval);
    activeIntervals.delete(key);
  }
}

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

export function cleanupAllIntervals(): void {
  activeIntervals.forEach((interval) => clearInterval(interval));
  activeIntervals.clear();
}

// ============================================================================
// Type Coercion Utilities
// ============================================================================

export function coerceBoolean(value: any): boolean {
  if (value === true || value === 'true' || value === '') {
    return true;
  }
  return false;
}

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
 * Factory: Simple attribute handler
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
 * Factory: Boolean attribute handler
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
            if (isEnabled) {
              internal.setAttribute(traitName, '');
              (internal as any)[traitName] = true;
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
 * Factory: Internal element sync handler (with retry logic)
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
        (internal as any)[config.syncProperty] = value;
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
        const textValue = value || '';

        element.setAttribute(traitName, textValue);
        (element as any)[traitName] = textValue;

        if (typeof (element as any).requestUpdate === 'function') {
          (element as any).requestUpdate();

          const updateComplete = (element as any).updateComplete;
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
        const propValue = (element as any)[traitName];
        if (propValue !== undefined && propValue !== null) {
          return propValue;
        }
        return element.getAttribute(traitName) || (config.default ?? '');
      },
    },
  };
}

// Re-export debug for use in component modules
export { debug };
