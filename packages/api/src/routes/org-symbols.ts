/**
 * Organization Symbols Routes
 * Handles symbol CRUD at the organization level
 */

import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { symbols } from '../db/schema.js';
import {
  getAuthUser,
  requireOrgAdmin,
  isUserInOrganization,
  isOrgAdmin,
} from '../middleware/permissions.js';

interface CreateOrgSymbolBody {
  name: string;
  symbolData: unknown;
}

interface UpdateOrgSymbolBody {
  name?: string;
  symbolData?: unknown;
}

export async function orgSymbolRoutes(app: FastifyInstance) {
  /**
   * GET /api/organizations/:orgId/symbols
   * List all organization-scoped symbols
   */
  app.get<{ Params: { orgId: string } }>(
    '/:orgId/symbols',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { orgId } = request.params;

      // Check org membership
      const isMember = await isUserInOrganization(authUser.id, orgId);
      if (!isMember) {
        return reply.status(403).send({ message: 'Not a member of this organization' });
      }

      const orgSymbols = await db
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
        .where(and(eq(symbols.scope, 'organization'), eq(symbols.organizationId, orgId)))
        .orderBy(symbols.name);

      return { symbols: orgSymbols };
    }
  );

  /**
   * POST /api/organizations/:orgId/symbols
   * Create a new organization-scoped symbol (org_admin only)
   */
  app.post<{ Params: { orgId: string }; Body: CreateOrgSymbolBody }>(
    '/:orgId/symbols',
    {
      preHandler: [app.authenticate, requireOrgAdmin],
      schema: {
        body: {
          type: 'object',
          required: ['name', 'symbolData'],
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
      const { orgId } = request.params;
      const { name, symbolData } = request.body;

      const [newSymbol] = await db
        .insert(symbols)
        .values({
          name,
          symbolData,
          scope: 'organization',
          organizationId: orgId,
          createdBy: authUser.id,
        })
        .returning();

      return reply.status(201).send(newSymbol);
    }
  );

  /**
   * PUT /api/organizations/:orgId/symbols/:symbolId
   * Update an org symbol (creator or org_admin)
   */
  app.put<{ Params: { orgId: string; symbolId: string }; Body: UpdateOrgSymbolBody }>(
    '/:orgId/symbols/:symbolId',
    {
      preHandler: [app.authenticate],
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
      const { orgId, symbolId } = request.params;

      // Check org membership
      const isMember = await isUserInOrganization(authUser.id, orgId);
      if (!isMember) {
        return reply.status(403).send({ message: 'Not a member of this organization' });
      }

      const [existingSymbol] = await db
        .select()
        .from(symbols)
        .where(and(eq(symbols.id, symbolId), eq(symbols.organizationId, orgId), eq(symbols.scope, 'organization')))
        .limit(1);

      if (!existingSymbol) {
        return reply.status(404).send({ message: 'Symbol not found' });
      }

      // Creator or org_admin can edit
      const isCreator = existingSymbol.createdBy === authUser.id;
      if (!isCreator) {
        const hasAdminRole = await isOrgAdmin(authUser.id, orgId);
        if (!hasAdminRole) {
          return reply.status(403).send({ message: 'Only the creator or an org admin can edit this symbol' });
        }
      }

      const { name, symbolData } = request.body;
      const updateData: Partial<typeof symbols.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (name !== undefined) updateData.name = name;
      if (symbolData !== undefined) updateData.symbolData = symbolData;

      const [updated] = await db
        .update(symbols)
        .set(updateData)
        .where(and(eq(symbols.id, symbolId), eq(symbols.organizationId, orgId)))
        .returning();

      return updated;
    }
  );

  /**
   * DELETE /api/organizations/:orgId/symbols/:symbolId
   * Delete an org symbol (creator or org_admin)
   */
  app.delete<{ Params: { orgId: string; symbolId: string } }>(
    '/:orgId/symbols/:symbolId',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { orgId, symbolId } = request.params;

      // Check org membership
      const isMember = await isUserInOrganization(authUser.id, orgId);
      if (!isMember) {
        return reply.status(403).send({ message: 'Not a member of this organization' });
      }

      const [existingSymbol] = await db
        .select()
        .from(symbols)
        .where(and(eq(symbols.id, symbolId), eq(symbols.organizationId, orgId), eq(symbols.scope, 'organization')))
        .limit(1);

      if (!existingSymbol) {
        return reply.status(404).send({ message: 'Symbol not found' });
      }

      const isCreator = existingSymbol.createdBy === authUser.id;
      if (!isCreator) {
        const hasAdminRole = await isOrgAdmin(authUser.id, orgId);
        if (!hasAdminRole) {
          return reply.status(403).send({ message: 'Only the creator or an org admin can delete this symbol' });
        }
      }

      await db
        .delete(symbols)
        .where(and(eq(symbols.id, symbolId), eq(symbols.organizationId, orgId)));

      return { message: 'Symbol deleted successfully' };
    }
  );
}
