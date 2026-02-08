/**
 * Error Classes Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalError,
  ServiceUnavailableError,
  DatabaseError,
  DatabaseConnectionError,
  isApiError,
  wrapError,
  ErrorCodes,
} from './errors.js';

describe('ApiError', () => {
  it('should create error with all properties', () => {
    const error = new ApiError('Test error', 400, 'TEST_ERROR', { foo: 'bar' });

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.details).toEqual({ foo: 'bar' });
    expect(error.name).toBe('ApiError');
  });

  it('should serialize to JSON correctly', () => {
    const error = new ApiError('Test error', 400, 'TEST_ERROR', { foo: 'bar' });
    const json = error.toJSON();

    expect(json).toEqual({
      error: {
        message: 'Test error',
        code: 'TEST_ERROR',
        statusCode: 400,
        details: { foo: 'bar' },
      },
    });
  });

  it('should serialize without details if not provided', () => {
    const error = new ApiError('Test error', 400, 'TEST_ERROR');
    const json = error.toJSON();

    expect(json.error.details).toBeUndefined();
  });
});

describe('Client Errors (4xx)', () => {
  describe('BadRequestError', () => {
    it('should have status 400', () => {
      const error = new BadRequestError();
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
    });

    it('should use custom message', () => {
      const error = new BadRequestError('Custom message');
      expect(error.message).toBe('Custom message');
    });

    it('should include details', () => {
      const error = new BadRequestError('Invalid field', { field: 'email' });
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('UnauthorizedError', () => {
    it('should have status 401', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Authentication required');
    });
  });

  describe('ForbiddenError', () => {
    it('should have status 403', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Access denied');
    });
  });

  describe('NotFoundError', () => {
    it('should have status 404', () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should format message with resource name', () => {
      const error = new NotFoundError('User');
      expect(error.message).toBe('User not found');
    });

    it('should format message with resource and identifier', () => {
      const error = new NotFoundError('User', '123');
      expect(error.message).toBe("User '123' not found");
      expect(error.details).toEqual({ resource: 'User', identifier: '123' });
    });
  });

  describe('ConflictError', () => {
    it('should have status 409', () => {
      const error = new ConflictError();
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('ValidationError', () => {
    it('should have status 422', () => {
      const error = new ValidationError();
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should include validation errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'name', message: 'Name is required' },
      ];
      const error = new ValidationError('Validation failed', errors);
      expect(error.details).toEqual({ errors });
    });
  });

  describe('RateLimitError', () => {
    it('should have status 429', () => {
      const error = new RateLimitError();
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMITED');
    });

    it('should include retry after seconds', () => {
      const error = new RateLimitError(60);
      expect(error.details).toEqual({ retryAfterSeconds: 60 });
    });
  });
});

describe('Server Errors (5xx)', () => {
  describe('InternalError', () => {
    it('should have status 500', () => {
      const error = new InternalError();
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('Internal server error');
    });
  });

  describe('ServiceUnavailableError', () => {
    it('should have status 503', () => {
      const error = new ServiceUnavailableError('database');
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.message).toBe('database is temporarily unavailable');
    });

    it('should use custom message', () => {
      const error = new ServiceUnavailableError('database', 'Database is undergoing maintenance', 300);
      expect(error.message).toBe('Database is undergoing maintenance');
      expect(error.details).toEqual({ service: 'database', retryAfterSeconds: 300 });
    });
  });

  describe('DatabaseError', () => {
    it('should have status 503', () => {
      const error = new DatabaseError();
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('DATABASE_ERROR');
    });

    it('should store original error', () => {
      const original = new Error('Connection failed');
      const error = new DatabaseError('DB failed', original);
      expect(error.originalError).toBe(original);
    });
  });

  describe('DatabaseConnectionError', () => {
    it('should extend DatabaseError', () => {
      const error = new DatabaseConnectionError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.message).toBe('Unable to connect to database');
    });
  });
});

describe('isApiError', () => {
  it('should return true for ApiError instances', () => {
    expect(isApiError(new ApiError('test', 400, 'TEST'))).toBe(true);
    expect(isApiError(new BadRequestError())).toBe(true);
    expect(isApiError(new NotFoundError())).toBe(true);
    expect(isApiError(new InternalError())).toBe(true);
  });

  it('should return false for non-ApiError', () => {
    expect(isApiError(new Error('test'))).toBe(false);
    expect(isApiError({ message: 'test' })).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
    expect(isApiError('error')).toBe(false);
  });
});

describe('wrapError', () => {
  it('should return ApiError unchanged', () => {
    const original = new NotFoundError('User');
    const wrapped = wrapError(original);
    expect(wrapped).toBe(original);
  });

  it('should wrap regular Error as InternalError with generic message', () => {
    const error = new Error('Something went wrong');
    const wrapped = wrapError(error);
    expect(wrapped).toBeInstanceOf(InternalError);
    // Internal error details are not leaked to the client
    expect(wrapped.message).toBe('An unexpected error occurred');
  });

  it('should detect connection errors', () => {
    const error = new Error('Connection refused');
    const wrapped = wrapError(error);
    expect(wrapped).toBeInstanceOf(DatabaseConnectionError);
  });

  it('should detect duplicate key errors', () => {
    const error = new Error('duplicate key value violates unique constraint');
    const wrapped = wrapError(error);
    expect(wrapped).toBeInstanceOf(ConflictError);
  });

  it('should detect foreign key errors', () => {
    const error = new Error('foreign key constraint violation');
    const wrapped = wrapError(error);
    expect(wrapped).toBeInstanceOf(BadRequestError);
  });

  it('should wrap non-Error values', () => {
    const wrapped = wrapError('string error');
    expect(wrapped).toBeInstanceOf(InternalError);
    expect(wrapped.message).toBe('An unexpected error occurred');
  });
});

describe('ErrorCodes', () => {
  it('should contain all error codes', () => {
    expect(ErrorCodes.BAD_REQUEST).toBe('BAD_REQUEST');
    expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCodes.CONFLICT).toBe('CONFLICT');
    expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED');
    expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
    expect(ErrorCodes.DATABASE_ERROR).toBe('DATABASE_ERROR');
  });
});
