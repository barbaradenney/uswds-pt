/**
 * WebComponentTraitManager
 *
 * Manages the integration between GrapesJS traits and Web Components.
 * Handles the complexity of Shadow DOM, property vs attribute updates,
 * and prevents sync loops.
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
    console.log(`WebComponentTraitManager: Registered ${config.tagName}`);
  }

  /**
   * Register multiple components at once
   */
  registerComponents(configs: ComponentConfig[]): void {
    configs.forEach(config => this.registerComponent(config));
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

    const config = this.componentConfigs.get(tagName);
    if (!config) return;

    console.log(`WebComponentTraitManager: Selected ${tagName}`);

    // Set up trait change listeners
    this.setupTraitListeners(component, config);
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
  }

  /**
   * Handle component mount - initialize traits
   */
  private handleComponentMount(component: any): void {
    const tagName = component.get('tagName')?.toLowerCase();
    if (!tagName) return;

    const config = this.componentConfigs.get(tagName);
    if (!config) return;

    const element = component.getEl();
    if (!element) return;

    console.log(`WebComponentTraitManager: Mounted ${tagName}`);

    // Initialize all traits
    this.initializeTraits(component, element, config);
  }

  /**
   * Initialize traits with their default values
   */
  private initializeTraits(component: any, element: HTMLElement, config: ComponentConfig): void {
    const attributes = component.get('attributes') || {};

    Object.entries(config.traits).forEach(([traitName, handler]) => {
      const value = attributes[traitName];

      if (handler.onInit && value !== undefined) {
        handler.onInit(element, value);
      }
    });
  }

  /**
   * Set up listeners for trait changes
   */
  private setupTraitListeners(component: any, config: ComponentConfig): void {
    const componentId = component.getId();
    const listenerId = `${componentId}-traits`;

    // Remove old listener if exists
    const oldListener = this.activeListeners.get(listenerId);
    if (oldListener) {
      component.off('change:attributes', oldListener);
    }

    // Create new listener
    const listener = () => {
      this.handleTraitChanges(component, config);
    };

    // Store and attach listener
    this.activeListeners.set(listenerId, listener);
    component.on('change:attributes', listener);
  }

  /**
   * Handle trait value changes
   */
  private handleTraitChanges(component: any, config: ComponentConfig): void {
    const element = component.getEl();
    if (!element) {
      console.warn('WebComponentTraitManager: No element found for component');
      return;
    }

    const attributes = component.get('attributes') || {};
    const previousAttributes = component.previous('attributes') || {};

    // Process each trait that has changed
    Object.entries(config.traits).forEach(([traitName, handler]) => {
      const newValue = attributes[traitName];
      const oldValue = previousAttributes[traitName];

      // Only process if value actually changed
      if (newValue !== oldValue) {
        console.log(`WebComponentTraitManager: Trait '${traitName}' changed from`, oldValue, 'to', newValue);

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
