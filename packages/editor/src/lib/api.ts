/**
 * API Utilities
 * Centralized API endpoint constants and helper functions
 */

import { authFetch } from '../hooks/useAuth';

/**
 * API endpoint constants
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_ME: '/api/auth/me',

  // Organizations
  ORGANIZATIONS: '/api/organizations',
  ORGANIZATIONS_SETUP: '/api/organizations/setup',

  // Teams
  TEAMS: '/api/teams',
  TEAM: (teamId: string) => `/api/teams/${teamId}`,
  TEAM_MEMBERS: (teamId: string) => `/api/teams/${teamId}/members`,
  TEAM_MEMBER: (teamId: string, userId: string) => `/api/teams/${teamId}/members/${userId}`,

  // Invitations
  INVITATIONS: '/api/invitations',
  INVITATION: (invitationId: string) => `/api/invitations/${invitationId}`,
  INVITATION_ACCEPT: (token: string) => `/api/invitations/${token}/accept`,
  INVITATION_DECLINE: (token: string) => `/api/invitations/${token}/decline`,
  TEAM_INVITATIONS: (teamId: string) => `/api/invitations/teams/${teamId}/invitations`,

  // Prototypes
  PROTOTYPES: '/api/prototypes',
  PROTOTYPE: (slug: string) => `/api/prototypes/${slug}`,

  // Prototype Versions
  PROTOTYPE_VERSIONS: (slug: string) => `/api/prototypes/${slug}/versions`,
  PROTOTYPE_VERSION_RESTORE: (slug: string, version: number) => `/api/prototypes/${slug}/versions/${version}/restore`,
} as const;

/**
 * Result type for API operations
 */
export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Options for API requests
 */
interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  defaultError?: string;
}

/**
 * Make an authenticated API request with consistent error handling
 * @param endpoint - The API endpoint to call
 * @param options - Request options
 * @returns ApiResult with success status, data, or error message
 */
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResult<T>> {
  const { method = 'GET', body, defaultError = 'Request failed' } = options;

  try {
    const init: RequestInit = {
      method,
    };

    if (body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }

    const response = await authFetch(endpoint, init);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || defaultError,
      };
    }

    // Handle empty responses (e.g., DELETE)
    const text = await response.text();
    const data = text ? JSON.parse(text) : undefined;

    return {
      success: true,
      data,
    };
  } catch (err) {
    return {
      success: false,
      error: defaultError,
    };
  }
}

/**
 * Helper for GET requests
 */
export function apiGet<T>(endpoint: string, defaultError?: string): Promise<ApiResult<T>> {
  return apiRequest<T>(endpoint, { method: 'GET', defaultError });
}

/**
 * Helper for POST requests
 */
export function apiPost<T>(endpoint: string, body?: unknown, defaultError?: string): Promise<ApiResult<T>> {
  return apiRequest<T>(endpoint, { method: 'POST', body, defaultError });
}

/**
 * Helper for PUT requests
 */
export function apiPut<T>(endpoint: string, body?: unknown, defaultError?: string): Promise<ApiResult<T>> {
  return apiRequest<T>(endpoint, { method: 'PUT', body, defaultError });
}

/**
 * Helper for DELETE requests
 */
export function apiDelete<T>(endpoint: string, defaultError?: string): Promise<ApiResult<T>> {
  return apiRequest<T>(endpoint, { method: 'DELETE', defaultError });
}
