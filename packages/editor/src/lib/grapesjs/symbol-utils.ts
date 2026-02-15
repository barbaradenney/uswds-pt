/**
 * Symbol Utilities
 *
 * Pure utility wrappers for GrapesJS native symbol system
 * (addSymbol, getSymbolInfo, detachSymbol) with null-safety
 * and debug logging.
 */

import { createDebugLogger } from '@uswds-pt/shared';
import type { EditorInstance } from '../../types/grapesjs';

const debug = createDebugLogger('SymbolUtils');

/**
 * Native symbol data has component-level props like `tagName` or `type` at the
 * top level (from component.toJSON()). Legacy format has a `components[]`
 * wrapper array and an `id`/`label` envelope.
 */
export function isNativeSymbolData(symbolData: unknown): boolean {
  if (!symbolData || typeof symbolData !== 'object') return false;
  const data = symbolData as Record<string, unknown>;

  // Native: has component-level properties at top level
  if (data.tagName || data.type) return true;

  // Legacy: has `components` array wrapper with `id` and `label`
  if (Array.isArray(data.components) && data.id && data.label) return false;

  return false;
}

/**
 * Wraps editor.Components.getSymbolInfo() with try/catch and null-safety.
 */
export function getSymbolInfo(
  editor: EditorInstance,
  component: any
): {
  isSymbol: boolean;
  isMain: boolean;
  isInstance: boolean;
  isRoot: boolean;
  main: any;
  instances: any[];
  relatives: any[];
} | null {
  try {
    const info = editor?.Components?.getSymbolInfo?.(component);
    return info || null;
  } catch (err) {
    debug('getSymbolInfo failed:', err);
    return null;
  }
}

/**
 * Finds a main symbol by its GrapesJS ID from editor.Components.getSymbols().
 */
export function findMainByGrapesId(editor: EditorInstance, id: string): any | null {
  try {
    const symbols = editor?.Components?.getSymbols?.() || [];
    return symbols.find((s: any) => s.getId?.() === id) || null;
  } catch (err) {
    debug('findMainByGrapesId failed:', err);
    return null;
  }
}

/**
 * Serializes a main symbol component to JSON for API storage.
 */
export function serializeMainSymbol(main: any): Record<string, unknown> | null {
  try {
    return main?.toJSON?.() || null;
  } catch (err) {
    debug('serializeMainSymbol failed:', err);
    return null;
  }
}
