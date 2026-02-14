/**
 * Preview Routes - Endpoints for viewing prototypes
 * Public prototypes (isPublic=true) require no auth.
 * Authenticated users can preview any prototype they have access to.
 */

import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db, prototypes, teams, organizations, teamMemberships } from '../db/index.js';

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
          teamId: prototypes.teamId,
        })
        .from(prototypes)
        .where(and(eq(prototypes.slug, slug), eq(prototypes.isPublic, true)))
        .limit(1);

      // If not public but user is authenticated, check team membership
      // (not just createdBy — users removed from a team should lose access)
      if (!prototype && userId) {
        [prototype] = await db
          .select({
            name: prototypes.name,
            htmlContent: prototypes.htmlContent,
            grapesData: prototypes.grapesData,
            createdBy: prototypes.createdBy,
            teamId: prototypes.teamId,
          })
          .from(prototypes)
          .innerJoin(teamMemberships, and(
            eq(teamMemberships.teamId, prototypes.teamId),
            eq(teamMemberships.userId, userId),
          ))
          .where(eq(prototypes.slug, slug))
          .limit(1);
      }

      if (!prototype) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Look up org-level state/user definitions via prototype → team → organization
      let stateDefinitions: unknown[] = [];
      let userDefinitions: unknown[] = [];
      if (prototype.teamId) {
        const [team] = await db
          .select({ organizationId: teams.organizationId })
          .from(teams)
          .where(eq(teams.id, prototype.teamId))
          .limit(1);

        if (team?.organizationId) {
          const [org] = await db
            .select({
              stateDefinitions: organizations.stateDefinitions,
              userDefinitions: organizations.userDefinitions,
            })
            .from(organizations)
            .where(eq(organizations.id, team.organizationId))
            .limit(1);

          if (org) {
            stateDefinitions = org.stateDefinitions as unknown[] || [];
            userDefinitions = org.userDefinitions as unknown[] || [];
          }
        }
      }

      // Public prototypes: short cache with revalidation so newly-private prototypes are re-checked
      // Authenticated user's own prototypes: no caching
      if (!userId || prototype.createdBy !== userId) {
        reply.header('Cache-Control', 'public, max-age=60, must-revalidate');
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
        stateDefinitions,
        userDefinitions,
      };
    }
  );
}
