/**
 * Version History Hook
 * Manages fetching and restoring prototype versions
 */

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, apiGet, apiPost, apiPatch } from '../lib/api';

export interface PrototypeVersion {
  id: string;
  versionNumber: number;
  label?: string | null;
  contentChecksum?: string | null;
  createdAt: string;
}

interface VersionHistoryState {
  versions: PrototypeVersion[];
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;
}

interface UseVersionHistoryReturn extends VersionHistoryState {
  fetchVersions: (signal?: AbortSignal) => Promise<void>;
  restoreVersion: (versionNumber: number) => Promise<boolean>;
  updateLabel: (versionNumber: number, label: string) => Promise<boolean>;
  clearError: () => void;
}

export function useVersionHistory(
  slug: string | null,
): UseVersionHistoryReturn {
  const [state, setState] = useState<VersionHistoryState>({
    versions: [],
    isLoading: false,
    isRestoring: false,
    error: null,
  });

  const fetchVersions = useCallback(async (signal?: AbortSignal) => {
    if (!slug) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const result = await apiGet<{ versions: PrototypeVersion[] }>(
      API_ENDPOINTS.PROTOTYPE_VERSIONS(slug)
    );

    // Don't update state if this request was cancelled
    if (signal?.aborted) return;

    if (result.success && result.data) {
      const fetchedVersions = result.data.versions;
      setState(prev => ({
        ...prev,
        versions: fetchedVersions,
        isLoading: false,
      }));
    } else {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: result.error || 'Failed to load versions',
      }));
    }
  }, [slug]);

  const restoreVersion = useCallback(async (versionNumber: number): Promise<boolean> => {
    if (!slug) return false;

    setState(prev => ({ ...prev, isRestoring: true, error: null }));

    const result = await apiPost(
      API_ENDPOINTS.PROTOTYPE_VERSION_RESTORE(slug, versionNumber),
      undefined,
      'Failed to restore version'
    );

    setState(prev => ({
      ...prev,
      isRestoring: false,
      ...(result.success ? {} : { error: result.error || null }),
    }));

    return result.success;
  }, [slug]);

  const updateLabel = useCallback(async (versionNumber: number, label: string): Promise<boolean> => {
    if (!slug) return false;

    const result = await apiPatch<PrototypeVersion>(
      API_ENDPOINTS.PROTOTYPE_VERSION_LABEL(slug, versionNumber),
      { label },
      'Failed to update version label'
    );

    if (result.success) {
      // Update local state with the new label
      setState(prev => ({
        ...prev,
        versions: prev.versions.map(v =>
          v.versionNumber === versionNumber
            ? { ...v, label: label || null }
            : v
        ),
      }));
    }

    return result.success;
  }, [slug]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Fetch versions when slug changes
  useEffect(() => {
    const abortController = new AbortController();

    if (slug) {
      fetchVersions(abortController.signal);
    } else {
      setState({
        versions: [],
        isLoading: false,
        isRestoring: false,
        error: null,
      });
    }

    return () => abortController.abort();
  }, [slug, fetchVersions]);

  return {
    ...state,
    fetchVersions,
    restoreVersion,
    updateLabel,
    clearError,
  };
}
