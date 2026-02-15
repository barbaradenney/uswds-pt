/**
 * Tests for AuthContext
 *
 * Covers: initial state, login flow, logout flow, localStorage restoration,
 * cross-tab storage sync, refreshUser, authFetch, and edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { AuthProvider, useAuthContext, getAuthToken, authFetch } from './AuthContext';
import type { UserWithOrgAndTeams } from '@uswds-pt/shared';

// ============================================================================
// Fixtures
// ============================================================================

function createMockUser(overrides: Partial<UserWithOrgAndTeams> = {}): UserWithOrgAndTeams {
  return {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    teamMemberships: [
      {
        teamId: 'team-1',
        teamName: 'Alpha Team',
        teamSlug: 'alpha-team',
        role: 'team_member',
        joinedAt: new Date('2025-01-01'),
      },
    ],
    organization: { id: 'org-1', name: 'Test Org', slug: 'test-org' },
    ...overrides,
  };
}

// ============================================================================
// In-memory localStorage
// ============================================================================

/**
 * The global test setup installs a no-op localStorage mock.
 * AuthContext needs a working one, so we replace it per-suite.
 */
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (index: number) => [...store.keys()][index] ?? null,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/** Wrapper component that renders children inside AuthProvider */
function Wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

/** Simple consumer component that exposes auth state for assertions */
function AuthConsumer() {
  const auth = useAuthContext();
  return (
    <div>
      <span data-testid="is-authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="is-loading">{String(auth.isLoading)}</span>
      <span data-testid="token">{auth.token ?? 'null'}</span>
      <span data-testid="user-name">{auth.user?.name ?? 'null'}</span>
      <span data-testid="error">{auth.error ?? 'null'}</span>
      <button data-testid="logout" onClick={auth.logout}>Logout</button>
      <button data-testid="clear-error" onClick={auth.clearError}>Clear Error</button>
      <button
        data-testid="login"
        onClick={() => auth.loginWithToken('test-jwt-token').catch(() => {})}
      >
        Login
      </button>
      <button data-testid="refresh" onClick={() => auth.refreshUser()}>Refresh</button>
    </div>
  );
}

// ============================================================================
// Test suite
// ============================================================================

