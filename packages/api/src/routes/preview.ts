/**
 * Preview Routes - Public endpoints for viewing prototypes
 * No authentication required for preview access
 */

import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
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
          grapesData: prototypes.grapesData,
        })
        .from(prototypes)
        .where(and(eq(prototypes.slug, slug), eq(prototypes.isPublic, true)))
        .limit(1);

      if (!prototype) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Cache preview responses for 5 minutes (public, revalidate after)
      reply.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');

      // Return with gjsData key for frontend compatibility
      return {
        name: prototype.name,
        htmlContent: prototype.htmlContent,
        gjsData: prototype.grapesData ? JSON.stringify(prototype.grapesData) : undefined,
      };
    }
  );
}
