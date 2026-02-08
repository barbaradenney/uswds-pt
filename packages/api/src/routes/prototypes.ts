/**
 * Prototype Routes
 * Team-scoped prototype management
 */

import { FastifyInstance } from 'fastify';
import { eq, desc, and, or, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { CreatePrototypeBody, UpdatePrototypeBody } from '@uswds-pt/shared';
import { db } from '../db/index.js';
import { prototypes, prototypeVersions, teamMemberships } from '../db/schema.js';
import { getAuthUser } from '../middleware/permissions.js';
import { ROLES, hasPermission, Role } from '../db/roles.js';

/**
 * Normalize GrapesJS project data to ensure consistent structure
 * This fixes issues where new prototypes don't have properly initialized pages
 */
function normalizeGrapesData(data: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return {
      pages: [],
      styles: [],
      assets: [],
    };
  }

  const normalized: Record<string, unknown> = { ...data };

  // Ensure pages is always an array
  if (!normalized.pages || !Array.isArray(normalized.pages)) {
    normalized.pages = [];
  }

  // Ensure styles is always an array
  if (!normalized.styles || !Array.isArray(normalized.styles)) {
    normalized.styles = [];
  }

  // Ensure assets is always an array
  if (!normalized.assets || !Array.isArray(normalized.assets)) {
    normalized.assets = [];
  }

  return normalized;
}

// Max serialized size for grapesData (5MB)
const MAX_GRAPES_DATA_SIZE = 5 * 1024 * 1024;

/**
 * Validate grapesData shape and size.
 * Uses Fastify's bodyLimit for primary byte-size enforcement;
 * this is a secondary check using Buffer.byteLength for accuracy.
 */
function validateGrapesData(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;

  // Check serialized byte size (accurate for multi-byte chars)
  const byteSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
  if (byteSize > MAX_GRAPES_DATA_SIZE) {
    return `grapesData exceeds maximum size of ${MAX_GRAPES_DATA_SIZE / (1024 * 1024)}MB`;
  }

  // Validate expected shape: pages should be an array if present
  if ('pages' in data && !Array.isArray(data.pages)) {
    return 'grapesData.pages must be an array';
  }

  return null;
}

interface PrototypeParams {
  slug: string;
}

interface VersionParams extends PrototypeParams {
  version: string;
}

interface ListQuery {
  teamId?: string;
  page?: string;
  limit?: string;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

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

      // Parse pagination params
      const page = Math.max(1, parseInt(request.query.page || '1', 10) || 1);
      const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(request.query.limit || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
      const offset = (page - 1) * limit;

      if (teamId) {
        // Verify user is a member of the team
        const membership = await getTeamMembership(userId, teamId);
        if (!membership) {
          return reply.status(403).send({ message: 'Not a member of this team' });
        }

        const whereClause = eq(prototypes.teamId, teamId);

        // Get total count
        const [{ total }] = await db
          .select({ total: count() })
          .from(prototypes)
          .where(whereClause);

        // Get paginated team prototypes
        const items = await db
          .select()
          .from(prototypes)
          .where(whereClause)
          .orderBy(desc(prototypes.updatedAt))
          .limit(limit)
          .offset(offset);

        return { prototypes: items, total: Number(total), page, limit };
      }

      // No teamId - return user's legacy prototypes (those without a team)
      // plus prototypes from teams they belong to
      const userMemberships = await db
        .select({ teamId: teamMemberships.teamId })
        .from(teamMemberships)
        .where(eq(teamMemberships.userId, userId));

      const teamIds = userMemberships.map(m => m.teamId);

      const whereClause = teamIds.length > 0
        ? or(
            eq(prototypes.createdBy, userId),
            ...teamIds.map(tid => eq(prototypes.teamId, tid))
          )
        : eq(prototypes.createdBy, userId);

      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(prototypes)
        .where(whereClause);

      // Get paginated items
      const items = await db
        .select()
        .from(prototypes)
        .where(whereClause)
        .orderBy(desc(prototypes.updatedAt))
        .limit(limit)
        .offset(offset);

      return { prototypes: items, total: Number(total), page, limit };
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
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 1000 },
            htmlContent: { type: 'string', maxLength: 2_097_152 }, // 2MB
            grapesData: { type: 'object' },
            teamId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { description, htmlContent, grapesData, teamId } = request.body;
      const name = request.body.name.trim();
      if (!name) {
        return reply.status(400).send({ message: 'Name cannot be empty' });
      }
      const userId = getAuthUser(request).id;

