/**
 * Organization Routes
 * Handles organization management endpoints
 */

import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { organizations, users, teams, teamMemberships } from '../db/schema.js';
import { ROLES } from '../db/roles.js';
import { requireOrgAdmin, loadUserOrganization, getAuthUser } from '../middleware/permissions.js';

interface UpdateOrgBody {
  name?: string;
  description?: string;
  logoUrl?: string;
}

export async function organizationRoutes(app: FastifyInstance) {
  /**
   * POST /api/organizations/setup
   * Set up organization and team for users who don't have one
   */
  app.post<{ Body: { teamName: string } }>(
    '/setup',
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['teamName'],
          properties: {
            teamName: { type: 'string', minLength: 1, maxLength: 255 },
          },
        },
      },
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { teamName } = request.body;

      // Get user's current organization
      const [user] = await db
        .select({ organizationId: users.organizationId, email: users.email })
        .from(users)
        .where(eq(users.id, authUser.id))
        .limit(1);

      if (!user) {
        return reply.status(404).send({ message: 'User not found' });
      }

      // Check if user already has an organization
      if (user.organizationId) {
        return reply.status(400).send({ message: 'User already has an organization' });
      }

      // Create organization
      const orgSlug = `org-${authUser.id.substring(0, 8)}`;
      const [org] = await db
        .insert(organizations)
        .values({
          name: `${user.email.split('@')[0]}'s Organization`,
          slug: orgSlug,
          description: 'Personal organization',
        })
        .returning();

      // Update user with organization
      await db
        .update(users)
        .set({ organizationId: org.id })
        .where(eq(users.id, authUser.id));

      // Create the team
      const teamSlug = teamName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100);

      const [team] = await db
        .insert(teams)
        .values({
          organizationId: org.id,
          name: teamName,
          slug: teamSlug || 'general',
        })
        .returning();

      // Add user as org_admin
      await db.insert(teamMemberships).values({
        teamId: team.id,
        userId: authUser.id,
        role: ROLES.ORG_ADMIN,
      });

      return {
        organization: org,
        team: {
          ...team,
          role: ROLES.ORG_ADMIN,
        },
      };
    }
  );

  /**
   * GET /api/organizations
   * Get the current user's organization
   */
  app.get(
    '/',
    {
      preHandler: [app.authenticate, loadUserOrganization],
    },
    async (request, reply) => {
      const orgId = request.userOrganizationId;

      if (!orgId) {
        return reply.status(404).send({ message: 'User does not belong to an organization' });
      }

      const [org] = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          description: organizations.description,
          logoUrl: organizations.logoUrl,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
        })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!org) {
        return reply.status(404).send({ message: 'Organization not found' });
      }

      return org;
    }
  );

  /**
   * PUT /api/organizations/:orgId
   * Update organization details (org_admin only)
   */
  app.put<{ Params: { orgId: string }; Body: UpdateOrgBody }>(
    '/:orgId',
    {
      preHandler: [app.authenticate, requireOrgAdmin],
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            logoUrl: { type: 'string', maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      const { orgId } = request.params;
      const { name, description, logoUrl } = request.body;

      // Verify user belongs to this organization
      if (request.userOrganizationId !== orgId) {
        return reply.status(403).send({ message: 'Cannot update another organization' });
      }

      const updateData: Partial<typeof organizations.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (logoUrl !== undefined) updateData.logoUrl = logoUrl;

      const [updated] = await db
        .update(organizations)
        .set(updateData)
        .where(eq(organizations.id, orgId))
        .returning({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          description: organizations.description,
          logoUrl: organizations.logoUrl,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
        });

      if (!updated) {
        return reply.status(404).send({ message: 'Organization not found' });
      }

      return updated;
    }
  );

  /**
   * GET /api/organizations/:orgId/members
   * List all members in the organization (org_admin only)
   */
  app.get<{ Params: { orgId: string } }>(
    '/:orgId/members',
    {
      preHandler: [app.authenticate, requireOrgAdmin],
    },
    async (request, reply) => {
      const { orgId } = request.params;

      // Verify user belongs to this organization
      if (request.userOrganizationId !== orgId) {
        return reply.status(403).send({ message: 'Cannot view another organization' });
      }

      // Get all users in the organization (1 query)
      const orgUsers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          createdAt: users.createdAt,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.organizationId, orgId));

      if (orgUsers.length === 0) {
        return { members: [] };
      }

      // Get all team memberships for all users in a single query
      const allMemberships = await db
        .select({
          userId: teamMemberships.userId,
          teamId: teamMemberships.teamId,
          teamName: teams.name,
          role: teamMemberships.role,
          joinedAt: teamMemberships.joinedAt,
        })
        .from(teamMemberships)
        .innerJoin(teams, eq(teamMemberships.teamId, teams.id))
        .innerJoin(users, eq(teamMemberships.userId, users.id))
        .where(eq(users.organizationId, orgId));

      // Group memberships by user ID
      const membershipsByUser = new Map<string, typeof allMemberships>();
      for (const membership of allMemberships) {
        const existing = membershipsByUser.get(membership.userId) || [];
        existing.push(membership);
        membershipsByUser.set(membership.userId, existing);
      }

      // Combine users with their memberships
      const membersWithTeams = orgUsers.map(user => ({
        ...user,
        teamMemberships: (membershipsByUser.get(user.id) || []).map(m => ({
          teamId: m.teamId,
          teamName: m.teamName,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
      }));

      return { members: membersWithTeams };
    }
  );
}
