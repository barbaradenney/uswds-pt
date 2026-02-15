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
 *   - 'true'   → strict SSL (rejectUnauthorized: true)
 *   - 'verify'  → same as 'true' (alias for clarity)
 *   - 'false'  → no SSL (e.g., Docker bridge network to local postgres)
 *   - unset    → auto: SSL in production (without strict verification), none otherwise
 *
 * Default production mode uses rejectUnauthorized: false because hosted
 * database providers like Supabase use pooler certificates with self-signed
 * CAs that Node.js cannot verify against its default trust store.
 * The connection is still TLS-encrypted; only certificate chain verification
 * is relaxed.
 */
function resolveSSL(): boolean | object | undefined {
  const dbSsl = process.env.DB_SSL?.toLowerCase();
  if (dbSsl === 'true' || dbSsl === 'verify') return { rejectUnauthorized: true };
  if (dbSsl === 'false') return undefined;
  // Default: SSL in production without strict cert verification (Supabase-compatible)
  return isProduction ? { rejectUnauthorized: false } : undefined;
}

// Create postgres client with explicit pool configuration
const poolSize = parseInt(process.env.DB_POOL_SIZE || '20', 10);

export const client = postgres(connectionString, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 1800,
  ssl: resolveSSL(),
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export schema for convenience
export * from './schema.js';
