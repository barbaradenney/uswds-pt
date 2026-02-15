/**
 * Symbol Creation & Detach Setup
 *
 * Registers the create-symbol and detach-symbol commands and adds
 * toolbar buttons to selected components using dialog-first architecture.
 * Uses GrapesJS native symbol system (addSymbol/detachSymbol).
 */

import { createDebugLogger } from '@uswds-pt/shared';
import { GJS_EVENTS } from '../../contracts';
import { getSymbolInfo, serializeMainSymbol } from '../symbol-utils';
import type { EditorInstance, RegisterListener } from './types';

const debug = createDebugLogger('GrapesJSSetup');

// SVG icons for toolbar buttons
const SYMBOL_CREATE_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="vertical-align: middle;">
  <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9zM12 4.15L6.04 7.5 12 10.85l5.96-3.35L12 4.15zM5 15.91l6 3.38v-6.71L5 9.21v6.7zm14 0v-6.7l-6 3.37v6.71l6-3.38z"/>
</svg>`;

const SYMBOL_DETACH_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="vertical-align: middle;">
  <path d="M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.43-.98 2.63-2.31 2.98l1.46 1.46C20.88 15.61 22 13.95 22 12c0-2.76-2.24-5-5-5zm-1 4h-2.19l2 2H16v-2zM2 4.27l3.11 3.11C3.29 8.12 2 9.91 2 12c0 2.76 2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1 0-1.59 1.21-2.9 2.76-3.07L8.73 11H8v2h2.73L13 15.27V17h1.73l4.01 4L20 19.74 3.27 3 2 4.27z"/>
</svg>`;

/**
 * Set up symbol creation and detach handlers with dialog-first architecture.
 */
export function setupSymbolCreationHandler(
  editor: EditorInstance,
  registerListener: RegisterListener,
  onSymbolCreate: (symbolData: any, mainComponent: any) => void
): void {
  // ── create-symbol command ────────────────────────────────────
  editor.Commands.add('create-symbol', {
    run(editor: EditorInstance) {
      const selected = editor.getSelected();
      if (!selected) {
        debug('No component selected for symbol creation');
        return;
      }

      // Already a symbol? Skip.
      const info = getSymbolInfo(editor, selected);
      if (info?.isSymbol) {
        debug('Component is already a symbol');
        return;
      }

      debug('Creating native symbol from component:', selected.getId());

      // Use GrapesJS native addSymbol — converts selected into an instance,
      // returns the main symbol (if new) or a new instance (if already main).
      let main: any;
      try {
        main = editor.Components.addSymbol(selected);
      } catch (err) {
        debug('addSymbol failed:', err);
        return;
      }

      if (!main) {
        debug('addSymbol returned null');
        return;
      }

      // Serialize the main for the scope dialog
      const serialized = serializeMainSymbol(main);
      if (!serialized) {
        debug('Failed to serialize main symbol');
        return;
      }

      // Pass serialized data + main component reference to the dialog handler.
      // If the user cancels, Editor.tsx will undo by removing the main.
      onSymbolCreate(serialized, main);
    },
  });

  // ── detach-symbol command ────────────────────────────────────
  editor.Commands.add('detach-symbol', {
    run(editor: EditorInstance) {
      const selected = editor.getSelected();
      if (!selected) return;

      const info = getSymbolInfo(editor, selected);
      if (!info?.isInstance) {
        debug('Cannot detach: not a symbol instance');
        return;
      }

      debug('Detaching symbol instance:', selected.getId());
      try {
        editor.Components.detachSymbol(selected);
      } catch (err) {
        debug('detachSymbol failed:', err);
      }
    },
  });

  // ── toolbar button logic ─────────────────────────────────────
  registerListener(editor, GJS_EVENTS.COMPONENT_SELECTED, (component: any) => {
    if (!component) return;

    const toolbar = component.get('toolbar') || [];
    const info = getSymbolInfo(editor, component);

    if (info?.isInstance) {
      // Symbol instance → show Detach button (if not already there)
      const hasDetach = toolbar.some((item: any) => item.command === 'detach-symbol');
      if (!hasDetach) {
        // Remove create-symbol button if present
        const filtered = toolbar.filter((item: any) => item.command !== 'create-symbol');
        component.set('toolbar', [
          ...filtered,
          {
            attributes: { title: 'Detach Symbol' },
            command: 'detach-symbol',
            label: SYMBOL_DETACH_ICON,
          },
        ]);
      }
    } else if (!info?.isMain) {
      // Regular component → show Create Symbol button (if not already there)
      const hasCreate = toolbar.some((item: any) => item.command === 'create-symbol');
      if (!hasCreate) {
        // Remove detach-symbol button if present
        const filtered = toolbar.filter((item: any) => item.command !== 'detach-symbol');
        component.set('toolbar', [
          ...filtered,
          {
            attributes: { title: 'Create Symbol' },
            command: 'create-symbol',
            label: SYMBOL_CREATE_ICON,
          },
        ]);
      }
    }
  });
}
