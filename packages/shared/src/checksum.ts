/**
 * Isomorphic SHA-256 checksum utility
 * Works in both browser (crypto.subtle) and Node.js (crypto module)
 */

/**
 * Deterministic JSON serialization with sorted keys.
 * Ensures the same data always produces the same string regardless
 * of property insertion order.
 */
function stableSerialize(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      return Object.keys(val)
        .sort()
        .reduce<Record<string, unknown>>((sorted, k) => {
          sorted[k] = val[k];
          return sorted;
        }, {});
    }
    return val;
  });
}

/**
 * Compute a SHA-256 hex checksum of the given string.
 * Uses crypto.subtle in the browser, crypto.createHash in Node.js.
 */
async function computeChecksum(data: string): Promise<string> {
  // Browser environment
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Node.js environment
  const { createHash } = await import('crypto');
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Compute a content checksum from htmlContent and grapesData.
 * This is the standard way to compute checksums across the codebase.
 */
export async function computeContentChecksum(
  htmlContent: string,
  grapesData: unknown
): Promise<string> {
  const payload = stableSerialize(htmlContent) + stableSerialize(grapesData);
  return computeChecksum(payload);
}
