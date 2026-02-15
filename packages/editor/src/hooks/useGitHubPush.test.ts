/**
 * Tests for useGitHubPush hook
 *
 * Tests push/handoff operations, connection status, state management,
 * and error handling with mocked API functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGitHubPush } from './useGitHubPush';

// Mock the API module
const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
vi.mock('../lib/api', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  API_ENDPOINTS: {
    GITHUB_TEAM_CONNECTION: (teamId: string) => `/api/teams/${teamId}/github`,
    GITHUB_TEAM_HANDOFF: (teamId: string) => `/api/teams/${teamId}/github/handoff`,
    PROTOTYPE_PUSH: (slug: string) => `/api/prototypes/${slug}/push`,
    PROTOTYPE_PUSH_HANDOFF: (slug: string) => `/api/prototypes/${slug}/push-handoff`,
  },
}));

describe('useGitHubPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default: no connections
    mockApiGet.mockResolvedValue({ success: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('initial state', () => {
    it('should have correct default state when disabled', () => {
      const { result } = renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: 'team-123', enabled: false })
      );

      expect(result.current.canPush).toBe(false);
      expect(result.current.canHandoff).toBe(false);
      expect(result.current.isPushing).toBe(false);
      expect(result.current.hasUnpushedChanges).toBe(false);
      expect(result.current.lastPushResult).toBeNull();
      expect(typeof result.current.push).toBe('function');
      expect(typeof result.current.pushHandoff).toBe('function');
      expect(typeof result.current.dismissResult).toBe('function');
      expect(typeof result.current.markSaved).toBe('function');
    });

    it('should have correct default state when enabled but no team', () => {
      const { result } = renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: undefined, enabled: true })
      );

      expect(result.current.canPush).toBe(false);
      expect(result.current.canHandoff).toBe(false);
    });

    it('should not fetch connections when disabled', () => {
      renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: 'team-123', enabled: false })
      );

      expect(mockApiGet).not.toHaveBeenCalled();
    });

    it('should not fetch connections when teamId is undefined', () => {
      renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: undefined, enabled: true })
      );

      expect(mockApiGet).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Connection Detection Tests
  // ============================================================================

  describe('connection detection', () => {
    it('should detect push connection when team is connected', async () => {
      mockApiGet.mockImplementation((endpoint: string) => {
        if (endpoint.includes('/github') && !endpoint.includes('handoff')) {
          return Promise.resolve({ success: true, data: { connected: true, repoOwner: 'owner', repoName: 'repo' } });
        }
        return Promise.resolve({ success: false });
      });

      const { result } = renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: 'team-123', enabled: true })
      );

      // Advance fake timers so the useEffect fetch resolves
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.canPush).toBe(true);
    });

    it('should detect handoff connection', async () => {
      mockApiGet.mockImplementation((endpoint: string) => {
        if (endpoint.includes('handoff')) {
          return Promise.resolve({ success: true, data: { connected: true } });
        }
        return Promise.resolve({ success: false });
      });

      const { result } = renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: 'team-123', enabled: true })
      );

      // Advance fake timers so the useEffect fetch resolves
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.canHandoff).toBe(true);
    });

    it('should handle connection check failure gracefully', async () => {
      mockApiGet.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: 'team-123', enabled: true })
      );

      // Should not throw, connections should remain false
      await vi.advanceTimersByTimeAsync(100);
      expect(result.current.canPush).toBe(false);
      expect(result.current.canHandoff).toBe(false);
    });
  });

  // ============================================================================
  // Push Tests
  // ============================================================================

  describe('push', () => {
    it('should call push endpoint and update state on success', async () => {
      mockApiGet.mockResolvedValue({ success: true, data: { connected: true } });
      mockApiPost.mockResolvedValue({
        success: true,
        data: {
          commitSha: 'abc123',
          commitUrl: 'https://github.com/owner/repo/commit/abc123',
          branch: 'my-prototype',
        },
      });

      const { result } = renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: 'team-123', enabled: true })
      );

      // Mark as having unpushed changes first
      act(() => {
        result.current.markSaved();
      });
      expect(result.current.hasUnpushedChanges).toBe(true);

      // Push
      await act(async () => {
        await result.current.push();
      });

      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/prototypes/test-slug/push',
        undefined,
        'Failed to push to GitHub'
      );
      expect(result.current.isPushing).toBe(false);
      expect(result.current.hasUnpushedChanges).toBe(false);
      expect(result.current.lastPushResult).toEqual({
        commitUrl: 'https://github.com/owner/repo/commit/abc123',
        branch: 'my-prototype',
      });
    });

    it('should not push when slug is undefined', async () => {
      const { result } = renderHook(() =>
        useGitHubPush({ slug: undefined, teamId: 'team-123', enabled: true })
      );

      await act(async () => {
        await result.current.push();
      });

      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it('should not allow concurrent pushes', async () => {
      let resolvePost!: (value: unknown) => void;
      const postPromise = new Promise((resolve) => { resolvePost = resolve; });

      mockApiPost.mockReturnValue(postPromise);

      const { result } = renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: 'team-123', enabled: true })
      );

      // Start first push
      let pushPromise1: Promise<void>;
      act(() => {
        pushPromise1 = result.current.push();
      });

      // Try second push while first is in flight
      await act(async () => {
        await result.current.push();
      });

      // Only one API call should have been made
      expect(mockApiPost).toHaveBeenCalledTimes(1);

      // Resolve the first push
      resolvePost({ success: true, data: { commitSha: 'abc', commitUrl: 'url', branch: 'br' } });
      await act(async () => {
        await pushPromise1!;
      });
    });

    it('should handle push failure gracefully', async () => {
      mockApiPost.mockResolvedValue({ success: false, error: 'Push failed' });

      const { result } = renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: 'team-123', enabled: true })
      );

      act(() => {
        result.current.markSaved();
      });

      await act(async () => {
        await result.current.push();
      });

      // isPushing should be reset
      expect(result.current.isPushing).toBe(false);
      // lastPushResult should not be set
      expect(result.current.lastPushResult).toBeNull();
      // hasUnpushedChanges should remain true (push failed)
      expect(result.current.hasUnpushedChanges).toBe(true);
    });

    it('should auto-dismiss push result after 8 seconds', async () => {
      mockApiPost.mockResolvedValue({
        success: true,
        data: { commitSha: 'abc', commitUrl: 'https://example.com', branch: 'br' },
      });

      const { result } = renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: 'team-123', enabled: true })
      );

      await act(async () => {
        await result.current.push();
      });

      expect(result.current.lastPushResult).not.toBeNull();

      // Advance past the 8s auto-dismiss
      act(() => {
        vi.advanceTimersByTime(8001);
      });

      expect(result.current.lastPushResult).toBeNull();
    });
  });

  // ============================================================================
  // Handoff Push Tests
  // ============================================================================

  describe('pushHandoff', () => {
    it('should call handoff endpoint with clean HTML', async () => {
      mockApiPost.mockResolvedValue({
        success: true,
        data: {
          commitSha: 'def456',
          commitUrl: 'https://github.com/owner/repo/commit/def456',
          branch: 'handoff/my-prototype',
        },
      });

      const { result } = renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: 'team-123', enabled: true })
      );

      const cleanHtml = '<html><body><h1>Clean HTML</h1></body></html>';
      await act(async () => {
        await result.current.pushHandoff(cleanHtml);
      });

      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/prototypes/test-slug/push-handoff',
        { htmlContent: cleanHtml },
        'Failed to push handoff to GitHub'
      );
      expect(result.current.lastPushResult).toEqual({
        commitUrl: 'https://github.com/owner/repo/commit/def456',
        branch: 'handoff/my-prototype',
      });
    });

    it('should not push handoff when slug is undefined', async () => {
      const { result } = renderHook(() =>
        useGitHubPush({ slug: undefined, teamId: 'team-123', enabled: true })
      );

      await act(async () => {
        await result.current.pushHandoff('<div>test</div>');
      });

      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it('should handle handoff push failure gracefully', async () => {
      mockApiPost.mockResolvedValue({ success: false, error: 'Handoff failed' });

      const { result } = renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: 'team-123', enabled: true })
      );

      await act(async () => {
        await result.current.pushHandoff('<div>test</div>');
      });

      expect(result.current.isPushing).toBe(false);
      expect(result.current.lastPushResult).toBeNull();
    });
  });

  // ============================================================================
  // State Management Tests
  // ============================================================================

  describe('state management', () => {
    it('should mark saves as unpushed changes', () => {
      const { result } = renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: 'team-123', enabled: true })
      );

      expect(result.current.hasUnpushedChanges).toBe(false);

      act(() => {
        result.current.markSaved();
      });

      expect(result.current.hasUnpushedChanges).toBe(true);
    });

    it('should dismiss result and clear timer', async () => {
      mockApiPost.mockResolvedValue({
        success: true,
        data: { commitSha: 'abc', commitUrl: 'https://example.com', branch: 'br' },
      });

      const { result } = renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: 'team-123', enabled: true })
      );

      await act(async () => {
        await result.current.push();
      });

      expect(result.current.lastPushResult).not.toBeNull();

      act(() => {
        result.current.dismissResult();
      });

      expect(result.current.lastPushResult).toBeNull();

      // Advancing timer should not cause errors (timer was cleared)
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.lastPushResult).toBeNull();
    });
  });

  // ============================================================================
  // Cleanup Tests
  // ============================================================================

  describe('cleanup', () => {
    it('should cleanup timers on unmount', async () => {
      mockApiPost.mockResolvedValue({
        success: true,
        data: { commitSha: 'abc', commitUrl: 'https://example.com', branch: 'br' },
      });

      const { result, unmount } = renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: 'team-123', enabled: true })
      );

      await act(async () => {
        await result.current.push();
      });

      expect(result.current.lastPushResult).not.toBeNull();

      // Unmount should not throw
      unmount();

      // Advancing timers after unmount should not cause errors
      act(() => {
        vi.advanceTimersByTime(10000);
      });
    });

    it('should cancel connection fetch on unmount', () => {
      mockApiGet.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { unmount } = renderHook(() =>
        useGitHubPush({ slug: 'test-slug', teamId: 'team-123', enabled: true })
      );

      // Unmount should not throw even with pending fetches
      unmount();
    });
  });
});
