/**
 * Symbols Routes
 * Handles global symbol management endpoints for team-shared symbols
 */

import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { symbols } from '../db/schema.js';
import { ROLES } from '../db/roles.js';
import {
  getAuthUser,
  requireTeamMember,
} from '../middleware/permissions.js';

interface CreateSymbolBody {
  name: string;
  symbolData: unknown;
}

interface UpdateSymbolBody {
  name?: string;
  symbolData?: unknown;
}

export async function symbolRoutes(app: FastifyInstance) {
  /**
   * GET /api/teams/:teamId/symbols
   * List all global symbols for a team
   */
  app.get<{ Params: { teamId: string } }>(
    '/:teamId/symbols',
    {
      preHandler: [app.authenticate, requireTeamMember('teamId')],
    },
    async (request, _reply) => {
      const { teamId } = request.params;

      const teamSymbols = await db
        .select({
          id: symbols.id,
          teamId: symbols.teamId,
          name: symbols.name,
          symbolData: symbols.symbolData,
          createdBy: symbols.createdBy,
          createdAt: symbols.createdAt,
          updatedAt: symbols.updatedAt,
        })
        .from(symbols)
        .where(eq(symbols.teamId, teamId))
        .orderBy(symbols.name);

      return { symbols: teamSymbols };
    }
  );

  /**
   * POST /api/teams/:teamId/symbols
   * Create a new global symbol
   */
  app.post<{ Params: { teamId: string }; Body: CreateSymbolBody }>(
    '/:teamId/symbols',
    {
      preHandler: [app.authenticate, requireTeamMember('teamId')],
      schema: {
        body: {
          type: 'object',
          required: ['name', 'symbolData'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            symbolData: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { teamId } = request.params;
      const { name, symbolData } = request.body;

      const [newSymbol] = await db
        .insert(symbols)
        .values({
          teamId,
          name,
          symbolData,
          createdBy: authUser.id,
        })
        .returning();

      return reply.status(201).send(newSymbol);
    }
  );

  /**
   * GET /api/teams/:teamId/symbols/:symbolId
   * Get a specific symbol
   */
  app.get<{ Params: { teamId: string; symbolId: string } }>(
    '/:teamId/symbols/:symbolId',
    {
      preHandler: [app.authenticate, requireTeamMember('teamId')],
    },
    async (request, reply) => {
      const { teamId, symbolId } = request.params;

      const [symbol] = await db
        .select()
        .from(symbols)
        .where(and(eq(symbols.id, symbolId), eq(symbols.teamId, teamId)))
        .limit(1);

      if (!symbol) {
        return reply.status(404).send({ message: 'Symbol not found' });
      }

      return symbol;
    }
  );

  /**
   * PUT /api/teams/:teamId/symbols/:symbolId
   * Update a symbol (creator or team_admin only)
   */
  app.put<{ Params: { teamId: string; symbolId: string }; Body: UpdateSymbolBody }>(
    '/:teamId/symbols/:symbolId',
    {
      preHandler: [app.authenticate, requireTeamMember('teamId')],
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            symbolData: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { teamId, symbolId } = request.params;
      const { name, symbolData } = request.body;

      // Get the existing symbol
      const [existingSymbol] = await db
        .select()
        .from(symbols)
        .where(and(eq(symbols.id, symbolId), eq(symbols.teamId, teamId)))
        .limit(1);

      if (!existingSymbol) {
        return reply.status(404).send({ message: 'Symbol not found' });
      }

      // Check if user can edit (creator or team_admin)
      const isCreator = existingSymbol.createdBy === authUser.id;
      const userRole = request.teamMembership?.role;
      const isAdmin = userRole === ROLES.TEAM_ADMIN || userRole === ROLES.ORG_ADMIN;

      if (!isCreator && !isAdmin) {
        return reply.status(403).send({ message: 'Only the creator or an admin can edit this symbol' });
      }

      const updateData: Partial<typeof symbols.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (name !== undefined) updateData.name = name;
      if (symbolData !== undefined) updateData.symbolData = symbolData;

      const [updated] = await db
        .update(symbols)
        .set(updateData)
        .where(and(eq(symbols.id, symbolId), eq(symbols.teamId, teamId)))
        .returning();

      return updated;
    }
  );

  /**
   * DELETE /api/teams/:teamId/symbols/:symbolId
   * Delete a symbol (creator or team_admin only)
   */
  app.delete<{ Params: { teamId: string; symbolId: string } }>(
    '/:teamId/symbols/:symbolId',
    {
      preHandler: [app.authenticate, requireTeamMember('teamId')],
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { teamId, symbolId } = request.params;

      // Get the existing symbol
      const [existingSymbol] = await db
        .select()
        .from(symbols)
        .where(and(eq(symbols.id, symbolId), eq(symbols.teamId, teamId)))
        .limit(1);

      if (!existingSymbol) {
        return reply.status(404).send({ message: 'Symbol not found' });
      }

      // Check if user can delete (creator or team_admin)
      const isCreator = existingSymbol.createdBy === authUser.id;
      const userRole = request.teamMembership?.role;
      const isAdmin = userRole === ROLES.TEAM_ADMIN || userRole === ROLES.ORG_ADMIN;

      if (!isCreator && !isAdmin) {
        return reply.status(403).send({ message: 'Only the creator or an admin can delete this symbol' });
      }

      await db
        .delete(symbols)
        .where(and(eq(symbols.id, symbolId), eq(symbols.teamId, teamId)));

      return { message: 'Symbol deleted successfully' };
    }
  );
}
