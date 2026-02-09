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
  branchId?: string | null;
  branchName?: string | null;
  createdAt: string;
}

interface VersionHistoryState {
  versions: PrototypeVersion[];
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;
}

export type BranchFilter = 'current' | 'all' | 'main' | string; // string = specific branchId

interface UseVersionHistoryReturn extends VersionHistoryState {
  fetchVersions: () => Promise<void>;
  restoreVersion: (versionNumber: number) => Promise<boolean>;
  updateLabel: (versionNumber: number, label: string) => Promise<boolean>;
  clearError: () => void;
  branchFilter: BranchFilter;
  setBranchFilter: (filter: BranchFilter) => void;
}

export function useVersionHistory(
  slug: string | null,
  activeBranchId?: string | null,
): UseVersionHistoryReturn {
  const [state, setState] = useState<VersionHistoryState>({
    versions: [],
    isLoading: false,
    isRestoring: false,
    error: null,
  });
  const [branchFilter, setBranchFilter] = useState<BranchFilter>('current');

  const fetchVersions = useCallback(async () => {
    if (!slug) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Build query string for branch filtering
    let endpoint = API_ENDPOINTS.PROTOTYPE_VERSIONS(slug);
    if (branchFilter === 'current') {
      // "current" means filter by the active branch (or main if no branch)
      if (activeBranchId) {
        endpoint += `?branchId=${encodeURIComponent(activeBranchId)}`;
      } else {
        endpoint += '?branch=main';
      }
    } else if (branchFilter === 'main') {
      endpoint += '?branch=main';
    } else if (branchFilter !== 'all') {
      // Specific branchId
      endpoint += `?branchId=${encodeURIComponent(branchFilter)}`;
    }

    const result = await apiGet<{ versions: PrototypeVersion[] }>(
      endpoint
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
  }, [slug, branchFilter, activeBranchId]);

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
    updateLabel,
    clearError,
    branchFilter,
    setBranchFilter,
  };
}
