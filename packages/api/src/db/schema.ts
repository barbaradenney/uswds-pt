/**
 * Database Schema
 * Using Drizzle ORM with PostgreSQL
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// Organizations & Teams
// ============================================================================

/**
 * Organizations table
 * Top-level grouping for agencies/companies
 */
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).unique().notNull(),
    description: text('description'),
    logoUrl: varchar('logo_url', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => ({
    slugIdx: index('organizations_slug_idx').on(table.slug),
  })
);

/**
 * Teams table
 * Subdivisions within organizations
 */
export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => ({
    orgIdx: index('teams_organization_idx').on(table.organizationId),
    uniqueSlugPerOrg: unique('teams_org_slug_unique').on(table.organizationId, table.slug),
  })
);

/**
 * Team memberships table
 * Join table connecting users to teams with roles
 */
export const teamMemberships = pgTable(
  'team_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .references(() => teams.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: varchar('role', { length: 50 }).notNull().default('team_member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
    invitedBy: uuid('invited_by').references(() => users.id),
  },
  (table) => ({
    teamIdx: index('memberships_team_idx').on(table.teamId),
    userIdx: index('memberships_user_idx').on(table.userId),
    uniqueMembership: unique('memberships_unique').on(table.teamId, table.userId),
  })
);

/**
 * Invitations table
 * Pending invitations for users to join teams
 */
export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    teamId: uuid('team_id')
      .references(() => teams.id, { onDelete: 'cascade' })
      .notNull(),
    role: varchar('role', { length: 50 }).notNull().default('team_member'),
    token: varchar('token', { length: 64 }).unique().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    invitedBy: uuid('invited_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
  },
  (table) => ({
    tokenIdx: index('invitations_token_idx').on(table.token),
    emailIdx: index('invitations_email_idx').on(table.email),
    teamIdx: index('invitations_team_idx').on(table.teamId),
  })
);

// ============================================================================
// Users
// ============================================================================

/**
 * Users table
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  organizationId: uuid('organization_id').references(() => organizations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

// ============================================================================
// Relations
// ============================================================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  teams: many(teams),
  users: many(users),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
  memberships: many(teamMemberships),
  invitations: many(invitations),
  prototypes: many(prototypes),
  symbols: many(symbols),
}));

export const teamMembershipsRelations = relations(teamMemberships, ({ one }) => ({
  team: one(teams, {
    fields: [teamMemberships.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMemberships.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [teamMemberships.invitedBy],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  inviter: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  prototypes: many(prototypes),
  teamMemberships: many(teamMemberships),
}));

/**
 * Prototypes table
 */
export const prototypes = pgTable(
  'prototypes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 21 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    htmlContent: text('html_content').notNull().default(''),
    grapesData: jsonb('grapes_data').notNull().default({}),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    isPublic: boolean('is_public').default(false).notNull(),
    version: integer('version').notNull().default(1),
    contentChecksum: varchar('content_checksum', { length: 64 }),
    // No .references() here — Drizzle can't express the circular FK between
    // prototypes and prototype_branches at the table-definition level. The FK
    // constraint is created via the SQL migration (add-branching.ts) instead.
    activeBranchId: uuid('active_branch_id'),
    mainHtmlContent: text('main_html_content'),
    mainGrapesData: jsonb('main_grapes_data'),
    mainContentChecksum: varchar('main_content_checksum', { length: 64 }),
  },
  (table) => ({
    slugIdx: index('prototypes_slug_idx').on(table.slug),
    createdByIdx: index('prototypes_created_by_idx').on(table.createdBy),
    teamIdx: index('prototypes_team_idx').on(table.teamId),
  })
);

export const prototypesRelations = relations(prototypes, ({ one, many }) => ({
  team: one(teams, {
    fields: [prototypes.teamId],
    references: [teams.id],
  }),
  creator: one(users, {
    fields: [prototypes.createdBy],
    references: [users.id],
  }),
  versions: many(prototypeVersions),
  branches: many(prototypeBranches),
  activeBranch: one(prototypeBranches, {
    fields: [prototypes.activeBranchId],
    references: [prototypeBranches.id],
  }),
}));

