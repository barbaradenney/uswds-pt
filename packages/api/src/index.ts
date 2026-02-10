/**
 * USWDS Prototyping Tool API
 * Main entry point
 */

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { authPlugin } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { prototypeRoutes } from './routes/prototypes.js';
import { previewRoutes } from './routes/preview.js';
import { organizationRoutes } from './routes/organizations.js';
import { teamRoutes } from './routes/teams.js';
import { invitationRoutes } from './routes/invitations.js';
import { symbolRoutes } from './routes/symbols.js';
import { githubAuthRoutes } from './routes/github-auth.js';
import { githubRoutes, githubTeamRoutes } from './routes/github.js';
import { errorHandler, checkDatabaseHealth } from './lib/error-handler.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

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

  // Fail fast if JWT_SECRET is not set in production
  if (isProduction && !process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable must be set in production');
    process.exit(1);
  }

  // Validate GitHub OAuth configuration: if any GitHub env var is set, all must be set
  const githubVars = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_CALLBACK_URL'] as const;
  const setGithubVars = githubVars.filter((v) => process.env[v]);
  if (setGithubVars.length > 0 && setGithubVars.length < githubVars.length) {
    const missing = githubVars.filter((v) => !process.env[v]);
    console.error(`FATAL: Partial GitHub OAuth config — missing: ${missing.join(', ')}`);
    process.exit(1);
  }

  // ENCRYPTION_KEY is required when GitHub OAuth is configured (used for token encryption)
  if (setGithubVars.length > 0 && !process.env.ENCRYPTION_KEY) {
    console.error('FATAL: ENCRYPTION_KEY must be set when GitHub OAuth is configured');
    process.exit(1);
  }

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
    // Trust proxy headers when behind a reverse proxy (Render, etc.)
    ...(isProduction && { trustProxy: true }),
    // Allow large payloads for htmlContent (2MB) + grapesData (5MB)
    bodyLimit: 8 * 1024 * 1024, // 8MB
  });

  // Register CORS - allow frontend URLs
  // CORS_ORIGINS can be a comma-separated list of allowed origins
  const additionalOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : [];

  // CORS uses origin (protocol + host + port) — strip any path from FRONTEND_URL
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  let frontendOrigin = frontendUrl;
  try {
    const parsed = new URL(frontendUrl);
    frontendOrigin = parsed.origin;
  } catch { /* use as-is if not a valid URL */ }

  const allowedOrigins = [
    frontendOrigin,
    ...(!isProduction ? ['http://localhost:5173'] : []), // Vite dev server (dev only)
    ...additionalOrigins,
  ].filter(Boolean);

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
  });

  // Register global rate limiting: 100 requests per minute per IP
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Register auth plugin
  await app.register(authPlugin);

  // Register error handler plugin
  await app.register(errorHandler, {
    includeStackTrace: !isProduction,
    logAllErrors: !isProduction,
  });

  // Register routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(prototypeRoutes, { prefix: '/api/prototypes' });
  await app.register(previewRoutes, { prefix: '/api/preview' });
  await app.register(organizationRoutes, { prefix: '/api/organizations' });
  await app.register(teamRoutes, { prefix: '/api/teams' });
  await app.register(symbolRoutes, { prefix: '/api/teams' });
  await app.register(invitationRoutes, { prefix: '/api/invitations' });
  await app.register(githubAuthRoutes, { prefix: '/api/auth' });
  await app.register(githubRoutes, { prefix: '/api/github' });
  await app.register(githubTeamRoutes, { prefix: '/api/teams' });

  // Health check endpoint with database status (exempt from rate limiting)
  app.get('/api/health', { config: { rateLimit: false } as Record<string, unknown> }, async () => {
    const dbHealth = await checkDatabaseHealth(db, sql);

    return {
      status: dbHealth.healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealth.healthy ? 'healthy' : 'unhealthy',
          latencyMs: dbHealth.latencyMs,
          ...(dbHealth.error && { error: dbHealth.error }),
        },
      },
    };
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
