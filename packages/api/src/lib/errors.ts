/**
 * Custom Error Classes
 *
 * Structured error types for consistent API error responses.
 * Each error class maps to specific HTTP status codes and includes
 * machine-readable error codes for client handling.
 */

/**
 * Base API Error class
 * All custom errors should extend this class
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// ============================================================================
// 4xx Client Errors
// ============================================================================

/**
 * 400 Bad Request
 * The request was malformed or contained invalid parameters
 */
export class BadRequestError extends ApiError {
  constructor(message = 'Bad request', details?: Record<string, unknown>) {
    super(message, 400, 'BAD_REQUEST', details);
    this.name = 'BadRequestError';
  }
}

/**
 * 401 Unauthorized
 * Authentication is required or credentials are invalid
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/**
 * 403 Forbidden
 * User is authenticated but lacks permission
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Access denied', details?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', details);
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found
 * The requested resource doesn't exist
 */
export class NotFoundError extends ApiError {
  constructor(resource = 'Resource', identifier?: string) {
    const message = identifier
      ? `${resource} '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', { resource, identifier });
    this.name = 'NotFoundError';
  }
}

/**
 * 409 Conflict
 * The request conflicts with current state (e.g., duplicate entry)
 */
export class ConflictError extends ApiError {
  constructor(message = 'Resource conflict', details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

/**
 * 422 Unprocessable Entity
 * Request was valid but cannot be processed (validation failed)
 */
export class ValidationError extends ApiError {
  constructor(
    message = 'Validation failed',
    errors?: Array<{ field: string; message: string }>
  ) {
    super(message, 422, 'VALIDATION_ERROR', { errors });
    this.name = 'ValidationError';
  }
}

/**
 * 429 Too Many Requests
 * Rate limit exceeded
 */
export class RateLimitError extends ApiError {
  constructor(
    retryAfterSeconds?: number,
    message = 'Too many requests, please try again later'
  ) {
    super(message, 429, 'RATE_LIMITED', { retryAfterSeconds });
    this.name = 'RateLimitError';
  }
}

// ============================================================================
// 5xx Server Errors
// ============================================================================

/**
 * 500 Internal Server Error
 * An unexpected error occurred
 */
export class InternalError extends ApiError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
    this.name = 'InternalError';
  }
}

/**
 * 503 Service Unavailable
 * Service is temporarily unavailable (e.g., database down)
 */
export class ServiceUnavailableError extends ApiError {
  constructor(
    service = 'service',
    message?: string,
    retryAfterSeconds?: number
  ) {
    super(
      message || `${service} is temporarily unavailable`,
      503,
      'SERVICE_UNAVAILABLE',
      { service, retryAfterSeconds }
    );
    this.name = 'ServiceUnavailableError';
  }
}

// ============================================================================
// Database-Specific Errors
// ============================================================================

/**
 * Database operation failed
 */
export class DatabaseError extends ApiError {
  public readonly originalError?: Error;

  constructor(
    message = 'Database operation failed',
    originalError?: Error
  ) {
    super(message, 503, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * Database connection failed after retries
 */
export class DatabaseConnectionError extends DatabaseError {
  constructor(message = 'Unable to connect to database') {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Wrap unknown errors in ApiError
 * Useful for consistent error handling
 */
export function wrapError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Check for common database error patterns (case-insensitive)
    if (message.includes('connection') || message.includes('econnrefused')) {
      return new DatabaseConnectionError(error.message);
    }
    if (message.includes('duplicate') || message.includes('unique')) {
      return new ConflictError('A record with this identifier already exists');
    }
    if (message.includes('foreign key')) {
      return new BadRequestError('Referenced record does not exist');
    }

    return new InternalError(error.message);
  }

  return new InternalError('An unexpected error occurred');
}

/**
 * Error codes for client handling
 */
export const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
