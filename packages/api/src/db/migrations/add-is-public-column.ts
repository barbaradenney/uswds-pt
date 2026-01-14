/**
 * Migration: Add is_public column to prototypes table
 *
 * This fixes the missing column that db:push didn't detect.
 *
 * Usage:
 *   npx tsx src/db/migrations/add-is-public-column.ts
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../index.js';

async function addIsPublicColumn() {
  console.log('Adding is_public column to prototypes table...');

  try {
    await db.execute(sql`
      ALTER TABLE prototypes
      ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false NOT NULL
    `);

    console.log('Column added successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addIsPublicColumn()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
