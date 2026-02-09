/**
 * Migration: Add branching support to prototypes
 *
 * Adds:
 * - prototype_branches table for storing branch content
 * - active_branch_id, main_html_content, main_grapes_data columns to prototypes
 * - branch_id column to prototype_versions
 *
 * All operations use IF NOT EXISTS for idempotency.
 *
 * Usage:
 *   npx tsx src/db/migrations/add-branching.ts
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../index.js';

async function addBranching() {
  console.log('Adding branching support...');

  try {
    // 1. Create prototype_branches table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS prototype_branches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        prototype_id uuid NOT NULL REFERENCES prototypes(id) ON DELETE CASCADE,
        name varchar(100) NOT NULL,
        slug varchar(100) NOT NULL,
        description text,
        html_content text NOT NULL DEFAULT '',
        grapes_data jsonb NOT NULL DEFAULT '{}',
        content_checksum varchar(64),
        forked_from_version integer,
        created_by uuid REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        is_active boolean NOT NULL DEFAULT true,
        CONSTRAINT branches_prototype_slug_unique UNIQUE (prototype_id, slug)
      )
    `);
    console.log('  Created prototype_branches table');

    // 2. Add indexes to prototype_branches
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS branches_prototype_idx
      ON prototype_branches (prototype_id)
    `);
    console.log('  Created branches_prototype_idx');

    // 3. Add columns to prototypes table
    await db.execute(sql`
      ALTER TABLE prototypes
      ADD COLUMN IF NOT EXISTS active_branch_id uuid REFERENCES prototype_branches(id) ON DELETE SET NULL
    `);
    await db.execute(sql`
      ALTER TABLE prototypes
      ADD COLUMN IF NOT EXISTS main_html_content text
    `);
    await db.execute(sql`
      ALTER TABLE prototypes
      ADD COLUMN IF NOT EXISTS main_grapes_data jsonb
    `);
    await db.execute(sql`
      ALTER TABLE prototypes
      ADD COLUMN IF NOT EXISTS main_content_checksum varchar(64)
    `);
    console.log('  Added branching columns to prototypes');

    // 4. Add branch_id column to prototype_versions
    await db.execute(sql`
      ALTER TABLE prototype_versions
      ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES prototype_branches(id) ON DELETE SET NULL
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS versions_branch_idx
      ON prototype_versions (branch_id)
    `);
    console.log('  Added branch_id to prototype_versions');

    console.log('Branching migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addBranching()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
