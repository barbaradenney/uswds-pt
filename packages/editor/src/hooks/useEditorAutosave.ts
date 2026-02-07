/**
 * Unified Editor Autosave Hook
 *
 * Replaces the dual autosave system (timer + event-based) with a single
 * unified mechanism that uses the state machine for guards.
 *
 * Features:
 * - Debounced saves after content changes
 * - Maximum wait time to ensure periodic saves
 * - State machine integration for proper guards
 * - Pause/resume for operations like version restore
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { createDebugLogger } from '@uswds-pt/shared';
import type { UseEditorStateMachineReturn } from './useEditorStateMachine';

const debug = createDebugLogger('EditorAutosave');

export interface UseEditorAutosaveOptions {
  /** Whether autosave is enabled */
  enabled: boolean;
  /** State machine for guards */
  stateMachine: UseEditorStateMachineReturn;
  /** Function to perform the save - returns truthy value on success */
  onSave: () => Promise<unknown>;
  /** Debounce time in ms after last change (default: 5000) */
  debounceMs?: number;
  /** Shorter debounce for the first save before any save has happened (default: 500) */
  initialDebounceMs?: number;
  /** Maximum wait time before forcing save (default: 30000) */
  maxWaitMs?: number;
}

export interface UseEditorAutosaveReturn {
  /** Current autosave status */
  status: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  /** Timestamp of last successful autosave */
  lastSavedAt: Date | null;
  /** Whether autosave is currently active */
  isActive: boolean;
  /** Trigger a save due to content change */
  triggerChange: () => void;
  /** Pause autosave temporarily */
  pause: () => void;
  /** Resume autosave */
  resume: () => void;
  /** Mark content as saved (e.g., after manual save) */
  markSaved: () => void;
}

