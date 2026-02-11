/**
 * useGitHubPush Hook
 *
 * Manages manual GitHub push state for the editor.
 * Tracks whether the team has a GitHub connection, whether there are
 * unpushed changes, and provides a push() function to trigger a push.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_ENDPOINTS, apiGet, apiPost } from '../lib/api';

interface TeamConnection {
  connected: boolean;
  repoOwner?: string;
  repoName?: string;
  defaultBranch?: string;
}

interface PushResult {
  commitSha: string;
  commitUrl: string;
  branch: string;
}

export interface UseGitHubPushResult {
  /** Team has a GitHub connection and user can push */
  canPush: boolean;
  /** Team has a handoff connection configured */
  canHandoff: boolean;
  /** Push request is in flight */
  isPushing: boolean;
  /** There have been saves since the last push */
  hasUnpushedChanges: boolean;
  /** Result from the last successful push (auto-clears after 8s) */
  lastPushResult: { commitUrl: string; branch: string } | null;
  /** Trigger a push to GitHub */
  push: () => Promise<void>;
  /** Push clean HTML to the handoff repo */
  pushHandoff: (cleanHtml: string) => Promise<void>;
  /** Clear the success feedback */
  dismissResult: () => void;
  /** Mark that a save just happened (call after each successful save) */
  markSaved: () => void;
}

interface UseGitHubPushOptions {
  slug: string | undefined;
  teamId: string | undefined;
  enabled: boolean;
}

export function useGitHubPush({ slug, teamId, enabled }: UseGitHubPushOptions): UseGitHubPushResult {
  const [hasConnection, setHasConnection] = useState(false);
  const [hasHandoffConnection, setHasHandoffConnection] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [hasUnpushedChanges, setHasUnpushedChanges] = useState(false);
  const [lastPushResult, setLastPushResult] = useState<{ commitUrl: string; branch: string } | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch team GitHub connection status on mount
  useEffect(() => {
    if (!enabled || !teamId) {
      setHasConnection(false);
      setHasHandoffConnection(false);
      return;
    }

    let cancelled = false;

    apiGet<TeamConnection>(API_ENDPOINTS.GITHUB_TEAM_CONNECTION(teamId)).then((result) => {
      if (!cancelled && result.success && result.data?.connected) {
        setHasConnection(true);
      }
    });

    apiGet<TeamConnection>(API_ENDPOINTS.GITHUB_TEAM_HANDOFF(teamId)).then((result) => {
      if (!cancelled && result.success && result.data?.connected) {
        setHasHandoffConnection(true);
      }
    });

    return () => { cancelled = true; };
  }, [enabled, teamId]);

  const markSaved = useCallback(() => {
    setHasUnpushedChanges(true);
  }, []);

  const dismissResult = useCallback(() => {
    setLastPushResult(null);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const push = useCallback(async () => {
    if (!slug || isPushing) return;

    setIsPushing(true);
    try {
      const result = await apiPost<PushResult>(
        API_ENDPOINTS.PROTOTYPE_PUSH(slug),
        undefined,
        'Failed to push to GitHub'
      );

      if (result.success && result.data) {
        setHasUnpushedChanges(false);
        setLastPushResult({
          commitUrl: result.data.commitUrl,
          branch: result.data.branch,
        });

        // Auto-dismiss after 8 seconds
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = setTimeout(() => {
          setLastPushResult(null);
          dismissTimerRef.current = null;
        }, 8000);
      }
    } finally {
      setIsPushing(false);
    }
  }, [slug, isPushing]);

  const pushHandoff = useCallback(async (cleanHtml: string) => {
    if (!slug || isPushing) return;

    setIsPushing(true);
    try {
      const result = await apiPost<PushResult>(
        API_ENDPOINTS.PROTOTYPE_PUSH_HANDOFF(slug),
        { htmlContent: cleanHtml },
        'Failed to push handoff to GitHub'
      );

      if (result.success && result.data) {
        setLastPushResult({
          commitUrl: result.data.commitUrl,
          branch: result.data.branch,
        });

        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = setTimeout(() => {
          setLastPushResult(null);
          dismissTimerRef.current = null;
        }, 8000);
      }
    } finally {
      setIsPushing(false);
    }
  }, [slug, isPushing]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  return {
    canPush: hasConnection && enabled,
    canHandoff: hasHandoffConnection && enabled,
    isPushing,
    hasUnpushedChanges,
    lastPushResult,
    push,
    pushHandoff,
    dismissResult,
    markSaved,
  };
}
