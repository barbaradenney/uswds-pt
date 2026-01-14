/**
 * Validation Utilities
 * Shared validation functions for forms
 */

/**
 * Email validation regex
 * Matches most valid email formats per RFC 5322
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validate an email address
 * @param email - The email address to validate
 * @returns true if the email is valid
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.length <= 254 && EMAIL_REGEX.test(trimmed);
}

/**
 * Validate that a string is not empty after trimming
 * @param value - The string to validate
 * @param minLength - Minimum length (default 1)
 * @param maxLength - Maximum length (optional)
 * @returns true if the string is valid
 */
export function isValidString(value: string, minLength = 1, maxLength?: number): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    return false;
  }
  if (maxLength !== undefined && trimmed.length > maxLength) {
    return false;
  }
  return true;
}

/**
 * Validate a team/organization name
 * @param name - The name to validate
 * @returns An error message or null if valid
 */
export function validateName(name: string): string | null {
  if (!name || !name.trim()) {
    return 'Name is required';
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters';
  }
  if (name.trim().length > 100) {
    return 'Name must be less than 100 characters';
  }
  return null;
}

/**
 * Validate an email for invitation
 * @param email - The email to validate
 * @returns An error message or null if valid
 */
export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) {
    return 'Email is required';
  }
  if (!isValidEmail(email)) {
    return 'Please enter a valid email address';
  }
  return null;
}
