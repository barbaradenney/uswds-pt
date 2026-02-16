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
 *
 * GrapesJS omits `tagName` for plain `<div>` (the default) and `type` for
 * `'default'`, so we also check for GrapesJS symbol markers and other
 * component-level properties (`attributes`, `classes`, `components` without
 * the legacy `id+label` envelope).
 */
export function isNativeSymbolData(symbolData: unknown): boolean {
  if (!symbolData || typeof symbolData !== 'object') return false;
  const data = symbolData as Record<string, unknown>;

  // Native: has component-level properties at top level
  if (data.tagName || data.type) return true;

  // Native: has GrapesJS symbol marker
  if ('__symbol' in data || '__symbolId' in data) return true;

  // Legacy wrapper: has id + label + components array (the old envelope format)
  if (data.id && data.label && Array.isArray(data.components)) return false;

  // Has component-level props but NOT the legacy id+label envelope →
  // native component with default tag (plain div)
  if (Array.isArray(data.components) || 'attributes' in data || 'classes' in data) return true;

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
