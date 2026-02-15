/**
 * Database Connection
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://uswds_pt:password@localhost:5432/uswds_pt';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Resolve SSL config for the postgres connection.
 *
 * DB_SSL env var gives explicit control:
 *   - 'true'  → strict SSL (rejectUnauthorized: true)
 *   - 'false' → no SSL (e.g., Docker bridge network to local postgres)
 *   - unset   → auto: SSL in production, none otherwise
 */
function resolveSSL(): boolean | object | undefined {
  const dbSsl = process.env.DB_SSL?.toLowerCase();
  if (dbSsl === 'true') return { rejectUnauthorized: true };
  if (dbSsl === 'false') return undefined;
  // Default: SSL in production
  return isProduction ? { rejectUnauthorized: true } : undefined;
}

// Create postgres client with explicit pool configuration
export const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: resolveSSL(),
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export schema for convenience
export * from './schema.js';
