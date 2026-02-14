/**
 * Editor Type Definitions
 *
 * Barrel file re-exporting all editor types for discoverability.
 * Import from here instead of individual files:
 *
 *   import type { EditorInstance, GrapesEditor, GrapesPage } from '../types';
 */

export type {
  GjsEditor,
  GjsComponent,
  GjsTrait,
  GrapesComponent,
  GrapesComponentCollection,
  GrapesTrait,
  GrapesTraitCollection,
  GrapesTraitManager,
  GrapesPage,
  GrapesPagesManager,
  GrapesCanvas,
  GrapesDomComponents,
  GrapesBlockManager,
  GrapesCommands,
  GrapesModal,
  GrapesProjectData,
  GrapesEditor,
  EditorInstance,
} from './grapesjs';

export { isGrapesEditor } from './grapesjs';