export function useEditorAutosave({
  enabled,
  stateMachine,
  onSave,
  debounceMs = 5000,
  initialDebounceMs = 500,
  maxWaitMs = 30000,
}: UseEditorAutosaveOptions): UseEditorAutosaveReturn {
  const [status, setStatus] = useState<UseEditorAutosaveReturn['status']>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const isPausedRef = useRef(false);

  // Refs for tracking state without causing re-renders
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstChangeTimeRef = useRef<number | null>(null);
  const hasPendingChangesRef = useRef(false);
  const changeCounterRef = useRef(0);
  const isMountedRef = useRef(true);

  // Clean up timeouts
  const clearTimeouts = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
      maxWaitTimeoutRef.current = null;
    }
    if (statusResetTimeoutRef.current) {
      clearTimeout(statusResetTimeoutRef.current);
      statusResetTimeoutRef.current = null;
    }
  }, []);

  // Safe status update that respects mount state
  const safeSetStatus = useCallback((newStatus: UseEditorAutosaveReturn['status']) => {
    if (isMountedRef.current) {
      setStatus(newStatus);
    }
  }, []);

  // Schedule status reset with cleanup
  const scheduleStatusReset = useCallback((delayMs: number) => {
    if (statusResetTimeoutRef.current) {
      clearTimeout(statusResetTimeoutRef.current);
    }
    statusResetTimeoutRef.current = setTimeout(() => {
      safeSetStatus('idle');
      statusResetTimeoutRef.current = null;
    }, delayMs);
  }, [safeSetStatus]);

  // Ref that always points to the latest performSave. Timeouts and closures
  // call performSaveRef.current() so they never invoke a stale version that
  // captured an old canAutosave value (e.g., false before dirty was set).
  const performSaveRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Perform the actual save
  const performSave = useCallback(async () => {
    // Check guards from state machine
    if (!stateMachine.canAutosave) {
      debug('Autosave skipped: canAutosave is false');
      return;
    }

    if (isPausedRef.current) {
      debug('Autosave skipped: paused');
      return;
    }

    if (!hasPendingChangesRef.current) {
      debug('Autosave skipped: no pending changes');
      return;
    }

    debug('Autosave starting...');
    safeSetStatus('saving');

    // Capture change counter before async save so we can detect new edits
    const countAtStart = changeCounterRef.current;

    try {
      const result = await onSave();

      // Check for truthy result (supports both boolean and Prototype | null)
      if (result) {
        // Only clear pending flag if no new changes arrived during save
        if (changeCounterRef.current === countAtStart) {
          hasPendingChangesRef.current = false;
          firstChangeTimeRef.current = null;
        }
        setLastSavedAt(new Date());
        safeSetStatus('saved');
        debug('Autosave successful');

        // Reset to idle after showing "saved" status
        scheduleStatusReset(3000);
      } else {
        safeSetStatus('error');
        debug('Autosave returned falsy value');

        // Reset to idle after showing error
        scheduleStatusReset(5000);
      }
    } catch (err) {
      debug('Autosave error:', err);
      safeSetStatus('error');

      // Reset to idle after showing error
      scheduleStatusReset(5000);
    }

    // Only clear save timers if no new changes arrived during save
    if (changeCounterRef.current === countAtStart) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
        maxWaitTimeoutRef.current = null;
      }
    }
  }, [stateMachine.canAutosave, onSave, safeSetStatus, scheduleStatusReset]);

  // Keep ref pointing to the latest performSave
  performSaveRef.current = performSave;

  // Trigger a change (called when content changes)
  const triggerChange = useCallback(() => {
    // Always mark content as dirty, even if autosave is disabled
    // This ensures the dirty flag is set for save-on-exit detection
    if (stateMachine.canModifyContent) {
      stateMachine.contentChanged();
    }

    if (!enabled || isPausedRef.current) {
      debug('Autosave skipped: enabled=', enabled, 'paused=', isPausedRef.current);
      return;
    }

    // Can't autosave without a prototype
    if (!stateMachine.state.prototype) {
      debug('Autosave skipped: no prototype yet (changes still tracked)');
      return;
    }

    hasPendingChangesRef.current = true;
    changeCounterRef.current++;
    safeSetStatus('pending');

    // Track first change time for max wait
    if (firstChangeTimeRef.current === null) {
      firstChangeTimeRef.current = Date.now();
      debug('First change recorded');

      // Set up max wait timeout
      maxWaitTimeoutRef.current = setTimeout(() => {
        debug('Max wait reached, forcing save');
        performSaveRef.current();
      }, maxWaitMs);
    }

    // Clear existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Use shorter debounce for the first save (before any save has happened).
    // This ensures new prototypes get saved quickly so content isn't lost
    // if the user navigates away before the normal debounce fires.
    const effectiveDebounce = lastSavedAt === null && stateMachine.state.lastSavedAt === null
      ? initialDebounceMs
      : debounceMs;

    // Set new debounce timeout — uses performSaveRef so the timeout always
    // calls the latest performSave (with current canAutosave value).
    debounceTimeoutRef.current = setTimeout(() => {
      debug('Debounce complete, triggering save');
      performSaveRef.current();
    }, effectiveDebounce);

    debug('Change triggered, debounce reset, debounce:', effectiveDebounce, 'ms');
  }, [enabled, stateMachine, debounceMs, initialDebounceMs, maxWaitMs, safeSetStatus, lastSavedAt]);

  // Pause autosave
  const pause = useCallback(() => {
    debug('Autosave paused');
    isPausedRef.current = true;
    clearTimeouts();
  }, [clearTimeouts]);

  // Resume autosave
  const resume = useCallback(() => {
    debug('Autosave resumed');
    isPausedRef.current = false;

    // If there are pending changes, restart the timer
    if (hasPendingChangesRef.current && enabled) {
      // Clear any existing timeout to prevent leaks on rapid resume() calls
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => performSaveRef.current(), debounceMs);
    }
  }, [enabled, debounceMs]);

  // Mark as saved (e.g., after manual save)
  const markSaved = useCallback(() => {
    hasPendingChangesRef.current = false;
    firstChangeTimeRef.current = null;
    setLastSavedAt(new Date());
    safeSetStatus('saved');
    clearTimeouts();

    // Reset to idle after showing "saved" status
    scheduleStatusReset(3000);
  }, [clearTimeouts, safeSetStatus, scheduleStatusReset]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimeouts();
    };
  }, [clearTimeouts]);

  // Handle enabled changes
  useEffect(() => {
    if (!enabled) {
      clearTimeouts();
      safeSetStatus('idle');
    }
  }, [enabled, clearTimeouts, safeSetStatus]);

  return {
    status,
    lastSavedAt,
    isActive: enabled && !isPausedRef.current,
    triggerChange,
    pause,
    resume,
    markSaved,
  };
}
