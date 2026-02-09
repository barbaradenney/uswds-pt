/**
 * Migration: Add github_repo_connections table
 *
 * Creates a table to link prototypes to GitHub repositories for push-on-save.
 *
 * Usage: npx tsx src/db/migrations/add-github-repos.ts
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../index.js';

async function migrate() {
  console.log('Creating github_repo_connections table...');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS github_repo_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prototype_id UUID NOT NULL UNIQUE REFERENCES prototypes(id) ON DELETE CASCADE,
      repo_owner VARCHAR(255) NOT NULL,
      repo_name VARCHAR(255) NOT NULL,
      default_branch VARCHAR(100) NOT NULL DEFAULT 'main',
      file_path VARCHAR(500) NOT NULL DEFAULT 'prototype.html',
      last_pushed_at TIMESTAMPTZ,
      last_pushed_version INTEGER,
      last_pushed_commit_sha VARCHAR(40),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('  - Table created');

  // Add index
  try {
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS github_connections_prototype_idx
      ON github_repo_connections(prototype_id)
    `);
    console.log('  - Index created');
  } catch {
    console.log('  - Index already exists');
  }

  console.log('GitHub repo connections migration complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
