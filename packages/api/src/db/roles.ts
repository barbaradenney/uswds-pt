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
  const userLevel = ROLE_HIERARCHY[userRole];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];
  if (userLevel === undefined || requiredLevel === undefined) {
    return false;
  }
  return userLevel >= requiredLevel;
}

/**
 * Check if a user can assign a specific role
 * Only admins (org_admin or team_admin) can assign roles, and only roles below their level
 * @param userRole - The role of the user trying to assign
 * @param roleToAssign - The role being assigned
 * @returns true if user can assign the role
 */
export function canAssignRole(userRole: Role, roleToAssign: Role): boolean {
  const userLevel = ROLE_HIERARCHY[userRole];
  const assignLevel = ROLE_HIERARCHY[roleToAssign];
  const minAdminLevel = ROLE_HIERARCHY[ROLES.TEAM_ADMIN];

  // Must be at least team_admin to assign any roles
  if (userLevel === undefined || assignLevel === undefined || userLevel < minAdminLevel) {
    return false;
  }

  // Can only assign roles below their own level
  return userLevel > assignLevel;
}

/**
 * Get all roles that a user can assign based on their role
 * Only admins can assign roles
 * @param userRole - The role of the user
 * @returns Array of roles the user can assign (roles below their level)
 */
export function getAssignableRoles(userRole: Role): Role[] {
  const userLevel = ROLE_HIERARCHY[userRole];
  const minAdminLevel = ROLE_HIERARCHY[ROLES.TEAM_ADMIN];

  // Must be at least team_admin to assign any roles
  if (userLevel === undefined || userLevel < minAdminLevel) {
    return [];
  }

  return (Object.entries(ROLE_HIERARCHY) as [Role, number][])
    .filter(([, level]) => level < userLevel)
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
