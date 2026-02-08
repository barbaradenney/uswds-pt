/**
 * HTML sanitization utilities
 */

/**
 * Escape HTML special characters for safe innerHTML insertion.
 * Handles all five HTML-significant characters in the correct order
 * (ampersand first to avoid double-encoding).
 */
export function escapeHtml(str: string): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
