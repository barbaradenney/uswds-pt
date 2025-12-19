/**
 * WebComponentTraitManager
 *
 * Manages the integration between GrapesJS traits and Web Components.
 * Handles the complexity of Shadow DOM, property vs attribute updates,
 * and prevents sync loops.
 */

import { componentRegistry } from './component-registry-v2.js';

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
   */
  private initializeTraits(component: any, element: HTMLElement, handlers: Record<string, TraitHandler>): void {
    const attributes = component.get('attributes') || {};

    Object.entries(handlers).forEach(([traitName, handler]) => {
      const value = attributes[traitName];

      // Call onInit if it exists
      if (handler.onInit && value !== undefined) {
        handler.onInit(element, value);
      }

      // For traits without onInit, call onChange to initialize
      // This ensures the DOM is in sync with the attribute value
      if (!handler.onInit && value !== undefined) {
        handler.onChange(element, value);
      }
    });
  }

  /**
   * Set up MutationObserver to watch for attribute changes and keep DOM in sync
   */
  private setupAttributeObservers(component: any, element: HTMLElement, tagName: string, handlers: Record<string, TraitHandler>): void {
    const componentId = component.getId();

    // Create a MutationObserver to watch for attribute changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const attributeName = mutation.attributeName;
          if (!attributeName) return;

          const handler = handlers[attributeName];
          if (handler) {
            const newValue = element.getAttribute(attributeName);
            debug(`Observed attribute '${attributeName}' changed to:`, newValue);

            // For text attributes, ensure button textContent stays in sync
            if (attributeName === 'text') {
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
                  if (!syncButtonText()) {
                    console.warn(`WebComponentTraitManager: Button element still not found after delay`);
                  }
                }, 100);
              }
            }
          }
        }
      });
    });

    // Observe attribute changes
    observer.observe(element, {
      attributes: true,
      attributeOldValue: true,
    });

    // Store observer for cleanup
    const observerId = `${componentId}-observer`;
    this.activeListeners.set(observerId, () => observer.disconnect());

    debug(`Set up attribute observer for ${component.get('tagName')}`);
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

    // Create new listener
    const listener = () => {
      this.handleTraitChanges(component, handlers);
    };

    // Store and attach listener
    this.activeListeners.set(listenerId, listener);
    component.on('change:attributes', listener);
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
          handler.onChange(element, newValue, oldValue);

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
   * Destroy the manager and clean up listeners
   */
  destroy(): void {
    this.activeListeners.forEach((listener, key) => {
      // Listeners are already cleaned up via deselect events
    });
    this.activeListeners.clear();
    this.componentConfigs.clear();
  }
}
