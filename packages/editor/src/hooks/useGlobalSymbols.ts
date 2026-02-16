/**
 * Global Symbols Hook
 *
 * Manages symbols across three scopes: prototype, team, and organization.
 * Provides CRUD operations, promotion, and integration with GrapesJS editor.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { GlobalSymbol, GrapesJSSymbol, GrapesProjectData, SymbolScope } from '@uswds-pt/shared';
import { createDebugLogger } from '@uswds-pt/shared';
import {
  fetchGlobalSymbols,
  createGlobalSymbol,
  updateGlobalSymbol,
  deleteGlobalSymbol,
  promoteSymbol as promoteSymbolApi,
} from '../lib/api';
import { isNativeSymbolData } from '../lib/grapesjs/symbol-utils';

const debug = createDebugLogger('GlobalSymbols');

// Scope-based prefixes for GrapesJS symbol IDs
export const PROTOTYPE_SYMBOL_PREFIX = 'proto-';
export const TEAM_SYMBOL_PREFIX = 'team-';
export const ORG_SYMBOL_PREFIX = 'org-';

/** All managed symbol prefixes (including legacy 'global-') */
const MANAGED_PREFIXES = [PROTOTYPE_SYMBOL_PREFIX, TEAM_SYMBOL_PREFIX, ORG_SYMBOL_PREFIX, 'global-'];

interface GlobalSymbolsState {
  symbols: GlobalSymbol[];
  isLoading: boolean;
  error: string | null;
}

export interface UseGlobalSymbolsOptions {
  /** Team ID to load symbols for */
  teamId: string | null;
  /** Whether the hook is enabled (e.g., not in demo mode) */
  enabled?: boolean;
  /** Prototype ID (for prototype-scoped creation) */
  prototypeId?: string | null;
}

export interface UseGlobalSymbolsReturn extends GlobalSymbolsState {
  /** Refresh symbols from the server */
  refresh: () => Promise<void>;
  /** Create a new symbol with scope */
  create: (name: string, symbolData: GrapesJSSymbol, scope?: SymbolScope) => Promise<GlobalSymbol | null>;
  /** Update an existing symbol */
  update: (symbolId: string, updates: { name?: string; symbolData?: GrapesJSSymbol }) => Promise<GlobalSymbol | null>;
  /** Delete a symbol */
  remove: (symbolId: string) => Promise<boolean>;
  /** Promote a symbol to a higher scope */
  promote: (symbolId: string, targetScope: 'team' | 'organization') => Promise<GlobalSymbol | null>;
  /** Symbols formatted for GrapesJS (stable reference via useMemo) */
  getGrapesJSSymbols: GrapesJSSymbol[];
  /** Check if a symbol ID is a managed (non-local) symbol */
  isManagedSymbol: (symbolId: string) => boolean;
  /** Get symbol by its GrapesJS ID */
  getByGrapesId: (grapesId: string) => GlobalSymbol | null;
}

/** Get the prefix for a given scope */
function prefixForScope(scope: string): string {
  switch (scope) {
    case 'prototype': return PROTOTYPE_SYMBOL_PREFIX;
    case 'organization': return ORG_SYMBOL_PREFIX;
    case 'team':
    default: return TEAM_SYMBOL_PREFIX;
  }
}

