/**
 * Prototype Routes
 * Team-scoped prototype management
 */

import { FastifyInstance } from 'fastify';
import { eq, ne, desc, and, or, count, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { CreatePrototypeBody, UpdatePrototypeBody } from '@uswds-pt/shared';
import { computeContentChecksum, toBranchSlug } from '@uswds-pt/shared';
import { db } from '../db/index.js';
import { prototypes, prototypeVersions, teamMemberships, users, githubTeamConnections } from '../db/schema.js';
import { getAuthUser } from '../middleware/permissions.js';
import { ROLES, hasPermission, Role } from '../db/roles.js';
import { pushToGitHub, createGitHubBranch } from '../lib/github-push.js';

/**
 * Normalize GrapesJS project data to ensure consistent structure
 * This fixes issues where new prototypes don't have properly initialized pages
 */
function normalizeGrapesData(data: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return {
      pages: [],
      styles: [],
      assets: [],
    };
  }

  const normalized: Record<string, unknown> = { ...data };

  // Ensure pages is always an array
  if (!normalized.pages || !Array.isArray(normalized.pages)) {
    normalized.pages = [];
  }

  // Ensure styles is always an array
  if (!normalized.styles || !Array.isArray(normalized.styles)) {
    normalized.styles = [];
  }

  // Ensure assets is always an array
  if (!normalized.assets || !Array.isArray(normalized.assets)) {
    normalized.assets = [];
  }

  return normalized;
}

// Max serialized size for grapesData (5MB)
const MAX_GRAPES_DATA_SIZE = 5 * 1024 * 1024;

/**
 * Validate grapesData shape and size.
 * Uses Fastify's bodyLimit for primary byte-size enforcement;
 * this is a secondary check using Buffer.byteLength for accuracy.
 */
function validateGrapesData(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;

  // Check serialized byte size (accurate for multi-byte chars)
  const byteSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
  if (byteSize > MAX_GRAPES_DATA_SIZE) {
    return `grapesData exceeds maximum size of ${MAX_GRAPES_DATA_SIZE / (1024 * 1024)}MB`;
  }

  // Validate expected shape: pages should be an array if present
  if ('pages' in data && !Array.isArray(data.pages)) {
    return 'grapesData.pages must be an array';
  }

  return null;
}

interface PrototypeParams {
  slug: string;
}

interface VersionParams extends PrototypeParams {
  version: string;
}

interface CompareParams extends PrototypeParams {
  v1: string;
  v2: string;
}

interface ListQuery {
  teamId?: string;
  page?: string;
  limit?: string;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Check if user is a member of the specified team and get their role
 */
async function getTeamMembership(userId: string, teamId: string) {
  const [membership] = await db
    .select()
    .from(teamMemberships)
    .where(
      and(
        eq(teamMemberships.userId, userId),
        eq(teamMemberships.teamId, teamId)
      )
    )
    .limit(1);

  return membership;
}

/**
 * Check if user can access a prototype (member of its team or creator for legacy)
 */
async function canAccessPrototype(userId: string, prototype: { teamId: string | null; createdBy: string }) {
  // Legacy prototypes without team - only creator can access
  if (!prototype.teamId) {
    return prototype.createdBy === userId;
  }

  // Check team membership
  const membership = await getTeamMembership(userId, prototype.teamId);
  return !!membership;
}

/**
 * Check if user can edit a prototype
 */
async function canEditPrototype(userId: string, prototype: { teamId: string | null; createdBy: string }) {
  // Legacy prototypes without team - only creator can edit
  if (!prototype.teamId) {
    return prototype.createdBy === userId;
  }

  // Check team membership with at least member role
  const membership = await getTeamMembership(userId, prototype.teamId);
  if (!membership) return false;

  // Viewers cannot edit
  return hasPermission(membership.role as Role, ROLES.TEAM_MEMBER);
}

/**
 * Check if user can delete a prototype
 */
async function canDeletePrototype(userId: string, prototype: { teamId: string | null; createdBy: string }) {
  // Creator can always delete their own prototype
  if (prototype.createdBy === userId) {
    return true;
  }

  // Legacy prototypes without team - only creator can delete
  if (!prototype.teamId) {
    return false;
  }

  // Team admins can delete any team prototype
  const membership = await getTeamMembership(userId, prototype.teamId);
  if (!membership) return false;

  return hasPermission(membership.role as Role, ROLES.TEAM_ADMIN);
}

/**
 * Check if a prototype name is already taken within a team (case-insensitive).
 * Optionally exclude a specific slug (for rename checks).
 */
async function isNameTaken(
  teamId: string,
  name: string,
  excludeSlug?: string
): Promise<boolean> {
  const conditions = [
    eq(prototypes.teamId, teamId),
    eq(sql`lower(${prototypes.name})`, name.toLowerCase().trim()),
  ];
  if (excludeSlug) {
    conditions.push(ne(prototypes.slug, excludeSlug));
  }
  const [result] = await db
    .select({ count: count() })
    .from(prototypes)
    .where(and(...conditions));
  return Number(result.count) > 0;
}

/**
 * Fire-and-forget auto-push to GitHub after a successful save.
 * Looks up team-level GitHub connection directly via teamId.
 * Errors are logged but do not block the save response.
 */
async function autoGitHubPush(
  request: import('fastify').FastifyRequest,
  updated: { id: string; htmlContent: string; version: number; name: string; branchSlug: string; teamId: string | null; contentChecksum: string | null },
): Promise<void> {
  if (!updated.teamId) return;

  const userId = getAuthUser(request).id;

  // Look up team-level GitHub connection directly
  const [connection] = await db
    .select()
    .from(githubTeamConnections)
    .where(eq(githubTeamConnections.teamId, updated.teamId))
    .limit(1);

  if (!connection) return;

  // Get user's token
  const [user] = await db
    .select({ githubAccessToken: users.githubAccessToken })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.githubAccessToken) return;

