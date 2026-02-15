/**
 * Permission Middleware
 * Handles role-based access control for organizations and teams
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { teamMemberships, teams, users } from '../db/schema.js';
import { hasPermission, Role, ROLES } from '../db/roles.js';

// Extend FastifyRequest to include team membership info
declare module 'fastify' {
  interface FastifyRequest {
    teamMembership?: {
      id: string;
      teamId: string;
      userId: string;
      role: string;
      joinedAt: Date;
      invitedBy: string | null;
    };
    userOrganizationId?: string;
  }
}

/**
 * Get the authenticated user from the request
 */
export function getAuthUser(request: FastifyRequest): { id: string; email: string } {
  return request.user as { id: string; email: string };
}

/**
 * Middleware to load user's organization ID into request
 */
export async function loadUserOrganization(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const authUser = getAuthUser(request);

  const [user] = await db
    .select({ organizationId: users.organizationId })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (user?.organizationId) {
    request.userOrganizationId = user.organizationId;
  }
}

/**
 * Middleware to require the user to be a member of the specified team
 * Attaches the membership to request.teamMembership
 */
export function requireTeamMember(teamIdParam: string = 'teamId') {
  return async (
    request: FastifyRequest<{ Params: Record<string, string> }>,
    reply: FastifyReply
  ): Promise<void> => {
    const authUser = getAuthUser(request);
    const teamId = request.params[teamIdParam];

    if (!teamId) {
      return reply.status(400).send({ message: 'Team ID is required' });
    }

    const [membership] = await db
      .select()
      .from(teamMemberships)
      .where(
        and(
          eq(teamMemberships.teamId, teamId),
          eq(teamMemberships.userId, authUser.id)
        )
      )
      .limit(1);

    if (!membership) {
      return reply.status(403).send({ message: 'Not a member of this team' });
    }

    request.teamMembership = membership;
  };
}

/**
 * Middleware to require a minimum role level in the team
 * Must be used after requireTeamMember
 */
export function requireTeamRole(requiredRole: Role) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const membership = request.teamMembership;

    if (!membership) {
      return reply.status(500).send({
        message: 'Team membership not loaded. Use requireTeamMember first.',
      });
    }

    const userRole = membership.role as Role;

    if (!hasPermission(userRole, requiredRole)) {
      return reply.status(403).send({
        message: `Requires ${requiredRole} role or higher`,
      });
    }
  };
}

/**
 * Middleware to require org_admin role
 * Checks if user is org_admin in any team within their organization
 */
export async function requireOrgAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authUser = getAuthUser(request);

  // Get user's organization
  const [user] = await db
    .select({ organizationId: users.organizationId })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!user?.organizationId) {
    return reply.status(403).send({ message: 'User does not belong to an organization' });
  }

  // Check if user has org_admin role in any team
  const [adminMembership] = await db
    .select()
    .from(teamMemberships)
    .innerJoin(teams, eq(teamMemberships.teamId, teams.id))
    .where(
      and(
        eq(teamMemberships.userId, authUser.id),
        eq(teamMemberships.role, ROLES.ORG_ADMIN),
        eq(teams.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!adminMembership) {
    return reply.status(403).send({ message: 'Requires organization admin role' });
  }

  request.userOrganizationId = user.organizationId;
}

/**
 * Get the user's highest role across all their team memberships
 */
export async function getUserHighestRole(userId: string): Promise<Role | null> {
  const memberships = await db
    .select({ role: teamMemberships.role })
    .from(teamMemberships)
    .where(eq(teamMemberships.userId, userId));

  if (memberships.length === 0) {
    return null;
  }

  // Find highest role
  const roleHierarchy: Role[] = [
    ROLES.ORG_ADMIN,
    ROLES.TEAM_ADMIN,
    ROLES.TEAM_MEMBER,
    ROLES.TEAM_VIEWER,
  ];

  for (const role of roleHierarchy) {
    if (memberships.some((m) => m.role === role)) {
      return role;
    }
  }

  return ROLES.TEAM_VIEWER;
}

/**
 * Check if user is a member of the specified organization
 */
export async function isUserInOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const [user] = await db
    .select({ organizationId: users.organizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.organizationId === organizationId;
}

/**
 * Check if user has org_admin role in the specified organization.
 * Pure boolean helper (no reply side-effects) for use in route handlers
 * that need creator-or-admin authorization logic.
 */
export async function isOrgAdmin(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const [adminMembership] = await db
    .select({ id: teamMemberships.id })
    .from(teamMemberships)
    .innerJoin(teams, eq(teamMemberships.teamId, teams.id))
    .where(
      and(
        eq(teamMemberships.userId, userId),
        eq(teamMemberships.role, ROLES.ORG_ADMIN),
        eq(teams.organizationId, organizationId)
      )
    )
    .limit(1);

  return !!adminMembership;
}
