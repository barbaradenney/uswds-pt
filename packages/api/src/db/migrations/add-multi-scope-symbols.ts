/**
 * Migration: Add multi-scope symbols, org definitions, and handoff connections
 *
 * Adds scope, organization_id, prototype_id, promoted_from columns to symbols.
 * Makes team_id nullable. Adds state_definitions/user_definitions to organizations.
 * Creates github_handoff_connections table.
 *
 * All statements are idempotent (IF NOT EXISTS / IF NOT EXISTS patterns).
 *
 * Usage: npx tsx src/db/migrations/add-multi-scope-symbols.ts
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../index.js';

async function migrate() {
  console.log('=== Multi-scope symbols migration ===');

  // 1. Add multi-scope columns to symbols table
  console.log('1. Adding multi-scope columns to symbols...');

  await db.execute(sql`
    ALTER TABLE symbols ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'team'
  `);
  await db.execute(sql`
    ALTER TABLE symbols ADD COLUMN IF NOT EXISTS organization_id UUID
  `);
  await db.execute(sql`
    ALTER TABLE symbols ADD COLUMN IF NOT EXISTS prototype_id UUID
  `);
  await db.execute(sql`
    ALTER TABLE symbols ADD COLUMN IF NOT EXISTS promoted_from UUID
  `);
  console.log('   - Columns added');

  // 2. Make team_id nullable (org-scoped symbols don't belong to a specific team)
  console.log('2. Making symbols.team_id nullable...');
  await db.execute(sql`
    ALTER TABLE symbols ALTER COLUMN team_id DROP NOT NULL
  `);
  console.log('   - team_id is now nullable');

  // 3. Add foreign keys for new symbol columns
  console.log('3. Adding foreign keys...');
  try {
    await db.execute(sql`
      ALTER TABLE symbols ADD CONSTRAINT symbols_organization_id_organizations_id_fk
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    `);
    console.log('   - symbols.organization_id FK added');
  } catch {
    console.log('   - symbols.organization_id FK already exists');
  }

  try {
    await db.execute(sql`
      ALTER TABLE symbols ADD CONSTRAINT symbols_prototype_id_prototypes_id_fk
      FOREIGN KEY (prototype_id) REFERENCES prototypes(id) ON DELETE CASCADE
    `);
    console.log('   - symbols.prototype_id FK added');
  } catch {
    console.log('   - symbols.prototype_id FK already exists');
  }

  // 4. Add indexes for new symbol columns
  console.log('4. Adding indexes...');
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS symbols_organization_idx ON symbols(organization_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS symbols_prototype_idx ON symbols(prototype_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS symbols_scope_idx ON symbols(scope)
  `);
  console.log('   - Indexes added');

  // 5. Add state/user definitions to organizations
  console.log('5. Adding state/user definitions to organizations...');
  await db.execute(sql`
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state_definitions JSONB NOT NULL DEFAULT '[]'::jsonb
  `);
  await db.execute(sql`
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS user_definitions JSONB NOT NULL DEFAULT '[]'::jsonb
  `);
  console.log('   - Columns added');

  // 6. Create github_handoff_connections table
  console.log('6. Creating github_handoff_connections table...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS github_handoff_connections (
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
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS github_handoff_connections_team_idx
    ON github_handoff_connections(team_id)
  `);
  console.log('   - Table and index created');

  // 7. Add prototypes.updated_at index (query performance)
  console.log('7. Adding prototypes.updated_at index...');
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS prototypes_updated_at_idx ON prototypes(updated_at)
  `);
  console.log('   - Index added');

  console.log('=== Migration complete ===');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
