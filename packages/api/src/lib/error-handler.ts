/**
 * Error Handler Plugin
 *
 * Fastify plugin for consistent error handling across all routes.
 * Provides:
 * - Structured error responses
 * - Error logging with context
 * - Database operation wrapper with retry logic
 */

import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import {
  ApiError,
  isApiError,
  wrapError,
  InternalError,
  DatabaseError,
  ServiceUnavailableError,
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

interface DatabaseOperationOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial delay between retries in ms */
  initialDelayMs?: number;
  /** Maximum delay between retries in ms */
  maxDelayMs?: number;
  /** Operation name for logging */
  operationName?: string;
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
    const apiError = isApiError(error) ? error : wrapError(error);

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
  fastify: '4.x',
});

// ============================================================================
// Database Operation Wrapper
// ============================================================================

/**
 * Check if an error is retryable (connection/timeout issues)
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const retryablePatterns = [
    'connection',
    'timeout',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ECONNRESET',
    'EPIPE',
    'too many clients',
    'Connection terminated',
  ];

  const message = error.message.toLowerCase();
  return retryablePatterns.some(pattern => message.includes(pattern.toLowerCase()));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, initialDelayMs: number, maxDelayMs: number): number {
  // Exponential backoff: delay = min(initialDelay * 2^attempt, maxDelay)
  const exponentialDelay = initialDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter (random 0-25% of delay)
  const jitter = Math.random() * cappedDelay * 0.25;
  return cappedDelay + jitter;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrap database operations with retry logic
 *
 * @example
 * const result = await withDatabaseRetry(
 *   async () => db.select().from(users).where(eq(users.id, id)),
 *   { operationName: 'getUser' }
 * );
 */
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  options: DatabaseOperationOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 100,
    maxDelayMs = 2000,
    operationName = 'database operation',
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry non-retryable errors
      if (!isRetryableError(error)) {
        throw new DatabaseError(
          `${operationName} failed: ${lastError.message}`,
          lastError
        );
      }

      // Don't retry after max attempts
      if (attempt >= maxRetries) {
        break;
      }

      // Wait before retry
      const delay = calculateDelay(attempt, initialDelayMs, maxDelayMs);
      console.warn(
        `[DB Retry] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
        `retrying in ${Math.round(delay)}ms: ${lastError.message}`
      );
      await sleep(delay);
    }
  }

  // All retries exhausted
  throw new ServiceUnavailableError(
    'database',
    `${operationName} failed after ${maxRetries + 1} attempts`,
    5 // Suggest retry after 5 seconds
  );
}

// ============================================================================
// Route Handler Wrapper
// ============================================================================

type AsyncRouteHandler<T> = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<T>;

/**
 * Wrap async route handlers to ensure errors are properly caught
 * Note: Fastify 4.x handles async errors automatically, but this wrapper
 * provides explicit error handling if needed
 *
 * @example
 * app.get('/users/:id', asyncHandler(async (request, reply) => {
 *   const user = await getUser(request.params.id);
 *   if (!user) throw new NotFoundError('User', request.params.id);
 *   return user;
 * }));
 */
export function asyncHandler<T>(handler: AsyncRouteHandler<T>): AsyncRouteHandler<T> {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await handler(request, reply);
    } catch (error) {
      // Re-throw ApiErrors as-is
      if (isApiError(error)) {
        throw error;
      }
      // Wrap unknown errors
      throw wrapError(error);
    }
  };
}

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
    const result = await Promise.race([
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
