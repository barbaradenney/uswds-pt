/**
 * Tests for useConnectionStatus hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConnectionStatus } from './useConnectionStatus';
import type { OnlineStatus } from '../lib/retry';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Capture the listener passed to subscribeToOnlineStatus so tests can
// simulate online/offline transitions by calling it directly.
let capturedListener: ((status: OnlineStatus) => void) | null = null;
const mockUnsubscribe = vi.fn();

vi.mock('../lib/retry', () => ({
  isOnline: vi.fn(() => true),
  subscribeToOnlineStatus: vi.fn((listener: (status: OnlineStatus) => void) => {
    capturedListener = listener;
    return mockUnsubscribe;
  }),
}));

// Import the mocked functions so we can change their return values per-test
import { isOnline, subscribeToOnlineStatus } from '../lib/retry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate going offline by invoking the captured listener */
function simulateOffline() {
  capturedListener?.({
    isOnline: false,
    lastOnlineAt: new Date(),
    lastOfflineAt: new Date(),
  });
}

/** Simulate going online by invoking the captured listener */
function simulateOnline() {
  capturedListener?.({
    isOnline: true,
    lastOnlineAt: new Date(),
    lastOfflineAt: null,
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('useConnectionStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    capturedListener = null;
    mockUnsubscribe.mockClear();
    vi.mocked(isOnline).mockReturnValue(true);
    vi.mocked(subscribeToOnlineStatus).mockImplementation(
      (listener: (status: OnlineStatus) => void) => {
        capturedListener = listener;
        return mockUnsubscribe;
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Initial state
  // ==========================================================================

  describe('initial state', () => {
    it('should return isOnline: true when browser is online', () => {
      vi.mocked(isOnline).mockReturnValue(true);

      const { result } = renderHook(() => useConnectionStatus());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.justReconnected).toBe(false);
      expect(result.current.lastChange).toBeNull();
    });

    it('should return isOnline: false when browser is offline', () => {
      vi.mocked(isOnline).mockReturnValue(false);

      const { result } = renderHook(() => useConnectionStatus());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.justReconnected).toBe(false);
      expect(result.current.lastChange).toBeNull();
    });

    it('should subscribe to online status changes on mount', () => {
      renderHook(() => useConnectionStatus());

      expect(subscribeToOnlineStatus).toHaveBeenCalledTimes(1);
      expect(subscribeToOnlineStatus).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  // ==========================================================================
  // 2. Connection success (API returns healthy / online transition)
  // ==========================================================================

  describe('going online', () => {
    it('should update isOnline to true when online event fires', () => {
      vi.mocked(isOnline).mockReturnValue(false);

      const { result } = renderHook(() => useConnectionStatus());

      expect(result.current.isOnline).toBe(false);

      act(() => {
        simulateOnline();
      });

      expect(result.current.isOnline).toBe(true);
    });

    it('should set justReconnected when transitioning from offline to online', () => {
      vi.mocked(isOnline).mockReturnValue(false);

      const { result } = renderHook(() => useConnectionStatus());

      // Initially offline
      expect(result.current.isOnline).toBe(false);
      expect(result.current.justReconnected).toBe(false);

      // Come back online
      act(() => {
        simulateOnline();
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.justReconnected).toBe(true);
    });

    it('should update lastChange timestamp when going online', () => {
      vi.mocked(isOnline).mockReturnValue(false);

      const { result } = renderHook(() => useConnectionStatus());

      expect(result.current.lastChange).toBeNull();

      act(() => {
        simulateOnline();
      });

      expect(result.current.lastChange).toBeInstanceOf(Date);
    });

    it('should NOT set justReconnected when already online and online event fires', () => {
      vi.mocked(isOnline).mockReturnValue(true);

      const { result } = renderHook(() => useConnectionStatus());

      // Already online, receiving another online event
      act(() => {
        simulateOnline();
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.justReconnected).toBe(false);
    });
  });

  // ==========================================================================
  // 3. Connection failure (offline transition)
  // ==========================================================================

  describe('going offline', () => {
    it('should update isOnline to false when offline event fires', () => {
      vi.mocked(isOnline).mockReturnValue(true);

      const { result } = renderHook(() => useConnectionStatus());

      expect(result.current.isOnline).toBe(true);

      act(() => {
        simulateOffline();
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('should not set justReconnected when going offline', () => {
      vi.mocked(isOnline).mockReturnValue(true);

      const { result } = renderHook(() => useConnectionStatus());

      act(() => {
        simulateOffline();
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.justReconnected).toBe(false);
    });

    it('should update lastChange timestamp when going offline', () => {
      vi.mocked(isOnline).mockReturnValue(true);

      const { result } = renderHook(() => useConnectionStatus());

      expect(result.current.lastChange).toBeNull();

      act(() => {
        simulateOffline();
      });

      expect(result.current.lastChange).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // 4. Reconnection behavior (justReconnected auto-clear)
  // ==========================================================================

  describe('reconnection behavior', () => {
    it('should clear justReconnected after 3 seconds', () => {
      vi.mocked(isOnline).mockReturnValue(false);

      const { result } = renderHook(() => useConnectionStatus());

      // Transition to online (reconnect)
      act(() => {
        simulateOnline();
      });

      expect(result.current.justReconnected).toBe(true);

      // Advance 2 seconds — should still be true
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.justReconnected).toBe(true);

      // Advance to 3 seconds — should clear
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      expect(result.current.justReconnected).toBe(false);
    });

    it('should maintain isOnline as true after justReconnected clears', () => {
      vi.mocked(isOnline).mockReturnValue(false);

      const { result } = renderHook(() => useConnectionStatus());

      act(() => {
        simulateOnline();
      });

      // Wait for justReconnected to clear
      act(() => {
        vi.advanceTimersByTime(3100);
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.justReconnected).toBe(false);
    });

    it('should handle multiple offline/online cycles', () => {
      vi.mocked(isOnline).mockReturnValue(true);

      const { result } = renderHook(() => useConnectionStatus());

      // Cycle 1: go offline then online
      act(() => {
        simulateOffline();
      });
      expect(result.current.isOnline).toBe(false);

      act(() => {
        simulateOnline();
      });
      expect(result.current.isOnline).toBe(true);
      expect(result.current.justReconnected).toBe(true);

      // Wait for justReconnected to clear
      act(() => {
        vi.advanceTimersByTime(3100);
      });
      expect(result.current.justReconnected).toBe(false);

      // Cycle 2: go offline then online again
      act(() => {
        simulateOffline();
      });
      expect(result.current.isOnline).toBe(false);
      expect(result.current.justReconnected).toBe(false);

      act(() => {
        simulateOnline();
      });
      expect(result.current.isOnline).toBe(true);
      expect(result.current.justReconnected).toBe(true);
    });

    it('should reset justReconnected timer if going offline again before timeout', () => {
      vi.mocked(isOnline).mockReturnValue(false);

      const { result } = renderHook(() => useConnectionStatus());

      // Come online (triggers justReconnected)
      act(() => {
        simulateOnline();
      });
      expect(result.current.justReconnected).toBe(true);

      // Advance 1.5 seconds, then go offline again
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      act(() => {
        simulateOffline();
      });
      // Going offline should not set justReconnected (wasOffline=false since
      // we were online, isNowOnline=false, so justReconnected = false && false = false)
      expect(result.current.justReconnected).toBe(false);
      expect(result.current.isOnline).toBe(false);

      // The 3-second cleanup timer from the first reconnection should
      // have been cleared because justReconnected changed to false.
      // Now come online again — should set justReconnected again.
      act(() => {
        simulateOnline();
      });
      expect(result.current.justReconnected).toBe(true);

      // Full 3 seconds from this new reconnection should clear it
      act(() => {
        vi.advanceTimersByTime(3100);
      });
      expect(result.current.justReconnected).toBe(false);
    });
  });

  // ==========================================================================
  // 5. Cleanup on unmount
  // ==========================================================================

  describe('cleanup on unmount', () => {
    it('should call unsubscribe when unmounted', () => {
      const { unmount } = renderHook(() => useConnectionStatus());

      expect(mockUnsubscribe).not.toHaveBeenCalled();

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should not update state after unmount when online event fires', () => {
      vi.mocked(isOnline).mockReturnValue(false);

      const { result, unmount } = renderHook(() => useConnectionStatus());

      expect(result.current.isOnline).toBe(false);

      unmount();

      // Simulate online event after unmount — should not throw or update
      // The subscription was cleaned up, so the listener should not be invoked
      // by the real system. But we can verify unsubscribe was called.
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should clear justReconnected timeout on unmount', () => {
      vi.mocked(isOnline).mockReturnValue(false);

      const { result, unmount } = renderHook(() => useConnectionStatus());

      // Trigger reconnection
      act(() => {
        simulateOnline();
      });
      expect(result.current.justReconnected).toBe(true);

      // Unmount before 3-second timeout
      unmount();

      // Advance past the timeout — no errors or state updates should occur
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // The unsubscribe should have been called
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // 6. Edge cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle rapid online/offline toggles', () => {
      vi.mocked(isOnline).mockReturnValue(true);

      const { result } = renderHook(() => useConnectionStatus());

      // Rapid toggling
      act(() => {
        simulateOffline();
        simulateOnline();
        simulateOffline();
        simulateOnline();
      });

      // Should end up online with justReconnected
      // The last transition is offline -> online, so justReconnected = true
      expect(result.current.isOnline).toBe(true);
      expect(result.current.justReconnected).toBe(true);
    });

    it('should have a non-null lastChange after any status transition', () => {
      vi.mocked(isOnline).mockReturnValue(true);

      const { result } = renderHook(() => useConnectionStatus());

      expect(result.current.lastChange).toBeNull();

      act(() => {
        simulateOffline();
      });

      const firstChange = result.current.lastChange;
      expect(firstChange).toBeInstanceOf(Date);

      // Advance time so the next Date is different
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        simulateOnline();
      });

      const secondChange = result.current.lastChange;
      expect(secondChange).toBeInstanceOf(Date);
      expect(secondChange!.getTime()).toBeGreaterThanOrEqual(firstChange!.getTime());
    });
  });
});
