/**
 * Global Symbols Hook
 *
 * Manages global symbols that can be shared across prototypes within a team.
 * Provides CRUD operations and integration with GrapesJS editor.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GlobalSymbol, GrapesJSSymbol } from '@uswds-pt/shared';
import {
  fetchGlobalSymbols,
  createGlobalSymbol,
  updateGlobalSymbol,
  deleteGlobalSymbol,
} from '../lib/api';

// Debug logging
const DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('debug') === 'true' ||
    localStorage.getItem('uswds_pt_debug') === 'true');

function debug(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[GlobalSymbols]', ...args);
  }
}

// Prefix for global symbol IDs to distinguish from local symbols
export const GLOBAL_SYMBOL_PREFIX = 'global-';

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
}

export interface UseGlobalSymbolsReturn extends GlobalSymbolsState {
  /** Refresh symbols from the server */
  refresh: () => Promise<void>;
  /** Create a new global symbol */
  create: (name: string, symbolData: GrapesJSSymbol) => Promise<GlobalSymbol | null>;
  /** Update an existing global symbol */
  update: (symbolId: string, updates: { name?: string; symbolData?: GrapesJSSymbol }) => Promise<GlobalSymbol | null>;
  /** Delete a global symbol */
  remove: (symbolId: string) => Promise<boolean>;
  /** Get symbols formatted for GrapesJS */
  getGrapesJSSymbols: () => GrapesJSSymbol[];
  /** Check if a symbol ID is a global symbol */
  isGlobalSymbol: (symbolId: string) => boolean;
  /** Get global symbol by its GrapesJS ID */
  getByGrapesId: (grapesId: string) => GlobalSymbol | null;
}

export function useGlobalSymbols({
  teamId,
  enabled = true,
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
   * Refresh symbols from the server
   */
  const refresh = useCallback(async () => {
    if (!enabled || !teamId) {
      setState((prev) => ({ ...prev, symbols: [], isLoading: false }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    debug('Loading global symbols for team:', teamId);

    const result = await fetchGlobalSymbols(teamId);

    if (!mountedRef.current) return;

    if (result.success && result.data) {
      debug('Loaded', result.data.symbols.length, 'global symbols');
      setState({
        symbols: result.data.symbols,
        isLoading: false,
        error: null,
      });
    } else {
      debug('Failed to load global symbols:', result.error);
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
   * Create a new global symbol
   */
  const create = useCallback(
    async (name: string, symbolData: GrapesJSSymbol): Promise<GlobalSymbol | null> => {
      if (!teamId) {
        setState((prev) => ({ ...prev, error: 'No team selected' }));
        return null;
      }

      debug('Creating global symbol:', name);

      // Ensure the symbol has a unique global ID
      const globalSymbolData: GrapesJSSymbol = {
        ...symbolData,
        id: `${GLOBAL_SYMBOL_PREFIX}${symbolData.id || Date.now()}`,
      };

      const result = await createGlobalSymbol(teamId, name, globalSymbolData);

      if (!mountedRef.current) return null;

      if (result.success && result.data) {
        debug('Created global symbol:', result.data.id);
        setState((prev) => ({
          ...prev,
          symbols: [...prev.symbols, result.data!],
          error: null,
        }));
        return result.data;
      }

      setState((prev) => ({ ...prev, error: result.error || 'Failed to create symbol' }));
      return null;
    },
    [teamId]
  );

  /**
   * Update an existing global symbol
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

      debug('Updating global symbol:', symbolId);

      const result = await updateGlobalSymbol(teamId, symbolId, updates);

      if (!mountedRef.current) return null;

      if (result.success && result.data) {
        debug('Updated global symbol:', symbolId);
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
   * Delete a global symbol
   */
  const remove = useCallback(
    async (symbolId: string): Promise<boolean> => {
      if (!teamId) {
        setState((prev) => ({ ...prev, error: 'No team selected' }));
        return false;
      }

      debug('Deleting global symbol:', symbolId);

      const result = await deleteGlobalSymbol(teamId, symbolId);

      if (!mountedRef.current) return false;

      if (result.success) {
        debug('Deleted global symbol:', symbolId);
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
   * Get symbols formatted for GrapesJS
   * Global symbols are marked with a prefix so they can be identified later
   */
  const getGrapesJSSymbols = useCallback((): GrapesJSSymbol[] => {
    return state.symbols.map((symbol) => ({
      ...symbol.symbolData,
      // Ensure the ID has the global prefix
      id: symbol.symbolData.id.startsWith(GLOBAL_SYMBOL_PREFIX)
        ? symbol.symbolData.id
        : `${GLOBAL_SYMBOL_PREFIX}${symbol.symbolData.id}`,
      // Store the database ID for later reference
      _globalSymbolId: symbol.id,
    }));
  }, [state.symbols]);

  /**
   * Check if a symbol ID is a global symbol
   */
  const isGlobalSymbol = useCallback((symbolId: string): boolean => {
    return symbolId.startsWith(GLOBAL_SYMBOL_PREFIX);
  }, []);

  /**
   * Get global symbol by its GrapesJS ID
   */
  const getByGrapesId = useCallback(
    (grapesId: string): GlobalSymbol | null => {
      // Remove the prefix if present
      const cleanId = grapesId.startsWith(GLOBAL_SYMBOL_PREFIX)
        ? grapesId.slice(GLOBAL_SYMBOL_PREFIX.length)
        : grapesId;

      return (
        state.symbols.find(
          (s) =>
            s.symbolData.id === grapesId ||
            s.symbolData.id === cleanId ||
            s.symbolData.id === `${GLOBAL_SYMBOL_PREFIX}${cleanId}`
        ) || null
      );
    },
    [state.symbols]
  );

  return {
    ...state,
    refresh,
    create,
    update,
    remove,
    getGrapesJSSymbols,
    isGlobalSymbol,
    getByGrapesId,
  };
}

/**
 * Merge global symbols into GrapesJS project data
 * Call this before loading project data into the editor
 */
export function mergeGlobalSymbols(
  projectData: any,
  globalSymbols: GrapesJSSymbol[]
): any {
  if (!projectData || !globalSymbols.length) {
    return projectData;
  }

  // Get existing symbols from project data
  const existingSymbols = projectData.symbols || [];
  const existingIds = new Set(existingSymbols.map((s: any) => s.id));

  // Add global symbols that aren't already in the project
  const newSymbols = globalSymbols.filter((s) => !existingIds.has(s.id));

  debug('Merging', newSymbols.length, 'global symbols into project data');

  return {
    ...projectData,
    symbols: [...existingSymbols, ...newSymbols],
  };
}

/**
 * Extract local symbols from GrapesJS project data
 * This filters out global symbols so only local ones are saved with the prototype
 */
export function extractLocalSymbols(projectData: any): any {
  if (!projectData?.symbols) {
    return projectData;
  }

  const localSymbols = projectData.symbols.filter(
    (s: any) => !s.id?.startsWith(GLOBAL_SYMBOL_PREFIX)
  );

  debug('Extracted', localSymbols.length, 'local symbols from', projectData.symbols.length, 'total');

  return {
    ...projectData,
    symbols: localSymbols,
  };
}
