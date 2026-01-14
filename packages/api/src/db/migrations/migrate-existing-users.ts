/**
 * Migration: Migrate Existing Users to Organizations and Teams
 *
 * This script migrates existing users to the new organization/team structure:
 * 1. Creates a "Default Organization" if it doesn't exist
 * 2. Associates all users without an organization to the default org
 * 3. Creates a "General" team in the default organization
 * 4. Adds all users to the General team as team_member
 * 5. Promotes the first user to org_admin
 *
 * Usage:
 *   npx tsx src/db/migrations/migrate-existing-users.ts
 */

import 'dotenv/config';
import { db } from '../index.js';
import {
  organizations,
  teams,
  teamMemberships,
  users,
} from '../schema.js';
import { eq, isNull, and, asc } from 'drizzle-orm';
import { ROLES } from '../roles.js';

async function migrateExistingUsers() {
  console.log('Starting migration: Migrate Existing Users to Organizations and Teams');

  try {
    // Step 1: Check if default organization exists
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, 'default'))
      .limit(1);

    let defaultOrgId: string;

    if (existingOrg) {
      console.log('Default organization already exists:', existingOrg.id);
      defaultOrgId = existingOrg.id;
    } else {
      // Create default organization
      const [newOrg] = await db
        .insert(organizations)
        .values({
          name: 'Default Organization',
          slug: 'default',
          description: 'Auto-created organization for existing users',
        })
        .returning({ id: organizations.id });

      defaultOrgId = newOrg.id;
      console.log('Created default organization:', defaultOrgId);
    }

    // Step 2: Update users without organization
    const usersWithoutOrg = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(isNull(users.organizationId));

    if (usersWithoutOrg.length > 0) {
      await db
        .update(users)
        .set({ organizationId: defaultOrgId })
        .where(isNull(users.organizationId));

      console.log(`Updated ${usersWithoutOrg.length} users to default organization`);
    } else {
      console.log('No users without organization found');
    }

    // Step 3: Check if General team exists
    const [existingTeam] = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.organizationId, defaultOrgId),
          eq(teams.slug, 'general')
        )
      )
      .limit(1);

    let generalTeamId: string;

    if (existingTeam) {
      console.log('General team already exists:', existingTeam.id);
      generalTeamId = existingTeam.id;
    } else {
      // Create General team
      const [newTeam] = await db
        .insert(teams)
        .values({
          organizationId: defaultOrgId,
          name: 'General',
          slug: 'general',
          description: 'Default team for all organization members',
        })
        .returning({ id: teams.id });

      generalTeamId = newTeam.id;
      console.log('Created General team:', generalTeamId);
    }

    // Step 4: Add users to General team
    const orgUsers = await db
      .select({ id: users.id, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.organizationId, defaultOrgId))
      .orderBy(asc(users.createdAt));

    let addedCount = 0;
    let firstUserId: string | null = null;

    for (const user of orgUsers) {
      // Check if user is already a member
      const [existingMembership] = await db
        .select()
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, generalTeamId),
            eq(teamMemberships.userId, user.id)
          )
        )
        .limit(1);

      if (!existingMembership) {
        await db.insert(teamMemberships).values({
          teamId: generalTeamId,
          userId: user.id,
          role: ROLES.TEAM_MEMBER,
        });
        addedCount++;

        // Track first user (oldest)
        if (!firstUserId) {
          firstUserId = user.id;
        }
      } else if (!firstUserId) {
        firstUserId = user.id;
      }
    }

    console.log(`Added ${addedCount} users to General team`);

    // Step 5: Promote first user to org_admin
    if (firstUserId) {
      await db
        .update(teamMemberships)
        .set({ role: ROLES.ORG_ADMIN })
        .where(
          and(
            eq(teamMemberships.teamId, generalTeamId),
            eq(teamMemberships.userId, firstUserId)
          )
        );

      const [adminUser] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, firstUserId))
        .limit(1);

      console.log(`Promoted user to org_admin: ${adminUser?.email}`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateExistingUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