  // Git branch = uswds-pt/<branchSlug>
  const gitBranch = `uswds-pt/${updated.branchSlug}`;

  // Try to create the branch (may already exist)
  try {
    await createGitHubBranch({
      encryptedAccessToken: user.githubAccessToken,
      owner: connection.repoOwner,
      repo: connection.repoName,
      branchName: gitBranch,
      fromBranch: connection.defaultBranch,
    });
  } catch {
    // Branch may already exist
  }

  const result = await pushToGitHub({
    encryptedAccessToken: user.githubAccessToken,
    owner: connection.repoOwner,
    repo: connection.repoName,
    branch: gitBranch,
    filePath: 'prototype.html',
    content: updated.htmlContent,
    commitMessage: `Update ${updated.name} (v${updated.version})`,
  });

  // Update prototype with push metadata
  await db
    .update(prototypes)
    .set({
      lastGithubPushAt: new Date(),
      lastGithubCommitSha: result.commitSha,
    })
    .where(eq(prototypes.id, updated.id));
}

export async function prototypeRoutes(app: FastifyInstance) {
  /**
   * Insert a prototype, retrying with a nanoid suffix on branch-slug uniqueness collisions.
   * Uses PostgreSQL error code 23505 (unique_violation) for reliable detection.
   */
  async function insertWithBranchSlug(
    tx: typeof db,
    values: Record<string, unknown>,
    maxRetries = 3
  ): Promise<typeof prototypes.$inferSelect> {
    let currentBranchSlug = values.branchSlug as string;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const [result] = await tx
          .insert(prototypes)
          .values({ ...values, branchSlug: currentBranchSlug } as typeof prototypes.$inferInsert)
          .returning();
        return result;
      } catch (error: unknown) {
        const isUniqueViolation = typeof error === 'object' && error !== null && (error as Record<string, unknown>).code === '23505';
        if (isUniqueViolation && attempt < maxRetries - 1) {
          currentBranchSlug = `${values.branchSlug as string}-${nanoid(4)}`;
          continue;
        }
        throw error;
      }
    }
    // Should not be reached, but satisfies TypeScript
    throw new Error('insertWithBranchSlug: exceeded max retries');
  }

  /**
   * GET /api/prototypes
   * List prototypes for a team (or user's legacy prototypes)
   */
  app.get<{ Querystring: ListQuery }>(
    '/',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = getAuthUser(request).id;
      const { teamId } = request.query;

      // Parse pagination params
      const page = Math.max(1, parseInt(request.query.page || '1', 10) || 1);
      const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(request.query.limit || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
      const offset = (page - 1) * limit;

      if (teamId) {
        // Verify user is a member of the team
        const membership = await getTeamMembership(userId, teamId);
        if (!membership) {
          return reply.status(403).send({ message: 'Not a member of this team' });
        }

        const whereClause = eq(prototypes.teamId, teamId);

        // Get total count
        const [{ total }] = await db
          .select({ total: count() })
          .from(prototypes)
          .where(whereClause);

        // Get paginated team prototypes
        const items = await db
          .select()
          .from(prototypes)
          .where(whereClause)
          .orderBy(desc(prototypes.updatedAt))
          .limit(limit)
          .offset(offset);

        return { prototypes: items, total: Number(total), page, limit };
      }

      // No teamId - return user's legacy prototypes (those without a team)
      // plus prototypes from teams they belong to
      const userMemberships = await db
        .select({ teamId: teamMemberships.teamId })
        .from(teamMemberships)
        .where(eq(teamMemberships.userId, userId));

      const teamIds = userMemberships.map(m => m.teamId);

      const whereClause = teamIds.length > 0
        ? or(
            eq(prototypes.createdBy, userId),
            ...teamIds.map(tid => eq(prototypes.teamId, tid))
          )
        : eq(prototypes.createdBy, userId);

      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(prototypes)
        .where(whereClause);

      // Get paginated items
      const items = await db
        .select()
        .from(prototypes)
        .where(whereClause)
        .orderBy(desc(prototypes.updatedAt))
        .limit(limit)
        .offset(offset);

      return { prototypes: items, total: Number(total), page, limit };
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
      const userId = getAuthUser(request).id;

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
          required: ['name', 'teamId'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 1000 },
            htmlContent: { type: 'string', maxLength: 2_097_152 }, // 2MB
            grapesData: { type: 'object' },
            teamId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { description, htmlContent, grapesData, teamId } = request.body;
      const name = request.body.name.trim();
      if (!name) {
        return reply.status(400).send({ message: 'Name cannot be empty' });
      }
      const userId = getAuthUser(request).id;

      // Verify user is a member of the team with at least member role
      const membership = await getTeamMembership(userId, teamId);
      if (!membership) {
        return reply.status(403).send({ message: 'Not a member of this team' });
      }

      if (!hasPermission(membership.role as Role, ROLES.TEAM_MEMBER)) {
        return reply.status(403).send({ message: 'Viewers cannot create prototypes' });
      }

      // Check for duplicate name within the team
      if (await isNameTaken(teamId, name)) {
        return reply.status(409).send({
          message: `A prototype named "${name}" already exists in this team`,
        });
      }

      // Validate grapesData size and shape
      const grapesError = validateGrapesData(grapesData);
      if (grapesError) {
        return reply.status(400).send({ message: grapesError });
      }

      const slug = nanoid(10);
      const branchSlug = toBranchSlug(name);

      const normalizedData = normalizeGrapesData(grapesData);
      const contentChecksum = await computeContentChecksum(
        htmlContent || '',
        normalizedData
      );

      const prototype = await insertWithBranchSlug(db, {
        slug,
        name,
        description,
        htmlContent: htmlContent || '',
        grapesData: normalizedData,
        teamId,
        createdBy: userId,
        contentChecksum,
        branchSlug,
      });

      return reply.status(201).send(prototype);
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
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 1000 },
            htmlContent: { type: 'string', maxLength: 2_097_152 }, // 2MB
            grapesData: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;
      const { description, htmlContent, grapesData } = request.body;
      const name = request.body.name?.trim();
      if (name !== undefined && !name) {
        return reply.status(400).send({ message: 'Name cannot be empty' });
      }
      const userId = getAuthUser(request).id;

      // Get current prototype (for auth check + optimistic concurrency pre-check)
      const [current] = await db
        .select()
        .from(prototypes)
        .where(eq(prototypes.slug, slug))
        .limit(1);

      if (!current) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Check edit permission
      if (!(await canEditPrototype(userId, current))) {
        return reply.status(403).send({ message: 'Access denied' });
      }

      // Check for duplicate name when renaming
      if (name && name !== current.name && current.teamId) {
        if (await isNameTaken(current.teamId, name, slug)) {
          return reply.status(409).send({
            message: `A prototype named "${name}" already exists in this team`,
          });
        }
      }

      // Validate grapesData size and shape
      const grapesError = validateGrapesData(grapesData);
      if (grapesError) {
        return reply.status(400).send({ message: grapesError });
      }

      // Optimistic concurrency check via If-Match header (early rejection)
      const ifMatch = request.headers['if-match'];
      if (ifMatch) {
        const expectedVersion = parseInt(ifMatch, 10);
        if (!isNaN(expectedVersion) && current.version !== expectedVersion) {
          return reply.status(409).send({
            message: 'This prototype was modified by another session',
            serverVersion: current.version,
            yourVersion: expectedVersion,
          });
        }
      }

      // Wrap everything in a transaction to prevent TOCTOU races.
      // Re-read the prototype inside the transaction so the version snapshot
      // captures the actual current state, not a potentially stale read.
      let updated;
      try {
        // Compute checksum for the new content
        const newHtml = htmlContent ?? current.htmlContent;
        const newGrapesData = grapesData ? normalizeGrapesData(grapesData) : (current.grapesData as Record<string, unknown>);
        const contentChecksum = await computeContentChecksum(newHtml, newGrapesData);

        updated = await db.transaction(async (tx) => {
          // Re-read inside transaction to get fresh state for snapshot
          const [fresh] = await tx
            .select()
            .from(prototypes)
            .where(eq(prototypes.id, current.id))
            .limit(1);

          if (!fresh) {
            throw new Error('CONCURRENT_MODIFICATION');
          }

          // Get the last version number
          const [lastVersion] = await tx
            .select({ versionNumber: prototypeVersions.versionNumber })
            .from(prototypeVersions)
            .where(eq(prototypeVersions.prototypeId, fresh.id))
            .orderBy(desc(prototypeVersions.versionNumber))
            .limit(1);

          const newVersionNumber = (lastVersion?.versionNumber || 0) + 1;

          // Create version snapshot of current state (uses fresh read)
          await tx.insert(prototypeVersions).values({
            prototypeId: fresh.id,
            versionNumber: newVersionNumber,
            htmlContent: fresh.htmlContent,
            grapesData: fresh.grapesData,
            contentChecksum: fresh.contentChecksum,
            createdBy: userId,
          });

          // Update prototype with version in WHERE to prevent race conditions
          const [result] = await tx
            .update(prototypes)
            .set({
              name: name ?? fresh.name,
              description: description ?? fresh.description,
              htmlContent: newHtml,
              grapesData: newGrapesData,
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
            message: 'This prototype was modified concurrently. Please reload and try again.',
          });
        }
        throw err;
      }

      // Auto-push to GitHub if a connection exists (fire-and-forget)
      autoGitHubPush(request, updated).catch((err) => {
        request.log.warn(err, 'Auto GitHub push failed (non-blocking)');
      });

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
      const userId = getAuthUser(request).id;

      // Get prototype
      const [prototype] = await db
        .select()
        .from(prototypes)
        .where(eq(prototypes.slug, slug))
        .limit(1);

      if (!prototype) {
        return reply.status(404).send({ message: 'Prototype not found' });
      }

      // Check delete permission
      if (!(await canDeletePrototype(userId, prototype))) {
        return reply.status(403).send({ message: 'Access denied' });
      }

      await db.delete(prototypes).where(eq(prototypes.id, prototype.id));

      return { success: true };
    }
  );

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

  /**
   * POST /api/prototypes/:slug/duplicate
   * Duplicate a prototype
   */
  app.post<{ Params: PrototypeParams }>(
    '/:slug/duplicate',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const { slug } = request.params;
      const userId = getAuthUser(request).id;

      try {
        // Get the original prototype
        const [original] = await db
          .select()
          .from(prototypes)
          .where(eq(prototypes.slug, slug))
          .limit(1);

        if (!original) {
          return reply.status(404).send({ message: 'Prototype not found' });
        }

        // Check access (user must be able to view the original)
        if (!(await canAccessPrototype(userId, original))) {
          return reply.status(403).send({ message: 'Access denied' });
        }

        // For team prototypes, check that user can create in that team
        if (original.teamId) {
          const membership = await getTeamMembership(userId, original.teamId);
          if (!membership || !hasPermission(membership.role as Role, ROLES.TEAM_MEMBER)) {
            return reply.status(403).send({ message: 'Cannot create prototypes in this team' });
          }
        }

        // Create new slug and name, auto-resolving collisions
        const newSlug = nanoid(10);
        let newName = `Copy of ${original.name}`;
        if (original.teamId && await isNameTaken(original.teamId, newName)) {
          for (let i = 2; i <= 100; i++) {
            const candidate = `Copy of ${original.name} (${i})`;
            if (!(await isNameTaken(original.teamId, candidate))) {
              newName = candidate;
              break;
            }
          }
        }
        const branchSlug = toBranchSlug(newName);

        // Create the duplicate - ensure grapesData has a default value
        const dupHtml = original.htmlContent || '';
        const dupGrapesData = original.grapesData || {};
        const contentChecksum = await computeContentChecksum(dupHtml, dupGrapesData);

        const duplicate = await insertWithBranchSlug(db, {
          slug: newSlug,
          name: newName,
          description: original.description,
          htmlContent: dupHtml,
          grapesData: dupGrapesData,
          contentChecksum,
          teamId: original.teamId,
          createdBy: userId,
          branchSlug,
        });

        return reply.status(201).send(duplicate);
      } catch (error) {
        if (error instanceof Error && error.message.includes('duplicate key')) {
          return reply.status(409).send({ message: 'A prototype with this name already exists' });
        }
        throw error;
      }
    }
  );
}
