import { useState, useEffect, useCallback } from 'react';
import type { Role, InvitationWithTeam } from '@uswds-pt/shared';
import { createDebugLogger } from '@uswds-pt/shared';
import { authFetch } from './useAuth';

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
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const response = await authFetch('/api/invitations');
      if (response.ok) {
        const data = await response.json();
        setState({
          invitations: data.invitations || [],
          isLoading: false,
          error: null,
        });
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load invitations',
        }));
      }
    } catch (err) {
      debug('Failed to fetch invitations:', err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load invitations',
      }));
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshInvitations();
  }, [refreshInvitations]);

  // Accept an invitation
  const acceptInvitation = useCallback(async (token: string): Promise<boolean> => {
    try {
      const response = await authFetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
      });

      if (!response.ok) {
        try {
          const error = await response.json();
          setState((prev) => ({
            ...prev,
            error: error.message || 'Failed to accept invitation',
          }));
        } catch {
          setState((prev) => ({ ...prev, error: 'Failed to accept invitation' }));
        }
        return false;
      }

      // Remove accepted invitation from list
      setState((prev) => ({
        ...prev,
        invitations: prev.invitations.filter((inv) => inv.token !== token),
      }));

      return true;
    } catch (err) {
      setState((prev) => ({ ...prev, error: 'Failed to accept invitation' }));
      return false;
    }
  }, []);

  // Decline an invitation
  const declineInvitation = useCallback(async (token: string): Promise<boolean> => {
    try {
      const response = await authFetch(`/api/invitations/${token}/decline`, {
        method: 'POST',
      });

      if (!response.ok) {
        try {
          const error = await response.json();
          setState((prev) => ({
            ...prev,
            error: error.message || 'Failed to decline invitation',
          }));
        } catch {
          setState((prev) => ({ ...prev, error: 'Failed to decline invitation' }));
        }
        return false;
      }

      // Remove declined invitation from list
      setState((prev) => ({
        ...prev,
        invitations: prev.invitations.filter((inv) => inv.token !== token),
      }));

      return true;
    } catch (err) {
      setState((prev) => ({ ...prev, error: 'Failed to decline invitation' }));
      return false;
    }
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
  try {
    const response = await authFetch(`/api/invitations/${token}/accept`, {
      method: 'POST',
    });

    if (!response.ok) {
      try {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to accept invitation',
        };
      } catch {
        return {
          success: false,
          error: 'Failed to accept invitation',
        };
      }
    }

    const data = await response.json();
    return {
      success: true,
      teamId: data.membership?.teamId,
      role: data.membership?.role,
    };
  } catch (err) {
    return {
      success: false,
      error: 'Failed to accept invitation',
    };
  }
}