describe('AuthContext', () => {
  let memoryStorage: Storage;

  beforeEach(() => {
    memoryStorage = createMemoryStorage();
    Object.defineProperty(window, 'localStorage', {
      value: memoryStorage,
      writable: true,
      configurable: true,
    });

    // Prevent logout from actually navigating
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hash: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    memoryStorage.clear();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Initial state (not authenticated)
  // ==========================================================================

  describe('initial state', () => {
    it('should start with isLoading true then settle to not authenticated', async () => {
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>,
      );

      // After mount + useEffect the state should settle
      await waitFor(() => {
        expect(screen.getByTestId('is-loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
      expect(screen.getByTestId('token').textContent).toBe('null');
      expect(screen.getByTestId('user-name').textContent).toBe('null');
      expect(screen.getByTestId('error').textContent).toBe('null');
    });

    it('should throw when useAuthContext is called outside AuthProvider', () => {
      // Suppress console.error from React error boundary
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        renderHook(() => useAuthContext());
      }).toThrow('useAuthContext must be used within AuthProvider');

      console.error = originalError;
    });
  });

  // ==========================================================================
  // 2. Login flow
  // ==========================================================================

  describe('login flow', () => {
    it('should set token and user after successful loginWithToken', async () => {
      const mockUser = createMockUser();

      server.use(
        http.get('/api/auth/me', () => {
          return HttpResponse.json(mockUser);
        }),
      );

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-loading').textContent).toBe('false');
      });

      await act(async () => {
        screen.getByTestId('login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
      });

      expect(screen.getByTestId('token').textContent).toBe('test-jwt-token');
      expect(screen.getByTestId('user-name').textContent).toBe('Alice');
      expect(screen.getByTestId('error').textContent).toBe('null');

      // Verify token was persisted to localStorage
      expect(memoryStorage.getItem('uswds_pt_token')).toBe('test-jwt-token');
      // Verify user was persisted to localStorage
      const storedUser = JSON.parse(memoryStorage.getItem('uswds_pt_user')!);
      expect(storedUser.id).toBe('user-1');
      expect(storedUser.email).toBe('alice@example.com');
    });

    it('should set error when /api/auth/me returns non-ok status', async () => {
      server.use(
        http.get('/api/auth/me', () => {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }),
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.loginWithToken('bad-token')).rejects.toThrow(
          'Failed to fetch user data',
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch user data');
      });

      expect(result.current.isAuthenticated).toBe(false);
      // Token should have been removed from localStorage
      expect(memoryStorage.getItem('uswds_pt_token')).toBeNull();
    });

    it('should set error when fetch throws a network error', async () => {
      server.use(
        http.get('/api/auth/me', () => {
          return HttpResponse.error();
        }),
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.loginWithToken('token-123')).rejects.toThrow();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
      expect(memoryStorage.getItem('uswds_pt_token')).toBeNull();
    });
  });

  // ==========================================================================
  // 3. Logout flow
  // ==========================================================================

  describe('logout flow', () => {
    it('should clear token, user, and localStorage on logout', async () => {
      const mockUser = createMockUser();

      server.use(
        http.get('/api/auth/me', () => {
          return HttpResponse.json(mockUser);
        }),
      );

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>,
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('is-loading').textContent).toBe('false');
      });

      // Login first
      await act(async () => {
        screen.getByTestId('login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
      });

      // Now logout
      act(() => {
        screen.getByTestId('logout').click();
      });

      expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
      expect(screen.getByTestId('token').textContent).toBe('null');
      expect(screen.getByTestId('user-name').textContent).toBe('null');

      // localStorage should be cleared
      expect(memoryStorage.getItem('uswds_pt_token')).toBeNull();
      expect(memoryStorage.getItem('uswds_pt_user')).toBeNull();

      // Should redirect to login page
      expect(window.location.hash).toBe('#/login');
    });
  });

  // ==========================================================================
  // 4. Token restoration from localStorage on mount
  // ==========================================================================

  describe('token restoration from localStorage', () => {
    it('should restore user and token from localStorage on mount', async () => {
      const mockUser = createMockUser({ name: 'Bob' });

      // Pre-populate localStorage before rendering
      memoryStorage.setItem('uswds_pt_token', 'restored-token');
      memoryStorage.setItem('uswds_pt_user', JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
      expect(screen.getByTestId('token').textContent).toBe('restored-token');
      expect(screen.getByTestId('user-name').textContent).toBe('Bob');
    });

    it('should not restore when only token exists without user data', async () => {
      memoryStorage.setItem('uswds_pt_token', 'orphan-token');
      // No user data stored

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
      expect(screen.getByTestId('token').textContent).toBe('null');
    });

    it('should not restore when only user exists without token', async () => {
      const mockUser = createMockUser();
      // No token, but user data exists
      memoryStorage.setItem('uswds_pt_user', JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    });
  });

  // ==========================================================================
  // 5. Cross-tab sync via StorageEvent
  // ==========================================================================

  describe('cross-tab sync via StorageEvent', () => {
    it('should log out when another tab removes the token', async () => {
      const mockUser = createMockUser();
      memoryStorage.setItem('uswds_pt_token', 'my-token');
      memoryStorage.setItem('uswds_pt_user', JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
      });

      // Simulate another tab removing the token from localStorage
      memoryStorage.removeItem('uswds_pt_token');
      memoryStorage.removeItem('uswds_pt_user');

      // Dispatch a storage event as the browser would for cross-tab changes
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'uswds_pt_token',
            oldValue: 'my-token',
            newValue: null,
          }),
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
      });

      expect(screen.getByTestId('token').textContent).toBe('null');
      expect(screen.getByTestId('user-name').textContent).toBe('null');
    });

    it('should update state when another tab writes new user data', async () => {
      const oldUser = createMockUser({ name: 'OldName' });
      const newUser = createMockUser({ name: 'NewName' });

      memoryStorage.setItem('uswds_pt_token', 'shared-token');
      memoryStorage.setItem('uswds_pt_user', JSON.stringify(oldUser));

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-name').textContent).toBe('OldName');
      });

      // Simulate another tab updating user data
      memoryStorage.setItem('uswds_pt_user', JSON.stringify(newUser));

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'uswds_pt_user',
            oldValue: JSON.stringify(oldUser),
            newValue: JSON.stringify(newUser),
          }),
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-name').textContent).toBe('NewName');
      });
    });

    it('should ignore storage events for unrelated keys', async () => {
      const mockUser = createMockUser();
      memoryStorage.setItem('uswds_pt_token', 'my-token');
      memoryStorage.setItem('uswds_pt_user', JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
      });

      // Dispatch a storage event for a completely different key
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'some_other_key',
            oldValue: 'foo',
            newValue: 'bar',
          }),
        );
      });

      // Auth state should remain unchanged
      expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
      expect(screen.getByTestId('user-name').textContent).toBe('Alice');
    });
  });

  // ==========================================================================
  // 6. refreshUser success and failure paths
  // ==========================================================================

  describe('refreshUser', () => {
    it('should update user data on successful refresh', async () => {
      const initialUser = createMockUser({ name: 'Before Refresh' });
      const updatedUser = createMockUser({ name: 'After Refresh' });

      memoryStorage.setItem('uswds_pt_token', 'valid-token');
      memoryStorage.setItem('uswds_pt_user', JSON.stringify(initialUser));

      server.use(
        http.get('/api/auth/me', () => {
          return HttpResponse.json(updatedUser);
        }),
      );

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-name').textContent).toBe('Before Refresh');
      });

      await act(async () => {
        screen.getByTestId('refresh').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-name').textContent).toBe('After Refresh');
      });

      // localStorage should also be updated
      const stored = JSON.parse(memoryStorage.getItem('uswds_pt_user')!);
      expect(stored.name).toBe('After Refresh');
    });

    it('should silently fail on network error without changing auth state', async () => {
      const initialUser = createMockUser({ name: 'Existing User' });

      memoryStorage.setItem('uswds_pt_token', 'valid-token');
      memoryStorage.setItem('uswds_pt_user', JSON.stringify(initialUser));

      server.use(
        http.get('/api/auth/me', () => {
          return HttpResponse.error();
        }),
      );

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-name').textContent).toBe('Existing User');
      });

      await act(async () => {
        screen.getByTestId('refresh').click();
      });

      // User should remain unchanged after failed refresh
      expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
      expect(screen.getByTestId('user-name').textContent).toBe('Existing User');
      expect(screen.getByTestId('error').textContent).toBe('null');
    });

    it('should silently fail when response is not ok', async () => {
      const initialUser = createMockUser({ name: 'Still Here' });

      memoryStorage.setItem('uswds_pt_token', 'valid-token');
      memoryStorage.setItem('uswds_pt_user', JSON.stringify(initialUser));

      server.use(
        http.get('/api/auth/me', () => {
          return HttpResponse.json({ error: 'Token expired' }, { status: 401 });
        }),
      );

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-name').textContent).toBe('Still Here');
      });

      await act(async () => {
        screen.getByTestId('refresh').click();
      });

      // User should remain unchanged — refreshUser only updates on response.ok
      expect(screen.getByTestId('user-name').textContent).toBe('Still Here');
    });

    it('should do nothing when no token exists in localStorage', async () => {
      // No token in storage — refreshUser should return early

      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const { result } = renderHook(() => useAuthContext(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshUser();
      });

      // Fetch should not have been called by refreshUser (note: it may be
      // called by MSW internals, so we check that no /api/auth/me calls were made)
      const authMeCalls = fetchSpy.mock.calls.filter(
        ([input]) => typeof input === 'string' && input.includes('/api/auth/me'),
      );
      expect(authMeCalls).toHaveLength(0);

      fetchSpy.mockRestore();
    });
  });

  // ==========================================================================
  // 7. authFetch wrapper
  // ==========================================================================

  describe('authFetch', () => {
    it('should add Authorization header when token exists in localStorage', async () => {
      memoryStorage.setItem('uswds_pt_token', 'my-jwt-token');

      let capturedAuthHeader: string | null = null;

      server.use(
        http.get('/api/test-endpoint', ({ request }) => {
          capturedAuthHeader = request.headers.get('Authorization');
          return HttpResponse.json({ ok: true });
        }),
      );

      await authFetch('/api/test-endpoint');

      expect(capturedAuthHeader).toBe('Bearer my-jwt-token');
    });

    it('should not add Authorization header when no token exists', async () => {
      // localStorage is empty

      let capturedAuthHeader: string | null = null;

      server.use(
        http.get('/api/test-endpoint', ({ request }) => {
          capturedAuthHeader = request.headers.get('Authorization');
          return HttpResponse.json({ ok: true });
        }),
      );

      await authFetch('/api/test-endpoint');

      expect(capturedAuthHeader).toBeNull();
    });

    it('should prepend API_URL for relative paths starting with /', async () => {
      // With VITE_API_URL defaulting to '', relative path /api/foo
      // should be called as-is ('' + '/api/foo' = '/api/foo')

      let capturedUrl = '';

      server.use(
        http.get('/api/some-path', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ok: true });
        }),
      );

      await authFetch('/api/some-path');

      expect(capturedUrl).toContain('/api/some-path');
    });

    it('should pass through absolute URLs without prepending API_URL', async () => {
      let capturedUrl = '';

      server.use(
        http.get('https://external.com/data', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ ok: true });
        }),
      );

      await authFetch('https://external.com/data');

      expect(capturedUrl).toBe('https://external.com/data');
    });

    it('should forward custom headers and init options', async () => {
      memoryStorage.setItem('uswds_pt_token', 'my-token');

      let capturedContentType: string | null = null;
      let capturedMethod = '';

      server.use(
        http.post('/api/submit', ({ request }) => {
          capturedContentType = request.headers.get('Content-Type');
          capturedMethod = request.method;
          return HttpResponse.json({ ok: true });
        }),
      );

      await authFetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'test' }),
      });

      expect(capturedMethod).toBe('POST');
      expect(capturedContentType).toBe('application/json');
    });
  });

  // ==========================================================================
  // 8. getAuthToken utility
  // ==========================================================================

  describe('getAuthToken', () => {
    it('should return the stored token', () => {
      memoryStorage.setItem('uswds_pt_token', 'abc-123');
      expect(getAuthToken()).toBe('abc-123');
    });

    it('should return null when no token is stored', () => {
      expect(getAuthToken()).toBeNull();
    });
  });

  // ==========================================================================
  // 9. clearError
  // ==========================================================================

  describe('clearError', () => {
    it('should clear the error state', async () => {
      server.use(
        http.get('/api/auth/me', () => {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }),
      );

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-loading').textContent).toBe('false');
      });

      // Trigger a failed login to produce an error
      await act(async () => {
        screen.getByTestId('login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error').textContent).toBe('Failed to fetch user data');
      });

      // Clear the error
      act(() => {
        screen.getByTestId('clear-error').click();
      });

      expect(screen.getByTestId('error').textContent).toBe('null');
    });
  });

  // ==========================================================================
  // 10. Edge cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle corrupted JSON in localStorage user data', async () => {
      memoryStorage.setItem('uswds_pt_token', 'valid-token');
      memoryStorage.setItem('uswds_pt_user', 'not-valid-json{{{');

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-loading').textContent).toBe('false');
      });

      // Should fall back to unauthenticated state
      expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
      expect(screen.getByTestId('token').textContent).toBe('null');

      // Corrupted data should have been cleaned from localStorage
      expect(memoryStorage.getItem('uswds_pt_token')).toBeNull();
      expect(memoryStorage.getItem('uswds_pt_user')).toBeNull();
    });

    it('should handle empty string token in localStorage', async () => {
      memoryStorage.setItem('uswds_pt_token', '');
      memoryStorage.setItem('uswds_pt_user', JSON.stringify(createMockUser()));

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-loading').textContent).toBe('false');
      });

      // Empty string is falsy, so localStorage.getItem returns '' which is falsy
      // The readFromStorage check is `if (token && userJson)` so empty string fails
      expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    });

    it('should handle loginWithToken being called with empty string', async () => {
      server.use(
        http.get('/api/auth/me', () => {
          return HttpResponse.json(createMockUser());
        }),
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Empty token — the code still stores it and fetches /api/auth/me
      // It technically works because the fetch succeeds (MSW doesn't check the header)
      await act(async () => {
        await result.current.loginWithToken('');
      });

      // The token is stored (even though empty), and user is fetched
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle multiple rapid login calls', async () => {
      const users = [
        createMockUser({ name: 'First' }),
        createMockUser({ name: 'Second' }),
      ];
      let callCount = 0;

      server.use(
        http.get('/api/auth/me', () => {
          const user = users[callCount] ?? users[users.length - 1];
          callCount++;
          return HttpResponse.json(user);
        }),
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Fire two logins rapidly — the second should resolve last
      await act(async () => {
        const p1 = result.current.loginWithToken('token-1');
        const p2 = result.current.loginWithToken('token-2');
        await Promise.allSettled([p1, p2]);
      });

      // The final state should reflect the last resolved login
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
    });

    it('should handle logout when already logged out', async () => {
      const { result } = renderHook(() => useAuthContext(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw
      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });
});
