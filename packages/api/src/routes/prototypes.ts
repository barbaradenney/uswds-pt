/**
 * Prototype Routes
 * Team-scoped prototype management
 */

import { FastifyInstance } from 'fastify';
import { eq, desc, and, or, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { prototypes, prototypeVersions, teamMemberships } from '../db/schema.js';
import { getAuthUser } from '../middleware/permissions.js';
import { ROLES, hasPermission, Role } from '../db/roles.js';

interface CreatePrototypeBody {
  name: string;
  description?: string;
  htmlContent?: string;
  grapesData?: Record<string, unknown>;
  teamId: string;
}

interface UpdatePrototypeBody {
  name?: string;
  description?: string;
  htmlContent?: string;
  grapesData?: Record<string, unknown>;
}

interface PrototypeParams {
  slug: string;
}

interface VersionParams extends PrototypeParams {
  version: string;
}

interface ListQuery {
  teamId?: string;
}

/**
 * Check if user is a member of the specified team and get their role
 */
async function getTeamMembership(userId: string, teamId: string) {
  const [membership] = await db
    .select()
    .from(teamMemberships)
    .where(
      and(
        eq(teamMemberships.userId, userId),
        eq(teamMemberships.teamId, teamId)
      )
    )
    .limit(1);

  return membership;
}

/**
 * Check if user can access a prototype (member of its team or creator for legacy)
 */
async function canAccessPrototype(userId: string, prototype: { teamId: string | null; createdBy: string }) {
  // Legacy prototypes without team - only creator can access
  if (!prototype.teamId) {
    return prototype.createdBy === userId;
  }

  // Check team membership
  const membership = await getTeamMembership(userId, prototype.teamId);
  return !!membership;
}

/**
 * Check if user can edit a prototype
 */
async function canEditPrototype(userId: string, prototype: { teamId: string | null; createdBy: string }) {
  // Legacy prototypes without team - only creator can edit
  if (!prototype.teamId) {
    return prototype.createdBy === userId;
  }

  // Check team membership with at least member role
  const membership = await getTeamMembership(userId, prototype.teamId);
  if (!membership) return false;

  // Viewers cannot edit
  return hasPermission(membership.role as Role, ROLES.TEAM_MEMBER);
}

/**
 * Check if user can delete a prototype
 */
async function canDeletePrototype(userId: string, prototype: { teamId: string | null; createdBy: string }) {
  // Creator can always delete their own prototype
  if (prototype.createdBy === userId) {
    return true;
  }

  // Legacy prototypes without team - only creator can delete
  if (!prototype.teamId) {
    return false;
  }

  // Team admins can delete any team prototype
  const membership = await getTeamMembership(userId, prototype.teamId);
  if (!membership) return false;

  return hasPermission(membership.role as Role, ROLES.TEAM_ADMIN);
}

export async function prototypeRoutes(app: FastifyInstance) {
  /**
   * GET /api/prototypes
   * List prototypes for a team (or user's legacy prototypes)
   */
  app.get<{ Querystring: ListQuery }>(
    '/',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = getAuthUser(request).id;
      const { teamId } = request.query;

      if (teamId) {
        // Verify user is a member of the team
        const membership = await getTeamMembership(userId, teamId);
        if (!membership) {
          return reply.status(403).send({ message: 'Not a member of this team' });
        }

        // Get team prototypes
        const items = await db
          .select()
          .from(prototypes)
          .where(eq(prototypes.teamId, teamId))
          .orderBy(desc(prototypes.updatedAt));

        return { prototypes: items };
      }

      // No teamId - return user's legacy prototypes (those without a team)
      // plus prototypes from teams they belong to
      const userMemberships = await db
        .select({ teamId: teamMemberships.teamId })
        .from(teamMemberships)
        .where(eq(teamMemberships.userId, userId));

      const teamIds = userMemberships.map(m => m.teamId);

      let items;
      if (teamIds.length > 0) {
        // Get prototypes from user's teams or created by user (legacy)
        items = await db
          .select()
          .from(prototypes)
          .where(
            or(
              eq(prototypes.createdBy, userId),
              ...teamIds.map(tid => eq(prototypes.teamId, tid))
            )
          )
          .orderBy(desc(prototypes.updatedAt));
      } else {
        // User has no teams, just get their own prototypes
        items = await db
          .select()
          .from(prototypes)
          .where(eq(prototypes.createdBy, userId))
          .orderBy(desc(prototypes.updatedAt));
      }

      return { prototypes: items };
    }
  );

  /**
   * GET /api/prototypes/:slug
   * Get a single prototype by slug
   */
  app.get<{ Params: PrototypeParams }>(
    '/:slug',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const { slug } = request.params;
      const userId = getAuthUser(request).id;

      const [prototype] = await db
        .select()
        .from(prototypes)
        .where(eq(prototypes.slug, slug))
        .limit(1);

      if (!prototype) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Check access
      if (!(await canAccessPrototype(userId, prototype))) {
        return reply.status(403).send({ message: 'Access denied' });
      }

      return prototype;
    }
  );

  /**
   * POST /api/prototypes
   * Create a new prototype
   */
  app.post<{ Body: CreatePrototypeBody }>(
    '/',
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['name', 'teamId'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            htmlContent: { type: 'string' },
            grapesData: { type: 'object' },
            teamId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { name, description, htmlContent, grapesData, teamId } = request.body;
      const userId = getAuthUser(request).id;

      // Verify user is a member of the team with at least member role
      const membership = await getTeamMembership(userId, teamId);
      if (!membership) {
        return reply.status(403).send({ message: 'Not a member of this team' });
      }

      if (!hasPermission(membership.role as Role, ROLES.TEAM_MEMBER)) {
        return reply.status(403).send({ message: 'Viewers cannot create prototypes' });
      }

      const slug = nanoid(10);

      const [prototype] = await db
        .insert(prototypes)
        .values({
          slug,
          name,
          description,
          htmlContent: htmlContent || '',
          grapesData: grapesData || {},
          teamId,
          createdBy: userId,
        })
        .returning();

      return prototype;
    }
  );

  /**
   * PUT /api/prototypes/:slug
   * Update a prototype (creates a version snapshot)
   */
  app.put<{ Params: PrototypeParams; Body: UpdatePrototypeBody }>(
    '/:slug',
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            htmlContent: { type: 'string' },
            grapesData: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;
      const { name, description, htmlContent, grapesData } = request.body;
      const userId = getAuthUser(request).id;

      // Get current prototype
      const [current] = await db
        .select()
        .from(prototypes)
        .where(eq(prototypes.slug, slug))
        .limit(1);

      if (!current) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Check edit permission
      if (!(await canEditPrototype(userId, current))) {
        return reply.status(403).send({ message: 'Access denied' });
      }

      // Get the last version number
      const [lastVersion] = await db
        .select({ versionNumber: prototypeVersions.versionNumber })
        .from(prototypeVersions)
        .where(eq(prototypeVersions.prototypeId, current.id))
        .orderBy(desc(prototypeVersions.versionNumber))
        .limit(1);

      const newVersionNumber = (lastVersion?.versionNumber || 0) + 1;

      // Create version snapshot of current state
      await db.insert(prototypeVersions).values({
        prototypeId: current.id,
        versionNumber: newVersionNumber,
        htmlContent: current.htmlContent,
        grapesData: current.grapesData,
        createdBy: userId,
      });

      // Update prototype
      const [updated] = await db
        .update(prototypes)
        .set({
          name: name ?? current.name,
          description: description ?? current.description,
          htmlContent: htmlContent ?? current.htmlContent,
          grapesData: grapesData ?? current.grapesData,
          updatedAt: new Date(),
        })
        .where(eq(prototypes.id, current.id))
        .returning();

      return updated;
    }
  );

  /**
   * DELETE /api/prototypes/:slug
   * Delete a prototype
   */
  app.delete<{ Params: PrototypeParams }>(
    '/:slug',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const { slug } = request.params;
      const userId = getAuthUser(request).id;

      // Get prototype
      const [prototype] = await db
        .select()
        .from(prototypes)
        .where(eq(prototypes.slug, slug))
        .limit(1);

      if (!prototype) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Check delete permission
      if (!(await canDeletePrototype(userId, prototype))) {
        return reply.status(403).send({ message: 'Access denied' });
      }

      await db.delete(prototypes).where(eq(prototypes.id, prototype.id));

      return { success: true };
    }
  );

  /**
   * GET /api/prototypes/:slug/versions
   * Get version history for a prototype
   */
  app.get<{ Params: PrototypeParams }>(
    '/:slug/versions',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const { slug } = request.params;
      const userId = getAuthUser(request).id;

      // Get prototype
      const [prototype] = await db
        .select()
        .from(prototypes)
        .where(eq(prototypes.slug, slug))
        .limit(1);

      if (!prototype) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Check access
      if (!(await canAccessPrototype(userId, prototype))) {
        return reply.status(403).send({ message: 'Access denied' });
      }

      // Get versions
      const versions = await db
        .select({
          id: prototypeVersions.id,
          versionNumber: prototypeVersions.versionNumber,
          createdAt: prototypeVersions.createdAt,
        })
        .from(prototypeVersions)
        .where(eq(prototypeVersions.prototypeId, prototype.id))
        .orderBy(desc(prototypeVersions.versionNumber));

      return { versions };
    }
  );

  /**
   * POST /api/prototypes/:slug/versions/:version/restore
   * Restore a prototype to a specific version
   */
  app.post<{ Params: VersionParams }>(
    '/:slug/versions/:version/restore',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const { slug, version } = request.params;
      const userId = getAuthUser(request).id;
      const versionNumber = parseInt(version, 10);

      if (isNaN(versionNumber)) {
        return reply.status(400).send({ message: 'Invalid version number' });
      }

      // Get prototype
      const [prototype] = await db
        .select()
        .from(prototypes)
        .where(eq(prototypes.slug, slug))
        .limit(1);

      if (!prototype) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Check edit permission
      if (!(await canEditPrototype(userId, prototype))) {
        return reply.status(403).send({ message: 'Access denied' });
      }

      // Get the version to restore
      const [versionData] = await db
        .select()
        .from(prototypeVersions)
        .where(
          and(
            eq(prototypeVersions.prototypeId, prototype.id),
            eq(prototypeVersions.versionNumber, versionNumber)
          )
        )
        .limit(1);

      if (!versionData) {
        return reply.status(404).send({ message: 'Version not found' });
      }

      // Create a new version with current state before restoring
      const [lastVersion] = await db
        .select({ versionNumber: prototypeVersions.versionNumber })
        .from(prototypeVersions)
        .where(eq(prototypeVersions.prototypeId, prototype.id))
        .orderBy(desc(prototypeVersions.versionNumber))
        .limit(1);

      await db.insert(prototypeVersions).values({
        prototypeId: prototype.id,
        versionNumber: (lastVersion?.versionNumber || 0) + 1,
        htmlContent: prototype.htmlContent,
        grapesData: prototype.grapesData,
        createdBy: userId,
      });

      // Restore the version
      const [updated] = await db
        .update(prototypes)
        .set({
          htmlContent: versionData.htmlContent || '',
          grapesData: versionData.grapesData || {},
          updatedAt: new Date(),
        })
        .where(eq(prototypes.id, prototype.id))
        .returning();

      return updated;
    }
  );
}
