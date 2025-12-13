/**
 * Authentication Plugin
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db, users, type User } from '../db/index.js';

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string; email: string };
  }
}

// JWT payload type
interface JWTPayload {
  id: string;
  email: string;
}

async function authPluginImpl(app: FastifyInstance) {
  // Register JWT plugin
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
  });

  // Authenticate decorator
  app.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({ error: 'Unauthorized' });
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
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
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
): Promise<Omit<User, 'passwordHash'>> {
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      name,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      isActive: users.isActive,
    });

  return user;
}

/**
 * Find a user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  return user || null;
}

/**
 * Find a user by ID
 */
export async function findUserById(
  id: string
): Promise<Omit<User, 'passwordHash'> | null> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user || null;
}
