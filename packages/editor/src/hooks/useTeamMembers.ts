import { useState, useEffect, useCallback } from 'react';
import type { Role } from '@uswds-pt/shared';
import { API_ENDPOINTS, apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

interface TeamMember {
  id: string;
  email: string;
  name?: string;
  role: Role;
  joinedAt: Date;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: Role;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  invitedById: string;
  invitedByEmail?: string;
  invitedByName?: string;
}

interface TeamMembersState {
  members: TeamMember[];
  invitations: PendingInvitation[];
  isLoading: boolean;
  error: string | null;
}

interface UseTeamMembersReturn extends TeamMembersState {
  refreshMembers: () => Promise<void>;
  refreshInvitations: () => Promise<void>;
  addMember: (userId: string, role?: Role) => Promise<boolean>;
  updateMemberRole: (userId: string, role: Role) => Promise<boolean>;
  removeMember: (userId: string) => Promise<boolean>;
  sendInvitation: (email: string, role?: Role) => Promise<boolean>;
  cancelInvitation: (invitationId: string) => Promise<boolean>;
  clearError: () => void;
}

export function useTeamMembers(teamId: string | null): UseTeamMembersReturn {
  const [state, setState] = useState<TeamMembersState>({
    members: [],
    invitations: [],
    isLoading: false,
    error: null,
  });

  // Load team members
  const refreshMembers = useCallback(async () => {
    if (!teamId) return;

    const result = await apiGet<{ members: TeamMember[] }>(
      API_ENDPOINTS.TEAM_MEMBERS(teamId)
    );
    if (result.success && result.data) {
      const members = result.data.members || [];
      setState((prev) => ({ ...prev, members }));
    }
  }, [teamId]);

  // Load pending invitations
  const refreshInvitations = useCallback(async () => {
    if (!teamId) return;

    const result = await apiGet<{ invitations: PendingInvitation[] }>(
      API_ENDPOINTS.TEAM_INVITATIONS(teamId)
    );
    if (result.success && result.data) {
      const invitations = result.data.invitations || [];
      setState((prev) => ({ ...prev, invitations }));
    }
  }, [teamId]);

  // Initial load when teamId changes
  useEffect(() => {
    let mounted = true;

    if (teamId) {
      if (mounted) {
        setState((prev) => ({ ...prev, isLoading: true }));
      }
      Promise.all([refreshMembers(), refreshInvitations()])
        .finally(() => {
          if (mounted) {
            setState((prev) => ({ ...prev, isLoading: false }));
          }
        });
    } else {
      if (mounted) {
        setState({
          members: [],
          invitations: [],
          isLoading: false,
          error: null,
        });
      }
    }

    return () => {
      mounted = false;
    };
  }, [teamId, refreshMembers, refreshInvitations]);

  // Add a member directly (for users already in the organization)
  const addMember = useCallback(async (userId: string, role: Role = 'team_member'): Promise<boolean> => {
    if (!teamId) return false;

    const result = await apiPost(
      API_ENDPOINTS.TEAM_MEMBERS(teamId),
      { userId, role },
      'Failed to add member'
    );

    if (result.success) {
      await refreshMembers();
      return true;
    }

    setState((prev) => ({ ...prev, error: result.error || null }));
    return false;
  }, [teamId, refreshMembers]);

  // Update a member's role
  const updateMemberRole = useCallback(async (userId: string, role: Role): Promise<boolean> => {
    if (!teamId) return false;

    const result = await apiPut(
      API_ENDPOINTS.TEAM_MEMBER(teamId, userId),
      { role },
      'Failed to update role'
    );

    if (result.success) {
      await refreshMembers();
      return true;
    }

    setState((prev) => ({ ...prev, error: result.error || null }));
    return false;
  }, [teamId, refreshMembers]);

  // Remove a member from the team
  const removeMember = useCallback(async (userId: string): Promise<boolean> => {
    if (!teamId) return false;

    const result = await apiDelete(
      API_ENDPOINTS.TEAM_MEMBER(teamId, userId),
      'Failed to remove member'
    );

    if (result.success) {
      await refreshMembers();
      return true;
    }

    setState((prev) => ({ ...prev, error: result.error || null }));
    return false;
  }, [teamId, refreshMembers]);

  // Send an invitation to a new user
  const sendInvitation = useCallback(async (email: string, role: Role = 'team_member'): Promise<boolean> => {
    if (!teamId) return false;

    const result = await apiPost(
      API_ENDPOINTS.TEAM_INVITATIONS(teamId),
      { email, role },
      'Failed to send invitation'
    );

    if (result.success) {
      await refreshInvitations();
      return true;
    }

    setState((prev) => ({ ...prev, error: result.error || null }));
    return false;
  }, [teamId, refreshInvitations]);

  // Cancel a pending invitation
  const cancelInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    const result = await apiDelete(
      API_ENDPOINTS.INVITATION(invitationId),
      'Failed to cancel invitation'
    );

    if (result.success) {
      await refreshInvitations();
      return true;
    }

    setState((prev) => ({ ...prev, error: result.error || null }));
    return false;
  }, [refreshInvitations]);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    refreshMembers,
    refreshInvitations,
    addMember,
    updateMemberRole,
    removeMember,
    sendInvitation,
    cancelInvitation,
    clearError,
  };
}
