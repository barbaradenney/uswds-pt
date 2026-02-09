/**
 * Branches Hook
 * Manages fetching, creating, switching, and deleting prototype branches
 */

import { useState, useEffect, useCallback } from 'react';
import type { PrototypeBranch } from '@uswds-pt/shared';
import { API_ENDPOINTS, apiGet, apiPost, apiDelete } from '../lib/api';

interface BranchesState {
  branches: PrototypeBranch[];
  activeBranchId: string | null;
  isLoading: boolean;
  isSwitching: boolean;
  error: string | null;
}

export interface UseBranchesReturn extends BranchesState {
  fetchBranches: () => Promise<void>;
  createBranch: (name: string, description?: string) => Promise<PrototypeBranch | null>;
  switchBranch: (branchSlug: string) => Promise<boolean>;
  switchToMain: () => Promise<boolean>;
  deleteBranch: (branchSlug: string) => Promise<boolean>;
  clearError: () => void;
}

export function useBranches(slug: string | null): UseBranchesReturn {
  const [state, setState] = useState<BranchesState>({
    branches: [],
    activeBranchId: null,
    isLoading: false,
    isSwitching: false,
    error: null,
  });

  const fetchBranches = useCallback(async () => {
    if (!slug) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const result = await apiGet<{ branches: PrototypeBranch[]; activeBranchId: string | null }>(
      API_ENDPOINTS.PROTOTYPE_BRANCHES(slug)
    );

    if (result.success && result.data) {
      const { branches, activeBranchId } = result.data;
      setState(prev => ({
        ...prev,
        branches,
        activeBranchId,
        isLoading: false,
      }));
    } else {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: result.error || 'Failed to load branches',
      }));
    }
  }, [slug]);

  const createBranch = useCallback(async (name: string, description?: string): Promise<PrototypeBranch | null> => {
    if (!slug) return null;

    const result = await apiPost<PrototypeBranch>(
      API_ENDPOINTS.PROTOTYPE_BRANCHES(slug),
      { name, description },
      'Failed to create branch'
    );

    if (result.success && result.data) {
      const newBranch = result.data;
      setState(prev => ({
        ...prev,
        branches: [newBranch, ...prev.branches],
      }));
      return newBranch;
    }

    setState(prev => ({ ...prev, error: result.error || null }));
    return null;
  }, [slug]);

  const switchBranch = useCallback(async (branchSlug: string): Promise<boolean> => {
    if (!slug) return false;

    setState(prev => ({ ...prev, isSwitching: true, error: null }));

    const result = await apiPost(
      API_ENDPOINTS.PROTOTYPE_BRANCH_SWITCH(slug, branchSlug),
      undefined,
      'Failed to switch branch'
    );

    setState(prev => ({ ...prev, isSwitching: false }));

    if (result.success) {
      await fetchBranches();
      return true;
    }

    setState(prev => ({ ...prev, error: result.error || null }));
    return false;
  }, [slug, fetchBranches]);

  const switchToMain = useCallback(async (): Promise<boolean> => {
    if (!slug) return false;

    setState(prev => ({ ...prev, isSwitching: true, error: null }));

    const result = await apiPost(
      API_ENDPOINTS.PROTOTYPE_BRANCH_SWITCH_MAIN(slug),
      undefined,
      'Failed to switch to main'
    );

    setState(prev => ({ ...prev, isSwitching: false }));

    if (result.success) {
      await fetchBranches();
      return true;
    }

    setState(prev => ({ ...prev, error: result.error || null }));
    return false;
  }, [slug, fetchBranches]);

  const deleteBranch = useCallback(async (branchSlug: string): Promise<boolean> => {
    if (!slug) return false;

    const result = await apiDelete(
      API_ENDPOINTS.PROTOTYPE_BRANCH_DELETE(slug, branchSlug),
      'Failed to delete branch'
    );

    if (result.success) {
      setState(prev => ({
        ...prev,
        branches: prev.branches.filter(b => b.slug !== branchSlug),
      }));
      return true;
    }

    setState(prev => ({ ...prev, error: result.error || null }));
    return false;
  }, [slug]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Fetch branches when slug changes
  useEffect(() => {
    if (slug) {
      fetchBranches();
    } else {
      setState({
        branches: [],
        activeBranchId: null,
        isLoading: false,
        isSwitching: false,
        error: null,
      });
    }
  }, [slug, fetchBranches]);

  return {
    ...state,
    fetchBranches,
    createBranch,
    switchBranch,
    switchToMain,
    deleteBranch,
    clearError,
  };
}
