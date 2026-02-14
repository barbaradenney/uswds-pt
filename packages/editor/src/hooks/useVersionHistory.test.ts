/**
 * Tests for useVersionHistory hook
 *
 * Tests fetching versions, restoring versions, updating labels,
 * error handling, and loading states with mocked API dependencies.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVersionHistory } from './useVersionHistory';
import type { PrototypeVersion } from './useVersionHistory';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockApiPatch = vi.fn();

vi.mock('../lib/api', () => ({
  API_ENDPOINTS: {
    PROTOTYPE_VERSIONS: (slug: string) => `/api/prototypes/${encodeURIComponent(slug)}/versions`,
    PROTOTYPE_VERSION_RESTORE: (slug: string, version: number) =>
      `/api/prototypes/${encodeURIComponent(slug)}/versions/${version}/restore`,
    PROTOTYPE_VERSION_LABEL: (slug: string, version: number) =>
      `/api/prototypes/${encodeURIComponent(slug)}/versions/${version}`,
  },
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPatch: (...args: unknown[]) => mockApiPatch(...args),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createMockVersions(count = 3): PrototypeVersion[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `version-${i + 1}`,
    versionNumber: i + 1,
    label: i === 0 ? 'Initial version' : null,
    contentChecksum: `checksum-${i + 1}`,
    createdAt: new Date(2026, 0, i + 1).toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('useVersionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Initial state
  // ==========================================================================

  describe('initial state', () => {
    it('should return default empty state when slug is null', () => {
      mockApiGet.mockResolvedValue({ success: true, data: { versions: [] } });

      const { result } = renderHook(() => useVersionHistory(null));

      expect(result.current.versions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRestoring).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should not fetch versions when slug is null', () => {
      const { result } = renderHook(() => useVersionHistory(null));

      expect(mockApiGet).not.toHaveBeenCalled();
      expect(result.current.versions).toEqual([]);
    });

    it('should expose fetchVersions, restoreVersion, updateLabel, and clearError functions', () => {
      const { result } = renderHook(() => useVersionHistory(null));

      expect(typeof result.current.fetchVersions).toBe('function');
      expect(typeof result.current.restoreVersion).toBe('function');
      expect(typeof result.current.updateLabel).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  // ==========================================================================
  // 2. Fetching versions
  // ==========================================================================

  describe('fetchVersions', () => {
    it('should fetch versions automatically when slug is provided', async () => {
      const versions = createMockVersions();
      mockApiGet.mockResolvedValue({ success: true, data: { versions } });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApiGet).toHaveBeenCalledWith('/api/prototypes/my-prototype/versions');
      expect(result.current.versions).toEqual(versions);
      expect(result.current.error).toBeNull();
    });

    it('should set isLoading to true while fetching', async () => {
      let resolveGet: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveGet = resolve;
      });
      mockApiGet.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      // isLoading should be true during fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the fetch
      await act(async () => {
        resolveGet!({ success: true, data: { versions: [] } });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set error when fetch fails', async () => {
      mockApiGet.mockResolvedValue({
        success: false,
        error: 'Server error',
      });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Server error');
      expect(result.current.versions).toEqual([]);
    });

    it('should use default error message when API returns no error string', async () => {
      mockApiGet.mockResolvedValue({
        success: false,
      });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load versions');
    });

    it('should refetch when slug changes', async () => {
      const versionsA = createMockVersions(2);
      const versionsB = createMockVersions(5);

      mockApiGet
        .mockResolvedValueOnce({ success: true, data: { versions: versionsA } })
        .mockResolvedValueOnce({ success: true, data: { versions: versionsB } });

      const { result, rerender } = renderHook(
        ({ slug }) => useVersionHistory(slug),
        { initialProps: { slug: 'prototype-a' as string | null } },
      );

      await waitFor(() => {
        expect(result.current.versions).toEqual(versionsA);
      });

      // Change slug
      rerender({ slug: 'prototype-b' });

      await waitFor(() => {
        expect(result.current.versions).toEqual(versionsB);
      });

      expect(mockApiGet).toHaveBeenCalledTimes(2);
      expect(mockApiGet).toHaveBeenCalledWith('/api/prototypes/prototype-a/versions');
      expect(mockApiGet).toHaveBeenCalledWith('/api/prototypes/prototype-b/versions');
    });

    it('should reset state when slug changes to null', async () => {
      const versions = createMockVersions();
      mockApiGet.mockResolvedValue({ success: true, data: { versions } });

      const { result, rerender } = renderHook(
        ({ slug }) => useVersionHistory(slug),
        { initialProps: { slug: 'my-prototype' as string | null } },
      );

      await waitFor(() => {
        expect(result.current.versions).toEqual(versions);
      });

      // Set slug to null
      rerender({ slug: null });

      expect(result.current.versions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRestoring).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should not update state when request is aborted (slug changes during fetch)', async () => {
      // First call takes a long time; second call resolves quickly
      let resolveFirst: (value: unknown) => void;
      const firstPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });

      const versionsB = createMockVersions(1);

      mockApiGet
        .mockReturnValueOnce(firstPromise)
        .mockResolvedValueOnce({ success: true, data: { versions: versionsB } });

      const { result, rerender } = renderHook(
        ({ slug }) => useVersionHistory(slug),
        { initialProps: { slug: 'prototype-a' as string | null } },
      );

      // First fetch is in progress
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Change slug while first fetch is still pending
      rerender({ slug: 'prototype-b' });

      // Wait for second fetch to complete
      await waitFor(() => {
        expect(result.current.versions).toEqual(versionsB);
      });

      // Now resolve the first fetch (should be ignored due to abort)
      await act(async () => {
        resolveFirst!({
          success: true,
          data: { versions: createMockVersions(10) },
        });
      });

      // State should still reflect prototype-b, not the stale prototype-a data
      expect(result.current.versions).toEqual(versionsB);
    });

    it('should allow manual refetch via fetchVersions', async () => {
      const initialVersions = createMockVersions(2);
      const updatedVersions = createMockVersions(4);

      mockApiGet
        .mockResolvedValueOnce({ success: true, data: { versions: initialVersions } })
        .mockResolvedValueOnce({ success: true, data: { versions: updatedVersions } });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.versions).toEqual(initialVersions);
      });

      // Manual refetch
      await act(async () => {
        await result.current.fetchVersions();
      });

      expect(result.current.versions).toEqual(updatedVersions);
      expect(mockApiGet).toHaveBeenCalledTimes(2);
    });

    it('should do nothing when fetchVersions is called with null slug', async () => {
      const { result } = renderHook(() => useVersionHistory(null));

      await act(async () => {
        await result.current.fetchVersions();
      });

      expect(mockApiGet).not.toHaveBeenCalled();
    });

    it('should encode special characters in slug', async () => {
      mockApiGet.mockResolvedValue({ success: true, data: { versions: [] } });

      renderHook(() => useVersionHistory('my prototype/test'));

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith(
          '/api/prototypes/my%20prototype%2Ftest/versions'
        );
      });
    });
  });

  // ==========================================================================
  // 3. Restoring a version
  // ==========================================================================

  describe('restoreVersion', () => {
    it('should restore a version successfully', async () => {
      mockApiGet.mockResolvedValue({ success: true, data: { versions: createMockVersions() } });
      mockApiPost.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.restoreVersion(2);
      });

      expect(success!).toBe(true);
      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/prototypes/my-prototype/versions/2/restore',
        undefined,
        'Failed to restore version',
      );
      expect(result.current.isRestoring).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set isRestoring to true during restore', async () => {
      mockApiGet.mockResolvedValue({ success: true, data: { versions: [] } });

      let resolvePost: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePost = resolve;
      });
      mockApiPost.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start restore without awaiting
      let restorePromise: Promise<boolean>;
      act(() => {
        restorePromise = result.current.restoreVersion(1);
      });

      // isRestoring should be true
      expect(result.current.isRestoring).toBe(true);

      // Resolve restore
      await act(async () => {
        resolvePost!({ success: true });
        await restorePromise!;
      });

      expect(result.current.isRestoring).toBe(false);
    });

    it('should set error when restore fails', async () => {
      mockApiGet.mockResolvedValue({ success: true, data: { versions: [] } });
      mockApiPost.mockResolvedValue({
        success: false,
        error: 'Version conflict',
      });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.restoreVersion(5);
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe('Version conflict');
      expect(result.current.isRestoring).toBe(false);
    });

    it('should set error to null when restore fails with no error message', async () => {
      mockApiGet.mockResolvedValue({ success: true, data: { versions: [] } });
      mockApiPost.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.restoreVersion(1);
      });

      expect(success!).toBe(false);
      // error is result.error || null, so undefined || null = null
      expect(result.current.error).toBeNull();
    });

    it('should return false when slug is null', async () => {
      const { result } = renderHook(() => useVersionHistory(null));

      let success: boolean;
      await act(async () => {
        success = await result.current.restoreVersion(1);
      });

      expect(success!).toBe(false);
      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it('should clear previous error before starting restore', async () => {
      mockApiGet.mockResolvedValue({ success: false, error: 'Load failed' });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.error).toBe('Load failed');
      });

      mockApiPost.mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.restoreVersion(1);
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ==========================================================================
  // 4. Updating a version label
  // ==========================================================================

  describe('updateLabel', () => {
    it('should update label successfully and update local state', async () => {
      const versions = createMockVersions(3);
      mockApiGet.mockResolvedValue({ success: true, data: { versions } });
      mockApiPatch.mockResolvedValue({
        success: true,
        data: { ...versions[1], label: 'New label' },
      });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.versions).toEqual(versions);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.updateLabel(2, 'New label');
      });

      expect(success!).toBe(true);
      expect(mockApiPatch).toHaveBeenCalledWith(
        '/api/prototypes/my-prototype/versions/2',
        { label: 'New label' },
        'Failed to update version label',
      );

      // Local state should be updated
      const updatedVersion = result.current.versions.find(v => v.versionNumber === 2);
      expect(updatedVersion?.label).toBe('New label');
    });

    it('should not modify other versions when updating a label', async () => {
      const versions = createMockVersions(3);
      mockApiGet.mockResolvedValue({ success: true, data: { versions } });
      mockApiPatch.mockResolvedValue({ success: true, data: {} });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.versions).toEqual(versions);
      });

      await act(async () => {
        await result.current.updateLabel(2, 'Updated');
      });

      // Version 1 should still have its original label
      const version1 = result.current.versions.find(v => v.versionNumber === 1);
      expect(version1?.label).toBe('Initial version');

      // Version 3 should still have null label
      const version3 = result.current.versions.find(v => v.versionNumber === 3);
      expect(version3?.label).toBeNull();
    });

    it('should set label to null when empty string is provided', async () => {
      const versions = createMockVersions(3);
      // Set version 2 to have a label initially
      versions[1].label = 'Old label';
      mockApiGet.mockResolvedValue({ success: true, data: { versions } });
      mockApiPatch.mockResolvedValue({ success: true, data: {} });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.versions[1].label).toBe('Old label');
      });

      await act(async () => {
        await result.current.updateLabel(2, '');
      });

      // Empty string "" || null evaluates to null
      const updatedVersion = result.current.versions.find(v => v.versionNumber === 2);
      expect(updatedVersion?.label).toBeNull();
    });

    it('should return false when update fails', async () => {
      mockApiGet.mockResolvedValue({ success: true, data: { versions: createMockVersions() } });
      mockApiPatch.mockResolvedValue({
        success: false,
        error: 'Not authorized',
      });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.versions.length).toBe(3);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.updateLabel(2, 'New label');
      });

      expect(success!).toBe(false);
    });

    it('should not update local state when API call fails', async () => {
      const versions = createMockVersions(3);
      mockApiGet.mockResolvedValue({ success: true, data: { versions } });
      mockApiPatch.mockResolvedValue({ success: false, error: 'Failed' });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.versions).toEqual(versions);
      });

      await act(async () => {
        await result.current.updateLabel(2, 'Should not appear');
      });

      // Version 2 should still have its original label (null)
      const version2 = result.current.versions.find(v => v.versionNumber === 2);
      expect(version2?.label).toBeNull();
    });

    it('should return false when slug is null', async () => {
      const { result } = renderHook(() => useVersionHistory(null));

      let success: boolean;
      await act(async () => {
        success = await result.current.updateLabel(1, 'Test');
      });

      expect(success!).toBe(false);
      expect(mockApiPatch).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 5. Error handling and clearError
  // ==========================================================================

  describe('clearError', () => {
    it('should clear the error state', async () => {
      mockApiGet.mockResolvedValue({
        success: false,
        error: 'Something went wrong',
      });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.error).toBe('Something went wrong');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should be safe to call when there is no error', () => {
      mockApiGet.mockResolvedValue({ success: true, data: { versions: [] } });

      const { result } = renderHook(() => useVersionHistory(null));

      expect(result.current.error).toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ==========================================================================
  // 6. Loading states combined with operations
  // ==========================================================================

  describe('combined loading states', () => {
    it('should handle fetch error followed by successful restore', async () => {
      // First fetch fails
      mockApiGet.mockResolvedValue({ success: false, error: 'Fetch failed' });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.error).toBe('Fetch failed');
      });

      // Restore succeeds and clears the error
      mockApiPost.mockResolvedValue({ success: true });

      await act(async () => {
        const success = await result.current.restoreVersion(1);
        expect(success).toBe(true);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isRestoring).toBe(false);
    });

    it('should handle multiple sequential operations', async () => {
      const versions = createMockVersions(3);
      mockApiGet.mockResolvedValue({ success: true, data: { versions } });

      const { result } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.versions.length).toBe(3);
      });

      // Update label
      mockApiPatch.mockResolvedValue({ success: true, data: {} });
      await act(async () => {
        const success = await result.current.updateLabel(1, 'Labeled');
        expect(success).toBe(true);
      });

      expect(result.current.versions[0].label).toBe('Labeled');

      // Restore version
      mockApiPost.mockResolvedValue({ success: true });
      await act(async () => {
        const success = await result.current.restoreVersion(2);
        expect(success).toBe(true);
      });

      expect(result.current.isRestoring).toBe(false);

      // Refetch
      const newVersions = createMockVersions(4);
      mockApiGet.mockResolvedValue({ success: true, data: { versions: newVersions } });

      await act(async () => {
        await result.current.fetchVersions();
      });

      expect(result.current.versions).toEqual(newVersions);
    });
  });

  // ==========================================================================
  // 7. Unmount / cleanup
  // ==========================================================================

  describe('cleanup on unmount', () => {
    it('should abort in-flight fetch on unmount', async () => {
      let resolveGet: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveGet = resolve;
      });
      mockApiGet.mockReturnValue(pendingPromise);

      const { result, unmount } = renderHook(() => useVersionHistory('my-prototype'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Unmount while fetch is pending
      unmount();

      // Resolve fetch after unmount - should not throw
      await act(async () => {
        resolveGet!({ success: true, data: { versions: createMockVersions() } });
      });

      // No error should have been thrown
    });

    it('should abort previous fetch when slug changes rapidly', async () => {
      const versions = createMockVersions(1);
      mockApiGet.mockResolvedValue({ success: true, data: { versions } });

      const { result, rerender } = renderHook(
        ({ slug }) => useVersionHistory(slug),
        { initialProps: { slug: 'slug-1' as string | null } },
      );

      // Rapidly change slug
      rerender({ slug: 'slug-2' });
      rerender({ slug: 'slug-3' });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The last call should have been for slug-3
      const lastCall = mockApiGet.mock.calls[mockApiGet.mock.calls.length - 1];
      expect(lastCall[0]).toBe('/api/prototypes/slug-3/versions');
    });
  });
});
