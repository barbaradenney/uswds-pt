/**
 * GrapesJS Type Definitions
 *
 * Basic type definitions for GrapesJS editor interactions.
 * These are not complete - they cover the APIs we actually use.
 * Expand as needed when using new GrapesJS features.
 */

import type { Editor, Component, Trait } from 'grapesjs';

// ── Re-exports of vendor types ──────────────────────────────────────────
// These give downstream code a single import location for common GrapesJS
// types without coupling to the `grapesjs` package directly.

/** Re-export of the GrapesJS Editor class. */
export type GjsEditor = Editor;

/** Re-export of the GrapesJS Component class. */
export type GjsComponent = Component;

/** Re-export of the GrapesJS Trait class. */
export type GjsTrait = Trait;

// ── Supplementary interfaces ────────────────────────────────────────────
// These interfaces capture the subset of GrapesJS APIs that this project
// uses, providing documentation and allowing code that cannot depend on
// the `grapesjs` package (e.g. the adapter) to program against a
// structural contract.

/**
 * GrapesJS Component Model (structural interface)
 *
 * Describes the Component API surface used throughout the editor package.
 * Prefer the `GjsComponent` type alias (backed by the real grapesjs
 * `Component` class) when you have access to the vendor types.
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
  removeAttributes(attrs: string | string[]): void;
  getAttributes(): Record<string, unknown>;
  components(): GrapesComponentCollection;
  getId(): string;
  getName(): string;
  toHTML(): string;
  find(selector: string): GrapesComponent[];
  append(content: string): void;
  parent(): GrapesComponent | undefined;
  remove(): void;
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
  add(content: string, opts?: { at?: number }): void;
}

/**
 * GrapesJS Trait (structural interface)
 */
export interface GrapesTrait {
  get(key: string): unknown;
  getValue(): unknown;
  setValue(value: unknown): void;
  set(key: string, value: unknown): void;
  on?(event: string, handler: (...args: unknown[]) => void): void;
}

/**
 * GrapesJS Trait collection (structural interface)
 *
 * Represents the Backbone collection returned by `component.get('traits')`.
 */
export interface GrapesTraitCollection {
  where(attrs: Record<string, unknown>): GrapesTrait[];
  add(trait: Record<string, unknown>): void;
  remove(trait: GrapesTrait): void;
  forEach(fn: (trait: GrapesTrait) => void): void;
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
 * GrapesJS Trait Manager (structural interface)
 *
 * Describes the TraitManager surface used in this project.
 */
export interface GrapesTraitManager {
  addType(name: string, methods: Record<string, unknown>): void;
  getType?(name: string): unknown;
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
  [key: string]: unknown;
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
  TraitManager: GrapesTraitManager;

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
 * Editor Instance Type
 *
 * Uses 'any' intentionally for GrapesJS SDK compatibility:
 *
 * 1. **SDK Variability**: GrapesJS model methods use `this` binding that
 *    doesn't work well with TypeScript's strict typing (see plugins).
 *
 * 2. **Test Mocking**: Allows creating partial mocks without implementing
 *    the entire GrapesEditor interface.
 *
 * 3. **Plugin Compatibility**: Third-party plugins may extend the editor
 *    with properties not in our interface definitions.
 *
 * For type-safe code, use the `GrapesEditor` interface directly when the
 * full interface is needed, or use `isGrapesEditor()` type guard.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EditorInstance = any;