export function useGlobalSymbols({
  teamId,
  enabled = true,
  prototypeId,
}: UseGlobalSymbolsOptions): UseGlobalSymbolsReturn {
  const [state, setState] = useState<GlobalSymbolsState>({
    symbols: [],
    isLoading: false,
    error: null,
  });

  // Track if mounted for async operations
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Refresh symbols from the server.
   * Single fetch from GET /api/teams/:teamId/symbols returns all 3 scopes.
   */
  const refresh = useCallback(async () => {
    if (!enabled || !teamId) {
      setState((prev) => ({ ...prev, symbols: [], isLoading: false }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    debug('Loading symbols for team:', teamId);

    const result = await fetchGlobalSymbols(teamId);

    if (!mountedRef.current) return;

    if (result.success && result.data) {
      debug('Loaded', result.data.symbols.length, 'symbols (all scopes)');
      setState({
        symbols: result.data.symbols,
        isLoading: false,
        error: null,
      });
    } else {
      debug('Failed to load symbols:', result.error);
      setState({
        symbols: [],
        isLoading: false,
        error: result.error || 'Failed to load symbols',
      });
    }
  }, [enabled, teamId]);

  // Load symbols when teamId changes
  useEffect(() => {
    if (enabled && teamId) {
      refresh();
    } else {
      setState({ symbols: [], isLoading: false, error: null });
    }
  }, [enabled, teamId, refresh]);

  /**
   * Create a new symbol with scope
   */
  const create = useCallback(
    async (name: string, symbolData: GrapesJSSymbol, scope: SymbolScope = 'team'): Promise<GlobalSymbol | null> => {
      if (!teamId) {
        debug('Create failed: No team selected');
        setState((prev) => ({ ...prev, error: 'No team selected' }));
        return null;
      }

      debug('Creating symbol:', name, 'scope:', scope);

      const prefix = prefixForScope(scope);
      const globalSymbolData: GrapesJSSymbol = {
        ...symbolData,
        id: `${prefix}${symbolData.id || Date.now()}`,
      };

      const result = await createGlobalSymbol(
        teamId,
        name,
        globalSymbolData,
        scope,
        scope === 'prototype' ? prototypeId || undefined : undefined,
      );

      if (!mountedRef.current) return null;

      if (result.success && result.data) {
        debug('Created symbol:', result.data.id, 'scope:', scope);
        setState((prev) => ({
          ...prev,
          symbols: [...prev.symbols, result.data!],
          error: null,
        }));
        return result.data;
      }

      debug('Create failed:', result.error);
      setState((prev) => ({ ...prev, error: result.error || 'Failed to create symbol' }));
      return null;
    },
    [teamId, prototypeId]
  );

  /**
   * Update an existing symbol
   */
  const update = useCallback(
    async (
      symbolId: string,
      updates: { name?: string; symbolData?: GrapesJSSymbol }
    ): Promise<GlobalSymbol | null> => {
      if (!teamId) {
        setState((prev) => ({ ...prev, error: 'No team selected' }));
        return null;
      }

      debug('Updating symbol:', symbolId);

      const result = await updateGlobalSymbol(teamId, symbolId, updates);

      if (!mountedRef.current) return null;

      if (result.success && result.data) {
        debug('Updated symbol:', symbolId);
        setState((prev) => ({
          ...prev,
          symbols: prev.symbols.map((s) =>
            s.id === symbolId ? result.data! : s
          ),
          error: null,
        }));
        return result.data;
      }

      setState((prev) => ({ ...prev, error: result.error || 'Failed to update symbol' }));
      return null;
    },
    [teamId]
  );

  /**
   * Delete a symbol
   */
  const remove = useCallback(
    async (symbolId: string): Promise<boolean> => {
      if (!teamId) {
        setState((prev) => ({ ...prev, error: 'No team selected' }));
        return false;
      }

      debug('Deleting symbol:', symbolId);

      const result = await deleteGlobalSymbol(teamId, symbolId);

      if (!mountedRef.current) return false;

      if (result.success) {
        debug('Deleted symbol:', symbolId);
        setState((prev) => ({
          ...prev,
          symbols: prev.symbols.filter((s) => s.id !== symbolId),
          error: null,
        }));
        return true;
      }

      setState((prev) => ({ ...prev, error: result.error || 'Failed to delete symbol' }));
      return false;
    },
    [teamId]
  );

  /**
   * Promote a symbol to a higher scope (creates a copy)
   */
  const promote = useCallback(
    async (symbolId: string, targetScope: 'team' | 'organization'): Promise<GlobalSymbol | null> => {
      if (!teamId) {
        setState((prev) => ({ ...prev, error: 'No team selected' }));
        return null;
      }

      debug('Promoting symbol:', symbolId, 'to:', targetScope);

      const result = await promoteSymbolApi(teamId, symbolId, targetScope);

      if (!mountedRef.current) return null;

      if (result.success && result.data) {
        debug('Promoted symbol, new ID:', result.data.id);
        setState((prev) => ({
          ...prev,
          symbols: [...prev.symbols, result.data!],
          error: null,
        }));
        return result.data;
      }

      setState((prev) => ({ ...prev, error: result.error || 'Failed to promote symbol' }));
      return null;
    },
    [teamId]
  );

  /**
   * Symbols formatted for GrapesJS.
   * Applies scope-based prefixes so they can be identified later.
   * Stable array reference — only recalculated when symbols change.
   */
  const getGrapesJSSymbols = useMemo((): GrapesJSSymbol[] => {
    return state.symbols.map((symbol) => {
      const prefix = prefixForScope(symbol.scope || 'team');
      return {
        ...symbol.symbolData,
        id: symbol.symbolData.id.startsWith(prefix)
          ? symbol.symbolData.id
          : `${prefix}${symbol.symbolData.id}`,
        _globalSymbolId: symbol.id,
      };
    });
  }, [state.symbols]);

  /**
   * Check if a symbol ID is a managed (non-local) symbol
   */
  const isManagedSymbol = useCallback((symbolId: string): boolean => {
    return MANAGED_PREFIXES.some((p) => symbolId.startsWith(p));
  }, []);

  /**
   * Get symbol by its GrapesJS ID
   */
  const getByGrapesId = useCallback(
    (grapesId: string): GlobalSymbol | null => {
      // Strip any known prefix
      let cleanId = grapesId;
      for (const prefix of MANAGED_PREFIXES) {
        if (grapesId.startsWith(prefix)) {
          cleanId = grapesId.slice(prefix.length);
          break;
        }
      }

      return (
        state.symbols.find(
          (s) =>
            s.symbolData.id === grapesId ||
            s.symbolData.id === cleanId ||
            MANAGED_PREFIXES.some((p) => s.symbolData.id === `${p}${cleanId}`)
        ) || null
      );
    },
    [state.symbols]
  );

  return useMemo((): UseGlobalSymbolsReturn => ({
    ...state,
    refresh,
    create,
    update,
    remove,
    promote,
    getGrapesJSSymbols,
    isManagedSymbol,
    getByGrapesId,
  }), [state, refresh, create, update, remove, promote, getGrapesJSSymbols, isManagedSymbol, getByGrapesId]);
}

/**
 * Merge global symbols into GrapesJS project data.
 * Call this before loading project data into the editor.
 *
 * For symbols that exist in both prototype data AND API, prefer the API
 * version (it may have been updated via "Save to Library" from another
 * prototype). Replaces by ID match instead of just appending.
 */
export function mergeGlobalSymbols(
  projectData: GrapesProjectData,
  globalSymbols: GrapesJSSymbol[]
): GrapesProjectData {
  if (!projectData || !globalSymbols.length) {
    return projectData;
  }

  const existingSymbols = projectData.symbols || [];

  // Build a map of API symbols by ID for fast lookup
  const apiSymbolMap = new Map<string, GrapesJSSymbol>();
  for (const s of globalSymbols) {
    apiSymbolMap.set(s.id, s);
  }

  // Replace existing symbols with API versions where IDs match
  const merged: unknown[] = existingSymbols.map((existing: unknown) => {
    const id = (existing as { id?: string }).id;
    if (id && apiSymbolMap.has(id)) {
      const apiVersion = apiSymbolMap.get(id)!;
      apiSymbolMap.delete(id); // consumed
      return apiVersion;
    }
    return existing;
  });

  // Append any API symbols not already in the prototype data
  for (const s of apiSymbolMap.values()) {
    merged.push(s);
  }

  debug('Merged symbols:', merged.length, '(existing:', existingSymbols.length, ', API:', globalSymbols.length, ')');

  return {
    ...projectData,
    symbols: merged,
  };
}

/**
 * Extract managed symbols from GrapesJS project data.
 *
 * Native-format managed symbols (from addSymbol) are KEPT in projectData
 * because GrapesJS needs them in `projectData.symbols` to reconnect
 * instances on load. Only legacy-format managed symbols (the old
 * `{ id, label, components }` wrapper) are stripped.
 *
 * Detection: native symbols have component-level props (`tagName`/`type`)
 * at the top level; legacy ones have `components[]` + `label`.
 */
export function extractManagedSymbols(projectData: GrapesProjectData): GrapesProjectData {
  if (!projectData?.symbols) {
    return projectData;
  }

  const filteredSymbols = projectData.symbols.filter(
    (s: unknown) => {
      const data = s as Record<string, unknown>;
      const id = data.id as string | undefined;
      if (!id) return true;

      const isManaged = MANAGED_PREFIXES.some((p) => id.startsWith(p));
      if (!isManaged) return true; // local symbol, keep

      // Managed symbol: keep if native format (needed for instance linking),
      // strip if legacy wrapper format
      return isNativeSymbolData(data);
    }
  );

  debug('Filtered symbols:', filteredSymbols.length, 'from', projectData.symbols.length, 'total (kept native, stripped legacy)');

  return {
    ...projectData,
    symbols: filteredSymbols,
  };
}

