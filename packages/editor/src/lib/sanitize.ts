/**
 * Centralized DOMPurify sanitization utility.
 *
 * Single import point so DOMPurify is loaded once and shared
 * across all components that need HTML sanitisation.
 */

import DOMPurify from 'dompurify';

export { DOMPurify };

/**
 * Sanitize an HTML string, removing any potentially dangerous content.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
