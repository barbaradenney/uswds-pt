/**
 * Authentication Plugin
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { eq } from 'drizzle-orm';
import { db, users, type User } from '../db/index.js';
import { DEFAULT_JWT_SECRET_DEV } from '../constants.js';
import { normalizeEmail } from '../lib/email.js';

/**
 * Shared select/returning fields for user queries (excludes sensitive fields).
 * Built as a function so `users` column references are resolved at call time,
 * not at module-load time — which avoids breakage when tests mock `../db/index.js`
 * without exporting the `users` table object.
 */
function userPublicFields() {
  return {
    id: users.id,
    email: users.email,
    name: users.name,
    organizationId: users.organizationId,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    isActive: users.isActive,
    githubId: users.githubId,
    githubUsername: users.githubUsername,
    githubTokenExpiresAt: users.githubTokenExpiresAt,
    avatarUrl: users.avatarUrl,
  } as const;
}


async function authPluginImpl(app: FastifyInstance) {
  // Register JWT plugin
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET_DEV,
    sign: { algorithm: 'HS256' },
    verify: { algorithms: ['HS256'] },
  });

  // Authenticate decorator
  app.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    }
  );
}

// Use fastify-plugin to expose decorators to parent scope
export const authPlugin = fastifyPlugin(authPluginImpl);

/**
 * Find a user by email
 */
export async function findUserByEmail(email: string): Promise<Omit<User, 'githubAccessToken'> | null> {
  const [user] = await db
    .select({
      ...userPublicFields(),
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);

  return user || null;
}

/**
 * Find a user by ID
 */
export async function findUserById(
  id: string
): Promise<Omit<User, 'passwordHash' | 'githubAccessToken'> | null> {
  const [user] = await db
    .select(userPublicFields())
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user || null;
}

/**
 * Find a user by GitHub ID
 */
export async function findUserByGithubId(githubId: number): Promise<Omit<User, 'passwordHash' | 'githubAccessToken'> | null> {
  const [user] = await db
    .select(userPublicFields())
    .from(users)
    .where(eq(users.githubId, githubId))
    .limit(1);

  return user || null;
}

/**
 * Create a new user via OAuth (no password)
 */
export async function createOAuthUser(
  email: string,
  name: string | undefined,
  githubId: number,
  githubUsername: string,
  githubAccessToken: string,
  avatarUrl?: string,
): Promise<Omit<User, 'passwordHash' | 'githubAccessToken'>> {
  const [user] = await db
    .insert(users)
    .values({
      email: normalizeEmail(email),
      name,
      githubId,
      githubUsername,
      githubAccessToken,
      avatarUrl,
    })
    .returning(userPublicFields());

  return user;
}

/**
 * Link GitHub account to an existing user
 */
export async function linkGithubToUser(
  userId: string,
  githubId: number,
  githubUsername: string,
  githubAccessToken: string,
  avatarUrl?: string,
): Promise<void> {
  await db
    .update(users)
    .set({
      githubId,
      githubUsername,
      githubAccessToken,
      avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Update stored GitHub access token for a user
 */
export async function updateGithubToken(
  userId: string,
  githubAccessToken: string,
): Promise<void> {
  await db
    .update(users)
    .set({
      githubAccessToken,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
