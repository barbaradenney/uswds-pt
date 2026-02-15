/**
 * Symbol Creation Setup
 *
 * Registers the create-symbol command and adds a toolbar button
 * to selected components using dialog-first architecture.
 */

import { createDebugLogger } from '@uswds-pt/shared';
import { GJS_EVENTS } from '../../contracts';
import type { EditorInstance, RegisterListener } from './types';

const debug = createDebugLogger('GrapesJSSetup');

/**
 * Set up symbol creation handler with dialog-first architecture.
 */
export function setupSymbolCreationHandler(
  editor: EditorInstance,
  registerListener: RegisterListener,
  onSymbolCreate: (symbolData: any, selectedComponent: any) => void
): void {
  editor.Commands.add('create-symbol', {
    run(editor: EditorInstance) {
      const selected = editor.getSelected();
      if (!selected) {
        debug('No component selected for symbol creation');
        return;
      }

      try {
        const symbolInfo = selected.getSymbolInfo?.();
        if (symbolInfo?.isSymbol) {
          debug('Component is already a symbol');
          return;
        }
      } catch {
        // getSymbolInfo not available in core — proceed
      }

      debug('Creating symbol from component:', selected.getId());

      const json = selected.toJSON?.() || {};
      const symbolData = {
        id: `symbol-${Date.now()}`,
        label: selected.getName?.() || selected.get?.('name') || 'New Symbol',
        icon: json.icon,
        components: [json],
      };

      onSymbolCreate(symbolData, selected);
    },
  });

  registerListener(editor, GJS_EVENTS.COMPONENT_SELECTED, (component: any) => {
    if (!component) return;

    const toolbar = component.get('toolbar') || [];
    const hasSymbolButton = toolbar.some((item: any) => item.command === 'create-symbol');
    if (hasSymbolButton) return;

    try {
      const symbolInfo = component.getSymbolInfo?.();
      if (symbolInfo?.isSymbol) return;
    } catch {
      // getSymbolInfo not available in core — show button
    }

    const newToolbar = [
      ...toolbar,
      {
        attributes: { title: 'Create Symbol' },
        command: 'create-symbol',
        label: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="vertical-align: middle;">
          <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9zM12 4.15L6.04 7.5 12 10.85l5.96-3.35L12 4.15zM5 15.91l6 3.38v-6.71L5 9.21v6.7zm14 0v-6.7l-6 3.37v6.71l6-3.38z"/>
        </svg>`,
      },
    ];

    component.set('toolbar', newToolbar);
  });
}
