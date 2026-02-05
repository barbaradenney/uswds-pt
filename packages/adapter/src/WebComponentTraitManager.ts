/**
 * WebComponentTraitManager
 *
 * Manages the integration between GrapesJS traits and Web Components.
 * Handles the complexity of Shadow DOM, property vs attribute updates,
 * and prevents sync loops.
 */

import { componentRegistry, cleanupElementIntervals, cleanupAllIntervals, type TraitHandler as RegistryTraitHandler } from './component-registry-v2.js';

// Debug logging flag - only log verbose output in development with explicit flag
const DEBUG = false; // Set to true during development for detailed logs

/**
 * Debug logging helper - only logs when DEBUG flag is enabled
 */
function debug(...args: any[]): void {
  if (DEBUG) {
    console.log('[WebComponentTraitManager]', ...args);
  }
}

export interface TraitHandler {
  /**
   * Called when a trait value changes in GrapesJS
   * @param element - The DOM element
   * @param value - The new value
   * @param oldValue - The previous value (optional)
   * @param component - The GrapesJS component (optional, for advanced handlers)
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

export interface ComponentConfig {
  /**
   * Tag name of the web component (e.g., 'usa-button')
   */
  tagName: string;

  /**
   * Map of trait names to their handlers
   */
  traits: Record<string, TraitHandler>;
}

export class WebComponentTraitManager {
  private editor: any;
  private componentConfigs: Map<string, ComponentConfig> = new Map();
  private activeListeners: Map<string, Function> = new Map();

  constructor(editor: any) {
    this.editor = editor;
    this.setupGlobalListeners();
  }

  /**
   * Register a component configuration
   */
  registerComponent(config: ComponentConfig): void {
    this.componentConfigs.set(config.tagName, config);
    debug(`Registered ${config.tagName}`);
  }

  /**
   * Register multiple components at once
   */
  registerComponents(configs: ComponentConfig[]): void {
    configs.forEach(config => this.registerComponent(config));
  }

  /**
   * Get trait handlers for a component (backward compatible)
   * Checks new componentRegistry first, then falls back to old componentConfigs
   */
  private getTraitHandlers(tagName: string): Record<string, TraitHandler> | undefined {
    // Try new registry first
    const registryHandlers = componentRegistry.getTraitHandlers(tagName);
    if (registryHandlers && Object.keys(registryHandlers).length > 0) {
      return registryHandlers;
    }

    // Fall back to old componentConfigs
    const config = this.componentConfigs.get(tagName);
    return config?.traits;
  }

  /**
   * Set up global listeners for component lifecycle
   */
  private setupGlobalListeners(): void {
    // Listen for component selection
    this.editor.on('component:selected', (component: any) => {
      this.handleComponentSelected(component);
    });

    // Listen for component deselection
    this.editor.on('component:deselected', (component: any) => {
      this.handleComponentDeselected(component);
    });

    // Listen for component mount (when added to canvas)
    this.editor.on('component:mount', (component: any) => {
      this.handleComponentMount(component);
    });

    // Listen for component removal (unmount) - critical for cleanup
    this.editor.on('component:remove', (component: any) => {
      this.handleComponentRemove(component);
    });

    // Listen for editor destroy to clean up all resources
    this.editor.on('destroy', () => {
      this.destroy();
    });

    console.log('WebComponentTraitManager: Global listeners initialized');
  }

  /**
   * Handle component selection - set up trait listeners
   */
  private handleComponentSelected(component: any): void {
    const tagName = component.get('tagName')?.toLowerCase();
    if (!tagName) return;

    const handlers = this.getTraitHandlers(tagName);
    if (!handlers) return;

    debug(`Selected ${tagName}`);

    // Set up trait change listeners
    this.setupTraitListeners(component, tagName, handlers);
  }

