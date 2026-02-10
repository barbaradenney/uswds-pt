/**
 * Preview Routes - Endpoints for viewing prototypes
 * Public prototypes (isPublic=true) require no auth.
 * Authenticated users can preview any prototype they have access to.
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
   * Get a prototype for preview. Public prototypes need no auth;
   * authenticated users can preview their own non-public prototypes.
   */
  app.get<{ Params: PreviewParams }>(
    '/:slug',
    async (request, reply) => {
      const { slug } = request.params;

      // Try to extract user ID from auth token (optional — don't fail if missing)
      let userId: string | null = null;
      try {
        await request.jwtVerify();
        userId = (request.user as { id: string }).id;
      } catch {
        // No valid token — proceed as unauthenticated
      }

      // First try public access (no auth needed)
      let [prototype] = await db
        .select({
          name: prototypes.name,
          htmlContent: prototypes.htmlContent,
          grapesData: prototypes.grapesData,
          createdBy: prototypes.createdBy,
        })
        .from(prototypes)
        .where(and(eq(prototypes.slug, slug), eq(prototypes.isPublic, true)))
        .limit(1);

      // If not public but user is authenticated, check if they created it
      if (!prototype && userId) {
        [prototype] = await db
          .select({
            name: prototypes.name,
            htmlContent: prototypes.htmlContent,
            grapesData: prototypes.grapesData,
            createdBy: prototypes.createdBy,
          })
          .from(prototypes)
          .where(and(eq(prototypes.slug, slug), eq(prototypes.createdBy, userId)))
          .limit(1);
      }

      if (!prototype) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Only cache public prototypes
      if (!userId || prototype.createdBy !== userId) {
        reply.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
      } else {
        reply.header('Cache-Control', 'private, no-cache');
      }

      // Return with gjsData key for frontend compatibility
      return {
        name: prototype.name,
        htmlContent: prototype.htmlContent,
        gjsData: prototype.grapesData && typeof prototype.grapesData === 'object' && Object.keys(prototype.grapesData as object).length > 0
          ? JSON.stringify(prototype.grapesData)
          : undefined,
      };
    }
  );
}
