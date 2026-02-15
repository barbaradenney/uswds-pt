/**
 * API Constants
 * Centralized configuration values for the API
 */

/**
 * JWT configuration
 */
export const JWT_EXPIRY = '7d';

/**
 * Fallback JWT secret for local development only.
 * In production, JWT_SECRET env var is required (enforced in index.ts).
 */
export const DEFAULT_JWT_SECRET_DEV = 'dev-only-jwt-secret-do-not-use-in-prod';

/**
 * API version (for future use)
 */
export const API_VERSION = '1.0.0';
