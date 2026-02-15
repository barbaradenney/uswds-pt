/**
 * Email Utilities
 * Centralized email handling functions
 */

/**
 * Normalize an email address for consistent storage and comparison
 * - Trims whitespace
 * - Converts to lowercase
 * @param email - The email address to normalize
 * @returns The normalized email address, or empty string if invalid input
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }
  return email.trim().toLowerCase();
}

