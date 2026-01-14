/**
 * USWDS Prototyping Tool API
 * Main entry point
 */

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authPlugin } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { prototypeRoutes } from './routes/prototypes.js';
import { previewRoutes } from './routes/preview.js';
import { organizationRoutes } from './routes/organizations.js';
import { teamRoutes } from './routes/teams.js';
import { invitationRoutes } from './routes/invitations.js';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: import('fastify').FastifyRequest,
      reply: import('fastify').FastifyReply
    ) => Promise<void>;
  }
}

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';

  const app = Fastify({
    logger: isProduction
      ? { level: process.env.LOG_LEVEL || 'info' }
      : {
          level: process.env.LOG_LEVEL || 'info',
          transport: {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        },
  });

  // Register CORS - allow frontend URLs
  // CORS_ORIGINS can be a comma-separated list of allowed origins
  const additionalOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : [];

  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
    ...additionalOrigins,
  ].filter(Boolean);

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
  });

  // Register auth plugin
  await app.register(authPlugin);

  // Register routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(prototypeRoutes, { prefix: '/api/prototypes' });
  await app.register(previewRoutes, { prefix: '/api/preview' });
  await app.register(organizationRoutes, { prefix: '/api/organizations' });
  await app.register(teamRoutes, { prefix: '/api/teams' });
  await app.register(invitationRoutes, { prefix: '/api/invitations' });

  // Global error handler to log all errors
  app.setErrorHandler((error, request, reply) => {
    app.log.error({
      err: error,
      url: request.url,
      method: request.method,
    }, 'Request error');

    reply.status(error.statusCode || 500).send({
      message: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500,
    });
  });

  // Health check endpoint
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Start server
  const port = parseInt(process.env.PORT || '3001', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    app.log.info(`Server running on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
