/**
 * Prototype Helpers
 * Shared utility functions used across prototype route modules
 */

import { eq, ne, and, count, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { prototypes, teamMemberships } from '../db/schema.js';
import { hasPermission, Role, ROLES } from '../db/roles.js';

// Max serialized size for grapesData (5MB)
export const MAX_GRAPES_DATA_SIZE = 5 * 1024 * 1024;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Column selection for prototype list queries. Excludes large payload fields
 * (htmlContent, grapesData) that aren't needed in list views.
 */
export const prototypeListColumns = {
  id: prototypes.id,
  slug: prototypes.slug,
  name: prototypes.name,
  description: prototypes.description,
  teamId: prototypes.teamId,
  createdBy: prototypes.createdBy,
  createdAt: prototypes.createdAt,
  updatedAt: prototypes.updatedAt,
  isPublic: prototypes.isPublic,
  version: prototypes.version,
  contentChecksum: prototypes.contentChecksum,
  branchSlug: prototypes.branchSlug,
  lastGithubPushAt: prototypes.lastGithubPushAt,
  lastGithubCommitSha: prototypes.lastGithubCommitSha,
};

export interface PrototypeParams {
  slug: string;
}

export interface VersionParams extends PrototypeParams {
  version: string;
}

export interface CompareParams extends PrototypeParams {
  v1: string;
  v2: string;
}

export interface ListQuery {
  teamId?: string;
  page?: string;
  limit?: string;
}

/**
 * Normalize GrapesJS project data to ensure consistent structure
 * This fixes issues where new prototypes don't have properly initialized pages
 */
export function normalizeGrapesData(data: Record<string, unknown> | undefined): Record<string, unknown> {
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

/**
 * Validate grapesData shape and size.
 * Uses Fastify's bodyLimit for primary byte-size enforcement;
 * this is a secondary check using Buffer.byteLength for accuracy.
 */
export function validateGrapesData(data: Record<string, unknown> | undefined): string | null {
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

const MAX_SYMBOL_DATA_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Validate symbolData size.
 */
export function validateSymbolData(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  const byteSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
  if (byteSize > MAX_SYMBOL_DATA_SIZE) {
    return `symbolData exceeds maximum size of ${MAX_SYMBOL_DATA_SIZE / (1024 * 1024)}MB`;
  }
  return null;
}

/**
 * Check if user is a member of the specified team and get their role
 */
export async function getTeamMembership(userId: string, teamId: string) {
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
export async function canAccessPrototype(userId: string, prototype: { teamId: string | null; createdBy: string }) {
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
export async function canEditPrototype(userId: string, prototype: { teamId: string | null; createdBy: string }) {
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
export async function canDeletePrototype(userId: string, prototype: { teamId: string | null; createdBy: string }) {
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
export async function isNameTaken(
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