  /**
   * Handle component deselection - clean up listeners
   */
  private handleComponentDeselected(component: any): void {
    const componentId = component.getId();
    const listenerId = `${componentId}-traits`;

    // Remove trait change listener
    const listener = this.activeListeners.get(listenerId);
    if (listener) {
      component.off('change:attributes', listener);
      this.activeListeners.delete(listenerId);
    }

    // Remove attribute observers
    const cleanupKeys = Array.from(this.activeListeners.keys()).filter(key =>
      key.startsWith(`${componentId}-observer`)
    );
    cleanupKeys.forEach(key => {
      const cleanup = this.activeListeners.get(key);
      if (typeof cleanup === 'function') {
        cleanup();
      }
      this.activeListeners.delete(key);
    });
  }

  /**
   * Handle component removal - clean up all resources including intervals
   * This is critical for preventing memory leaks
   */
  private handleComponentRemove(component: any): void {
    const componentId = component.getId();
    const tagName = component.get('tagName')?.toLowerCase();

    debug(`Removing component ${tagName} (${componentId})`);

    // Clean up all listeners for this component
    const keysToDelete = Array.from(this.activeListeners.keys()).filter(key =>
      key.startsWith(componentId)
    );

    keysToDelete.forEach(key => {
      const cleanup = this.activeListeners.get(key);
      if (typeof cleanup === 'function') {
        try {
          cleanup();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
      this.activeListeners.delete(key);
    });

    // Clean up any pending intervals for this element's traits
    const element = component.getEl();
    if (element && element instanceof HTMLElement) {
      cleanupElementIntervals(element);
    }

    debug(`Cleaned up resources for ${tagName} (${componentId})`);
  }

  /**
   * Handle component mount - initialize traits
   */
  private handleComponentMount(component: any): void {
    const tagName = component.get('tagName')?.toLowerCase();
    if (!tagName) return;

    const handlers = this.getTraitHandlers(tagName);
    if (!handlers) return;

    const element = component.getEl();
    if (!element) return;

    debug(`Mounted ${tagName}`);

    // Initialize all traits
    this.initializeTraits(component, element, handlers);

    // Set up attribute observers for special traits like 'text'
    this.setupAttributeObservers(component, element, tagName, handlers);
  }

  /**
   * Initialize traits with their default values
   * This ensures that default values are applied even when not explicitly set
   */
  private initializeTraits(component: any, element: HTMLElement, handlers: Record<string, TraitHandler>): void {
    const attributes = component.get('attributes') || {};
    const tagName = component.get('tagName')?.toLowerCase();

    // Get trait defaults from registry
    const traitDefaults = tagName ? componentRegistry.getTraitDefaults(tagName) : {};

    Object.entries(handlers).forEach(([traitName, handler]) => {
      // Get the value from attributes, falling back to the default
      let value = attributes[traitName];
      const hasValue = value !== undefined && value !== null;
      const defaultValue = traitDefaults[traitName];

      // If no value is set but there's a default, use the default
      if (!hasValue && defaultValue !== undefined) {
        value = defaultValue;
        debug(`Using default value for '${traitName}':`, defaultValue);
      }

      // Call onInit if it exists (with value or default)
      if (handler.onInit && value !== undefined) {
        try {
          handler.onInit(element, value);
        } catch (err) {
          console.warn(`WebComponentTraitManager: Error in onInit for '${traitName}':`, err);
        }
      }

      // For traits without onInit, call onChange to initialize
      // This ensures the DOM is in sync with the attribute value
      if (!handler.onInit && value !== undefined) {
        try {
          handler.onChange(element, value, undefined, component);
        } catch (err) {
          console.warn(`WebComponentTraitManager: Error in onChange for '${traitName}':`, err);
        }
      }
    });
  }

  /**
   * Set up MutationObserver to watch for attribute and nested element changes
   * USWDS-WC uses Light DOM, so we need to observe the subtree for changes
   */
  private setupAttributeObservers(component: any, element: HTMLElement, tagName: string, handlers: Record<string, TraitHandler>): void {
    const componentId = component.getId();

    // Debounce flag to prevent rapid-fire mutations from causing loops
    let isProcessingMutation = false;

    // Create a MutationObserver to watch for attribute and nested changes
    const observer = new MutationObserver((mutations) => {
      // Skip if we're already processing to prevent loops
      if (isProcessingMutation) return;

      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          // Handle attribute changes on the web component itself
          if (mutation.target === element) {
            const attributeName = mutation.attributeName;
            if (!attributeName) return;

            const handler = handlers[attributeName];
            if (handler) {
              const newValue = element.getAttribute(attributeName);
              debug(`Observed attribute '${attributeName}' changed to:`, newValue);

              // For text attributes, ensure button textContent stays in sync
              if (attributeName === 'text') {
                isProcessingMutation = true;
                const syncButtonText = () => {
                  const button = element.querySelector('button');
                  if (button) {
                    if (button.textContent !== newValue) {
                      button.textContent = newValue || '';
                      debug(`Synced button textContent to:`, newValue);
                    }
                    return true;
                  }
                  return false;
                };

                // Try immediately
                if (!syncButtonText()) {
                  // Button doesn't exist yet, wait for it
                  debug(`Button not found for sync, will retry...`);
                  setTimeout(() => {
                    syncButtonText();
                    isProcessingMutation = false;
                  }, 100);
                } else {
                  isProcessingMutation = false;
                }
              }
            }
          }
        } else if (mutation.type === 'childList') {
          // Handle child node additions/removals (Light DOM changes)
          // This helps detect when web component initially renders its content
          debug(`Child nodes changed in ${tagName}`);
        } else if (mutation.type === 'characterData') {
          // Handle text content changes in nested elements
          debug(`Text content changed in ${tagName}`);
        }
      });
    });

