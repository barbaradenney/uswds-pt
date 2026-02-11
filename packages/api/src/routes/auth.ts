/**
 * Authentication Routes
 */

import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import type { LoginBody, RegisterBody } from '@uswds-pt/shared';
import { db } from '../db/index.js';
import {
  users,
  organizations,
  teams,
  teamMemberships,
  invitations,
} from '../db/schema.js';
import { ROLES, INVITATION_STATUS } from '../db/roles.js';
import { getAuthUser } from '../middleware/permissions.js';
import { normalizeEmail } from '../lib/email.js';

/**
 * Get user with organization and team memberships
 */
export async function getUserWithOrgAndTeams(userId: string) {
  // Get user with organization
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      organizationId: users.organizationId,
      createdAt: users.createdAt,
      isActive: users.isActive,
      avatarUrl: users.avatarUrl,
      githubUsername: users.githubUsername,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  // Get organization if user has one
  let organization = null;
  if (user.organizationId) {
    const [org] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
      })
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);
    organization = org || null;
  }

  // Get team memberships
  const memberships = await db
    .select({
      teamId: teamMemberships.teamId,
      teamName: teams.name,
      teamSlug: teams.slug,
      role: teamMemberships.role,
      joinedAt: teamMemberships.joinedAt,
    })
    .from(teamMemberships)
    .innerJoin(teams, eq(teamMemberships.teamId, teams.id))
    .where(eq(teamMemberships.userId, userId));

  return {
    ...user,
    hasGitHubLinked: !!user.githubUsername,
    organization,
    teamMemberships: memberships,
  };
}

/**
 * Setup new user with default organization and team
 */
export async function setupNewUserOrganization(userId: string, email: string) {
  // Check for pending invitations
  const pendingInvitations = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.email, normalizeEmail(email)),
        eq(invitations.status, INVITATION_STATUS.PENDING)
      )
    )
    .limit(1);

  // If there's a pending invitation, don't create default org/team
  // User will accept invitation separately
  if (pendingInvitations.length > 0) {
    return;
  }

  // Wrap all writes in a transaction to prevent partial state on crash
  const emailPrefix = email.split('@')[0].replace(/[<>"'&]/g, '');
  await db.transaction(async (tx) => {
    // Create a personal organization for the user
    const [org] = await tx
      .insert(organizations)
      .values({
        name: `${emailPrefix}'s Organization`,
        slug: `org-${userId.substring(0, 8)}`,
        description: 'Personal organization',
      })
      .returning({ id: organizations.id });

    // Update user with organization
    await tx
      .update(users)
      .set({ organizationId: org.id })
      .where(eq(users.id, userId));

    // Create a default team
    const [team] = await tx
      .insert(teams)
      .values({
        organizationId: org.id,
        name: 'General',
        slug: 'general',
        description: 'Default team',
      })
      .returning({ id: teams.id });

    // Add user as org_admin
    await tx.insert(teamMemberships).values({
      teamId: team.id,
      userId: userId,
      role: ROLES.ORG_ADMIN,
    });
  });
}

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /api/auth/login
   * Authenticate a user and return a JWT token
   */
  app.post<{ Body: LoginBody }>(
    '/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
          additionalProperties: false,
        },
      },
    },
    async (_request, reply) => {
      return reply.status(410).send({
        message: 'Email/password login has been removed. Please use GitHub sign-in.',
      });
    }
  );

  /**
   * POST /api/auth/register
   * Create a new user account
   */
  app.post<{ Body: RegisterBody }>(
    '/register',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '1 minute',
        },
      },
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (_request, reply) => {
      return reply.status(410).send({
        message: 'Email/password registration has been removed. Please use GitHub sign-in.',
      });
    }
  );

  /**
   * GET /api/auth/me
   * Get the current authenticated user with organization and team data
   */
  app.get(
    '/me',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);

      const userData = await getUserWithOrgAndTeams(authUser.id);

      if (!userData) {
        return reply.status(404).send({ message: 'User not found' });
      }

      return userData;
    }
  );
}
