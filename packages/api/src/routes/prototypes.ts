/**
 * Prototype Routes
 */

import { FastifyInstance } from 'fastify';
import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, prototypes, prototypeVersions } from '../db/index.js';

interface CreatePrototypeBody {
  name: string;
  description?: string;
  htmlContent?: string;
  grapesData?: Record<string, unknown>;
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

export async function prototypeRoutes(app: FastifyInstance) {
  /**
   * GET /api/prototypes
   * List all prototypes for the current user
   */
  app.get(
    '/',
    {
      preHandler: [app.authenticate],
    },
    async (request) => {
      const userId = request.user.id;

      const items = await db
        .select()
        .from(prototypes)
        .where(eq(prototypes.createdBy, userId))
        .orderBy(desc(prototypes.updatedAt));

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
      const userId = request.user.id;

      const [prototype] = await db
        .select()
        .from(prototypes)
        .where(
          and(
            eq(prototypes.slug, slug),
            eq(prototypes.createdBy, userId)
          )
        )
        .limit(1);

      if (!prototype) {
        return reply.status(404).send({ error: 'Prototype not found' });
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
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            htmlContent: { type: 'string' },
            grapesData: { type: 'object' },
          },
        },
      },
    },
    async (request) => {
      const { name, description, htmlContent, grapesData } = request.body;
      const userId = request.user.id;
      const slug = nanoid(10);

      const [prototype] = await db
        .insert(prototypes)
        .values({
          slug,
          name,
          description,
          htmlContent: htmlContent || '',
          grapesData: grapesData || {},
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
      const userId = request.user.id;

      // Get current prototype
      const [current] = await db
        .select()
        .from(prototypes)
        .where(
          and(
            eq(prototypes.slug, slug),
            eq(prototypes.createdBy, userId)
          )
        )
        .limit(1);

      if (!current) {
        return reply.status(404).send({ error: 'Prototype not found' });
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
      const userId = request.user.id;

      const result = await db
        .delete(prototypes)
        .where(
          and(
            eq(prototypes.slug, slug),
            eq(prototypes.createdBy, userId)
          )
        )
        .returning({ id: prototypes.id });

      if (result.length === 0) {
        return reply.status(404).send({ error: 'Prototype not found' });
      }

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
      const userId = request.user.id;

      // Get prototype
      const [prototype] = await db
        .select()
        .from(prototypes)
        .where(
          and(
            eq(prototypes.slug, slug),
            eq(prototypes.createdBy, userId)
          )
        )
        .limit(1);

      if (!prototype) {
        return reply.status(404).send({ error: 'Prototype not found' });
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
      const userId = request.user.id;
      const versionNumber = parseInt(version, 10);

      if (isNaN(versionNumber)) {
        return reply.status(400).send({ error: 'Invalid version number' });
      }

      // Get prototype
      const [prototype] = await db
        .select()
        .from(prototypes)
        .where(
          and(
            eq(prototypes.slug, slug),
            eq(prototypes.createdBy, userId)
          )
        )
        .limit(1);

      if (!prototype) {
        return reply.status(404).send({ error: 'Prototype not found' });
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
        return reply.status(404).send({ error: 'Version not found' });
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
