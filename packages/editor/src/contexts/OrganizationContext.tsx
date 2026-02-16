/**
 * Organization Context
 *
 * Provides centralized organization/team state management using React Context.
 * This ensures org data is fetched once and shared across all components,
 * eliminating duplicate API calls when multiple components need org/team data.
 *
 * Follows the same pattern as AuthContext.tsx.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type { Organization, Team, Role } from '@uswds-pt/shared';
import { createDebugLogger } from '@uswds-pt/shared';
import { API_ENDPOINTS, apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { STORAGE_KEYS } from '../lib/constants';

const debug = createDebugLogger('OrganizationContext');

// ============================================================================
// Types
// ============================================================================

export interface OrganizationContextValue {
  organization: Organization | null;
  teams: Array<Team & { role: Role; joinedAt: Date }>;
  currentTeam: (Team & { role: Role; joinedAt: Date }) | null;
  isLoading: boolean;
  error: string | null;
  setCurrentTeam: (teamId: string | null) => void;
  refreshOrganization: () => Promise<void>;
  refreshTeams: () => Promise<void>;
  setupOrganization: (teamName: string) => Promise<boolean>;
  updateOrganization: (updates: { name?: string; description?: string; stateDefinitions?: Array<{ id: string; name: string }>; userDefinitions?: Array<{ id: string; name: string }> }) => Promise<Organization | null>;
  createTeam: (name: string, description?: string) => Promise<Team | null>;
  updateTeam: (teamId: string, updates: { name?: string; description?: string }) => Promise<Team | null>;
  deleteTeam: (teamId: string) => Promise<boolean>;
}

// ============================================================================
// Constants
// ============================================================================

const CURRENT_TEAM_KEY = STORAGE_KEYS.CURRENT_TEAM;

// ============================================================================
// Context
// ============================================================================

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  // Split state into stable data vs frequently-changing team selection
  // to minimize re-renders when only currentTeam changes
  const [orgData, setOrgData] = useState<{
    organization: Organization | null;
    teams: Array<Team & { role: Role; joinedAt: Date }>;
    isLoading: boolean;
    error: string | null;
  }>({
    organization: null,
    teams: [],
    isLoading: true,
    error: null,
  });
  const [currentTeam, setCurrentTeamState] = useState<(Team & { role: Role; joinedAt: Date }) | null>(null);

  // Guard against concurrent initial fetches (React Strict Mode double-mount)
  const initialFetchStartedRef = useRef(false);

  // Load organization data
  const refreshOrganization = useCallback(async () => {
    const result = await apiGet<Organization>(API_ENDPOINTS.ORGANIZATIONS);
    if (result.success && result.data) {
      setOrgData((prev) => ({ ...prev, organization: result.data! }));
    }
  }, []);

  // Load teams data
  const refreshTeams = useCallback(async () => {
    const result = await apiGet<{ teams: Array<Team & { role: Role; joinedAt: Date }> }>(
      API_ENDPOINTS.TEAMS,
      'Failed to load teams'
    );

    if (result.success && result.data) {
      const teams = result.data.teams || [];

      // Restore current team from localStorage, or auto-select first team if none saved
      const savedTeamId = localStorage.getItem(CURRENT_TEAM_KEY);
      let restoredTeam = savedTeamId ? teams.find((t) => t.id === savedTeamId) || null : null;

      // If no team is selected but user has teams, auto-select the first one
      if (!restoredTeam && teams.length > 0) {
        restoredTeam = teams[0];
        localStorage.setItem(CURRENT_TEAM_KEY, restoredTeam.id);
      }

      setOrgData((prev) => ({ ...prev, teams, isLoading: false }));
      setCurrentTeamState(restoredTeam);
    } else {
      setOrgData((prev) => ({
        ...prev,
        isLoading: false,
        error: result.error || null,
      }));
    }
  }, []);

  // Initial load -- guarded against React Strict Mode double-mount
  useEffect(() => {
    // Skip if initial fetch already started (prevents double-fetch in Strict Mode)
    if (initialFetchStartedRef.current) {
      debug('Initial fetch already in progress, skipping duplicate');
      return;
    }
    initialFetchStartedRef.current = true;

    let cancelled = false;

    const loadData = async () => {
      setOrgData((prev) => ({ ...prev, isLoading: true }));
      await Promise.all([refreshOrganization(), refreshTeams()]);
      // If effect was cleaned up while fetching, don't update state
      if (cancelled) {
        debug('Initial load completed after unmount, discarding results');
      }
    };
    loadData();

    return () => {
      cancelled = true;
    };
  }, [refreshOrganization, refreshTeams]);

  // Set current team (pass null to show all prototypes)
  const setCurrentTeam = useCallback((teamId: string | null) => {
    if (teamId === null) {
      localStorage.removeItem(CURRENT_TEAM_KEY);
      setCurrentTeamState(null);
      return;
    }
    const team = orgData.teams.find((t) => t.id === teamId);
    if (team) {
      localStorage.setItem(CURRENT_TEAM_KEY, teamId);
      setCurrentTeamState(team);
    }
  }, [orgData.teams]);

  // Update organization
  const updateOrganization = useCallback(async (
    updates: { name?: string; description?: string; stateDefinitions?: Array<{ id: string; name: string }>; userDefinitions?: Array<{ id: string; name: string }> }
  ): Promise<Organization | null> => {
    if (!orgData.organization) {
      setOrgData((prev) => ({ ...prev, error: 'No organization found' }));
      return null;
    }

    const result = await apiPut<Organization>(
      API_ENDPOINTS.ORGANIZATION(orgData.organization.id),
      updates,
      'Failed to update organization'
    );

    if (result.success && result.data) {
      setOrgData((prev) => ({ ...prev, organization: result.data! }));
      return result.data;
    }

    setOrgData((prev) => ({ ...prev, error: result.error || null }));
    return null;
  }, [orgData.organization]);

  // Create a new team
  const createTeam = useCallback(async (name: string, description?: string): Promise<Team | null> => {
    const result = await apiPost<Team>(
      API_ENDPOINTS.TEAMS,
      { name, description },
      'Failed to create team'
    );

    if (result.success && result.data) {
      await refreshTeams();
      return result.data;
    }

    setOrgData((prev) => ({ ...prev, error: result.error || null }));
    return null;
  }, [refreshTeams]);

  // Update a team
  const updateTeam = useCallback(async (
    teamId: string,
    updates: { name?: string; description?: string }
  ): Promise<Team | null> => {
    const result = await apiPut<Team>(
      API_ENDPOINTS.TEAM(teamId),
      updates,
      'Failed to update team'
    );

    if (result.success && result.data) {
      await refreshTeams();
      return result.data;
    }

    setOrgData((prev) => ({ ...prev, error: result.error || null }));
    return null;
  }, [refreshTeams]);

  // Delete a team
  const deleteTeam = useCallback(async (teamId: string): Promise<boolean> => {
    const result = await apiDelete(
      API_ENDPOINTS.TEAM(teamId),
      'Failed to delete team'
    );

    if (result.success) {
      await refreshTeams();
      return true;
    }

    setOrgData((prev) => ({ ...prev, error: result.error || null }));
    return false;
  }, [refreshTeams]);

  // Set up organization and first team for users without one
  const setupOrganization = useCallback(async (teamName: string): Promise<boolean> => {
    debug('setupOrganization: Creating team:', teamName);

    const result = await apiPost<{ organization: Organization; team: Team & { role: Role } }>(
      API_ENDPOINTS.ORGANIZATIONS_SETUP,
      { teamName },
      'Failed to set up organization'
    );

    debug('setupOrganization: Result:', result);

    if (result.success && result.data) {
      // Refresh data to get the new org and team
      await Promise.all([refreshOrganization(), refreshTeams()]);

      // Auto-select the new team
      if (result.data.team) {
        localStorage.setItem(CURRENT_TEAM_KEY, result.data.team.id);
      }

      return true;
    }

    debug('setupOrganization: Error:', result.error);
    setOrgData((prev) => ({ ...prev, error: result.error || null }));
    return false;
  }, [refreshOrganization, refreshTeams]);

  const value: OrganizationContextValue = useMemo(() => ({
    ...orgData,
    currentTeam,
    setCurrentTeam,
    refreshOrganization,
    refreshTeams,
    setupOrganization,
    updateOrganization,
    createTeam,
    updateTeam,
    deleteTeam,
  }), [orgData, currentTeam, setCurrentTeam, refreshOrganization, refreshTeams, setupOrganization, updateOrganization, createTeam, updateTeam, deleteTeam]);

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access organization context.
 * Must be used within OrganizationProvider.
 */
export function useOrganizationContext(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganizationContext must be used within OrganizationProvider');
  }
  return context;
}

/**
 * Try to access organization context, returning null if not within a provider.
 * Used internally by the useOrganization hook for fallback behavior.
 */
export function useOrganizationContextMaybe(): OrganizationContextValue | null {
  return useContext(OrganizationContext);
}
