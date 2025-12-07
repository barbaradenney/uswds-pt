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

/**
 * Users table
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  prototypes: many(prototypes),
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
    createdBy: uuid('created_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    isPublic: boolean('is_public').default(false).notNull(),
  },
  (table) => ({
    slugIdx: index('prototypes_slug_idx').on(table.slug),
    createdByIdx: index('prototypes_created_by_idx').on(table.createdBy),
  })
);

export const prototypesRelations = relations(prototypes, ({ one, many }) => ({
  creator: one(users, {
    fields: [prototypes.createdBy],
    references: [users.id],
  }),
  versions: many(prototypeVersions),
}));

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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by').references(() => users.id),
  },
  (table) => ({
    prototypeIdx: index('versions_prototype_idx').on(table.prototypeId),
    uniqueVersion: unique('versions_unique').on(table.prototypeId, table.versionNumber),
  })
);

export const prototypeVersionsRelations = relations(prototypeVersions, ({ one }) => ({
  prototype: one(prototypes, {
    fields: [prototypeVersions.prototypeId],
    references: [prototypes.id],
  }),
  creator: one(users, {
    fields: [prototypeVersions.createdBy],
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
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Prototype = typeof prototypes.$inferSelect;
export type NewPrototype = typeof prototypes.$inferInsert;

export type PrototypeVersion = typeof prototypeVersions.$inferSelect;
export type NewPrototypeVersion = typeof prototypeVersions.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
