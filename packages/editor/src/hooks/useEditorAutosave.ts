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
import type { UseEditorStateMachineReturn } from './useEditorStateMachine';

// Debug logging
const DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('debug') === 'true' ||
    localStorage.getItem('uswds_pt_debug') === 'true');

function debug(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[EditorAutosave]', ...args);
  }
}

export interface UseEditorAutosaveOptions {
  /** Whether autosave is enabled */
  enabled: boolean;
  /** State machine for guards */
  stateMachine: UseEditorStateMachineReturn;
  /** Function to perform the save */
  onSave: () => Promise<boolean>;
  /** Debounce time in ms after last change (default: 5000) */
  debounceMs?: number;
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
  maxWaitMs = 30000,
}: UseEditorAutosaveOptions): UseEditorAutosaveReturn {
  const [status, setStatus] = useState<UseEditorAutosaveReturn['status']>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Refs for tracking state without causing re-renders
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstChangeTimeRef = useRef<number | null>(null);
  const hasPendingChangesRef = useRef(false);

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
  }, []);

  // Perform the actual save
  const performSave = useCallback(async () => {
    // Check guards from state machine
    if (!stateMachine.canAutosave) {
      debug('Autosave skipped: canAutosave is false');
      return;
    }

    if (isPaused) {
      debug('Autosave skipped: paused');
      return;
    }

    if (!hasPendingChangesRef.current) {
      debug('Autosave skipped: no pending changes');
      return;
    }

    debug('Autosave starting...');
    setStatus('saving');

    try {
      const success = await onSave();

      if (success) {
        hasPendingChangesRef.current = false;
        firstChangeTimeRef.current = null;
        setLastSavedAt(new Date());
        setStatus('saved');
        debug('Autosave successful');

        // Reset to idle after showing "saved" status
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        debug('Autosave returned false');

        // Reset to idle after showing error
        setTimeout(() => setStatus('idle'), 5000);
      }
    } catch (err) {
      console.warn('[Autosave] Error:', err);
      setStatus('error');

      // Reset to idle after showing error
      setTimeout(() => setStatus('idle'), 5000);
    }

    clearTimeouts();
  }, [stateMachine.canAutosave, isPaused, onSave, clearTimeouts]);

  // Trigger a change (called when content changes)
  const triggerChange = useCallback(() => {
    // Always mark content as dirty, even if autosave is disabled
    // This ensures the dirty flag is set for save-on-exit detection
    if (stateMachine.canModifyContent) {
      stateMachine.contentChanged();
    }

    if (!enabled || isPaused) {
      debug('Autosave skipped: enabled=', enabled, 'paused=', isPaused);
      return;
    }

    // Can't autosave without a prototype
    if (!stateMachine.state.prototype) {
      debug('Autosave skipped: no prototype yet (changes still tracked)');
      return;
    }

    hasPendingChangesRef.current = true;
    setStatus('pending');

    // Track first change time for max wait
    if (firstChangeTimeRef.current === null) {
      firstChangeTimeRef.current = Date.now();
      debug('First change recorded');

      // Set up max wait timeout
      maxWaitTimeoutRef.current = setTimeout(() => {
        debug('Max wait reached, forcing save');
        performSave();
      }, maxWaitMs);
    }

    // Clear existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new debounce timeout
    debounceTimeoutRef.current = setTimeout(() => {
      debug('Debounce complete, triggering save');
      performSave();
    }, debounceMs);

    debug('Change triggered, debounce reset');
  }, [enabled, isPaused, stateMachine, performSave, debounceMs, maxWaitMs]);

  // Pause autosave
  const pause = useCallback(() => {
    debug('Autosave paused');
    setIsPaused(true);
    clearTimeouts();
  }, [clearTimeouts]);

  // Resume autosave
  const resume = useCallback(() => {
    debug('Autosave resumed');
    setIsPaused(false);

    // If there are pending changes, restart the timer
    if (hasPendingChangesRef.current && enabled) {
      debounceTimeoutRef.current = setTimeout(performSave, debounceMs);
    }
  }, [enabled, performSave, debounceMs]);

  // Mark as saved (e.g., after manual save)
  const markSaved = useCallback(() => {
    hasPendingChangesRef.current = false;
    firstChangeTimeRef.current = null;
    setLastSavedAt(new Date());
    setStatus('saved');
    clearTimeouts();

    // Reset to idle after showing "saved" status
    setTimeout(() => setStatus('idle'), 3000);
  }, [clearTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  // Handle enabled changes
  useEffect(() => {
    if (!enabled) {
      clearTimeouts();
      setStatus('idle');
    }
  }, [enabled, clearTimeouts]);

  return {
    status,
    lastSavedAt,
    isActive: enabled && !isPaused,
    triggerChange,
    pause,
    resume,
    markSaved,
  };
}
