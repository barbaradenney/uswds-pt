/**
 * Error Handler Plugin
 *
 * Fastify plugin for consistent error handling across all API routes.
 * Provides:
 * - Structured error responses
 * - Error logging with context
 * - Database health check
 */

import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import {
  ApiError,
  isApiError,
  wrapError,
} from './errors.js';

// ============================================================================
// Types
// ============================================================================

interface ErrorHandlerOptions {
  /** Include stack traces in error responses (development only) */
  includeStackTrace?: boolean;
  /** Log all errors (not just 5xx) */
  logAllErrors?: boolean;
}

// ============================================================================
// Error Handler Plugin
// ============================================================================

async function errorHandlerPlugin(
  app: FastifyInstance,
  options: ErrorHandlerOptions = {}
) {
  const {
    includeStackTrace = process.env.NODE_ENV !== 'production',
    logAllErrors = false,
  } = options;

  /**
   * Global error handler
   * Converts all errors to structured API responses
   */
  app.setErrorHandler((error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    // Convert to ApiError if needed
    // Preserve Fastify's statusCode for validation/schema errors (they have statusCode but aren't ApiErrors)
    let apiError: ApiError;
    if (isApiError(error)) {
      apiError = error;
    } else if ('statusCode' in error && typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
      apiError = new ApiError(error.message, error.statusCode, 'VALIDATION_ERROR');
    } else {
      apiError = wrapError(error);
    }

    // Log errors
    const shouldLog = logAllErrors || apiError.statusCode >= 500;
    if (shouldLog) {
      app.log.error({
        err: {
          message: error.message,
          stack: error.stack,
          code: apiError.code,
        },
        request: {
          method: request.method,
          url: request.url,
          params: request.params,
          query: request.query,
          // Don't log body for security (might contain passwords)
          headers: {
            'user-agent': request.headers['user-agent'],
            'content-type': request.headers['content-type'],
          },
        },
        userId: (request as any).user?.id,
      }, `Request error: ${apiError.message}`);
    }

    // Build response
    const response: Record<string, unknown> = {
      error: {
        message: apiError.message,
        code: apiError.code,
        statusCode: apiError.statusCode,
      },
    };

    // Include details if present
    if (apiError.details) {
      (response.error as Record<string, unknown>).details = apiError.details;
    }

    // Include stack trace in development
    if (includeStackTrace && apiError.statusCode >= 500) {
      (response.error as Record<string, unknown>).stack = error.stack;
    }

    return reply.status(apiError.statusCode).send(response);
  });

  /**
   * Not found handler for undefined routes
   */
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      error: {
        message: `Route ${request.method} ${request.url} not found`,
        code: 'NOT_FOUND',
        statusCode: 404,
      },
    });
  });
}

export const errorHandler = fp(errorHandlerPlugin, {
  name: 'error-handler',
  fastify: '5.x',
});

// ============================================================================
// Health Check Helper
// ============================================================================

/**
 * Database health check with timeout
 */
export async function checkDatabaseHealth(
  db: { execute: (sql: any) => Promise<unknown> },
  sql: { raw: (query: string) => any },
  timeoutMs = 5000
): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();

  try {
    await Promise.race([
      db.execute(sql.raw('SELECT 1')),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), timeoutMs)
      ),
    ]);

    return {
      healthy: true,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
