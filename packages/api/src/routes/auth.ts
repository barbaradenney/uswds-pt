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
import {
  createUser,
  findUserByEmail,
  verifyPassword,
} from '../plugins/auth.js';
import { JWT_EXPIRY } from '../constants.js';
import { getAuthUser } from '../middleware/permissions.js';
import { normalizeEmail } from '../lib/email.js';

/**
 * Get user with organization and team memberships
 */
async function getUserWithOrgAndTeams(userId: string) {
  // Get user with organization
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      organizationId: users.organizationId,
      createdAt: users.createdAt,
      isActive: users.isActive,
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
    organization,
    teamMemberships: memberships,
  };
}

/**
 * Setup new user with default organization and team
 */
async function setupNewUserOrganization(userId: string, email: string) {
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
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      // Find user
      const user = await findUserByEmail(email);
      if (!user) {
        return reply.status(401).send({ message: 'Invalid email or password' });
      }

      // Check if user is active
      if (!user.isActive) {
        return reply.status(401).send({ message: 'Account is disabled' });
      }

      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return reply.status(401).send({ message: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = app.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: JWT_EXPIRY }
      );

      // Get user with org and team data
      const userData = await getUserWithOrgAndTeams(user.id);

      return {
        token,
        user: userData,
      };
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
        },
      },
    },
    async (request, reply) => {
      const { email, password, name } = request.body;

      // Check if user already exists
      const existing = await findUserByEmail(email);
      if (existing) {
        return reply.status(400).send({ message: 'Email already registered' });
      }

      // Create user
      const user = await createUser(email, password, name);

      // Setup organization and team for new user
      await setupNewUserOrganization(user.id, email);

      // Generate JWT token
      const token = app.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: JWT_EXPIRY }
      );

      // Get user with org and team data
      const userData = await getUserWithOrgAndTeams(user.id);

      return reply.status(201).send({
        token,
        user: userData,
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
