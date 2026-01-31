import { useState, useEffect, useCallback } from 'react';
import type { Organization, Team, Role } from '@uswds-pt/shared';
import { API_ENDPOINTS, apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

interface OrganizationState {
  organization: Organization | null;
  teams: Array<Team & { role: Role; joinedAt: Date }>;
  currentTeam: (Team & { role: Role; joinedAt: Date }) | null;
  isLoading: boolean;
  error: string | null;
}

interface UseOrganizationReturn extends OrganizationState {
  setCurrentTeam: (teamId: string | null) => void;
  refreshOrganization: () => Promise<void>;
  refreshTeams: () => Promise<void>;
  setupOrganization: (teamName: string) => Promise<boolean>;
  createTeam: (name: string, description?: string) => Promise<Team | null>;
  updateTeam: (teamId: string, updates: { name?: string; description?: string }) => Promise<Team | null>;
  deleteTeam: (teamId: string) => Promise<boolean>;
}

const CURRENT_TEAM_KEY = 'uswds_pt_current_team';

export function useOrganization(): UseOrganizationReturn {
  const [state, setState] = useState<OrganizationState>({
    organization: null,
    teams: [],
    currentTeam: null,
    isLoading: true,
    error: null,
  });

  // Load organization data
  const refreshOrganization = useCallback(async () => {
    const result = await apiGet<Organization>(API_ENDPOINTS.ORGANIZATIONS);
    if (result.success && result.data) {
      const organization = result.data;
      setState((prev) => ({ ...prev, organization }));
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
      let currentTeam = savedTeamId ? teams.find((t) => t.id === savedTeamId) || null : null;

      // If no team is selected but user has teams, auto-select the first one
      if (!currentTeam && teams.length > 0) {
        currentTeam = teams[0];
        localStorage.setItem(CURRENT_TEAM_KEY, currentTeam.id);
      }

      setState((prev) => ({
        ...prev,
        teams,
        currentTeam,
        isLoading: false,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: result.error || null,
      }));
    }
  }, []);

  // Initial load
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (mounted) {
        setState((prev) => ({ ...prev, isLoading: true }));
      }
      await Promise.all([refreshOrganization(), refreshTeams()]);
    };
    loadData();

    return () => {
      mounted = false;
    };
  }, [refreshOrganization, refreshTeams]);

  // Set current team (pass null to show all prototypes)
  const setCurrentTeam = useCallback((teamId: string | null) => {
    setState((prev) => {
      if (teamId === null) {
        localStorage.removeItem(CURRENT_TEAM_KEY);
        return { ...prev, currentTeam: null };
      }
      const team = prev.teams.find((t) => t.id === teamId);
      if (team) {
        localStorage.setItem(CURRENT_TEAM_KEY, teamId);
        return { ...prev, currentTeam: team };
      }
      return prev;
    });
  }, []);

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

    setState((prev) => ({ ...prev, error: result.error || null }));
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

    setState((prev) => ({ ...prev, error: result.error || null }));
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

    setState((prev) => ({ ...prev, error: result.error || null }));
    return false;
  }, [refreshTeams]);

  // Set up organization and first team for users without one
  const setupOrganization = useCallback(async (teamName: string): Promise<boolean> => {
    console.log('[setupOrganization] Creating team:', teamName);

    const result = await apiPost<{ organization: Organization; team: Team & { role: Role } }>(
      API_ENDPOINTS.ORGANIZATIONS_SETUP,
      { teamName },
      'Failed to set up organization'
    );

    console.log('[setupOrganization] Result:', result);

    if (result.success && result.data) {
      // Refresh data to get the new org and team
      await Promise.all([refreshOrganization(), refreshTeams()]);

      // Auto-select the new team
      if (result.data.team) {
        localStorage.setItem(CURRENT_TEAM_KEY, result.data.team.id);
      }

      return true;
    }

    console.error('[setupOrganization] Error:', result.error);
    setState((prev) => ({ ...prev, error: result.error || null }));
    return false;
  }, [refreshOrganization, refreshTeams]);

  return {
    ...state,
    setCurrentTeam,
    refreshOrganization,
    refreshTeams,
    setupOrganization,
    createTeam,
    updateTeam,
    deleteTeam,
  };
}

/**
 * Get the current team ID from localStorage
 */
export function getCurrentTeamId(): string | null {
  return localStorage.getItem(CURRENT_TEAM_KEY);
}
