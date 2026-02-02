/**
 * Auth Hook
 *
 * Re-exports auth functionality from AuthContext.
 * Provides backwards compatibility for existing imports.
 */

// Re-export from context for backwards compatibility
export { useAuthContext as useAuth, getAuthToken, authFetch } from '../contexts/AuthContext';

// Also export the provider for use in main.tsx
export { AuthProvider } from '../contexts/AuthContext';
