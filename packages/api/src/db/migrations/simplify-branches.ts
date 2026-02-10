/**
 * Migration: Simplify branches — every prototype IS a branch
 *
 * Adds:
 * - branch_slug, last_github_push_at, last_github_commit_sha to prototypes
 * - github_org_connections table for org-level GitHub integration
 * - Backfills branch_slug from prototype names
 *
 * Cleanup (run after stable deploy):
 * - Drops: active_branch_id, main_html_content, main_grapes_data, main_content_checksum from prototypes
 * - Drops: branch_id from prototype_versions
 * - Drops: prototype_branches table
 * - Drops: github_repo_connections table
 *
 * All operations use IF NOT EXISTS / IF EXISTS for idempotency.
 *
 * Usage:
 *   npx tsx src/db/migrations/simplify-branches.ts
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../index.js';

/**
 * Mirrors the shared toBranchSlug() function for use inside the migration.
 */
function toBranchSlug(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200) || 'prototype';
}

async function simplifyBranches() {
  console.log('Simplifying branches — every prototype IS a branch...');

  try {
    // ========================================================================
    // Step 1: Add new columns to prototypes
    // ========================================================================

    await db.execute(sql`
      ALTER TABLE prototypes
      ADD COLUMN IF NOT EXISTS branch_slug varchar(200)
    `);
    await db.execute(sql`
      ALTER TABLE prototypes
      ADD COLUMN IF NOT EXISTS last_github_push_at timestamptz
    `);
    await db.execute(sql`
      ALTER TABLE prototypes
      ADD COLUMN IF NOT EXISTS last_github_commit_sha varchar(40)
    `);
    console.log('  Added branch_slug, last_github_push_at, last_github_commit_sha to prototypes');

    // ========================================================================
    // Step 2: Create github_org_connections table
    // ========================================================================

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS github_org_connections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        repo_owner varchar(255) NOT NULL,
        repo_name varchar(255) NOT NULL,
        default_branch varchar(100) NOT NULL DEFAULT 'main',
        connected_by uuid REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT github_org_connections_org_unique UNIQUE (organization_id)
      )
    `);
    console.log('  Created github_org_connections table');

    // ========================================================================
    // Step 3: Backfill branch_slug from prototype names
    // ========================================================================

    const rows = await db.execute(sql`
      SELECT id, name, team_id FROM prototypes WHERE branch_slug IS NULL
    `);

    // Track slugs per team to handle collisions
    const slugsByTeam = new Map<string, Set<string>>();

    for (const row of rows.rows) {
      const id = row.id as string;
      const name = row.name as string;
      const teamId = (row.team_id as string) || '__none__';

      if (!slugsByTeam.has(teamId)) {
        slugsByTeam.set(teamId, new Set());
      }
      const usedSlugs = slugsByTeam.get(teamId)!;

      let slug = toBranchSlug(name);

      // Handle collisions by appending a numeric suffix
      if (usedSlugs.has(slug)) {
        let suffix = 2;
        while (usedSlugs.has(`${slug}-${suffix}`)) {
          suffix++;
        }
        slug = `${slug}-${suffix}`;
      }

      usedSlugs.add(slug);

      await db.execute(sql`
        UPDATE prototypes SET branch_slug = ${slug} WHERE id = ${id}::uuid
      `);
    }

    console.log(`  Backfilled branch_slug for ${rows.rows.length} prototypes`);

    // ========================================================================
    // Step 4: Make branch_slug NOT NULL, add unique index
    // ========================================================================

    // Set any remaining nulls to 'prototype' as a safety net
    await db.execute(sql`
      UPDATE prototypes SET branch_slug = 'prototype' WHERE branch_slug IS NULL
    `);

    await db.execute(sql`
      ALTER TABLE prototypes ALTER COLUMN branch_slug SET NOT NULL
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS prototypes_team_branch_slug_unique
      ON prototypes (team_id, branch_slug)
    `);
    console.log('  Made branch_slug NOT NULL with unique index');

    // ========================================================================
    // Step 5: Cleanup — drop old branch infrastructure
    // ========================================================================

    // Drop FK constraint on active_branch_id first
    await db.execute(sql`
      ALTER TABLE prototypes DROP CONSTRAINT IF EXISTS prototypes_active_branch_id_prototype_branches_id_fk
    `);
    // Also try the constraint name from the migration
    await db.execute(sql`
      ALTER TABLE prototypes DROP CONSTRAINT IF EXISTS prototypes_active_branch_id_fkey
    `);

    await db.execute(sql`
      ALTER TABLE prototypes DROP COLUMN IF EXISTS active_branch_id
    `);
    await db.execute(sql`
      ALTER TABLE prototypes DROP COLUMN IF EXISTS main_html_content
    `);
    await db.execute(sql`
      ALTER TABLE prototypes DROP COLUMN IF EXISTS main_grapes_data
    `);
    await db.execute(sql`
      ALTER TABLE prototypes DROP COLUMN IF EXISTS main_content_checksum
    `);
    console.log('  Dropped old branch columns from prototypes');

    // Drop branch_id FK from prototype_versions
    await db.execute(sql`
      ALTER TABLE prototype_versions DROP CONSTRAINT IF EXISTS prototype_versions_branch_id_prototype_branches_id_fk
    `);
    await db.execute(sql`
      ALTER TABLE prototype_versions DROP CONSTRAINT IF EXISTS prototype_versions_branch_id_fkey
    `);
    await db.execute(sql`
      DROP INDEX IF EXISTS versions_branch_idx
    `);
    await db.execute(sql`
      ALTER TABLE prototype_versions DROP COLUMN IF EXISTS branch_id
    `);
    console.log('  Dropped branch_id from prototype_versions');

    // Drop old tables
    await db.execute(sql`DROP TABLE IF EXISTS prototype_branches CASCADE`);
    console.log('  Dropped prototype_branches table');

    await db.execute(sql`DROP TABLE IF EXISTS github_repo_connections CASCADE`);
    console.log('  Dropped github_repo_connections table');

    console.log('Branch simplification migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

simplifyBranches()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
