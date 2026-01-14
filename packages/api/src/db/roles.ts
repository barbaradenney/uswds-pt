/**
 * Role Constants and Permission Utilities
 * Defines the role hierarchy for organizations and teams
 */

/**
 * Available roles in the system
 */
export const ROLES = {
  /** Full organization access, can manage teams and all members */
  ORG_ADMIN: 'org_admin',
  /** Can manage team members, edit all team content */
  TEAM_ADMIN: 'team_admin',
  /** Can create/edit own content, view team content */
  TEAM_MEMBER: 'team_member',
  /** Read-only access to team content */
  TEAM_VIEWER: 'team_viewer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Role hierarchy levels - higher number = more permissions
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLES.ORG_ADMIN]: 100,
  [ROLES.TEAM_ADMIN]: 75,
  [ROLES.TEAM_MEMBER]: 50,
  [ROLES.TEAM_VIEWER]: 25,
};

/**
 * Check if a user's role has sufficient permissions for a required role
 * @param userRole - The role the user has
 * @param requiredRole - The minimum role required
 * @returns true if user has sufficient permissions
 */
export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a user can assign a specific role
 * Users can only assign roles at or below their own level
 * @param userRole - The role of the user trying to assign
 * @param roleToAssign - The role being assigned
 * @returns true if user can assign the role
 */
export function canAssignRole(userRole: Role, roleToAssign: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[roleToAssign];
}

/**
 * Get all roles that a user can assign based on their role
 * @param userRole - The role of the user
 * @returns Array of roles the user can assign
 */
export function getAssignableRoles(userRole: Role): Role[] {
  const userLevel = ROLE_HIERARCHY[userRole];
  return (Object.entries(ROLE_HIERARCHY) as [Role, number][])
    .filter(([, level]) => level <= userLevel)
    .map(([role]) => role);
}

/**
 * Invitation status values
 */
export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];

/**
 * Invitation expiry duration in days
 */
export const INVITATION_EXPIRY_DAYS = 7;
