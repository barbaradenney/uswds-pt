/**
 * Authentication Plugin
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db, users, type User } from '../db/index.js';
import { BCRYPT_SALT_ROUNDS, DEFAULT_JWT_SECRET } from '../constants.js';
import { normalizeEmail } from '../lib/email.js';


async function authPluginImpl(app: FastifyInstance) {
  // Register JWT plugin
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
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
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a new user
 */
export async function createUser(
  email: string,
  password: string,
  name?: string
): Promise<Omit<User, 'passwordHash' | 'githubAccessToken'>> {
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      email: normalizeEmail(email),
      passwordHash,
      name,
    })
    .returning({
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
    });

  return user;
}

/**
 * Find a user by email
 */
export async function findUserByEmail(email: string): Promise<Omit<User, 'githubAccessToken'> | null> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      organizationId: users.organizationId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      isActive: users.isActive,
      githubId: users.githubId,
      githubUsername: users.githubUsername,
      githubTokenExpiresAt: users.githubTokenExpiresAt,
      avatarUrl: users.avatarUrl,
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
    .select({
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
    })
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
    .select({
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
    })
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
    .returning({
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
    });

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
