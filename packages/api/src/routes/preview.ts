/**
 * Preview Routes - Endpoints for viewing prototypes
 * Public prototypes (isPublic=true) require no auth.
 * Authenticated users can preview any prototype they have access to.
 */

import { FastifyInstance } from 'fastify';
import { eq, and, or, sql } from 'drizzle-orm';
import { db, prototypes, teams, organizations, teamMemberships } from '../db/index.js';

interface PreviewParams {
  slug: string;
}

export async function previewRoutes(app: FastifyInstance) {
  /**
   * GET /api/preview/:slug
   * Get a prototype for preview. Public prototypes need no auth;
   * authenticated users can preview their own non-public prototypes.
   *
   * Uses a single query with LEFT JOINs to fetch the prototype along with
   * its team's organization-level state/user definitions.
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

      // Single query: fetch prototype + team + organization via LEFT JOINs.
      // Access check: prototype must be public OR the user must be an
      // authenticated team member (innerJoin on teamMemberships handles
      // the membership check when userId is present).
      const accessCondition = userId
        ? and(
            eq(prototypes.slug, slug),
            or(
              eq(prototypes.isPublic, true),
              eq(teamMemberships.userId, userId),
            ),
          )
        : and(eq(prototypes.slug, slug), eq(prototypes.isPublic, true));

      const [result] = await db
        .select({
          name: prototypes.name,
          htmlContent: prototypes.htmlContent,
          createdBy: prototypes.createdBy,
          stateDefinitions: organizations.stateDefinitions,
          userDefinitions: organizations.userDefinitions,
        })
        .from(prototypes)
        .leftJoin(teams, eq(teams.id, prototypes.teamId))
        .leftJoin(organizations, eq(organizations.id, teams.organizationId))
        .leftJoin(teamMemberships, userId
          ? and(
              eq(teamMemberships.teamId, prototypes.teamId),
              eq(teamMemberships.userId, userId),
            )
          : sql`false`)
        .where(accessCondition)
        .limit(1);

      if (!result) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Public prototypes: short cache with revalidation so newly-private prototypes are re-checked
      // Authenticated user's own prototypes: no caching
      if (!userId || result.createdBy !== userId) {
        reply.header('Cache-Control', 'public, max-age=60, must-revalidate');
      } else {
        reply.header('Cache-Control', 'private, no-cache');
      }

      return {
        name: result.name,
        htmlContent: result.htmlContent,
        stateDefinitions: (result.stateDefinitions as unknown[]) || [],
        userDefinitions: (result.userDefinitions as unknown[]) || [],
      };
    }
  );
}
