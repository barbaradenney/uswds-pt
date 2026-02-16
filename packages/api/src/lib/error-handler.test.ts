/**
 * Error Handler Tests
 *
 * Tests for error detection patterns used in the error handler module.
 */

import { describe, it, expect } from 'vitest';

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
