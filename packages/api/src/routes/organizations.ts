/**
 * Organization Routes
 * Handles organization management endpoints
 */

import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import type { UpdateOrgBody } from '@uswds-pt/shared';
import { db } from '../db/index.js';
import { organizations, users, teams, teamMemberships } from '../db/schema.js';
import { ROLES } from '../db/roles.js';
import { requireOrgAdmin, loadUserOrganization, getAuthUser } from '../middleware/permissions.js';

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

      // Wrap entire setup in a transaction to prevent duplicate creation on concurrent requests
      let result;
      try {
        result = await db.transaction(async (tx) => {
        // Re-read user inside transaction for consistency
        const [freshUser] = await tx
          .select({ organizationId: users.organizationId, email: users.email })
          .from(users)
          .where(eq(users.id, authUser.id))
          .limit(1);

        if (!freshUser) {
          throw { statusCode: 404, message: 'User not found' };
        }

        let orgId = freshUser.organizationId;

        // If user doesn't have an organization, create one
        if (!orgId) {
          const orgSlug = `org-${authUser.id.substring(0, 8)}`;
          const emailPrefix = freshUser.email.split('@')[0].replace(/[<>"'&]/g, '');
          const [newOrg] = await tx
            .insert(organizations)
            .values({
              name: `${emailPrefix}'s Organization`,
              slug: orgSlug,
              description: 'Personal organization',
            })
            .returning();

          orgId = newOrg.id;

          // Update user with organization
          await tx
            .update(users)
            .set({ organizationId: newOrg.id })
            .where(eq(users.id, authUser.id));
        }

        // Check if user already has teams in this org
        const existingTeams = await tx
          .select({ id: teams.id })
          .from(teams)
          .innerJoin(teamMemberships, eq(teams.id, teamMemberships.teamId))
          .where(eq(teamMemberships.userId, authUser.id))
          .limit(1);

        if (existingTeams.length > 0) {
          throw { statusCode: 400, message: 'User already has a team' };
        }

        // Create the team
        const teamSlug = teamName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 100);

        const [team] = await tx
          .insert(teams)
          .values({
            organizationId: orgId,
            name: teamName,
            slug: teamSlug || 'general',
          })
          .returning();

        // Add user as org_admin
        await tx.insert(teamMemberships).values({
          teamId: team.id,
          userId: authUser.id,
          role: ROLES.ORG_ADMIN,
        });

        // Get the organization for the response
        const [org] = await tx
          .select()
          .from(organizations)
          .where(eq(organizations.id, orgId))
          .limit(1);

        return {
          organization: org,
          team: {
            ...team,
            role: ROLES.ORG_ADMIN,
          },
        };
        });
      } catch (err: any) {
        if (err?.statusCode) {
          return reply.status(err.statusCode).send({ message: err.message });
        }
        throw err;
      }

      return result;
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
          stateDefinitions: organizations.stateDefinitions,
          userDefinitions: organizations.userDefinitions,
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
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 5000 },
            logoUrl: { type: 'string', maxLength: 500, pattern: '^https?://' },
            stateDefinitions: {
              type: 'array',
              maxItems: 50,
              items: {
                type: 'object',
                required: ['id', 'name'],
                additionalProperties: false,
                properties: {
                  id: { type: 'string', minLength: 1, maxLength: 100 },
                  name: { type: 'string', minLength: 1, maxLength: 255 },
                },
              },
            },
            userDefinitions: {
              type: 'array',
              maxItems: 50,
              items: {
                type: 'object',
                required: ['id', 'name'],
                additionalProperties: false,
                properties: {
                  id: { type: 'string', minLength: 1, maxLength: 100 },
                  name: { type: 'string', minLength: 1, maxLength: 255 },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { orgId } = request.params;
      const { name, description, logoUrl, stateDefinitions, userDefinitions } = request.body;

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
      if (stateDefinitions !== undefined) updateData.stateDefinitions = stateDefinitions;
      if (userDefinitions !== undefined) updateData.userDefinitions = userDefinitions;

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
          stateDefinitions: organizations.stateDefinitions,
          userDefinitions: organizations.userDefinitions,
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
