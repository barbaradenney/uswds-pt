/**
 * Autosave Hook
 * Timer-based autosave with change detection
 */

import { useRef, useEffect, useCallback, useState } from 'react';

interface EditorContent {
  html: string;
  projectData: object;
}

interface AutosaveOptions {
  /** Interval in milliseconds (default: 30000 = 30 seconds) */
  interval?: number;
  /** Function to get current editor content for comparison */
  getContent: () => EditorContent | null;
  /** Function to perform the save */
  onSave: () => Promise<void>;
  /** Whether autosave is enabled */
  enabled: boolean;
  /** Whether a save is currently in progress */
  isSaving: boolean;
}

interface UseAutosaveReturn {
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Timestamp of last successful autosave */
  lastSavedAt: Date | null;
  /** Whether autosave is currently active */
  isAutosaveActive: boolean;
  /** Manually mark content as saved (call after successful save) */
  markAsSaved: () => void;
  /** Pause autosave temporarily (e.g., during restore) */
  pause: () => void;
  /** Resume autosave */
  resume: () => void;
}

export function useAutosave({
  interval = 30000,
  getContent,
  onSave,
  enabled,
  isSaving,
}: AutosaveOptions): UseAutosaveReturn {
  // Store the last saved content for comparison
  const lastSavedContentRef = useRef<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Serialize content for comparison
  const serializeContent = useCallback((content: EditorContent): string => {
    return JSON.stringify({
      html: content.html,
      projectData: content.projectData,
    });
  }, []);

  // Check if content has changed
  const checkForChanges = useCallback((): boolean => {
    const content = getContent();
    if (!content) return false;

    const serialized = serializeContent(content);
    const changed = lastSavedContentRef.current !== null &&
                    lastSavedContentRef.current !== serialized;
    setHasUnsavedChanges(changed);
    return changed;
  }, [getContent, serializeContent]);

  // Mark content as saved
  const markAsSaved = useCallback(() => {
    const content = getContent();
    if (content) {
      lastSavedContentRef.current = serializeContent(content);
      setLastSavedAt(new Date());
      setHasUnsavedChanges(false);
    }
  }, [getContent, serializeContent]);

  // Pause/resume autosave
  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Autosave tick function
  const autosaveTick = useCallback(async () => {
    // Skip if paused, disabled, or already saving
    if (isPaused || !enabled || isSaving) {
      return;
    }

    // Check if content has changed
    if (checkForChanges()) {
      try {
        await onSave();
        markAsSaved();
      } catch (error) {
        // Error handling is done in onSave, just log here
        console.warn('[Autosave] Save failed:', error);
      }
    }
  }, [enabled, isSaving, isPaused, checkForChanges, onSave, markAsSaved]);

  // Set up autosave interval
  useEffect(() => {
    if (enabled && !isPaused) {
      intervalIdRef.current = setInterval(autosaveTick, interval);
    }

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [enabled, isPaused, interval, autosaveTick]);

  // Initialize lastSavedContent when first content is available
  useEffect(() => {
    if (enabled && lastSavedContentRef.current === null) {
      const content = getContent();
      if (content) {
        lastSavedContentRef.current = serializeContent(content);
      }
    }
  }, [enabled, getContent, serializeContent]);

  return {
    hasUnsavedChanges,
    lastSavedAt,
    isAutosaveActive: enabled && !isPaused,
    markAsSaved,
    pause,
    resume,
  };
}
