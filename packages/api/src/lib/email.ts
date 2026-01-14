/**
 * Email Utilities
 * Centralized email handling functions
 */

/**
 * Normalize an email address for consistent storage and comparison
 * - Trims whitespace
 * - Converts to lowercase
 * @param email - The email address to normalize
 * @returns The normalized email address
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Email validation regex (RFC 5322 compliant)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validate an email address format
 * @param email - The email address to validate
 * @returns true if the email is valid
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const normalized = normalizeEmail(email);
  return normalized.length > 0 && normalized.length <= 254 && EMAIL_REGEX.test(normalized);
}
