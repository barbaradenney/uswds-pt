/**
 * Shared Debug Utilities
 *
 * Provides consistent debug logging across all packages.
 * Debug mode can be enabled via:
 * - URL parameter: ?debug=true
 * - localStorage: uswds_pt_debug=true
 */

export const DEBUG_STORAGE_KEY = 'uswds_pt_debug';
const DEBUG_PARAM = 'debug';

/**
 * Check if debug mode is enabled
 * Works in both browser and Node.js environments
 */
function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') {
    // Node.js environment - check process.env
    // Access via globalThis to avoid requiring @types/node at build time
    const env = (globalThis as Record<string, unknown>).process as
      | { env: Record<string, string | undefined> }
      | undefined;
    return env?.env.DEBUG === 'true' || env?.env.USWDS_PT_DEBUG === 'true';
  }

  // Browser environment
  const urlDebug = new URLSearchParams(window.location.search).get(DEBUG_PARAM) === 'true';
  const storageDebug = localStorage.getItem(DEBUG_STORAGE_KEY) === 'true';
  return urlDebug || storageDebug;
}

/** Cached debug state to avoid repeated checks */
let debugEnabled: boolean | null = null;

/**
 * Get debug state (cached after first check)
 */
function getDebugState(): boolean {
  if (debugEnabled === null) {
    debugEnabled = isDebugEnabled();
  }
  return debugEnabled;
}

/**
 * Create a namespaced debug logger
 *
 * @param namespace - Prefix for all log messages (e.g., 'SaveQueue', 'Canvas')
 * @returns Debug function that logs only when debug mode is enabled
 *
 * @example
 * ```ts
 * const debug = createDebugLogger('SaveQueue');
 * debug('Processing save', { id: 123 });
 * // Output: [SaveQueue] Processing save { id: 123 }
 * ```
 */
export function createDebugLogger(namespace: string): (...args: unknown[]) => void {
  return (...args: unknown[]): void => {
    if (getDebugState()) {
      console.log(`[${namespace}]`, ...args);
    }
  };
}

/**
 * Generic debug logger with 'USWDS-PT' namespace
 * Use createDebugLogger() for more specific namespaces
 */
export const debug = createDebugLogger('USWDS-PT');

/**
 * Programmatically enable debug mode
 * Useful for enabling debug in tests or programmatically
 */
export function enableDebug(): void {
  debugEnabled = true;
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEBUG_STORAGE_KEY, 'true');
  }
}

/**
 * Programmatically disable debug mode
 */
export function disableDebug(): void {
  debugEnabled = false;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEBUG_STORAGE_KEY);
  }
}

/**
 * Reset debug state (force re-check on next call)
 * Useful for tests
 */
export function resetDebugState(): void {
  debugEnabled = null;
}
