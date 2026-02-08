/**
 * Migration: Add version column to prototypes table
 *
 * Required for optimistic concurrency control.
 * Existing rows default to version 1.
 *
 * Usage:
 *   npx tsx src/db/migrations/add-version-column.ts
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../index.js';

async function addVersionColumn() {
  console.log('Adding version column to prototypes table...');

  try {
    await db.execute(sql`
      ALTER TABLE prototypes
      ADD COLUMN IF NOT EXISTS version integer DEFAULT 1 NOT NULL
    `);

    console.log('Column added successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addVersionColumn()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
