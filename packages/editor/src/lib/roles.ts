/**
 * Role utility functions
 * Shared utilities for displaying role information in the UI
 */

import type { Role } from '@uswds-pt/shared';

/**
 * Get a short display label for a role
 */
export function getRoleBadge(role: Role): string {
  switch (role) {
    case 'org_admin':
      return 'Org Admin';
    case 'team_admin':
      return 'Admin';
    case 'team_member':
      return 'Member';
    case 'team_viewer':
      return 'Viewer';
    default:
      return role;
  }
}

/**
 * Get a longer description of what a role can do
 */
export function getRoleDescription(role: Role): string {
  switch (role) {
    case 'org_admin':
      return 'Full access to organization and all teams';
    case 'team_admin':
      return 'Can manage team members and all content';
    case 'team_member':
      return 'Can create and edit prototypes';
    case 'team_viewer':
      return 'Read-only access to team content';
    default:
      return '';
  }
}

/**
 * Get a full display name for a role (used in dropdowns, etc.)
 */
export function getRoleDisplayName(role: Role): string {
  switch (role) {
    case 'org_admin':
      return 'Organization Admin';
    case 'team_admin':
      return 'Team Admin';
    case 'team_member':
      return 'Team Member';
    case 'team_viewer':
      return 'Viewer';
    default:
      return role;
  }
}
