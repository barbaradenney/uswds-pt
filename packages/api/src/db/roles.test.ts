import { describe, it, expect } from 'vitest';
import { ROLES, ROLE_HIERARCHY, hasPermission, canAssignRole, getAssignableRoles, Role } from './roles';

describe('ROLES', () => {
  it('should have all expected roles defined', () => {
    expect(ROLES.ORG_ADMIN).toBe('org_admin');
    expect(ROLES.TEAM_ADMIN).toBe('team_admin');
    expect(ROLES.TEAM_MEMBER).toBe('team_member');
    expect(ROLES.TEAM_VIEWER).toBe('team_viewer');
  });
});

describe('ROLE_HIERARCHY', () => {
  it('should have correct hierarchy levels', () => {
    expect(ROLE_HIERARCHY.org_admin).toBeGreaterThan(ROLE_HIERARCHY.team_admin);
    expect(ROLE_HIERARCHY.team_admin).toBeGreaterThan(ROLE_HIERARCHY.team_member);
    expect(ROLE_HIERARCHY.team_member).toBeGreaterThan(ROLE_HIERARCHY.team_viewer);
  });
});

describe('hasPermission', () => {
  it('should return true when user role is higher than required', () => {
    expect(hasPermission(ROLES.ORG_ADMIN, ROLES.TEAM_ADMIN)).toBe(true);
    expect(hasPermission(ROLES.ORG_ADMIN, ROLES.TEAM_VIEWER)).toBe(true);
    expect(hasPermission(ROLES.TEAM_ADMIN, ROLES.TEAM_MEMBER)).toBe(true);
  });

  it('should return true when user role equals required role', () => {
    expect(hasPermission(ROLES.ORG_ADMIN, ROLES.ORG_ADMIN)).toBe(true);
    expect(hasPermission(ROLES.TEAM_VIEWER, ROLES.TEAM_VIEWER)).toBe(true);
  });

  it('should return false when user role is lower than required', () => {
    expect(hasPermission(ROLES.TEAM_VIEWER, ROLES.TEAM_MEMBER)).toBe(false);
    expect(hasPermission(ROLES.TEAM_MEMBER, ROLES.TEAM_ADMIN)).toBe(false);
    expect(hasPermission(ROLES.TEAM_ADMIN, ROLES.ORG_ADMIN)).toBe(false);
  });

  it('should return false for unknown roles', () => {
    expect(hasPermission('unknown' as Role, ROLES.TEAM_VIEWER)).toBe(false);
    expect(hasPermission(ROLES.TEAM_VIEWER, 'unknown' as Role)).toBe(false);
  });
});

describe('canAssignRole', () => {
  it('should allow org_admin to assign roles below them', () => {
    expect(canAssignRole(ROLES.ORG_ADMIN, ROLES.TEAM_ADMIN)).toBe(true);
    expect(canAssignRole(ROLES.ORG_ADMIN, ROLES.TEAM_MEMBER)).toBe(true);
    expect(canAssignRole(ROLES.ORG_ADMIN, ROLES.TEAM_VIEWER)).toBe(true);
  });

  it('should not allow users to assign their own role', () => {
    expect(canAssignRole(ROLES.ORG_ADMIN, ROLES.ORG_ADMIN)).toBe(false);
    expect(canAssignRole(ROLES.TEAM_ADMIN, ROLES.TEAM_ADMIN)).toBe(false);
  });

  it('should allow team_admin to assign roles below them', () => {
    expect(canAssignRole(ROLES.TEAM_ADMIN, ROLES.TEAM_MEMBER)).toBe(true);
    expect(canAssignRole(ROLES.TEAM_ADMIN, ROLES.TEAM_VIEWER)).toBe(true);
  });

  it('should not allow team_admin to assign org_admin', () => {
    expect(canAssignRole(ROLES.TEAM_ADMIN, ROLES.ORG_ADMIN)).toBe(false);
  });

  it('should not allow team_member or team_viewer to assign roles', () => {
    expect(canAssignRole(ROLES.TEAM_MEMBER, ROLES.TEAM_VIEWER)).toBe(false);
    expect(canAssignRole(ROLES.TEAM_VIEWER, ROLES.TEAM_VIEWER)).toBe(false);
  });

  it('should return false for unknown roles', () => {
    expect(canAssignRole('unknown' as Role, ROLES.TEAM_VIEWER)).toBe(false);
  });
});

describe('getAssignableRoles', () => {
  it('should return roles below org_admin level', () => {
    const roles = getAssignableRoles(ROLES.ORG_ADMIN);
    expect(roles).toContain(ROLES.TEAM_ADMIN);
    expect(roles).toContain(ROLES.TEAM_MEMBER);
    expect(roles).toContain(ROLES.TEAM_VIEWER);
    expect(roles).not.toContain(ROLES.ORG_ADMIN);
  });

  it('should return roles below team_admin level', () => {
    const roles = getAssignableRoles(ROLES.TEAM_ADMIN);
    expect(roles).toContain(ROLES.TEAM_MEMBER);
    expect(roles).toContain(ROLES.TEAM_VIEWER);
    expect(roles).not.toContain(ROLES.TEAM_ADMIN);
    expect(roles).not.toContain(ROLES.ORG_ADMIN);
  });

  it('should return empty array for lowest role', () => {
    const roles = getAssignableRoles(ROLES.TEAM_VIEWER);
    expect(roles).toHaveLength(0);
  });

  it('should return empty array for unknown role', () => {
    const roles = getAssignableRoles('unknown' as Role);
    expect(roles).toHaveLength(0);
  });
});
