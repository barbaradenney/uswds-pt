/**
 * Symbols Routes
 * Handles symbol management endpoints scoped to prototype, team, or organization
 */

import { FastifyInstance } from 'fastify';
import { eq, and, or, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { symbols, teams, prototypes } from '../db/schema.js';
import { ROLES } from '../db/roles.js';
import {
  getAuthUser,
  requireTeamMember,
  requireTeamRole,
} from '../middleware/permissions.js';

interface CreateSymbolBody {
  name: string;
  symbolData: unknown;
  scope?: 'prototype' | 'team' | 'organization';
  prototypeId?: string;
}

interface UpdateSymbolBody {
  name?: string;
  symbolData?: unknown;
}

interface PromoteSymbolBody {
  targetScope: 'team' | 'organization';
}

/**
 * Build scope-aware conditions to verify a symbol is accessible from a team context.
 * Returns OR conditions covering team, org, and prototype scopes.
 */
async function buildAccessConditions(teamId: string, userId: string) {
  const [teamRow, userPrototypes] = await Promise.all([
    db.select({ organizationId: teams.organizationId })
      .from(teams).where(eq(teams.id, teamId)).limit(1)
      .then((rows) => rows[0]),
    db.select({ id: prototypes.id })
      .from(prototypes)
      .where(and(eq(prototypes.teamId, teamId), eq(prototypes.createdBy, userId))),
  ]);

  const conditions = [
    and(eq(symbols.scope, 'team'), eq(symbols.teamId, teamId)),
  ];

  if (teamRow?.organizationId) {
    conditions.push(
      and(eq(symbols.scope, 'organization'), eq(symbols.organizationId, teamRow.organizationId))
    );
  }

  const protoIds = userPrototypes.map((p) => p.id);
  if (protoIds.length > 0) {
    conditions.push(
      and(eq(symbols.scope, 'prototype'), inArray(symbols.prototypeId, protoIds))
    );
  }

  return { conditions, teamRow };
}

export async function symbolRoutes(app: FastifyInstance) {
  /**
   * GET /api/teams/:teamId/symbols
   * List all symbols accessible from this team context:
   * - team-scoped symbols for this team
   * - org-scoped symbols for the team's organization
   * - prototype-scoped symbols for prototypes the user created in this team
   */
  app.get<{ Params: { teamId: string } }>(
    '/:teamId/symbols',
    {
      preHandler: [app.authenticate, requireTeamMember('teamId')],
    },
    async (request, _reply) => {
      const authUser = getAuthUser(request);
      const { teamId } = request.params;

      const { conditions } = await buildAccessConditions(teamId, authUser.id);

      const allSymbols = await db
        .select({
          id: symbols.id,
          teamId: symbols.teamId,
          name: symbols.name,
          symbolData: symbols.symbolData,
          scope: symbols.scope,
          organizationId: symbols.organizationId,
          prototypeId: symbols.prototypeId,
          promotedFrom: symbols.promotedFrom,
          createdBy: symbols.createdBy,
          createdAt: symbols.createdAt,
          updatedAt: symbols.updatedAt,
        })
        .from(symbols)
        .where(or(...conditions))
        .orderBy(symbols.name);

      return { symbols: allSymbols };
    }
  );

  /**
   * POST /api/teams/:teamId/symbols
   * Create a new symbol with optional scope
   */
  app.post<{ Params: { teamId: string }; Body: CreateSymbolBody }>(
    '/:teamId/symbols',
    {
      preHandler: [app.authenticate, requireTeamMember('teamId'), requireTeamRole(ROLES.TEAM_MEMBER)],
      schema: {
        body: {
          type: 'object',
          required: ['name', 'symbolData'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            symbolData: { type: 'object' },
            scope: { type: 'string', enum: ['prototype', 'team', 'organization'] },
            prototypeId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { teamId } = request.params;
      const { name, symbolData, scope = 'team', prototypeId } = request.body;

      const insertValues: typeof symbols.$inferInsert = {
        name,
        symbolData,
        scope,
        createdBy: authUser.id,
      };

      if (scope === 'prototype') {
        if (!prototypeId) {
          return reply.status(400).send({ message: 'prototypeId is required for prototype-scoped symbols' });
        }
        insertValues.prototypeId = prototypeId;
        insertValues.teamId = teamId;
      } else if (scope === 'organization') {
        // Require team_admin+ for org-scoped symbols
        const userRole = request.teamMembership?.role;
        if (userRole !== ROLES.TEAM_ADMIN && userRole !== ROLES.ORG_ADMIN) {
          return reply.status(403).send({ message: 'Requires team_admin or org_admin to create organization-scoped symbols' });
        }
        // Resolve orgId from team
        const [team] = await db
          .select({ organizationId: teams.organizationId })
          .from(teams)
          .where(eq(teams.id, teamId))
          .limit(1);

        if (!team?.organizationId) {
          return reply.status(400).send({ message: 'Team does not belong to an organization' });
        }
        insertValues.organizationId = team.organizationId;
        // org-scoped symbols don't need teamId
      } else {
        // team scope
        insertValues.teamId = teamId;
      }

      const [newSymbol] = await db
        .insert(symbols)
        .values(insertValues)
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
      const authUser = getAuthUser(request);
      const { teamId, symbolId } = request.params;

      const { conditions } = await buildAccessConditions(teamId, authUser.id);

      const [symbol] = await db
        .select()
        .from(symbols)
        .where(and(eq(symbols.id, symbolId), or(...conditions)))
        .limit(1);

      if (!symbol) {
        return reply.status(404).send({ message: 'Symbol not found' });
      }

      return symbol;
    }
  );

  /**
   * PUT /api/teams/:teamId/symbols/:symbolId
   * Update a symbol (creator or admin; org-scoped requires org_admin)
   */
  app.put<{ Params: { teamId: string; symbolId: string }; Body: UpdateSymbolBody }>(
    '/:teamId/symbols/:symbolId',
    {
      preHandler: [app.authenticate, requireTeamMember('teamId'), requireTeamRole(ROLES.TEAM_MEMBER)],
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
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

      const { conditions } = await buildAccessConditions(teamId, authUser.id);

      const [existingSymbol] = await db
        .select()
        .from(symbols)
        .where(and(eq(symbols.id, symbolId), or(...conditions)))
        .limit(1);

      if (!existingSymbol) {
        return reply.status(404).send({ message: 'Symbol not found' });
      }

      const isCreator = existingSymbol.createdBy === authUser.id;
      const userRole = request.teamMembership?.role;

      // Org-scoped symbols require org_admin to edit (not just team_admin)
      if (existingSymbol.scope === 'organization') {
        if (!isCreator && userRole !== ROLES.ORG_ADMIN) {
          return reply.status(403).send({ message: 'Only the creator or an org admin can edit organization-scoped symbols' });
        }
      } else {
        const isAdmin = userRole === ROLES.TEAM_ADMIN || userRole === ROLES.ORG_ADMIN;
        if (!isCreator && !isAdmin) {
          return reply.status(403).send({ message: 'Only the creator or an admin can edit this symbol' });
        }
      }

      const updateData: Partial<typeof symbols.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (name !== undefined) updateData.name = name;
      if (symbolData !== undefined) updateData.symbolData = symbolData;

      const [updated] = await db
        .update(symbols)
        .set(updateData)
        .where(eq(symbols.id, symbolId))
        .returning();

      return updated;
    }
  );

  /**
   * DELETE /api/teams/:teamId/symbols/:symbolId
   * Delete a symbol (creator or admin; org-scoped requires org_admin)
   */
  app.delete<{ Params: { teamId: string; symbolId: string } }>(
    '/:teamId/symbols/:symbolId',
    {
      preHandler: [app.authenticate, requireTeamMember('teamId'), requireTeamRole(ROLES.TEAM_MEMBER)],
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { teamId, symbolId } = request.params;

      const { conditions } = await buildAccessConditions(teamId, authUser.id);

      const [existingSymbol] = await db
        .select()
        .from(symbols)
        .where(and(eq(symbols.id, symbolId), or(...conditions)))
        .limit(1);

      if (!existingSymbol) {
        return reply.status(404).send({ message: 'Symbol not found' });
      }

      const isCreator = existingSymbol.createdBy === authUser.id;
      const userRole = request.teamMembership?.role;

      if (existingSymbol.scope === 'organization') {
        if (!isCreator && userRole !== ROLES.ORG_ADMIN) {
          return reply.status(403).send({ message: 'Only the creator or an org admin can delete organization-scoped symbols' });
        }
      } else {
        const isAdmin = userRole === ROLES.TEAM_ADMIN || userRole === ROLES.ORG_ADMIN;
        if (!isCreator && !isAdmin) {
          return reply.status(403).send({ message: 'Only the creator or an admin can delete this symbol' });
        }
      }

      await db
        .delete(symbols)
        .where(eq(symbols.id, symbolId));

      return { message: 'Symbol deleted successfully' };
    }
  );

  /**
   * POST /api/teams/:teamId/symbols/:symbolId/promote
   * Promote a symbol to a higher scope (creates a copy at the target scope)
   */
  app.post<{ Params: { teamId: string; symbolId: string }; Body: PromoteSymbolBody }>(
    '/:teamId/symbols/:symbolId/promote',
    {
      preHandler: [app.authenticate, requireTeamMember('teamId'), requireTeamRole(ROLES.TEAM_MEMBER)],
      schema: {
        body: {
          type: 'object',
          required: ['targetScope'],
          additionalProperties: false,
          properties: {
            targetScope: { type: 'string', enum: ['team', 'organization'] },
          },
        },
      },
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { teamId, symbolId } = request.params;
      const { targetScope } = request.body;

      // Verify source symbol is accessible from this team context
      const { conditions, teamRow } = await buildAccessConditions(teamId, authUser.id);

      const [sourceSymbol] = await db
        .select()
        .from(symbols)
        .where(and(eq(symbols.id, symbolId), or(...conditions)))
        .limit(1);

      if (!sourceSymbol) {
        return reply.status(404).send({ message: 'Symbol not found' });
      }

      const insertValues: typeof symbols.$inferInsert = {
        name: sourceSymbol.name,
        symbolData: sourceSymbol.symbolData,
        scope: targetScope,
        promotedFrom: sourceSymbol.id,
        createdBy: authUser.id,
      };

      if (targetScope === 'team') {
        insertValues.teamId = teamId;
      } else if (targetScope === 'organization') {
        // Require org_admin for promoting to organization scope
        const userRole = request.teamMembership?.role;
        if (userRole !== ROLES.ORG_ADMIN) {
          return reply.status(403).send({ message: 'Requires org_admin to promote to organization scope' });
        }

        if (!teamRow?.organizationId) {
          return reply.status(400).send({ message: 'Team does not belong to an organization' });
        }
        insertValues.organizationId = teamRow.organizationId;
      }

      const [promoted] = await db
        .insert(symbols)
        .values(insertValues)
        .returning();

      return reply.status(201).send(promoted);
    }
  );
}
