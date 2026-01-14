import { useState, useEffect, useCallback } from 'react';
import type {
  Organization,
  Team,
  Role,
  TeamMembershipWithTeam,
} from '@uswds-pt/shared';
import { API_ENDPOINTS, apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

interface OrganizationState {
  organization: Organization | null;
  teams: Array<Team & { role: Role; joinedAt: Date }>;
  currentTeam: (Team & { role: Role; joinedAt: Date }) | null;
  isLoading: boolean;
  error: string | null;
}

interface UseOrganizationReturn extends OrganizationState {
  setCurrentTeam: (teamId: string) => void;
  refreshOrganization: () => Promise<void>;
  refreshTeams: () => Promise<void>;
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
      setState((prev) => ({ ...prev, organization: result.data! }));
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

      // Restore current team from localStorage or use first team
      const savedTeamId = localStorage.getItem(CURRENT_TEAM_KEY);
      const currentTeam = teams.find((t) => t.id === savedTeamId) || teams[0] || null;

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

  // Set current team
  const setCurrentTeam = useCallback((teamId: string) => {
    setState((prev) => {
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

  return {
    ...state,
    setCurrentTeam,
    refreshOrganization,
    refreshTeams,
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
