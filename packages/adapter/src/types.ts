/**
 * GrapesJS-specific types for the adapter
 */

/**
 * Minimal GrapesJS component model interface for the adapter.
 *
 * This covers the Backbone model methods used by trait handlers and
 * visibility callbacks. It intentionally does NOT try to replicate
 * the full GrapesJS Component API -- only the subset we actually use.
 */
export interface GrapesComponentModel {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  getId(): string;
  getEl(): HTMLElement | null;
  addAttributes(attrs: Record<string, unknown>): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  previous(key: string): unknown;
}

/**
 * Minimal GrapesJS trait model interface (Backbone model).
 *
 * Represents an individual trait within GrapesJS's internal trait collection.
 * Used by WebComponentTraitManager when iterating over a component's traits
 * to attach change listeners.
 */
export interface GrapesTraitModel {
  get(key: string): unknown;
  on(event: string, handler: (...args: unknown[]) => void): void;
}

/**
 * GrapesJS trait collection -- an iterable of trait models.
 *
 * GrapesJS stores traits as a Backbone Collection. We only need
 * the forEach method for our trait listener setup.
 */
export interface GrapesTraitCollection {
  forEach(fn: (trait: GrapesTraitModel) => void): void;
}

export interface GrapesBlock {
  id: string;
  label: string;
  category: string;
  media: string;
  content: GrapesBlockContent;
  select?: boolean;
  activate?: boolean;
  attributes?: Record<string, string>;
}

export interface GrapesBlockContent {
  type: string;
  tagName: string;
  attributes?: Record<string, string>;
  components?: GrapesBlockContent[] | string;
  content?: string;
}

export interface GrapesTrait {
  name: string;
  label: string;
  type: string;
  default?: string | boolean | number;
  options?: GrapesTraitOption[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  category?: {
    id: string;
    label: string;
  };
  /**
   * Conditional visibility - function receives component model, returns boolean
   */
  visible?: boolean | ((component: GrapesComponentModel) => boolean);
}

export interface GrapesTraitOption {
  id: string;
  label: string;
}

export interface GrapesComponentType {
  isComponent: (el: HTMLElement) => boolean;
  model: {
    defaults: {
      tagName: string;
      draggable: boolean | string;
      droppable: boolean | string;
      traits: GrapesTrait[];
      attributes?: Record<string, string>;
      'custom-name'?: string;
      stylable?: boolean;
    };
  };
  view?: Record<string, unknown>;
}

export interface ComponentRegistryOptions {
  /**
   * Disable inline styling (recommended for USWDS)
   */
  disableStyles?: boolean;

  /**
   * Custom icons for components
   */
  icons?: Record<string, string>;

  /**
   * Custom default content for components
   */
  defaultContent?: Record<string, string>;
}
