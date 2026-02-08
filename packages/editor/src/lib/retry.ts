/**
 * Retry Utility
 *
 * Provides reliable retry logic with exponential backoff for network operations.
 * Used by save operations to handle transient failures.
 */

import { createDebugLogger } from '@uswds-pt/shared';

const debug = createDebugLogger('Retry');

/**
 * Error classification for retry decisions
 */
export type ErrorType = 'retriable' | 'permanent' | 'auth' | 'rate_limit' | 'offline';

/**
 * Classify an error to determine if it should be retried
 */
export function classifyError(error: unknown, response?: Response | null): ErrorType {
  // Check for offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'offline';
  }

  // Check response status codes
  if (response) {
    const status = response.status;

    // Auth errors - don't retry, need re-authentication
    if (status === 401 || status === 403) {
      return 'auth';
    }

    // Rate limiting - retry with longer delay
    if (status === 429) {
      return 'rate_limit';
    }

    // Client errors (4xx) - don't retry, request is invalid
    if (status >= 400 && status < 500) {
      return 'permanent';
    }

    // Server errors (5xx) - retry
    if (status >= 500) {
      return 'retriable';
    }
  }

  // Check error types
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors - retry
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('socket')
    ) {
      return 'retriable';
    }

    // Abort errors - don't retry
    if (message.includes('abort')) {
      return 'permanent';
    }
  }

  // TypeError usually means network failure
  if (error instanceof TypeError) {
    return 'retriable';
  }

  // Default to retriable for unknown errors
  return 'retriable';
}

/**
 * Options for retry operation
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms before first retry (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay between retries (default: 30000) */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Add random jitter to delays (default: true) */
  jitter?: boolean;
  /** Operation name for logging */
  operationName?: string;
  /** Callback when retry is attempted */
  onRetry?: (attempt: number, error: unknown, delay: number) => void;
  /** Callback when operation succeeds */
  onSuccess?: (attempt: number) => void;
  /** Callback when all retries exhausted */
  onExhausted?: (attempts: number, lastError: unknown) => void;
  /** AbortSignal to cancel retries */
  signal?: AbortSignal;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
  errorType?: ErrorType;
}

/**
 * Execute an operation with retry logic and exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    jitter = true,
    operationName = 'operation',
    onRetry,
    onSuccess,
    onExhausted,
    signal,
  } = options;

  let lastError: unknown;
  let lastErrorType: ErrorType = 'retriable';

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    // Check for abort
    if (signal?.aborted) {
      return {
        success: false,
        error: new Error('Operation aborted'),
        attempts: attempt,
        errorType: 'permanent',
      };
    }

    try {
      debug(`${operationName} attempt ${attempt}/${maxRetries + 1}`);
      const result = await operation();

      onSuccess?.(attempt);
      debug(`${operationName} succeeded on attempt ${attempt}`);

      return {
        success: true,
        data: result,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;

      // Respect explicit noRetry flag from caller
      if ((error as any)?.noRetry) {
        lastErrorType = 'permanent';
        debug(`${operationName} error marked as non-retriable`);
        break;
      }

      lastErrorType = classifyError(error);

      debug(`${operationName} failed (attempt ${attempt}):`, error, 'type:', lastErrorType);

      // Don't retry permanent or auth errors
      if (lastErrorType === 'permanent' || lastErrorType === 'auth') {
        debug(`${operationName} error is not retriable, giving up`);
        break;
      }

      // Check if we've exhausted retries
      if (attempt > maxRetries) {
        debug(`${operationName} exhausted all ${maxRetries} retries`);
        onExhausted?.(attempt, lastError);
        break;
      }

      // Calculate delay with exponential backoff
      let delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );

      // Add jitter (0-50% of delay)
      if (jitter) {
        delay = delay + Math.random() * delay * 0.5;
      }

      // Longer delay for rate limiting
      if (lastErrorType === 'rate_limit') {
        delay = Math.max(delay, 5000);
      }

      debug(`${operationName} retrying in ${Math.round(delay)}ms`);
      onRetry?.(attempt, error, delay);

      // Wait before retry
      await sleep(delay, signal);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxRetries + 1,
    errorType: lastErrorType,
  };
}

/**
 * Sleep for a given duration, respecting abort signal
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    const timeout = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Aborted'));
    });
  });
}

/**
 * Wrapper for fetch with retry logic
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const result = await withRetry<Response>(
    async () => {
      const response = await fetch(input, init);

      // Throw for server errors to trigger retry
      if (response.status >= 500) {
        const errorType = classifyError(null, response);
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).response = response;
        (error as any).errorType = errorType;
        throw error;
      }

      return response;
    },
    {
      operationName: `fetch ${typeof input === 'string' ? input : input.toString()}`,
      ...retryOptions,
    }
  );

  if (!result.success) {
    throw result.error;
  }

  return result.data!;
}

/**
 * Online status monitoring
 */
export interface OnlineStatus {
  isOnline: boolean;
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
}

let onlineStatus: OnlineStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastOnlineAt: null,
  lastOfflineAt: null,
};

const onlineListeners: Set<(status: OnlineStatus) => void> = new Set();

// Initialize online monitoring
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    onlineStatus = {
      isOnline: true,
      lastOnlineAt: new Date(),
      lastOfflineAt: onlineStatus.lastOfflineAt,
    };
    debug('Network came online');
    onlineListeners.forEach((listener) => listener(onlineStatus));
  });

  window.addEventListener('offline', () => {
    onlineStatus = {
      isOnline: false,
      lastOnlineAt: onlineStatus.lastOnlineAt,
      lastOfflineAt: new Date(),
    };
    debug('Network went offline');
    onlineListeners.forEach((listener) => listener(onlineStatus));
  });
}

/**
 * Get current online status
 */
export function getOnlineStatus(): OnlineStatus {
  return { ...onlineStatus };
}

/**
 * Subscribe to online status changes
 */
export function subscribeToOnlineStatus(listener: (status: OnlineStatus) => void): () => void {
  onlineListeners.add(listener);
  return () => onlineListeners.delete(listener);
}

/**
 * Check if we're currently online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
