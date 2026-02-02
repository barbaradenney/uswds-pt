/**
 * Tests for retry utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, classifyError, type ErrorType } from './retry';

describe('retry utility', () => {
  describe('classifyError', () => {
    it('should classify 401 as auth error', () => {
      const response = { status: 401 } as Response;
      expect(classifyError(null, response)).toBe('auth');
    });

    it('should classify 403 as auth error', () => {
      const response = { status: 403 } as Response;
      expect(classifyError(null, response)).toBe('auth');
    });

    it('should classify 429 as rate_limit', () => {
      const response = { status: 429 } as Response;
      expect(classifyError(null, response)).toBe('rate_limit');
    });

    it('should classify 4xx as permanent', () => {
      const response = { status: 400 } as Response;
      expect(classifyError(null, response)).toBe('permanent');
    });

    it('should classify 5xx as retriable', () => {
      const response = { status: 500 } as Response;
      expect(classifyError(null, response)).toBe('retriable');
    });

    it('should classify network errors as retriable', () => {
      expect(classifyError(new Error('network error'))).toBe('retriable');
      expect(classifyError(new Error('fetch failed'))).toBe('retriable');
      expect(classifyError(new TypeError('Failed to fetch'))).toBe('retriable');
    });

    it('should classify timeout errors as retriable', () => {
      expect(classifyError(new Error('timeout'))).toBe('retriable');
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(operation, { maxRetries: 3 });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await withRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 1, // Very short delay for tests
        jitter: false,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should exhaust retries and fail', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('always fails'));
      const onExhausted = vi.fn();

      const result = await withRetry(operation, {
        maxRetries: 2,
        initialDelayMs: 1,
        jitter: false,
        onExhausted,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.attempts).toBe(3); // 1 initial + 2 retries
      expect(onExhausted).toHaveBeenCalledWith(3, expect.any(Error));
    });

    it('should call onRetry for each retry attempt', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      const onRetry = vi.fn();

      await withRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 1,
        jitter: false,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number));
    });

    it('should call onSuccess when operation succeeds', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const onSuccess = vi.fn();

      await withRetry(operation, {
        maxRetries: 3,
        onSuccess,
      });

      expect(onSuccess).toHaveBeenCalledWith(1);
    });

    it('should not retry permanent errors', async () => {
      // Create an error that will be classified as permanent
      const error = new Error('abort');
      const operation = vi.fn().mockRejectedValue(error);

      const result = await withRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 1,
      });

      expect(result.success).toBe(false);
      // Should only attempt once for permanent errors
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect abort signal', async () => {
      const controller = new AbortController();
      const operation = vi.fn().mockResolvedValue('success');

      // Abort immediately
      controller.abort();

      const result = await withRetry(operation, {
        maxRetries: 3,
        signal: controller.signal,
      });

      expect(result.success).toBe(false);
      expect((result.error as Error).message).toContain('abort');
    });

    it('should use exponential backoff', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const delays: number[] = [];
      const onRetry = vi.fn((_attempt, _error, delay) => {
        delays.push(delay);
      });

      await withRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 10,
        backoffMultiplier: 2,
        jitter: false,
        onRetry,
      });

      // First retry: 10ms, Second retry: 20ms
      expect(delays[0]).toBe(10);
      expect(delays[1]).toBe(20);
    });
  });
});
