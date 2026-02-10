/**
 * Migration: Re-scope GitHub connections from organization to team
 *
 * Creates `github_team_connections` table (team_id unique, same columns as org version).
 * Migrates existing `github_org_connections` rows — for each org connection, inserts
 * a row for every team in that organization so no team loses its connection.
 *
 * Does NOT drop the old table (cleanup later).
 *
 * Usage: npx tsx src/db/migrations/github-team-connections.ts
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../index.js';

async function migrate() {
  console.log('Creating github_team_connections table...');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS github_team_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
      repo_owner VARCHAR(255) NOT NULL,
      repo_name VARCHAR(255) NOT NULL,
      default_branch VARCHAR(100) NOT NULL DEFAULT 'main',
      connected_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('  - Table created');

  // Add index
  try {
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS github_team_connections_team_idx
      ON github_team_connections(team_id)
    `);
    console.log('  - Index created');
  } catch {
    console.log('  - Index already exists');
  }

  // Migrate existing org connections → team connections (if old table exists)
  let rows: Array<{
    id: string;
    organization_id: string;
    repo_owner: string;
    repo_name: string;
    default_branch: string;
    connected_by: string | null;
  }> = [];

  try {
    const existing = await db.execute(sql`
      SELECT id, organization_id, repo_owner, repo_name, default_branch, connected_by
      FROM github_org_connections
    `);
    rows = existing.rows as typeof rows;
  } catch {
    console.log('  - Old github_org_connections table not found, skipping data migration');
  }

  if (rows.length > 0) {
    console.log(`  - Migrating ${rows.length} org connection(s) to team connections...`);

    for (const row of rows) {
      // Find all teams in this organization
      const teamsResult = await db.execute(sql`
        SELECT id FROM teams WHERE organization_id = ${row.organization_id}
      `);

      const teamRows = teamsResult.rows as Array<{ id: string }>;
      for (const team of teamRows) {
        try {
          await db.execute(sql`
            INSERT INTO github_team_connections (team_id, repo_owner, repo_name, default_branch, connected_by)
            VALUES (${team.id}, ${row.repo_owner}, ${row.repo_name}, ${row.default_branch}, ${row.connected_by})
            ON CONFLICT (team_id) DO NOTHING
          `);
          console.log(`    - Migrated team ${team.id} → ${row.repo_owner}/${row.repo_name}`);
        } catch (err) {
          console.warn(`    - Skipped team ${team.id} (already exists or error):`, err);
        }
      }
    }
  } else {
    console.log('  - No existing org connections to migrate');
  }

  console.log('GitHub team connections migration complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
