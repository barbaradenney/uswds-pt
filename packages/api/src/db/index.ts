/**
 * Database Connection
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://uswds_pt:password@localhost:5432/uswds_pt';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Load a CA certificate for SSL verification.
 *
 * Priority:
 * 1. DB_CA_CERT env var — PEM content inline (for platforms that support multi-line env vars)
 * 2. DB_CA_CERT_PATH env var — path to a PEM file
 * 3. Bundled Supabase CA cert at ../../../certs/supabase-ca.crt (default for Supabase users)
 *
 * Returns the PEM string or undefined if no cert is available.
 */
function loadCACert(): string | undefined {
  // 1. Inline PEM from env var
  if (process.env.DB_CA_CERT) {
    return process.env.DB_CA_CERT;
  }

  // 2. File path from env var
  if (process.env.DB_CA_CERT_PATH) {
    try {
      return fs.readFileSync(process.env.DB_CA_CERT_PATH, 'utf-8');
    } catch {
      // Fall through to bundled cert
    }
  }

  // 3. Bundled Supabase CA cert (shipped in repo at packages/api/certs/)
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const bundledPath = path.resolve(__dirname, '..', '..', 'certs', 'supabase-ca.crt');
    return fs.readFileSync(bundledPath, 'utf-8');
  } catch {
    return undefined;
  }
}

/**
 * Resolve SSL config for the postgres connection.
 *
 * DB_SSL env var gives explicit control:
 *   - 'true' or 'verify' → SSL with CA verification (loads CA cert automatically)
 *   - 'false'             → no SSL (e.g., Docker bridge network to local postgres)
 *   - unset               → auto: production uses SSL with CA verification if cert
 *                           is available, otherwise SSL without strict verification;
 *                           development uses no SSL
 */
function resolveSSL(): boolean | object | undefined {
  const dbSsl = process.env.DB_SSL?.toLowerCase();

  if (dbSsl === 'false') return undefined;

  if (dbSsl === 'true' || dbSsl === 'verify') {
    const ca = loadCACert();
    return ca
      ? { rejectUnauthorized: true, ca }
      : { rejectUnauthorized: true };
  }

  // Default: SSL in production
  if (isProduction) {
    const ca = loadCACert();
    if (ca) {
      // CA cert available → full verification (encrypted + server identity verified)
      return { rejectUnauthorized: true, ca };
    }
    // No CA cert → encrypted but unverified (fallback for non-Supabase providers)
    return { rejectUnauthorized: false };
  }

  return undefined;
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
