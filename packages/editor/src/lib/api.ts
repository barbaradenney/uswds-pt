/**
 * API Utilities
 * Centralized API endpoint constants and helper functions
 */

import { createDebugLogger } from '@uswds-pt/shared';
import { authFetch } from '../hooks/useAuth';
import type {
  GlobalSymbol,
  GlobalSymbolListResponse,
  CreateGlobalSymbolRequest,
  UpdateGlobalSymbolRequest,
  PromoteSymbolRequest,
  GrapesJSSymbol,
  SymbolScope,
} from '@uswds-pt/shared';

/**
 * Base API URL derived from the VITE_API_URL environment variable.
 * Empty string when not configured (demo mode).
 */
export const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Whether the editor is running in demo mode (no API URL configured).
 * In demo mode, prototypes are stored in localStorage and auth is skipped.
 */
export const isDemoMode = !import.meta.env.VITE_API_URL;

/**
 * API endpoint constants
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_ME: '/api/auth/me',
  AUTH_GITHUB: '/api/auth/github',

  // Organizations
  ORGANIZATIONS: '/api/organizations',
  ORGANIZATION: (orgId: string) => `/api/organizations/${orgId}`,
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
  PROTOTYPE: (slug: string) => `/api/prototypes/${encodeURIComponent(slug)}`,
  PROTOTYPE_DUPLICATE: (slug: string) => `/api/prototypes/${encodeURIComponent(slug)}/duplicate`,

  // Prototype Actions
  PROTOTYPE_PUSH: (slug: string) => `/api/prototypes/${encodeURIComponent(slug)}/push`,

  // Prototype Versions
  PROTOTYPE_VERSIONS: (slug: string) => `/api/prototypes/${encodeURIComponent(slug)}/versions`,
  PROTOTYPE_VERSION_RESTORE: (slug: string, version: number) => `/api/prototypes/${encodeURIComponent(slug)}/versions/${version}/restore`,
  PROTOTYPE_VERSION_COMPARE: (slug: string, v1: number, v2: number | 'current') =>
    `/api/prototypes/${encodeURIComponent(slug)}/versions/${v1}/compare/${v2}`,
  PROTOTYPE_VERSION_LABEL: (slug: string, version: number) =>
    `/api/prototypes/${encodeURIComponent(slug)}/versions/${version}`,

  // Global Symbols
  TEAM_SYMBOLS: (teamId: string) => `/api/teams/${encodeURIComponent(teamId)}/symbols`,
  TEAM_SYMBOL: (teamId: string, symbolId: string) => `/api/teams/${encodeURIComponent(teamId)}/symbols/${encodeURIComponent(symbolId)}`,
  TEAM_SYMBOL_PROMOTE: (teamId: string, symbolId: string) => `/api/teams/${encodeURIComponent(teamId)}/symbols/${encodeURIComponent(symbolId)}/promote`,

  // Organization Symbols
  ORG_SYMBOLS: (orgId: string) => `/api/organizations/${encodeURIComponent(orgId)}/symbols`,
  ORG_SYMBOL: (orgId: string, symbolId: string) => `/api/organizations/${encodeURIComponent(orgId)}/symbols/${encodeURIComponent(symbolId)}`,

  // GitHub Integration (team-level)
  GITHUB_REPOS: '/api/github/repos',
  GITHUB_TEAM_CONNECTION: (teamId: string) => `/api/teams/${encodeURIComponent(teamId)}/github`,
  GITHUB_TEAM_CONNECT: (teamId: string) => `/api/teams/${encodeURIComponent(teamId)}/github/connect`,
  GITHUB_TEAM_DISCONNECT: (teamId: string) => `/api/teams/${encodeURIComponent(teamId)}/github/disconnect`,

  // GitHub Handoff Integration (team-level)
  GITHUB_TEAM_HANDOFF: (teamId: string) => `/api/teams/${encodeURIComponent(teamId)}/github/handoff`,
  GITHUB_TEAM_HANDOFF_CONNECT: (teamId: string) => `/api/teams/${encodeURIComponent(teamId)}/github/handoff/connect`,
  GITHUB_TEAM_HANDOFF_DISCONNECT: (teamId: string) => `/api/teams/${encodeURIComponent(teamId)}/github/handoff/disconnect`,

  // Prototype Actions — Handoff
  PROTOTYPE_PUSH_HANDOFF: (slug: string) => `/api/prototypes/${encodeURIComponent(slug)}/push-handoff`,

  // Preview (public, no auth required)
  PREVIEW: (slug: string) => `/api/preview/${encodeURIComponent(slug)}`,

  // AI Copilot
  AI_CHAT: '/api/ai/chat',
} as const;

const debug = createDebugLogger('API');

/**
 * Safely parse a JSON response body, returning a fallback on failure.
 * Replaces the common `response.json().catch(() => ({}))` pattern.
 */
export async function parseJsonSafely(response: Response, fallback: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  try {
    return await response.json();
  } catch {
    return fallback;
  }
}

/**
 * Result type for API operations
 */
export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Options for API requests.
 *
 * For most callers, the convenience helpers (apiGet, apiPost, …) are sufficient.
 * Use `headers` / `signal` only when the standard helpers don't cover your
 * use case (e.g., optimistic concurrency via If-Match, or cancellation).
 */
interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  /** Extra headers merged with the default Content-Type header. */
  headers?: Record<string, string>;
  /** AbortSignal for request cancellation. */
  signal?: AbortSignal;
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
  const { method = 'GET', body, headers: extraHeaders, signal, defaultError = 'Request failed' } = options;

  try {
    const init: RequestInit = {
      method,
      signal,
    };

    const mergedHeaders: Record<string, string> = { ...extraHeaders };
    if (body !== undefined) {
      mergedHeaders['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    if (Object.keys(mergedHeaders).length > 0) {
      init.headers = mergedHeaders;
    }

    const response = await authFetch(endpoint, init);

    if (!response.ok) {
      const errorData = await parseJsonSafely(response);
      return {
        success: false,
        error: (errorData.message as string) || defaultError,
      };
    }

    // Handle empty responses (e.g., DELETE)
    const text = await response.text();
    let data: T | undefined;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      // Non-JSON response body — treat as successful with no data
      data = undefined;
    }

    return {
      success: true,
      data,
    };
  } catch (err) {
    debug(defaultError, err);
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
 * Helper for PATCH requests
 */
export function apiPatch<T>(endpoint: string, body?: unknown, defaultError?: string): Promise<ApiResult<T>> {
  return apiRequest<T>(endpoint, { method: 'PATCH', body, defaultError });
}

/**
 * Helper for DELETE requests
 */
export function apiDelete<T>(endpoint: string, defaultError?: string): Promise<ApiResult<T>> {
  return apiRequest<T>(endpoint, { method: 'DELETE', defaultError });
}

// ============================================================================
// Global Symbols API Functions
// ============================================================================

/**
 * Fetch all global symbols for a team
 */
export function fetchGlobalSymbols(teamId: string): Promise<ApiResult<GlobalSymbolListResponse>> {
  return apiGet<GlobalSymbolListResponse>(
    API_ENDPOINTS.TEAM_SYMBOLS(teamId),
    'Failed to fetch global symbols'
  );
}

/**
 * Create a new global symbol with optional scope
 */
export function createGlobalSymbol(
  teamId: string,
  name: string,
  symbolData: GrapesJSSymbol,
  scope?: SymbolScope,
  prototypeId?: string,
): Promise<ApiResult<GlobalSymbol>> {
  return apiPost<GlobalSymbol>(
    API_ENDPOINTS.TEAM_SYMBOLS(teamId),
    { name, symbolData, scope, prototypeId } as CreateGlobalSymbolRequest,
    'Failed to create global symbol'
  );
}

/**
 * Update an existing global symbol
 */
export function updateGlobalSymbol(
  teamId: string,
  symbolId: string,
  updates: UpdateGlobalSymbolRequest
): Promise<ApiResult<GlobalSymbol>> {
  return apiPut<GlobalSymbol>(
    API_ENDPOINTS.TEAM_SYMBOL(teamId, symbolId),
    updates,
    'Failed to update global symbol'
  );
}

/**
 * Delete a global symbol
 */
export function deleteGlobalSymbol(
  teamId: string,
  symbolId: string
): Promise<ApiResult<{ message: string }>> {
  return apiDelete<{ message: string }>(
    API_ENDPOINTS.TEAM_SYMBOL(teamId, symbolId),
    'Failed to delete global symbol'
  );
}

// ============================================================================
// Organization Symbols API Functions
// ============================================================================

/**
 * Fetch all organization-scoped symbols
 */
export function fetchOrgSymbols(orgId: string): Promise<ApiResult<GlobalSymbolListResponse>> {
  return apiGet<GlobalSymbolListResponse>(
    API_ENDPOINTS.ORG_SYMBOLS(orgId),
    'Failed to fetch organization symbols'
  );
}

/**
 * Create a new organization-scoped symbol
 */
export function createOrgSymbol(
  orgId: string,
  name: string,
  symbolData: GrapesJSSymbol
): Promise<ApiResult<GlobalSymbol>> {
  return apiPost<GlobalSymbol>(
    API_ENDPOINTS.ORG_SYMBOLS(orgId),
    { name, symbolData },
    'Failed to create organization symbol'
  );
}

/**
 * Update an organization-scoped symbol
 */
export function updateOrgSymbol(
  orgId: string,
  symbolId: string,
  updates: UpdateGlobalSymbolRequest
): Promise<ApiResult<GlobalSymbol>> {
  return apiPut<GlobalSymbol>(
    API_ENDPOINTS.ORG_SYMBOL(orgId, symbolId),
    updates,
    'Failed to update organization symbol'
  );
}

/**
 * Delete an organization-scoped symbol
 */
export function deleteOrgSymbol(
  orgId: string,
  symbolId: string
): Promise<ApiResult<{ message: string }>> {
  return apiDelete<{ message: string }>(
    API_ENDPOINTS.ORG_SYMBOL(orgId, symbolId),
    'Failed to delete organization symbol'
  );
}

// ============================================================================
// Symbol Promotion
// ============================================================================

/**
 * Promote a symbol to a higher scope (creates a copy)
 */
export function promoteSymbol(
  teamId: string,
  symbolId: string,
  targetScope: 'team' | 'organization'
): Promise<ApiResult<GlobalSymbol>> {
  return apiPost<GlobalSymbol>(
    API_ENDPOINTS.TEAM_SYMBOL_PROMOTE(teamId, symbolId),
    { targetScope } as PromoteSymbolRequest,
    'Failed to promote symbol'
  );
}
