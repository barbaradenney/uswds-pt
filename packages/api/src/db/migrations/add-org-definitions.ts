/**
 * Migration: Add state_definitions and user_definitions columns to organizations table
 *
 * Moves visibility dimension definitions (states and user personas) from
 * per-prototype grapesData to organization-level storage.
 *
 * Usage:
 *   npx tsx src/db/migrations/add-org-definitions.ts
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../index.js';

async function addOrgDefinitions() {
  console.log('Adding state_definitions and user_definitions columns to organizations table...');

  try {
    await db.execute(sql`
      ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS state_definitions jsonb DEFAULT '[]'::jsonb NOT NULL
    `);
    console.log('  state_definitions column added.');

    await db.execute(sql`
      ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS user_definitions jsonb DEFAULT '[]'::jsonb NOT NULL
    `);
    console.log('  user_definitions column added.');

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addOrgDefinitions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
