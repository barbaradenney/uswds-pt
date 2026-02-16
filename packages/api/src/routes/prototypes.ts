/**
 * Prototype Routes
 * Team-scoped prototype management (CRUD + duplicate)
 *
 * Version and push routes are in separate modules:
 * - prototype-versions.ts  (version history, restore, compare, label)
 * - prototype-push.ts      (GitHub push and handoff)
 */

import { FastifyInstance } from 'fastify';
import { eq, desc, and, or, lte, count, ilike } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { CreatePrototypeBody, UpdatePrototypeBody } from '@uswds-pt/shared';
import { computeContentChecksum, toBranchSlug } from '@uswds-pt/shared';
import { db } from '../db/index.js';
import { prototypes, prototypeVersions, teamMemberships } from '../db/schema.js';
import { getAuthUser } from '../middleware/permissions.js';
import { ROLES, hasPermission, Role } from '../db/roles.js';
import {
  normalizeGrapesData,
  validateGrapesData,
  getTeamMembership,
  canEditPrototype,
  canDeletePrototype,
  isNameTaken,
  prototypeListColumns,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from './prototype-helpers.js';
import type { PrototypeParams, ListQuery } from './prototype-helpers.js';

export async function prototypeRoutes(app: FastifyInstance) {
  /**
   * Insert a prototype, retrying with a nanoid suffix on branch-slug uniqueness collisions.
   * Uses PostgreSQL error code 23505 (unique_violation) for reliable detection.
   */
  async function insertWithBranchSlug(
    tx: typeof db,
    values: Record<string, unknown>,
    maxRetries = 3
  ): Promise<typeof prototypes.$inferSelect> {
    let currentBranchSlug = values.branchSlug as string;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const [result] = await tx
          .insert(prototypes)
          .values({ ...values, branchSlug: currentBranchSlug } as typeof prototypes.$inferInsert)
          .returning();
        return result;
      } catch (error: unknown) {
        const isUniqueViolation = typeof error === 'object' && error !== null && (error as Record<string, unknown>).code === '23505';
        if (isUniqueViolation && attempt < maxRetries - 1) {
          currentBranchSlug = `${values.branchSlug as string}-${nanoid(4)}`;
          continue;
        }
        throw error;
      }
    }
    // Should not be reached, but satisfies TypeScript
    throw new Error('insertWithBranchSlug: exceeded max retries');
  }

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

        const items = await db
          .select(prototypeListColumns)
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

      const items = await db
        .select(prototypeListColumns)
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

      // Single query: fetch prototype + check team membership via JOIN
      const [result] = await db
        .select({
          prototype: prototypes,
          memberRole: teamMemberships.role,
        })
        .from(prototypes)
        .leftJoin(teamMemberships, and(
          eq(teamMemberships.teamId, prototypes.teamId),
          eq(teamMemberships.userId, userId),
        ))
        .where(eq(prototypes.slug, slug))
        .limit(1);

      if (!result) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Check access: team member, or creator of legacy (no-team) prototype
      const { prototype, memberRole } = result;
      if (!memberRole && !(prototype.teamId === null && prototype.createdBy === userId)) {
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

      // Check for duplicate name within the team
      if (await isNameTaken(teamId, name)) {
        return reply.status(409).send({
          message: `A prototype named "${name}" already exists in this team`,
        });
      }

      // Validate grapesData size and shape
      const grapesError = validateGrapesData(grapesData);
      if (grapesError) {
        return reply.status(400).send({ message: grapesError });
      }

      const slug = nanoid(10);
      const branchSlug = toBranchSlug(name);

      const normalizedData = normalizeGrapesData(grapesData);
      const contentChecksum = await computeContentChecksum(
        htmlContent || '',
        normalizedData
      );

      const prototype = await insertWithBranchSlug(db, {
        slug,
        name,
        description,
        htmlContent: htmlContent || '',
        grapesData: normalizedData,
        teamId,
        createdBy: userId,
        contentChecksum,
        branchSlug,
      });

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

      // Check for duplicate name when renaming
      if (name && name !== current.name && current.teamId) {
        if (await isNameTaken(current.teamId, name, slug)) {
          return reply.status(409).send({
            message: `A prototype named "${name}" already exists in this team`,
          });
        }
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
        // Compute checksum for the new content
        const newHtml = htmlContent ?? current.htmlContent;
        const newGrapesData = grapesData ? normalizeGrapesData(grapesData) : (current.grapesData as Record<string, unknown>);
        const contentChecksum = await computeContentChecksum(newHtml, newGrapesData);

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
            contentChecksum: fresh.contentChecksum,
            createdBy: userId,
          });

          // Update prototype with version in WHERE to prevent race conditions
          const [result] = await tx
            .update(prototypes)
            .set({
              name: name ?? fresh.name,
              description: description ?? fresh.description,
              htmlContent: newHtml,
              grapesData: newGrapesData,
              updatedAt: new Date(),
              version: fresh.version + 1,
              contentChecksum,
            })
            .where(and(eq(prototypes.id, fresh.id), eq(prototypes.version, fresh.version)))
            .returning();

          if (!result) {
            throw new Error('CONCURRENT_MODIFICATION');
          }

          // Prune old versions — keep at most 50 per prototype
          const MAX_VERSIONS = 50;
          if (newVersionNumber > MAX_VERSIONS) {
            const [cutoff] = await tx
              .select({ versionNumber: prototypeVersions.versionNumber })
              .from(prototypeVersions)
              .where(eq(prototypeVersions.prototypeId, fresh.id))
              .orderBy(desc(prototypeVersions.versionNumber))
              .offset(MAX_VERSIONS)
              .limit(1);

            if (cutoff) {
              await tx
                .delete(prototypeVersions)
                .where(
                  and(
                    eq(prototypeVersions.prototypeId, fresh.id),
                    lte(prototypeVersions.versionNumber, cutoff.versionNumber)
                  )
                );
            }
          }

          return result;
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'CONCURRENT_MODIFICATION') {
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

        // Check access and create permission in a single membership query
        if (!original.teamId) {
          // Legacy prototypes without team — only creator can access/duplicate
          if (original.createdBy !== userId) {
            return reply.status(403).send({ message: 'Access denied' });
          }
        } else {
          const membership = await getTeamMembership(userId, original.teamId);
          if (!membership) {
            return reply.status(403).send({ message: 'Access denied' });
          }
          if (!hasPermission(membership.role as Role, ROLES.TEAM_MEMBER)) {
            return reply.status(403).send({ message: 'Cannot create prototypes in this team' });
          }
        }

        // Create new slug and name, auto-resolving collisions with a single query
        const newSlug = nanoid(10);
        const copyPrefix = `Copy of ${original.name}`;
        let newName = copyPrefix;

        if (original.teamId) {
          // Fetch all existing names matching "Copy of <name>%" in one query.
          // Escape LIKE special characters (%, _) in the prefix so they match literally.
          const escapedPrefix = copyPrefix.replace(/%/g, '\\%').replace(/_/g, '\\_');
          const existingNames = await db
            .select({ name: prototypes.name })
            .from(prototypes)
            .where(
              and(
                eq(prototypes.teamId, original.teamId),
                ilike(prototypes.name, `${escapedPrefix}%`)
              )
            );

          if (existingNames.length > 0) {
            const lowerNames = new Set(existingNames.map(r => r.name.toLowerCase()));

            if (lowerNames.has(copyPrefix.toLowerCase())) {
              // "Copy of <name>" is taken; find the next available suffix
              for (let i = 2; i <= existingNames.length + 2; i++) {
                const candidate = `${copyPrefix} (${i})`;
                if (!lowerNames.has(candidate.toLowerCase())) {
                  newName = candidate;
                  break;
                }
              }
            }
          }
        }
        const branchSlug = toBranchSlug(newName);

        // Create the duplicate - ensure grapesData has a default value
        const dupHtml = original.htmlContent || '';
        const dupGrapesData = original.grapesData || {};
        const contentChecksum = await computeContentChecksum(dupHtml, dupGrapesData);

        const duplicate = await insertWithBranchSlug(db, {
          slug: newSlug,
          name: newName,
          description: original.description,
          htmlContent: dupHtml,
          grapesData: dupGrapesData,
          contentChecksum,
          teamId: original.teamId,
          createdBy: userId,
          branchSlug,
        });

        return reply.status(201).send(duplicate);
      } catch (error) {
        if (error instanceof Error && error.message.includes('duplicate key')) {
          return reply.status(409).send({ message: 'A prototype with this name already exists' });
        }
        throw error;
      }
    }
  );
}
