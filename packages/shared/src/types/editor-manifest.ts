/**
 * Editor Manifest Types
 * Defines the structure for GrapesJS integration metadata
 */

export interface EditorManifest {
  version: string;
  generatedAt: string;
  uswdsWcVersion: string;
  settings: EditorSettings;
  categories: BlockCategory[];
  components: EditorComponent[];
}

export interface EditorSettings {
  cssPath: string;
  scriptPath: string;
  previewStyles?: string[];
}

export interface BlockCategory {
  id: string;
  label: string;
  order: number;
  icon?: string;
  open?: boolean;
}

export interface EditorComponent {
  tagName: string;
  className: string;
  block: BlockDefinition;
  traits: TraitDefinition[];
  nesting: NestingRules;
  designMode?: DesignModeConfig;
  preview?: PreviewConfig;
}

export interface BlockDefinition {
  label: string;
  category: string;
  icon: string;
  content: string;
  keywords?: string[];
  order?: number;
  activate?: boolean;
}

export interface TraitDefinition {
  name: string;
  label: string;
  type: TraitType;
  default?: string | boolean | number;
  options?: TraitOption[];
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  placeholder?: string;
  hint?: string;
  group?: string;
  order?: number;
  showIf?: {
    trait: string;
    value: unknown;
  };
}

export type TraitType =
  | 'text'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'radio'
  | 'color'
  | 'slider'
  | 'button'
  | 'code'
  | 'slot-editor'
  | 'array-editor'
  | 'json-editor';

export interface TraitOption {
  value: string;
  label: string;
  icon?: string;
}

export interface NestingRules {
  droppable: DroppableRule;
  canBeDroppedIn: string[];
  slots?: Record<string, DroppableRule>;
}

export interface DroppableRule {
  allow: string[];
  deny?: string[];
  maxChildren?: number;
}

export interface DesignModeConfig {
  handles?: {
    resize?: boolean;
    rotate?: boolean;
  };
  guides?: {
    showSlots?: boolean;
    showBoundaries?: boolean;
  };
  inlineEditable?: string[];
  toolbar?: ToolbarAction[];
}

export interface ToolbarAction {
  id: string;
  icon: string;
  label: string;
  command: string;
}

export interface PreviewConfig {
  wrapper?: string;
  dependencies?: string[];
  defaultAttrs?: Record<string, string>;
}
