/**
 * Test Application Builder
 *
 * Creates a configured Fastify instance for testing routes
 * without starting a server.
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { authPlugin } from '../plugins/auth.js';
import { authRoutes } from '../routes/auth.js';
import { prototypeRoutes } from '../routes/prototypes.js';
import { prototypeVersionRoutes } from '../routes/prototype-versions.js';
import { prototypePushRoutes } from '../routes/prototype-push.js';
import { teamRoutes } from '../routes/teams.js';
import { errorHandler } from '../lib/error-handler.js';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: import('fastify').FastifyRequest,
      reply: import('fastify').FastifyReply
    ) => Promise<void>;
  }
}

export interface BuildAppOptions {
  /** Whether to include error handler plugin */
  includeErrorHandler?: boolean;
}

/**
 * Build a Fastify app instance for testing
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const { includeErrorHandler = true } = options;

  const app = Fastify({
    logger: false, // Disable logging in tests
  });

  // Register CORS
  await app.register(cors, {
    origin: ['http://localhost:3000'],
    credentials: true,
  });

  // Register auth plugin
  await app.register(authPlugin);

  // Register error handler
  if (includeErrorHandler) {
    await app.register(errorHandler, {
      includeStackTrace: false,
      logAllErrors: false,
    });
  }

  // Register routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(prototypeRoutes, { prefix: '/api/prototypes' });
  await app.register(prototypeVersionRoutes, { prefix: '/api/prototypes' });
  await app.register(prototypePushRoutes, { prefix: '/api/prototypes' });
  await app.register(teamRoutes, { prefix: '/api/teams' });

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}

/**
 * Generate a valid JWT token for testing
 */
export function generateTestToken(app: FastifyInstance, payload: { id: string; email: string }): string {
  return app.jwt.sign(payload, { expiresIn: '1h' });
}

/**
 * Create auth header with bearer token
 */
export function authHeader(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` };
}
