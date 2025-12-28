/**
 * Preview Routes - Public endpoints for viewing prototypes
 * No authentication required for preview access
 */

import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, prototypes } from '../db/index.js';

interface PreviewParams {
  slug: string;
}

export async function previewRoutes(app: FastifyInstance) {
  /**
   * GET /api/preview/:slug
   * Get a prototype for public preview (no auth required)
   */
  app.get<{ Params: PreviewParams }>(
    '/:slug',
    async (request, reply) => {
      const { slug } = request.params;

      const [prototype] = await db
        .select({
          name: prototypes.name,
          htmlContent: prototypes.htmlContent,
        })
        .from(prototypes)
        .where(eq(prototypes.slug, slug))
        .limit(1);

      if (!prototype) {
        return reply.status(404).send({ error: 'Prototype not found' });
      }

      return prototype;
    }
  );
}
