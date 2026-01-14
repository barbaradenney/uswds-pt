/**
 * Team Routes
 * Handles team management endpoints
 */

import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { teams, teamMemberships, users, organizations } from '../db/schema.js';
import { ROLES, canAssignRole, Role } from '../db/roles.js';
import {
  getAuthUser,
  requireOrgAdmin,
  requireTeamMember,
  requireTeamRole,
} from '../middleware/permissions.js';

interface CreateTeamBody {
  name: string;
  slug: string;
  description?: string;
}

interface UpdateTeamBody {
  name?: string;
  description?: string;
}

interface AddMemberBody {
  userId: string;
  role?: string;
}

interface UpdateMemberBody {
  role: string;
}

// Helper to generate a slug from a name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

export async function teamRoutes(app: FastifyInstance) {
  /**
   * GET /api/teams
   * List all teams the current user belongs to
   */
  app.get(
    '/',
    {
      preHandler: [app.authenticate],
    },
    async (request, _reply) => {
      const authUser = getAuthUser(request);

      const userTeams = await db
        .select({
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
          description: teams.description,
          organizationId: teams.organizationId,
          createdAt: teams.createdAt,
          updatedAt: teams.updatedAt,
          role: teamMemberships.role,
          joinedAt: teamMemberships.joinedAt,
        })
        .from(teamMemberships)
        .innerJoin(teams, eq(teamMemberships.teamId, teams.id))
        .where(eq(teamMemberships.userId, authUser.id));

      return { teams: userTeams };
    }
  );

  /**
   * POST /api/teams
   * Create a new team (org_admin only)
   */
  app.post<{ Body: CreateTeamBody }>(
    '/',
    {
      preHandler: [app.authenticate, requireOrgAdmin],
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            slug: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { name, slug, description } = request.body;
      const organizationId = request.userOrganizationId;

      if (!organizationId) {
        return reply.status(400).send({ error: 'Organization not found' });
      }

      const teamSlug = slug || generateSlug(name);

      // Check if slug already exists in this organization
      const [existingTeam] = await db
        .select()
        .from(teams)
        .where(
          and(
            eq(teams.organizationId, organizationId),
            eq(teams.slug, teamSlug)
          )
        )
        .limit(1);

      if (existingTeam) {
        return reply.status(400).send({ message: 'Team with this slug already exists' });
      }

      // Create the team
      const [newTeam] = await db
        .insert(teams)
        .values({
          organizationId,
          name,
          slug: teamSlug,
          description,
        })
        .returning();

      // Add the creator as team_admin
      await db.insert(teamMemberships).values({
        teamId: newTeam.id,
        userId: authUser.id,
        role: ROLES.TEAM_ADMIN,
      });

      return newTeam;
    }
  );

  /**
   * GET /api/teams/:teamId
   * Get team details (team members only)
   */
  app.get<{ Params: { teamId: string } }>(
    '/:teamId',
    {
      preHandler: [app.authenticate, requireTeamMember('teamId')],
    },
    async (request, reply) => {
      const { teamId } = request.params;

      const [team] = await db
        .select({
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
          description: teams.description,
          organizationId: teams.organizationId,
          createdAt: teams.createdAt,
          updatedAt: teams.updatedAt,
        })
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);

      if (!team) {
        return reply.status(404).send({ message: 'Team not found' });
      }

      // Include organization info
      const [org] = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
        })
        .from(organizations)
        .where(eq(organizations.id, team.organizationId))
        .limit(1);

      return {
        ...team,
        organization: org,
        userRole: request.teamMembership?.role,
      };
    }
  );

  /**
   * PUT /api/teams/:teamId
   * Update team details (team_admin only)
   */
  app.put<{ Params: { teamId: string }; Body: UpdateTeamBody }>(
    '/:teamId',
    {
      preHandler: [
        app.authenticate,
        requireTeamMember('teamId'),
        requireTeamRole(ROLES.TEAM_ADMIN),
      ],
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { teamId } = request.params;
      const { name, description } = request.body;

      const updateData: Partial<typeof teams.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;

      const [updated] = await db
        .update(teams)
        .set(updateData)
        .where(eq(teams.id, teamId))
        .returning();

      if (!updated) {
        return reply.status(404).send({ message: 'Team not found' });
      }

      return updated;
    }
  );

  /**
   * DELETE /api/teams/:teamId
   * Delete a team (org_admin only)
   */
  app.delete<{ Params: { teamId: string } }>(
    '/:teamId',
    {
      preHandler: [app.authenticate, requireOrgAdmin],
    },
    async (request, reply) => {
      const { teamId } = request.params;

      // Verify team belongs to user's organization
      const [team] = await db
        .select({ organizationId: teams.organizationId })
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);

      if (!team) {
        return reply.status(404).send({ message: 'Team not found' });
      }

      if (team.organizationId !== request.userOrganizationId) {
        return reply.status(403).send({ message: 'Cannot delete team from another organization' });
      }

      await db.delete(teams).where(eq(teams.id, teamId));

      return { message: 'Team deleted successfully' };
    }
  );

  /**
   * GET /api/teams/:teamId/members
   * List team members (team members only)
   */
  app.get<{ Params: { teamId: string } }>(
    '/:teamId/members',
    {
      preHandler: [app.authenticate, requireTeamMember('teamId')],
    },
    async (request, _reply) => {
      const { teamId } = request.params;

      const members = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: teamMemberships.role,
          joinedAt: teamMemberships.joinedAt,
        })
        .from(teamMemberships)
        .innerJoin(users, eq(teamMemberships.userId, users.id))
        .where(eq(teamMemberships.teamId, teamId));

      return { members };
    }
  );

  /**
   * POST /api/teams/:teamId/members
   * Add a member to the team (team_admin only)
   */
  app.post<{ Params: { teamId: string }; Body: AddMemberBody }>(
    '/:teamId/members',
    {
      preHandler: [
        app.authenticate,
        requireTeamMember('teamId'),
        requireTeamRole(ROLES.TEAM_ADMIN),
      ],
      schema: {
        body: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            role: { type: 'string', enum: Object.values(ROLES) },
          },
        },
      },
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { teamId } = request.params;
      const { userId, role = ROLES.TEAM_MEMBER } = request.body;

      // Check if user can assign this role
      const userRole = request.teamMembership?.role as Role;
      if (!canAssignRole(userRole, role as Role)) {
        return reply.status(403).send({ message: 'Cannot assign a role higher than your own' });
      }

      // Check if user exists and is in the same organization
      const [team] = await db
        .select({ organizationId: teams.organizationId })
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);

      const [targetUser] = await db
        .select({ organizationId: users.organizationId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetUser) {
        return reply.status(404).send({ message: 'User not found' });
      }

      if (targetUser.organizationId !== team?.organizationId) {
        return reply.status(400).send({ message: 'User must be in the same organization' });
      }

      // Check if already a member
      const [existingMembership] = await db
        .select()
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, teamId),
            eq(teamMemberships.userId, userId)
          )
        )
        .limit(1);

      if (existingMembership) {
        return reply.status(400).send({ message: 'User is already a member of this team' });
      }

      // Add member
      const [membership] = await db
        .insert(teamMemberships)
        .values({
          teamId,
          userId,
          role,
          invitedBy: authUser.id,
        })
        .returning();

      return membership;
    }
  );

  /**
   * PUT /api/teams/:teamId/members/:userId
   * Update a member's role (team_admin only)
   */
  app.put<{ Params: { teamId: string; userId: string }; Body: UpdateMemberBody }>(
    '/:teamId/members/:userId',
    {
      preHandler: [
        app.authenticate,
        requireTeamMember('teamId'),
        requireTeamRole(ROLES.TEAM_ADMIN),
      ],
      schema: {
        body: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: Object.values(ROLES) },
          },
        },
      },
    },
    async (request, reply) => {
      const { teamId, userId } = request.params;
      const { role } = request.body;

      // Check if user can assign this role
      const userRole = request.teamMembership?.role as Role;
      if (!canAssignRole(userRole, role as Role)) {
        return reply.status(403).send({ message: 'Cannot assign a role higher than your own' });
      }

      const [updated] = await db
        .update(teamMemberships)
        .set({ role })
        .where(
          and(
            eq(teamMemberships.teamId, teamId),
            eq(teamMemberships.userId, userId)
          )
        )
        .returning();

      if (!updated) {
        return reply.status(404).send({ message: 'Membership not found' });
      }

      return updated;
    }
  );

  /**
   * DELETE /api/teams/:teamId/members/:userId
   * Remove a member from the team (team_admin only)
   */
  app.delete<{ Params: { teamId: string; userId: string } }>(
    '/:teamId/members/:userId',
    {
      preHandler: [
        app.authenticate,
        requireTeamMember('teamId'),
        requireTeamRole(ROLES.TEAM_ADMIN),
      ],
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { teamId, userId } = request.params;

      // Cannot remove yourself
      if (userId === authUser.id) {
        return reply.status(400).send({ message: 'Cannot remove yourself from the team' });
      }

      // Check target user's role
      const [targetMembership] = await db
        .select({ role: teamMemberships.role })
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, teamId),
            eq(teamMemberships.userId, userId)
          )
        )
        .limit(1);

      if (!targetMembership) {
        return reply.status(404).send({ message: 'Membership not found' });
      }

      // Check if user can remove this member
      const userRole = request.teamMembership?.role as Role;
      if (!canAssignRole(userRole, targetMembership.role as Role)) {
        return reply.status(403).send({ message: 'Cannot remove a member with equal or higher role' });
      }

      await db
        .delete(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, teamId),
            eq(teamMemberships.userId, userId)
          )
        );

      return { message: 'Member removed successfully' };
    }
  );
}
