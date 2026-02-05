/**
 * GrapesJS Type Definitions
 *
 * Basic type definitions for GrapesJS editor interactions.
 * These are not complete - they cover the APIs we actually use.
 * Expand as needed when using new GrapesJS features.
 */

/**
 * GrapesJS Component Model
 */
export interface GrapesComponent {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  getEl(): HTMLElement | null;
  getClasses(): string[];
  addClass(cls: string): void;
  removeClass(cls: string): void;
  getTrait(name: string): GrapesTrait | undefined;
  get attributes(): Record<string, unknown>;
  addAttributes(attrs: Record<string, unknown>): void;
  components(): GrapesComponentCollection;
}

/**
 * GrapesJS Component Collection
 */
export interface GrapesComponentCollection {
  length: number;
  models?: GrapesComponent[];
  reset(): void;
  forEach(fn: (comp: GrapesComponent) => void): void;
  map<T>(fn: (comp: GrapesComponent) => T): T[];
  filter(fn: (comp: GrapesComponent) => boolean): GrapesComponent[];
  at?(index: number): GrapesComponent | undefined;
}

/**
 * GrapesJS Trait
 */
export interface GrapesTrait {
  getValue(): unknown;
  setValue(value: unknown): void;
  set(key: string, value: unknown): void;
}

/**
 * GrapesJS Page
 */
export interface GrapesPage {
  getId?(): string;
  id?: string;
  get?(key: string): unknown;
  getName?(): string;
  getMainComponent?(): GrapesComponent | undefined;
  getMainFrame?(): { getComponent?(): GrapesComponent | undefined };
}

/**
 * GrapesJS Pages Manager
 */
export interface GrapesPagesManager {
  getAll(): GrapesPage[];
  getSelected(): GrapesPage | undefined;
  select(page: GrapesPage): void;
  get?(id: string): GrapesPage | undefined;
}

/**
 * GrapesJS Canvas
 */
export interface GrapesCanvas {
  getDocument(): Document | null;
  getWindow(): Window | null;
  getFrame?(): { loaded?: boolean } | null;
  getFrameEl?(): HTMLIFrameElement | null;
  refresh(options?: { spots?: boolean }): void;
}

/**
 * GrapesJS DomComponents Manager
 */
export interface GrapesDomComponents {
  getWrapper(): GrapesComponent | null;
  clear(): void;
}

/**
 * GrapesJS Block Manager
 */
export interface GrapesBlockManager {
  getAll(): Array<{ get(key: string): unknown }>;
  remove(id: string): void;
}

/**
 * GrapesJS Commands Manager
 */
export interface GrapesCommands {
  add(id: string, command: { run(editor: GrapesEditor): void }): void;
  isActive?(id: string): boolean;
}

/**
 * GrapesJS Modal
 */
export interface GrapesModal {
  close(): void;
}

/**
 * GrapesJS Project Data (for save/load)
 */
export interface GrapesProjectData {
  pages?: Array<{
    id?: string;
    name?: string;
    frames?: Array<{
      component?: {
        type?: string;
        components?: unknown[];
      };
    }>;
  }>;
  styles?: unknown[];
  assets?: unknown[];
}

/**
 * GrapesJS Editor Instance
 *
 * Main editor interface. Not complete - add methods as needed.
 */
export interface GrapesEditor {
  // Core
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  trigger?(event: string, ...args: unknown[]): void;
  refresh?(): void;

  // Managers
  Canvas: GrapesCanvas;
  DomComponents?: GrapesDomComponents;
  Pages?: GrapesPagesManager;
  Blocks?: GrapesBlockManager;
  Commands?: GrapesCommands;
  Modal?: GrapesModal;
  CssComposer?: { clear(): void };

  // Methods
  getHtml(): string;
  getProjectData(): GrapesProjectData;
  loadProjectData(data: GrapesProjectData): void;
  getSelected?(): GrapesComponent | undefined;
}

/**
 * Type guard to check if an object looks like a GrapesJS editor
 */
export function isGrapesEditor(obj: unknown): obj is GrapesEditor {
  if (!obj || typeof obj !== 'object') return false;
  const editor = obj as Record<string, unknown>;
  return (
    typeof editor.on === 'function' &&
    typeof editor.off === 'function' &&
    typeof editor.getHtml === 'function' &&
    editor.Canvas !== undefined
  );
}

/**
 * Legacy type alias for flexibility with GrapesJS SDK
 * Using 'any' allows compatibility with different SDK versions
 * and avoids strict typing issues in tests/mocks.
 *
 * TODO: Gradually migrate to GrapesEditor when types stabilize
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EditorInstance = any;
