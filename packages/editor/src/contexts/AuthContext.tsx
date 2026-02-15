/**
 * Auth Context
 *
 * Provides centralized authentication state management using React Context.
 * This ensures auth state is shared across all components rather than duplicated.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { UserWithOrgAndTeams } from '@uswds-pt/shared';

// ============================================================================
// Types
// ============================================================================

interface AuthState {
  user: UserWithOrgAndTeams | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  loginWithToken: (token: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

// ============================================================================
// Constants
// ============================================================================

const TOKEN_KEY = 'uswds_pt_token';
const USER_KEY = 'uswds_pt_user';
// AuthContext defines its own API_URL to avoid circular imports (api.ts imports authFetch from here).
// The canonical API_URL and API_ENDPOINTS live in lib/api.ts — all other files should use those.
const API_URL = import.meta.env.VITE_API_URL || '';

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Read auth state from localStorage
  const readFromStorage = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as UserWithOrgAndTeams;
        setState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } catch {
        // Invalid stored data, clear it
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setState((prev) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: prev.error,
    }));
    return false;
  }, []);

  // Initialize from localStorage on mount
  useEffect(() => {
    readFromStorage();
  }, [readFromStorage]);

  // Listen for storage events (changes from other tabs/windows)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY || e.key === USER_KEY) {
        readFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [readFromStorage]);

  /**
   * Login with an existing JWT token (used by OAuth callback).
   * Stores the token, fetches user data from /api/auth/me, and updates state.
   */
  const loginWithToken = useCallback(async (token: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      localStorage.setItem(TOKEN_KEY, token);

      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        localStorage.removeItem(TOKEN_KEY);
        throw new Error('Failed to fetch user data');
      }

      const user = await response.json() as UserWithOrgAndTeams;
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY);
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw new Error(errorMessage);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    // Redirect to login page
    window.location.hash = '#/login';
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const user = await response.json();
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        setState((prev) => ({ ...prev, user }));
      }
    } catch {
      // Silent fail - user data will be stale but auth still works
    }
  }, []);

  const value: AuthContextValue = useMemo(() => ({
    ...state,
    loginWithToken,
    logout,
    clearError,
    refreshUser,
  }), [state, loginWithToken, logout, clearError, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access auth context
 * Must be used within AuthProvider
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}

// ============================================================================
// Utility Functions (for use outside React components)
// ============================================================================

/**
 * Get the stored auth token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Create an authenticated fetch function
 * Automatically prepends API_URL for relative paths
 */
export function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Prepend API_URL for relative paths
  let url = input;
  if (typeof input === 'string' && input.startsWith('/')) {
    url = `${API_URL}${input}`;
  }

  return fetch(url, { ...init, headers });
}
