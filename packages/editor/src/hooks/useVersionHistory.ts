/**
 * Version History Hook
 * Manages fetching and restoring prototype versions
 */

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, apiGet, apiPost } from '../lib/api';

export interface PrototypeVersion {
  id: string;
  versionNumber: number;
  createdAt: string;
}

interface VersionHistoryState {
  versions: PrototypeVersion[];
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;
}

interface UseVersionHistoryReturn extends VersionHistoryState {
  fetchVersions: () => Promise<void>;
  restoreVersion: (versionNumber: number) => Promise<boolean>;
  clearError: () => void;
}

export function useVersionHistory(slug: string | null): UseVersionHistoryReturn {
  const [state, setState] = useState<VersionHistoryState>({
    versions: [],
    isLoading: false,
    isRestoring: false,
    error: null,
  });

  const fetchVersions = useCallback(async () => {
    if (!slug) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const result = await apiGet<{ versions: PrototypeVersion[] }>(
      API_ENDPOINTS.PROTOTYPE_VERSIONS(slug)
    );

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

    setState(prev => ({ ...prev, isRestoring: false }));

    if (!result.success) {
      setState(prev => ({ ...prev, error: result.error || null }));
    }

    return result.success;
  }, [slug]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Fetch versions when slug changes
  useEffect(() => {
    if (slug) {
      fetchVersions();
    } else {
      setState({
        versions: [],
        isLoading: false,
        isRestoring: false,
        error: null,
      });
    }
  }, [slug, fetchVersions]);

  return {
    ...state,
    fetchVersions,
    restoreVersion,
    clearError,
  };
}
