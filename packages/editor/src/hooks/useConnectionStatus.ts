/**
 * Connection Status Hook
 *
 * Provides real-time online/offline status for the UI.
 */

import { useState, useEffect } from 'react';
import { subscribeToOnlineStatus, isOnline } from '../lib/retry';

export interface ConnectionStatus {
  /** Whether the browser is online */
  isOnline: boolean;
  /** Whether we recently reconnected (for showing "reconnected" message) */
  justReconnected: boolean;
  /** Timestamp of last status change */
  lastChange: Date | null;
}

/**
 * Hook to track connection status
 *
 * @returns Connection status object
 */
export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(() => ({
    isOnline: isOnline(),
    justReconnected: false,
    lastChange: null,
  }));

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus((onlineStatus) => {
      setStatus((prev) => {
        const wasOffline = !prev.isOnline;
        const isNowOnline = onlineStatus.isOnline;
        const justReconnected = wasOffline && isNowOnline;

        return {
          isOnline: isNowOnline,
          justReconnected,
          lastChange: new Date(),
        };
      });
    });

    return unsubscribe;
  }, []);

  // Clear "just reconnected" after 3 seconds
  useEffect(() => {
    if (status.justReconnected) {
      const timeout = setTimeout(() => {
        setStatus((prev) => ({ ...prev, justReconnected: false }));
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [status.justReconnected]);

  return status;
}
