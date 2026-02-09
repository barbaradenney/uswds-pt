/**
 * Migration: Add GitHub OAuth columns to users table
 *
 * Adds columns for GitHub OAuth integration:
 * - github_id: unique GitHub user ID
 * - github_username: GitHub login handle
 * - github_access_token: encrypted OAuth access token
 * - github_token_expires_at: token expiration timestamp
 * - avatar_url: GitHub avatar URL
 *
 * Also makes password_hash nullable (OAuth users have no password).
 *
 * Usage: npx tsx src/db/migrations/add-github-oauth.ts
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../index.js';

async function migrate() {
  console.log('Adding GitHub OAuth columns to users table...');

  // Make password_hash nullable (OAuth users won't have one)
  await db.execute(sql`
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL
  `);
  console.log('  - Made password_hash nullable');

  // Add GitHub OAuth columns (idempotent)
  const columns = [
    { name: 'github_id', def: 'INTEGER UNIQUE' },
    { name: 'github_username', def: 'VARCHAR(255)' },
    { name: 'github_access_token', def: 'TEXT' },
    { name: 'github_token_expires_at', def: 'TIMESTAMPTZ' },
    { name: 'avatar_url', def: 'VARCHAR(500)' },
  ];

  for (const col of columns) {
    try {
      await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`));
      console.log(`  - Added column ${col.name}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('already exists')) {
        console.log(`  - Column ${col.name} already exists, skipping`);
      } else {
        throw err;
      }
    }
  }

  console.log('GitHub OAuth migration complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
