/**
 * Migration: Add team_id to prototypes
 *
 * This migration:
 * 1. Adds the team_id column to prototypes table
 * 2. Assigns existing prototypes to the user's first team
 * 3. Creates an index on team_id
 *
 * Usage:
 *   npx tsx src/db/migrations/add-team-to-prototypes.ts
 */

import 'dotenv/config';
import { db, client } from '../index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Starting migration: Add team_id to prototypes...');

  try {
    // Check if column already exists
    const columnCheck = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'prototypes' AND column_name = 'team_id'
    `);

    if (columnCheck.length > 0) {
      console.log('Column team_id already exists, skipping column creation.');
    } else {
      // Add team_id column (nullable initially)
      console.log('Adding team_id column to prototypes...');
      await db.execute(sql`
        ALTER TABLE prototypes
        ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE
      `);
      console.log('Column added successfully.');
    }

    // Check if index exists
    const indexCheck = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'prototypes' AND indexname = 'prototypes_team_idx'
    `);

    if (indexCheck.length > 0) {
      console.log('Index prototypes_team_idx already exists.');
    } else {
      // Create index
      console.log('Creating index on team_id...');
      await db.execute(sql`
        CREATE INDEX prototypes_team_idx ON prototypes(team_id)
      `);
      console.log('Index created successfully.');
    }

    // Assign existing prototypes to their creator's first team
    console.log('Assigning existing prototypes to teams...');
    await db.execute(sql`
      UPDATE prototypes p
      SET team_id = (
        SELECT tm.team_id
        FROM team_memberships tm
        WHERE tm.user_id = p.created_by
        ORDER BY tm.joined_at ASC
        LIMIT 1
      )
      WHERE p.team_id IS NULL
    `);
    console.log(`Updated prototypes with team assignments.`);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

migrate().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
