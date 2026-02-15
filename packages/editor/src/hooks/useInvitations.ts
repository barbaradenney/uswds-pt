import { useState, useEffect, useCallback } from 'react';
import type { Role, InvitationWithTeam } from '@uswds-pt/shared';
import { createDebugLogger } from '@uswds-pt/shared';
import { API_ENDPOINTS, apiGet, apiPost } from '../lib/api';

const debug = createDebugLogger('Invitations');

interface InvitationsState {
  invitations: InvitationWithTeam[];
  isLoading: boolean;
  error: string | null;
}

interface UseInvitationsReturn extends InvitationsState {
  refreshInvitations: () => Promise<void>;
  acceptInvitation: (token: string) => Promise<boolean>;
  declineInvitation: (invitationId: string) => Promise<boolean>;
  clearError: () => void;
}

/**
 * Hook for managing user's pending invitations
 * This is for the receiving user to view and accept/decline invitations
 */
export function useInvitations(): UseInvitationsReturn {
  const [state, setState] = useState<InvitationsState>({
    invitations: [],
    isLoading: true,
    error: null,
  });

  // Load user's pending invitations
  const refreshInvitations = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    const result = await apiGet<{ invitations: InvitationWithTeam[] }>(
      API_ENDPOINTS.INVITATIONS,
      'Failed to load invitations'
    );
    if (result.success) {
      setState({
        invitations: result.data?.invitations || [],
        isLoading: false,
        error: null,
      });
    } else {
      debug('Failed to fetch invitations:', result.error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: result.error || 'Failed to load invitations',
      }));
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshInvitations();
  }, [refreshInvitations]);

  // Accept an invitation
  const acceptInvitation = useCallback(async (token: string): Promise<boolean> => {
    const result = await apiPost(
      API_ENDPOINTS.INVITATION_ACCEPT(token),
      undefined,
      'Failed to accept invitation'
    );

    if (!result.success) {
      setState((prev) => ({
        ...prev,
        error: result.error || 'Failed to accept invitation',
      }));
      return false;
    }

    // Remove accepted invitation from list
    setState((prev) => ({
      ...prev,
      invitations: prev.invitations.filter((inv) => inv.token !== token),
    }));

    return true;
  }, []);

  // Decline an invitation
  const declineInvitation = useCallback(async (token: string): Promise<boolean> => {
    const result = await apiPost(
      API_ENDPOINTS.INVITATION_DECLINE(token),
      undefined,
      'Failed to decline invitation'
    );

    if (!result.success) {
      setState((prev) => ({
        ...prev,
        error: result.error || 'Failed to decline invitation',
      }));
      return false;
    }

    // Remove declined invitation from list
    setState((prev) => ({
      ...prev,
      invitations: prev.invitations.filter((inv) => inv.token !== token),
    }));

    return true;
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    refreshInvitations,
    acceptInvitation,
    declineInvitation,
    clearError,
  };
}

/**
 * Accept an invitation by token (can be used without hook context)
 * Useful for handling invitation links
 */
export async function acceptInvitationByToken(token: string): Promise<{
  success: boolean;
  error?: string;
  teamId?: string;
  role?: Role;
}> {
  const result = await apiPost<{ membership?: { teamId?: string; role?: Role } }>(
    API_ENDPOINTS.INVITATION_ACCEPT(token),
    undefined,
    'Failed to accept invitation'
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Failed to accept invitation',
    };
  }

  return {
    success: true,
    teamId: result.data?.membership?.teamId,
    role: result.data?.membership?.role,
  };
}