      // Verify user is a member of the team with at least member role
      const membership = await getTeamMembership(userId, teamId);
      if (!membership) {
        return reply.status(403).send({ message: 'Not a member of this team' });
      }

      if (!hasPermission(membership.role as Role, ROLES.TEAM_MEMBER)) {
        return reply.status(403).send({ message: 'Viewers cannot create prototypes' });
      }

      // Validate grapesData size and shape
      const grapesError = validateGrapesData(grapesData);
      if (grapesError) {
        return reply.status(400).send({ message: grapesError });
      }

      const slug = nanoid(10);

      const [prototype] = await db
        .insert(prototypes)
        .values({
          slug,
          name,
          description,
          htmlContent: htmlContent || '',
          grapesData: normalizeGrapesData(grapesData),
          teamId,
          createdBy: userId,
        })
        .returning();

      return reply.status(201).send(prototype);
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
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 1000 },
            htmlContent: { type: 'string', maxLength: 2_097_152 }, // 2MB
            grapesData: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;
      const { description, htmlContent, grapesData } = request.body;
      const name = request.body.name?.trim();
      if (name !== undefined && !name) {
        return reply.status(400).send({ message: 'Name cannot be empty' });
      }
      const userId = getAuthUser(request).id;

      // Get current prototype (for auth check + optimistic concurrency pre-check)
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

      // Validate grapesData size and shape
      const grapesError = validateGrapesData(grapesData);
      if (grapesError) {
        return reply.status(400).send({ message: grapesError });
      }

      // Optimistic concurrency check via If-Match header (early rejection)
      const ifMatch = request.headers['if-match'];
      if (ifMatch) {
        const expectedVersion = parseInt(ifMatch, 10);
        if (!isNaN(expectedVersion) && current.version !== expectedVersion) {
          return reply.status(409).send({
            message: 'This prototype was modified by another session',
            serverVersion: current.version,
            yourVersion: expectedVersion,
          });
        }
      }

      // Wrap everything in a transaction to prevent TOCTOU races.
      // Re-read the prototype inside the transaction so the version snapshot
      // captures the actual current state, not a potentially stale read.
      let updated;
      try {
        updated = await db.transaction(async (tx) => {
          // Re-read inside transaction to get fresh state for snapshot
          const [fresh] = await tx
            .select()
            .from(prototypes)
            .where(eq(prototypes.id, current.id))
            .limit(1);

          if (!fresh) {
            throw new Error('CONCURRENT_MODIFICATION');
          }

          // Get the last version number
          const [lastVersion] = await tx
            .select({ versionNumber: prototypeVersions.versionNumber })
            .from(prototypeVersions)
            .where(eq(prototypeVersions.prototypeId, fresh.id))
            .orderBy(desc(prototypeVersions.versionNumber))
            .limit(1);

          const newVersionNumber = (lastVersion?.versionNumber || 0) + 1;

          // Create version snapshot of current state (uses fresh read)
          await tx.insert(prototypeVersions).values({
            prototypeId: fresh.id,
            versionNumber: newVersionNumber,
            htmlContent: fresh.htmlContent,
            grapesData: fresh.grapesData,
            createdBy: userId,
          });

          // Update prototype with version in WHERE to prevent race conditions
          const [result] = await tx
            .update(prototypes)
            .set({
              name: name ?? fresh.name,
              description: description ?? fresh.description,
              htmlContent: htmlContent ?? fresh.htmlContent,
              grapesData: grapesData ? normalizeGrapesData(grapesData) : fresh.grapesData,
              updatedAt: new Date(),
              version: fresh.version + 1,
            })
            .where(and(eq(prototypes.id, fresh.id), eq(prototypes.version, fresh.version)))
            .returning();

          if (!result) {
            throw new Error('CONCURRENT_MODIFICATION');
          }

          return result;
        });
      } catch (err: any) {
        if (err?.message === 'CONCURRENT_MODIFICATION') {
          return reply.status(409).send({
            message: 'This prototype was modified concurrently. Please reload and try again.',
          });
        }
        throw err;
      }

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
  app.get<{ Params: PrototypeParams; Querystring: { page?: string; limit?: string } }>(
    '/:slug/versions',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const { slug } = request.params;
      const userId = getAuthUser(request).id;

      // Parse pagination params
      const page = Math.max(1, parseInt(request.query.page || '1', 10) || 1);
      const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(request.query.limit || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
      const offset = (page - 1) * limit;

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

      const whereClause = eq(prototypeVersions.prototypeId, prototype.id);

      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(prototypeVersions)
        .where(whereClause);

      // Get paginated versions
      const versions = await db
        .select({
          id: prototypeVersions.id,
          versionNumber: prototypeVersions.versionNumber,
          createdAt: prototypeVersions.createdAt,
        })
        .from(prototypeVersions)
        .where(whereClause)
        .orderBy(desc(prototypeVersions.versionNumber))
        .limit(limit)
        .offset(offset);

      return { versions, total: Number(total), page, limit };
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

      // Wrap in transaction with version check to prevent race conditions
      let updated;
      try {
        updated = await db.transaction(async (tx) => {
          // Re-read prototype inside transaction to avoid TOCTOU
          const [fresh] = await tx
            .select()
            .from(prototypes)
            .where(eq(prototypes.id, prototype.id))
            .limit(1);

          if (!fresh) {
            throw new Error('CONCURRENT_MODIFICATION');
          }

          const [lastVersion] = await tx
            .select({ versionNumber: prototypeVersions.versionNumber })
            .from(prototypeVersions)
            .where(eq(prototypeVersions.prototypeId, fresh.id))
            .orderBy(desc(prototypeVersions.versionNumber))
            .limit(1);

          await tx.insert(prototypeVersions).values({
            prototypeId: fresh.id,
            versionNumber: (lastVersion?.versionNumber || 0) + 1,
            htmlContent: fresh.htmlContent,
            grapesData: fresh.grapesData,
            createdBy: userId,
          });

          const [result] = await tx
            .update(prototypes)
            .set({
              htmlContent: versionData.htmlContent || '',
              grapesData: versionData.grapesData || {},
              updatedAt: new Date(),
              version: fresh.version + 1,
            })
            .where(and(eq(prototypes.id, fresh.id), eq(prototypes.version, fresh.version)))
            .returning();

          if (!result) {
            throw new Error('CONCURRENT_MODIFICATION');
          }

          return result;
        });
      } catch (err: any) {
        if (err?.message === 'CONCURRENT_MODIFICATION') {
          return reply.status(409).send({
            message: 'This version was modified concurrently. Please reload and try again.',
          });
        }
        throw err;
      }

      return updated;
    }
  );

  /**
   * POST /api/prototypes/:slug/duplicate
   * Duplicate a prototype
   */
  app.post<{ Params: PrototypeParams }>(
    '/:slug/duplicate',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const { slug } = request.params;
      const userId = getAuthUser(request).id;

      try {
        // Get the original prototype
        const [original] = await db
          .select()
          .from(prototypes)
          .where(eq(prototypes.slug, slug))
          .limit(1);

        if (!original) {
          return reply.status(404).send({ message: 'Prototype not found' });
        }

        // Check access (user must be able to view the original)
        if (!(await canAccessPrototype(userId, original))) {
          return reply.status(403).send({ message: 'Access denied' });
        }

        // For team prototypes, check that user can create in that team
        if (original.teamId) {
          const membership = await getTeamMembership(userId, original.teamId);
          if (!membership || !hasPermission(membership.role as Role, ROLES.TEAM_MEMBER)) {
            return reply.status(403).send({ message: 'Cannot create prototypes in this team' });
          }
        }

        // Create new slug and name
        const newSlug = nanoid(10);
        const newName = `Copy of ${original.name}`;

        // Create the duplicate - ensure grapesData has a default value
        const [duplicate] = await db
          .insert(prototypes)
          .values({
            slug: newSlug,
            name: newName,
            description: original.description,
            htmlContent: original.htmlContent || '',
            grapesData: original.grapesData || {},
            teamId: original.teamId,
            createdBy: userId,
          })
          .returning();

        return reply.status(201).send(duplicate);
      } catch (error) {
        console.error('Failed to duplicate prototype:', error);
        return reply.status(500).send({ message: 'Failed to duplicate prototype' });
      }
    }
  );
}
