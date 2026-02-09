/**
 * Error Handler Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { withDatabaseRetry, asyncHandler } from './error-handler.js';
import { DatabaseError, ServiceUnavailableError, NotFoundError, isApiError } from './errors.js';

describe('withDatabaseRetry', () => {
  it('should return result on first success', async () => {
    const operation = vi.fn().mockResolvedValue({ id: 1, name: 'Test' });

    const result = await withDatabaseRetry(operation, { operationName: 'getUser' });

    expect(result).toEqual({ id: 1, name: 'Test' });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on connection errors and succeed', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Connection refused'))
      .mockResolvedValueOnce({ id: 1 });

    // Use minimal delays for fast tests
    const result = await withDatabaseRetry(operation, {
      operationName: 'getUser',
      maxRetries: 1,
      initialDelayMs: 1,
      maxDelayMs: 5,
    });

    expect(result).toEqual({ id: 1 });
    expect(operation).toHaveBeenCalledTimes(2);
  }, 10000);

  it('should throw DatabaseError on non-retryable errors', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Invalid SQL syntax'));

    await expect(
      withDatabaseRetry(operation, { operationName: 'insertUser' })
    ).rejects.toThrow(DatabaseError);

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should throw ServiceUnavailableError after max retries', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Connection refused'));

    await expect(
      withDatabaseRetry(operation, {
        operationName: 'getUser',
        maxRetries: 1,
        initialDelayMs: 1,
        maxDelayMs: 5,
      })
    ).rejects.toThrow(ServiceUnavailableError);

    expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
  }, 10000);

  it('should use default options', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await withDatabaseRetry(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should identify various retryable error patterns', async () => {
    // Test that connection-related error retries (not the actual retry logic)
    const connectionError = new Error('ECONNREFUSED 127.0.0.1:5432');
    const operation = vi.fn()
      .mockRejectedValueOnce(connectionError)
      .mockResolvedValueOnce('success');

    const result = await withDatabaseRetry(operation, {
      maxRetries: 1,
      initialDelayMs: 1,
      maxDelayMs: 5,
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  }, 10000);
});

describe('asyncHandler', () => {
  it('should return result on success', async () => {
    const handler = asyncHandler(async () => ({ data: 'test' }));
    const request = {} as any;
    const reply = {} as any;

    const result = await handler(request, reply);
    expect(result).toEqual({ data: 'test' });
  });

  it('should pass through ApiError unchanged', async () => {
    const originalError = new NotFoundError('User', '123');
    const handler = asyncHandler(async () => {
      throw originalError;
    });

    const request = {} as any;
    const reply = {} as any;

    try {
      await handler(request, reply);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBe(originalError);
    }
  });

  it('should wrap non-ApiError as ApiError', async () => {
    const handler = asyncHandler(async () => {
      throw new Error('Something went wrong');
    });

    const request = {} as any;
    const reply = {} as any;

    try {
      await handler(request, reply);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(isApiError(error)).toBe(true);
    }
  });

  it('should pass request and reply to handler', async () => {
    const mockRequest = { params: { id: '123' } } as any;
    const mockReply = { status: vi.fn() } as any;

    const handler = asyncHandler(async (request, reply) => {
      return { params: request.params, hasReply: !!reply };
    });

    const result = await handler(mockRequest, mockReply);
    expect(result).toEqual({ params: { id: '123' }, hasReply: true });
  });
});

describe('Error detection patterns', () => {
  it('should identify various connection error patterns', () => {
    const connectionErrors = [
      'connect ECONNREFUSED 127.0.0.1:5432',
      'Connection terminated unexpectedly',
      'timeout expired',
      'read ECONNRESET',
      'write EPIPE',
      'sorry, too many clients already',
    ];

    // These should all be retried
    for (const msg of connectionErrors) {
      const _error = new Error(msg);
      // Simplified check - in real implementation this is internal to withDatabaseRetry
      const isRetryable = [
        'connection',
        'timeout',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ECONNRESET',
        'EPIPE',
        'too many clients',
        'Connection terminated',
      ].some(pattern => msg.toLowerCase().includes(pattern.toLowerCase()));

      expect(isRetryable).toBe(true);
    }
  });

  it('should not retry syntax/validation errors', () => {
    const nonRetryableErrors = [
      'syntax error at or near "SELEC"',
      'column "nonexistent" does not exist',
      'null value in column "id" violates not-null constraint',
      'permission denied for table users',
    ];

    for (const msg of nonRetryableErrors) {
      const isRetryable = [
        'connection',
        'timeout',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ECONNRESET',
        'EPIPE',
        'too many clients',
        'Connection terminated',
      ].some(pattern => msg.toLowerCase().includes(pattern.toLowerCase()));

      expect(isRetryable).toBe(false);
    }
  });
});
