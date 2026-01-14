/**
 * API Constants
 * Centralized configuration values for the API
 */

/**
 * JWT configuration
 */
export const JWT_EXPIRY = '7d';

/**
 * Password hashing configuration
 */
export const BCRYPT_SALT_ROUNDS = 10;

/**
 * Default JWT secret (should be overridden in production via JWT_SECRET env var)
 */
export const DEFAULT_JWT_SECRET = 'development-secret-change-in-production';

/**
 * API version (for future use)
 */
export const API_VERSION = '1.0.0';
