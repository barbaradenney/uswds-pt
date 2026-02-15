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
 * Default AI model names when AI_MODEL env var is not set.
 */
export const DEFAULT_AI_MODEL_CLAUDE = 'claude-sonnet-4-20250514';
export const DEFAULT_AI_MODEL_OPENAI = 'gpt-4o';
