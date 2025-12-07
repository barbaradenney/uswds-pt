/**
 * GrapesJS-specific types for the adapter
 */

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
