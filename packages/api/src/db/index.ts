/**
 * Database Connection
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://uswds_pt:password@localhost:5432/uswds_pt';

// Create postgres client
export const client = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export schema for convenience
export * from './schema.js';
