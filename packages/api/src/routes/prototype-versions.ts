/**
 * Prototype Version Routes
 * Version history, restore, compare, and label endpoints
 *
 * GET    /:slug/versions                      - List version history
 * POST   /:slug/versions/:version/restore     - Restore to a specific version
 * GET    /:slug/versions/:v1/compare/:v2      - Compare two versions
 * PATCH  /:slug/versions/:version             - Update a version's label
 */

import { FastifyInstance } from 'fastify';
import { eq, desc, and, count } from 'drizzle-orm';
import { computeContentChecksum } from '@uswds-pt/shared';
import { db } from '../db/index.js';
import { prototypes, prototypeVersions } from '../db/schema.js';
import { getAuthUser } from '../middleware/permissions.js';
import {
  PrototypeParams,
  VersionParams,
  CompareParams,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  canAccessPrototype,
  canEditPrototype,
} from './prototype-helpers.js';

export async function prototypeVersionRoutes(app: FastifyInstance) {
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
          label: prototypeVersions.label,
          contentChecksum: prototypeVersions.contentChecksum,
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
        // Compute checksum for the restored content
        const restoredHtml = versionData.htmlContent || '';
        const restoredData = versionData.grapesData || {};
        const contentChecksum = await computeContentChecksum(restoredHtml, restoredData);

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
            contentChecksum: fresh.contentChecksum,
            createdBy: userId,
          });

          const [result] = await tx
            .update(prototypes)
            .set({
              htmlContent: restoredHtml,
              grapesData: restoredData,
              updatedAt: new Date(),
              version: fresh.version + 1,
              contentChecksum,
            })
            .where(and(eq(prototypes.id, fresh.id), eq(prototypes.version, fresh.version)))
            .returning();

          if (!result) {
            throw new Error('CONCURRENT_MODIFICATION');
          }

          return result;
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'CONCURRENT_MODIFICATION') {
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
   * GET /api/prototypes/:slug/versions/:v1/compare/:v2
   * Compare two versions (or a version with current state)
   */
  app.get<{ Params: CompareParams }>(
    '/:slug/versions/:v1/compare/:v2',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const { slug, v1, v2 } = request.params;
      const userId = getAuthUser(request).id;

      const v1Number = parseInt(v1, 10);
      if (isNaN(v1Number)) {
        return reply.status(400).send({ message: 'Invalid version number for v1' });
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

      // Check access
      if (!(await canAccessPrototype(userId, prototype))) {
        return reply.status(403).send({ message: 'Access denied' });
      }

      // Only select the fields needed for diffing (avoids transferring large grapesData)
      const versionSelect = {
        versionNumber: prototypeVersions.versionNumber,
        htmlContent: prototypeVersions.htmlContent,
      };

      // Fetch version 1
      const [version1] = await db
        .select(versionSelect)
        .from(prototypeVersions)
        .where(
          and(
            eq(prototypeVersions.prototypeId, prototype.id),
            eq(prototypeVersions.versionNumber, v1Number)
          )
        )
        .limit(1);

      if (!version1) {
        return reply.status(404).send({ message: `Version ${v1Number} not found` });
      }

      // Fetch version 2 (or use current prototype state)
      let version2Data: { versionNumber: number | 'current'; htmlContent: string | null };
      if (v2 === 'current') {
        version2Data = {
          versionNumber: 'current' as const,
          htmlContent: prototype.htmlContent,
        };
      } else {
        const v2Number = parseInt(v2, 10);
        if (isNaN(v2Number)) {
          return reply.status(400).send({ message: 'Invalid version number for v2' });
        }

        const [version2] = await db
          .select(versionSelect)
          .from(prototypeVersions)
          .where(
            and(
              eq(prototypeVersions.prototypeId, prototype.id),
              eq(prototypeVersions.versionNumber, v2Number)
            )
          )
          .limit(1);

        if (!version2) {
          return reply.status(404).send({ message: `Version ${v2Number} not found` });
        }

        version2Data = {
          versionNumber: version2.versionNumber,
          htmlContent: version2.htmlContent,
        };
      }

      return {
        version1: {
          versionNumber: version1.versionNumber,
          htmlContent: version1.htmlContent,
        },
        version2: version2Data,
      };
    }
  );

  /**
   * PATCH /api/prototypes/:slug/versions/:version
   * Update a version's label
   */
  app.patch<{ Params: VersionParams; Body: { label: string } }>(
    '/:slug/versions/:version',
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['label'],
          additionalProperties: false,
          properties: {
            label: { type: 'string', maxLength: 255 },
          },
        },
      },
    },
    async (request, reply) => {
      const { slug, version } = request.params;
      const { label } = request.body;
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

      // Find and update the version
      const [updated] = await db
        .update(prototypeVersions)
        .set({ label: label || null })
        .where(
          and(
            eq(prototypeVersions.prototypeId, prototype.id),
            eq(prototypeVersions.versionNumber, versionNumber)
          )
        )
        .returning();

      if (!updated) {
        return reply.status(404).send({ message: 'Version not found' });
      }

      return updated;
    }
  );
}
