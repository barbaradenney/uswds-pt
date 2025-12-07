/**
 * Custom Elements Manifest (CEM) Types
 * Based on the Custom Elements Manifest specification
 * @see https://custom-elements-manifest.open-wc.org/
 */

export interface CEMManifest {
  schemaVersion: string;
  readme?: string;
  modules: CEMModule[];
}

export interface CEMModule {
  kind: 'javascript-module';
  path: string;
  declarations?: CEMDeclaration[];
  exports?: CEMExport[];
}

export interface CEMDeclaration {
  kind: 'class' | 'function' | 'variable' | 'mixin';
  name: string;
  description?: string;
  tagName?: string;
  customElement?: boolean;
  attributes?: CEMAttribute[];
  members?: CEMMember[];
  events?: CEMEvent[];
  slots?: CEMSlot[];
  cssProperties?: CEMCSSProperty[];
  cssParts?: CEMCSSPart[];
  superclass?: {
    name: string;
    package?: string;
    module?: string;
  };
  mixins?: Array<{
    name: string;
    package?: string;
    module?: string;
  }>;
}

export interface CEMAttribute {
  name: string;
  description?: string;
  type?: {
    text: string;
  };
  default?: string;
  fieldName?: string;
  deprecated?: boolean | string;
}

export interface CEMMember {
  kind: 'field' | 'method';
  name: string;
  description?: string;
  type?: {
    text: string;
  };
  default?: string;
  static?: boolean;
  privacy?: 'public' | 'protected' | 'private';
  readonly?: boolean;
  deprecated?: boolean | string;
  parameters?: CEMParameter[];
  return?: {
    type?: { text: string };
    description?: string;
  };
}

export interface CEMParameter {
  name: string;
  description?: string;
  type?: {
    text: string;
  };
  default?: string;
  optional?: boolean;
}

export interface CEMEvent {
  name: string;
  description?: string;
  type?: {
    text: string;
  };
  deprecated?: boolean | string;
}

export interface CEMSlot {
  name: string;
  description?: string;
}

export interface CEMCSSProperty {
  name: string;
  description?: string;
  default?: string;
  syntax?: string;
}

export interface CEMCSSPart {
  name: string;
  description?: string;
}

export interface CEMExport {
  kind: 'js' | 'custom-element-definition';
  name: string;
  declaration?: {
    name: string;
    module?: string;
  };
}

/**
 * Parsed component extracted from CEM for easier processing
 */
export interface ParsedComponent {
  tagName: string;
  className: string;
  description: string;
  category: string;
  packageName: string;
  attributes: CEMAttribute[];
  slots: CEMSlot[];
  events: CEMEvent[];
  cssProperties: CEMCSSProperty[];
  superclass?: {
    name: string;
    package?: string;
  };
}