    // Observe attribute changes, child list changes, and text content changes
    // subtree: true is critical for Light DOM web components
    observer.observe(element, {
      attributes: true,
      attributeOldValue: true,
      childList: true,           // Watch for child node additions/removals
      subtree: true,             // Watch all descendants (Light DOM)
      characterData: true,       // Watch for text content changes
      characterDataOldValue: true,
    });

    // Store observer for cleanup
    const observerId = `${componentId}-observer`;
    this.activeListeners.set(observerId, () => observer.disconnect());

    debug(`Set up attribute observer for ${component.get('tagName')} with subtree watching`);
  }

  /**
   * Set up listeners for trait changes
   */
  private setupTraitListeners(component: any, tagName: string, handlers: Record<string, TraitHandler>): void {
    const componentId = component.getId();
    const listenerId = `${componentId}-traits`;

    // Remove old listener if exists
    const oldListener = this.activeListeners.get(listenerId);
    if (oldListener) {
      component.off('change:attributes', oldListener);
    }

    // Create new listener for attribute changes
    const attributeListener = () => {
      this.handleTraitChanges(component, handlers);
    };

    // Store and attach listener
    this.activeListeners.set(listenerId, attributeListener);
    component.on('change:attributes', attributeListener);

    // Also listen for individual trait changes via component:update events
    // This catches cases where GrapesJS updates traits without triggering change:attributes
    Object.keys(handlers).forEach(traitName => {
      const traitListenerId = `${componentId}-trait-${traitName}`;
      const traitListener = () => {
        debug(`Trait update event for '${traitName}'`);
        const element = component.getEl();
        if (!element) return;

        const attrs = component.get('attributes') || {};
        const value = attrs[traitName];
        const handler = handlers[traitName];

        if (handler) {
          debug(`Calling handler for '${traitName}' with value:`, value);
          try {
            handler.onChange(element, value, undefined, component);
            if (typeof (element as any).requestUpdate === 'function') {
              (element as any).requestUpdate();
            }
          } catch (error) {
            console.error(`Error handling trait '${traitName}':`, error);
          }
        }
      };

      this.activeListeners.set(traitListenerId, traitListener);
      component.on(`change:attributes:${traitName}`, traitListener);
    });
  }

  /**
   * Handle trait value changes
   */
  private handleTraitChanges(component: any, handlers: Record<string, TraitHandler>): void {
    const element = component.getEl();
    if (!element) {
      console.warn('WebComponentTraitManager: No element found for component');
      return;
    }

    const attributes = component.get('attributes') || {};
    const previousAttributes = component.previous('attributes') || {};

    debug('All attributes:', JSON.stringify(attributes));
    debug('Previous attributes:', JSON.stringify(previousAttributes));

    // Process each trait that has changed
    Object.entries(handlers).forEach(([traitName, handler]) => {
      const newValue = attributes[traitName];
      const oldValue = previousAttributes[traitName];

      debug(`Checking '${traitName}': newValue="${newValue}" (${typeof newValue}), oldValue="${oldValue}" (${typeof oldValue}), changed=${newValue !== oldValue}`);

      // Only process if value actually changed
      if (newValue !== oldValue) {
        debug(`Trait '${traitName}' changed from`, oldValue, 'to', newValue);

        try {
          handler.onChange(element, newValue, oldValue, component);

          // Trigger web component update if it uses Lit or similar
          if (typeof (element as any).requestUpdate === 'function') {
            (element as any).requestUpdate();
          }
        } catch (error) {
          console.error(`WebComponentTraitManager: Error handling trait '${traitName}':`, error);
        }
      }
    });
  }

  /**
   * Helper: Update a property on the web component
   */
  static setProperty(element: HTMLElement, propertyName: string, value: any): void {
    (element as any)[propertyName] = value;
  }

  /**
   * Helper: Update an attribute on the web component
   */
  static setAttribute(element: HTMLElement, attributeName: string, value: any): void {
    if (value === null || value === undefined || value === false) {
      element.removeAttribute(attributeName);
    } else if (value === true) {
      element.setAttribute(attributeName, '');
    } else {
      element.setAttribute(attributeName, String(value));
    }
  }

  /**
   * Helper: Update an element inside the web component (Light DOM)
   * Note: USWDS-WC uses Light DOM, so internal elements are directly accessible
   */
  static updateInternalElement(
    element: HTMLElement,
    selector: string,
    updater: (internalElement: HTMLElement) => void
  ): void {
    const internalElement = element.querySelector(selector);
    if (internalElement instanceof HTMLElement) {
      updater(internalElement);
    } else {
      console.warn(`WebComponentTraitManager: Internal element '${selector}' not found`);
    }
  }

  /**
   * Helper: Set text content (handles both attribute and internal element)
   */
  static setTextContent(element: HTMLElement, text: string, internalSelector?: string): void {
    // Set as attribute
    element.setAttribute('text', text);

    // Also update internal element if specified (Light DOM)
    if (internalSelector) {
      this.updateInternalElement(element, internalSelector, (internalEl) => {
        internalEl.textContent = text;
      });
    }
  }

  /**
   * Helper: Set boolean attribute (for disabled, hidden, etc.)
   */
  static setBooleanAttribute(element: HTMLElement, attributeName: string, value: boolean): void {
    if (value) {
      element.setAttribute(attributeName, '');
    } else {
      element.removeAttribute(attributeName);
    }
  }

  /**
   * Destroy the manager and clean up all resources
   * Called when editor is destroyed or page is unloaded
   */
  destroy(): void {
    debug('Destroying WebComponentTraitManager');

    // Clean up all active listeners (observers, etc.)
    this.activeListeners.forEach((cleanup, key) => {
      if (typeof cleanup === 'function') {
        try {
          cleanup();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    });
    this.activeListeners.clear();

    // Clean up all pending intervals from component registry
    cleanupAllIntervals();

    // Clear component configs
    this.componentConfigs.clear();

    debug('WebComponentTraitManager destroyed');
  }
}