/**
 * Prototype branches table
 * Stores saved state of non-active branches.
 * The active branch's content lives in the prototypes table directly.
 */
export const prototypeBranches = pgTable(
  'prototype_branches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    prototypeId: uuid('prototype_id')
      .references(() => prototypes.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    htmlContent: text('html_content').notNull().default(''),
    grapesData: jsonb('grapes_data').notNull().default({}),
    contentChecksum: varchar('content_checksum', { length: 64 }),
    forkedFromVersion: integer('forked_from_version'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => ({
    prototypeIdx: index('branches_prototype_idx').on(table.prototypeId),
    uniqueSlug: unique('branches_prototype_slug_unique').on(table.prototypeId, table.slug),
  })
);

/**
 * Prototype versions table
 */
export const prototypeVersions = pgTable(
  'prototype_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    prototypeId: uuid('prototype_id')
      .references(() => prototypes.id, { onDelete: 'cascade' })
      .notNull(),
    versionNumber: integer('version_number').notNull(),
    htmlContent: text('html_content'),
    grapesData: jsonb('grapes_data'),
    label: varchar('label', { length: 255 }),
    contentChecksum: varchar('content_checksum', { length: 64 }),
    branchId: uuid('branch_id').references(() => prototypeBranches.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by').references(() => users.id),
  },
  (table) => ({
    prototypeIdx: index('versions_prototype_idx').on(table.prototypeId),
    uniqueVersion: unique('versions_unique').on(table.prototypeId, table.versionNumber),
    branchIdx: index('versions_branch_idx').on(table.branchId),
  })
);

export const prototypeBranchesRelations = relations(prototypeBranches, ({ one }) => ({
  prototype: one(prototypes, {
    fields: [prototypeBranches.prototypeId],
    references: [prototypes.id],
  }),
  creator: one(users, {
    fields: [prototypeBranches.createdBy],
    references: [users.id],
  }),
}));

export const prototypeVersionsRelations = relations(prototypeVersions, ({ one }) => ({
  prototype: one(prototypes, {
    fields: [prototypeVersions.prototypeId],
    references: [prototypes.id],
  }),
  creator: one(users, {
    fields: [prototypeVersions.createdBy],
    references: [users.id],
  }),
  branch: one(prototypeBranches, {
    fields: [prototypeVersions.branchId],
    references: [prototypeBranches.id],
  }),
}));

/**
 * Global symbols table
 * Stores reusable symbol components that can be shared across prototypes within a team
 */
export const symbols = pgTable(
  'symbols',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .references(() => teams.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    symbolData: jsonb('symbol_data').notNull(), // GrapesJS symbol structure
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdx: index('symbols_team_idx').on(table.teamId),
    createdByIdx: index('symbols_created_by_idx').on(table.createdBy),
  })
);

export const symbolsRelations = relations(symbols, ({ one }) => ({
  team: one(teams, {
    fields: [symbols.teamId],
    references: [teams.id],
  }),
  creator: one(users, {
    fields: [symbols.createdBy],
    references: [users.id],
  }),
}));

/**
 * Audit logs table (for future use)
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    action: varchar('action', { length: 50 }).notNull(),
    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    resourceId: uuid('resource_id'),
    metadata: jsonb('metadata'),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('audit_user_idx').on(table.userId),
    createdAtIdx: index('audit_created_at_idx').on(table.createdAt),
  })
);

/**
 * Type exports
 */
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type TeamMembership = typeof teamMemberships.$inferSelect;
export type NewTeamMembership = typeof teamMemberships.$inferInsert;

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Prototype = typeof prototypes.$inferSelect;
export type NewPrototype = typeof prototypes.$inferInsert;

export type PrototypeBranch = typeof prototypeBranches.$inferSelect;
export type NewPrototypeBranch = typeof prototypeBranches.$inferInsert;

export type PrototypeVersion = typeof prototypeVersions.$inferSelect;
export type NewPrototypeVersion = typeof prototypeVersions.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type Symbol = typeof symbols.$inferSelect;
export type NewSymbol = typeof symbols.$inferInsert;
