/**
 * Tests for api.ts — API endpoint constants, apiRequest, and convenience wrappers
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  API_ENDPOINTS,
  parseJsonSafely,
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  fetchGlobalSymbols,
  createGlobalSymbol,
  updateGlobalSymbol,
  deleteGlobalSymbol,
} from './api';

// ---------------------------------------------------------------------------
// Mock authFetch — follows the same pattern used in ai-client.test.ts
// ---------------------------------------------------------------------------
const mockAuthFetch = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a mock Response with a JSON body. */
function jsonResponse(data: unknown, status = 200): Response {
  const body = JSON.stringify(data);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => JSON.parse(body),
    text: async () => body,
    clone: () => jsonResponse(data, status),
  } as unknown as Response;
}

/** Create a mock Response with a plain text body. */
function textResponse(text: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'text/plain' }),
    json: async () => {
      throw new SyntaxError('Unexpected token');
    },
    text: async () => text,
    clone: () => textResponse(text, status),
  } as unknown as Response;
}

/** Create a mock Response with an empty body. */
function emptyResponse(status = 204): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'No Content',
    headers: new Headers(),
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input');
    },
    text: async () => '',
    clone: () => emptyResponse(status),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// API_ENDPOINTS
// ---------------------------------------------------------------------------
describe('API_ENDPOINTS', () => {
  describe('static endpoints', () => {
    it('has correct auth endpoints', () => {
      expect(API_ENDPOINTS.AUTH_LOGIN).toBe('/api/auth/login');
      expect(API_ENDPOINTS.AUTH_REGISTER).toBe('/api/auth/register');
      expect(API_ENDPOINTS.AUTH_ME).toBe('/api/auth/me');
      expect(API_ENDPOINTS.AUTH_GITHUB).toBe('/api/auth/github');
    });

    it('has correct organization endpoints', () => {
      expect(API_ENDPOINTS.ORGANIZATIONS).toBe('/api/organizations');
      expect(API_ENDPOINTS.ORGANIZATIONS_SETUP).toBe('/api/organizations/setup');
    });

    it('has correct static team and prototype endpoints', () => {
      expect(API_ENDPOINTS.TEAMS).toBe('/api/teams');
      expect(API_ENDPOINTS.PROTOTYPES).toBe('/api/prototypes');
      expect(API_ENDPOINTS.INVITATIONS).toBe('/api/invitations');
    });

    it('has correct GitHub and AI endpoints', () => {
      expect(API_ENDPOINTS.GITHUB_REPOS).toBe('/api/github/repos');
      expect(API_ENDPOINTS.AI_CHAT).toBe('/api/ai/chat');
    });
  });

  describe('dynamic endpoint functions', () => {
    it('ORGANIZATION builds correct URL', () => {
      expect(API_ENDPOINTS.ORGANIZATION('org-1')).toBe('/api/organizations/org-1');
    });

    it('TEAM builds correct URL', () => {
      expect(API_ENDPOINTS.TEAM('team-abc')).toBe('/api/teams/team-abc');
    });

    it('TEAM_MEMBERS builds correct URL', () => {
      expect(API_ENDPOINTS.TEAM_MEMBERS('t1')).toBe('/api/teams/t1/members');
    });

    it('TEAM_MEMBER builds correct URL', () => {
      expect(API_ENDPOINTS.TEAM_MEMBER('t1', 'u1')).toBe('/api/teams/t1/members/u1');
    });

    it('INVITATION builds correct URL', () => {
      expect(API_ENDPOINTS.INVITATION('inv-1')).toBe('/api/invitations/inv-1');
    });

    it('INVITATION_ACCEPT and INVITATION_DECLINE build correct URLs', () => {
      expect(API_ENDPOINTS.INVITATION_ACCEPT('tok-abc')).toBe('/api/invitations/tok-abc/accept');
      expect(API_ENDPOINTS.INVITATION_DECLINE('tok-abc')).toBe('/api/invitations/tok-abc/decline');
    });

    it('TEAM_INVITATIONS builds correct URL', () => {
      expect(API_ENDPOINTS.TEAM_INVITATIONS('t1')).toBe('/api/invitations/teams/t1/invitations');
    });

    it('PROTOTYPE encodes slug', () => {
      expect(API_ENDPOINTS.PROTOTYPE('my-prototype')).toBe('/api/prototypes/my-prototype');
      expect(API_ENDPOINTS.PROTOTYPE('slug with spaces')).toBe('/api/prototypes/slug%20with%20spaces');
    });

    it('PROTOTYPE_DUPLICATE encodes slug', () => {
      expect(API_ENDPOINTS.PROTOTYPE_DUPLICATE('my-proto')).toBe('/api/prototypes/my-proto/duplicate');
    });

    it('PROTOTYPE_PUSH encodes slug', () => {
      expect(API_ENDPOINTS.PROTOTYPE_PUSH('my-proto')).toBe('/api/prototypes/my-proto/push');
    });

    it('PROTOTYPE_PUSH_HANDOFF encodes slug', () => {
      expect(API_ENDPOINTS.PROTOTYPE_PUSH_HANDOFF('my-proto')).toBe('/api/prototypes/my-proto/push-handoff');
    });

    it('PROTOTYPE_VERSIONS encodes slug', () => {
      expect(API_ENDPOINTS.PROTOTYPE_VERSIONS('p1')).toBe('/api/prototypes/p1/versions');
    });

    it('PROTOTYPE_VERSION_RESTORE builds correct URL with version number', () => {
      expect(API_ENDPOINTS.PROTOTYPE_VERSION_RESTORE('p1', 3)).toBe('/api/prototypes/p1/versions/3/restore');
    });

    it('PROTOTYPE_VERSION_COMPARE builds correct URL with two versions', () => {
      expect(API_ENDPOINTS.PROTOTYPE_VERSION_COMPARE('p1', 1, 3)).toBe('/api/prototypes/p1/versions/1/compare/3');
    });

    it('PROTOTYPE_VERSION_COMPARE supports "current" as second version', () => {
      expect(API_ENDPOINTS.PROTOTYPE_VERSION_COMPARE('p1', 2, 'current')).toBe('/api/prototypes/p1/versions/2/compare/current');
    });

    it('PROTOTYPE_VERSION_LABEL builds correct URL', () => {
      expect(API_ENDPOINTS.PROTOTYPE_VERSION_LABEL('p1', 5)).toBe('/api/prototypes/p1/versions/5');
    });

    it('TEAM_SYMBOLS encodes teamId', () => {
      expect(API_ENDPOINTS.TEAM_SYMBOLS('team-1')).toBe('/api/teams/team-1/symbols');
      expect(API_ENDPOINTS.TEAM_SYMBOLS('team with space')).toBe('/api/teams/team%20with%20space/symbols');
    });

    it('TEAM_SYMBOL encodes teamId and symbolId', () => {
      expect(API_ENDPOINTS.TEAM_SYMBOL('t1', 's1')).toBe('/api/teams/t1/symbols/s1');
    });

    it('GITHUB_TEAM_CONNECTION builds correct URL', () => {
      expect(API_ENDPOINTS.GITHUB_TEAM_CONNECTION('t1')).toBe('/api/teams/t1/github');
    });

    it('GITHUB_TEAM_CONNECT and DISCONNECT build correct URLs', () => {
      expect(API_ENDPOINTS.GITHUB_TEAM_CONNECT('t1')).toBe('/api/teams/t1/github/connect');
      expect(API_ENDPOINTS.GITHUB_TEAM_DISCONNECT('t1')).toBe('/api/teams/t1/github/disconnect');
    });

    it('GITHUB_TEAM_HANDOFF builds correct URL', () => {
      expect(API_ENDPOINTS.GITHUB_TEAM_HANDOFF('t1')).toBe('/api/teams/t1/github/handoff');
    });

    it('GITHUB_TEAM_HANDOFF_CONNECT and DISCONNECT build correct URLs', () => {
      expect(API_ENDPOINTS.GITHUB_TEAM_HANDOFF_CONNECT('t1')).toBe('/api/teams/t1/github/handoff/connect');
      expect(API_ENDPOINTS.GITHUB_TEAM_HANDOFF_DISCONNECT('t1')).toBe('/api/teams/t1/github/handoff/disconnect');
    });

    it('PREVIEW encodes slug', () => {
      expect(API_ENDPOINTS.PREVIEW('my-proto')).toBe('/api/preview/my-proto');
      expect(API_ENDPOINTS.PREVIEW('special/chars')).toBe('/api/preview/special%2Fchars');
    });
  });
});

// ---------------------------------------------------------------------------
// parseJsonSafely
// ---------------------------------------------------------------------------
describe('parseJsonSafely', () => {
  it('parses a valid JSON response', async () => {
    const response = jsonResponse({ message: 'hello' });
    const result = await parseJsonSafely(response);
    expect(result).toEqual({ message: 'hello' });
  });

  it('returns empty object fallback for non-JSON response', async () => {
    const response = textResponse('<html>Error</html>', 500);
    const result = await parseJsonSafely(response);
    expect(result).toEqual({});
  });

  it('returns custom fallback for non-JSON response', async () => {
    const response = textResponse('not json', 400);
    const fallback = { error: 'unknown' };
    const result = await parseJsonSafely(response, fallback);
    expect(result).toEqual({ error: 'unknown' });
  });

  it('returns fallback when json() throws', async () => {
    const response = {
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as unknown as Response;
    const result = await parseJsonSafely(response);
    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// apiRequest — success paths
// ---------------------------------------------------------------------------
describe('apiRequest', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  describe('success responses', () => {
    it('returns success with parsed JSON data for GET', async () => {
      const data = { id: '1', name: 'Test Prototype' };
      mockAuthFetch.mockResolvedValue(jsonResponse(data));

      const result = await apiRequest('/api/prototypes/test');

      expect(result).toEqual({ success: true, data });
      expect(mockAuthFetch).toHaveBeenCalledWith('/api/prototypes/test', { method: 'GET' });
    });

    it('sends JSON body for POST requests', async () => {
      const requestBody = { name: 'New Item' };
      const responseData = { id: '2', name: 'New Item' };
      mockAuthFetch.mockResolvedValue(jsonResponse(responseData, 201));

      const result = await apiRequest('/api/items', {
        method: 'POST',
        body: requestBody,
      });

      expect(result).toEqual({ success: true, data: responseData });
      expect(mockAuthFetch).toHaveBeenCalledWith('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
    });

    it('sends JSON body for PUT requests', async () => {
      const body = { name: 'Updated' };
      mockAuthFetch.mockResolvedValue(jsonResponse({ id: '1', name: 'Updated' }));

      const result = await apiRequest('/api/items/1', {
        method: 'PUT',
        body,
      });

      expect(result.success).toBe(true);
      expect(mockAuthFetch).toHaveBeenCalledWith('/api/items/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    });

    it('handles empty response body (e.g., 204 No Content)', async () => {
      mockAuthFetch.mockResolvedValue(emptyResponse(204));

      const result = await apiRequest('/api/items/1', { method: 'DELETE' });

      expect(result).toEqual({ success: true, data: undefined });
    });

    it('handles non-JSON success response gracefully', async () => {
      mockAuthFetch.mockResolvedValue(textResponse('OK', 200));

      const result = await apiRequest('/api/health');

      expect(result).toEqual({ success: true, data: undefined });
    });

    it('does not set Content-Type header when body is undefined', async () => {
      mockAuthFetch.mockResolvedValue(jsonResponse({ ok: true }));

      await apiRequest('/api/test', { method: 'GET' });

      const [, init] = mockAuthFetch.mock.calls[0];
      expect(init.headers).toBeUndefined();
    });
  });

  describe('error responses', () => {
    it('returns error with server message for 400 Bad Request', async () => {
      mockAuthFetch.mockResolvedValue(
        jsonResponse({ message: 'Invalid input data' }, 400)
      );

      const result = await apiRequest('/api/items', { method: 'POST', body: {} });

      expect(result).toEqual({
        success: false,
        error: 'Invalid input data',
      });
    });

    it('returns error with server message for 401 Unauthorized', async () => {
      mockAuthFetch.mockResolvedValue(
        jsonResponse({ message: 'Token expired' }, 401)
      );

      const result = await apiRequest('/api/prototypes');

      expect(result).toEqual({
        success: false,
        error: 'Token expired',
      });
    });

    it('returns error with server message for 403 Forbidden', async () => {
      mockAuthFetch.mockResolvedValue(
        jsonResponse({ message: 'Insufficient permissions' }, 403)
      );

      const result = await apiRequest('/api/admin/settings');

      expect(result).toEqual({
        success: false,
        error: 'Insufficient permissions',
      });
    });

    it('returns error with server message for 404 Not Found', async () => {
      mockAuthFetch.mockResolvedValue(
        jsonResponse({ message: 'Prototype not found' }, 404)
      );

      const result = await apiRequest('/api/prototypes/nonexistent');

      expect(result).toEqual({
        success: false,
        error: 'Prototype not found',
      });
    });

    it('returns error with server message for 409 Conflict', async () => {
      mockAuthFetch.mockResolvedValue(
        jsonResponse({ message: 'Version conflict' }, 409)
      );

      const result = await apiRequest('/api/prototypes/test', {
        method: 'PUT',
        body: { name: 'test' },
      });

      expect(result).toEqual({
        success: false,
        error: 'Version conflict',
      });
    });

    it('returns error with server message for 500 Internal Server Error', async () => {
      mockAuthFetch.mockResolvedValue(
        jsonResponse({ message: 'Internal server error' }, 500)
      );

      const result = await apiRequest('/api/prototypes');

      expect(result).toEqual({
        success: false,
        error: 'Internal server error',
      });
    });

    it('uses defaultError when server response has no message', async () => {
      mockAuthFetch.mockResolvedValue(
        jsonResponse({ code: 'ERR_UNKNOWN' }, 500)
      );

      const result = await apiRequest('/api/prototypes', {
        defaultError: 'Failed to load prototypes',
      });

      expect(result).toEqual({
        success: false,
        error: 'Failed to load prototypes',
      });
    });

    it('uses generic default error when no defaultError is provided and no server message', async () => {
      mockAuthFetch.mockResolvedValue(
        jsonResponse({}, 500)
      );

      const result = await apiRequest('/api/something');

      expect(result).toEqual({
        success: false,
        error: 'Request failed',
      });
    });

    it('handles HTML error pages in error responses', async () => {
      mockAuthFetch.mockResolvedValue(
        textResponse('<html><body><h1>502 Bad Gateway</h1></body></html>', 502)
      );

      const result = await apiRequest('/api/prototypes', {
        defaultError: 'Server unavailable',
      });

      // parseJsonSafely will fail and return {}, so defaultError is used
      expect(result).toEqual({
        success: false,
        error: 'Server unavailable',
      });
    });

    it('handles completely empty error response body', async () => {
      mockAuthFetch.mockResolvedValue(emptyResponse(500));

      const result = await apiRequest('/api/test', {
        defaultError: 'Something went wrong',
      });

      // emptyResponse has ok: false for 500, parseJsonSafely returns {}
      expect(result).toEqual({
        success: false,
        error: 'Something went wrong',
      });
    });
  });

  describe('network errors', () => {
    it('returns error when fetch throws a network error', async () => {
      mockAuthFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await apiRequest('/api/prototypes');

      expect(result).toEqual({
        success: false,
        error: 'Request failed',
      });
    });

    it('returns custom defaultError when fetch throws', async () => {
      mockAuthFetch.mockRejectedValue(new Error('Network timeout'));

      const result = await apiRequest('/api/prototypes', {
        defaultError: 'Could not reach the server',
      });

      expect(result).toEqual({
        success: false,
        error: 'Could not reach the server',
      });
    });

    it('returns error on DNS resolution failure', async () => {
      mockAuthFetch.mockRejectedValue(new TypeError('getaddrinfo ENOTFOUND'));

      const result = await apiRequest('/api/test', {
        defaultError: 'Connection failed',
      });

      expect(result).toEqual({
        success: false,
        error: 'Connection failed',
      });
    });

    it('returns error on abort', async () => {
      mockAuthFetch.mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'));

      const result = await apiRequest('/api/test', {
        defaultError: 'Request was cancelled',
      });

      expect(result).toEqual({
        success: false,
        error: 'Request was cancelled',
      });
    });
  });

  describe('edge cases', () => {
    it('handles null body in successful JSON response', async () => {
      const response = {
        ok: true,
        status: 200,
        text: async () => 'null',
        json: async () => null,
      } as unknown as Response;
      mockAuthFetch.mockResolvedValue(response);

      const result = await apiRequest('/api/test');

      expect(result).toEqual({ success: true, data: null });
    });

    it('handles array response body', async () => {
      const items = [{ id: '1' }, { id: '2' }];
      const response = {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(items),
        json: async () => items,
      } as unknown as Response;
      mockAuthFetch.mockResolvedValue(response);

      const result = await apiRequest<Array<{ id: string }>>('/api/items');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(items);
    });

    it('defaults method to GET when not specified', async () => {
      mockAuthFetch.mockResolvedValue(jsonResponse({ ok: true }));

      await apiRequest('/api/test');

      const [, init] = mockAuthFetch.mock.calls[0];
      expect(init.method).toBe('GET');
    });

    it('sends body with PATCH requests', async () => {
      const body = { label: 'v2' };
      mockAuthFetch.mockResolvedValue(jsonResponse({ updated: true }));

      await apiRequest('/api/versions/1', {
        method: 'PATCH',
        body,
      });

      const [, init] = mockAuthFetch.mock.calls[0];
      expect(init.method).toBe('PATCH');
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(init.body).toBe(JSON.stringify(body));
    });
  });
});

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------
describe('apiGet', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it('sends a GET request', async () => {
    mockAuthFetch.mockResolvedValue(jsonResponse({ items: [] }));

    const result = await apiGet<{ items: unknown[] }>('/api/items');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ items: [] });
    expect(mockAuthFetch).toHaveBeenCalledWith('/api/items', { method: 'GET' });
  });

  it('passes defaultError through', async () => {
    mockAuthFetch.mockResolvedValue(jsonResponse({}, 500));

    const result = await apiGet('/api/items', 'Failed to fetch items');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to fetch items');
  });
});

describe('apiPost', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it('sends a POST request with body', async () => {
    const body = { name: 'Test' };
    mockAuthFetch.mockResolvedValue(jsonResponse({ id: '1', name: 'Test' }, 201));

    const result = await apiPost('/api/items', body);

    expect(result.success).toBe(true);
    expect(mockAuthFetch).toHaveBeenCalledWith('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  });

  it('sends a POST request without body', async () => {
    mockAuthFetch.mockResolvedValue(jsonResponse({ triggered: true }));

    const result = await apiPost('/api/actions/trigger');

    expect(result.success).toBe(true);
    const [, init] = mockAuthFetch.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('passes defaultError through', async () => {
    mockAuthFetch.mockResolvedValue(jsonResponse({ message: 'Conflict' }, 409));

    const result = await apiPost('/api/items', {}, 'Failed to create item');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Conflict');
  });
});

describe('apiPut', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it('sends a PUT request with body', async () => {
    const body = { name: 'Updated' };
    mockAuthFetch.mockResolvedValue(jsonResponse({ id: '1', name: 'Updated' }));

    const result = await apiPut('/api/items/1', body);

    expect(result.success).toBe(true);
    expect(mockAuthFetch).toHaveBeenCalledWith('/api/items/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  });

  it('sends a PUT request without body', async () => {
    mockAuthFetch.mockResolvedValue(jsonResponse({ reset: true }));

    await apiPut('/api/items/1/reset');

    const [, init] = mockAuthFetch.mock.calls[0];
    expect(init.method).toBe('PUT');
    expect(init.headers).toBeUndefined();
  });
});

describe('apiPatch', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it('sends a PATCH request with body', async () => {
    const body = { label: 'v2.0' };
    mockAuthFetch.mockResolvedValue(jsonResponse({ id: '1', label: 'v2.0' }));

    const result = await apiPatch('/api/versions/1', body);

    expect(result.success).toBe(true);
    expect(mockAuthFetch).toHaveBeenCalledWith('/api/versions/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  });

  it('passes defaultError through', async () => {
    mockAuthFetch.mockResolvedValue(jsonResponse({}, 400));

    const result = await apiPatch('/api/versions/1', {}, 'Failed to update version');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update version');
  });
});

describe('apiDelete', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it('sends a DELETE request without body', async () => {
    mockAuthFetch.mockResolvedValue(emptyResponse(204));

    const result = await apiDelete('/api/items/1');

    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
    expect(mockAuthFetch).toHaveBeenCalledWith('/api/items/1', { method: 'DELETE' });
  });

  it('returns error on failure', async () => {
    mockAuthFetch.mockResolvedValue(jsonResponse({ message: 'Cannot delete' }, 403));

    const result = await apiDelete('/api/items/1', 'Failed to delete item');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Cannot delete');
  });

  it('uses defaultError when server message is absent', async () => {
    mockAuthFetch.mockResolvedValue(jsonResponse({}, 500));

    const result = await apiDelete('/api/items/1', 'Failed to delete item');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to delete item');
  });
});

// ---------------------------------------------------------------------------
// Global Symbols API Functions
// ---------------------------------------------------------------------------
describe('Global Symbols API functions', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  describe('fetchGlobalSymbols', () => {
    it('calls GET on the correct endpoint', async () => {
      const symbols = { symbols: [{ id: 's1', name: 'Header' }] };
      mockAuthFetch.mockResolvedValue(jsonResponse(symbols));

      const result = await fetchGlobalSymbols('team-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(symbols);
      expect(mockAuthFetch).toHaveBeenCalledWith(
        '/api/teams/team-1/symbols',
        { method: 'GET' }
      );
    });

    it('returns error with custom message on failure', async () => {
      mockAuthFetch.mockResolvedValue(jsonResponse({}, 500));

      const result = await fetchGlobalSymbols('team-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch global symbols');
    });

    it('encodes teamId with special characters', async () => {
      mockAuthFetch.mockResolvedValue(jsonResponse({ symbols: [] }));

      await fetchGlobalSymbols('team with space');

      expect(mockAuthFetch).toHaveBeenCalledWith(
        '/api/teams/team%20with%20space/symbols',
        { method: 'GET' }
      );
    });
  });

  describe('createGlobalSymbol', () => {
    it('calls POST with name and symbolData', async () => {
      const symbolData = { components: [], styles: [] } as unknown;
      const created = { id: 's1', name: 'Header', symbolData };
      mockAuthFetch.mockResolvedValue(jsonResponse(created, 201));

      const result = await createGlobalSymbol('team-1', 'Header', symbolData as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(created);
      expect(mockAuthFetch).toHaveBeenCalledWith(
        '/api/teams/team-1/symbols',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Header', symbolData }),
        }
      );
    });

    it('returns error with custom message on failure', async () => {
      mockAuthFetch.mockResolvedValue(jsonResponse({ message: 'Duplicate name' }, 409));

      const result = await createGlobalSymbol('team-1', 'Header', {} as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Duplicate name');
    });
  });

  describe('updateGlobalSymbol', () => {
    it('calls PUT with updates payload', async () => {
      const updates = { name: 'Updated Header' };
      const updated = { id: 's1', name: 'Updated Header' };
      mockAuthFetch.mockResolvedValue(jsonResponse(updated));

      const result = await updateGlobalSymbol('team-1', 's1', updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updated);
      expect(mockAuthFetch).toHaveBeenCalledWith(
        '/api/teams/team-1/symbols/s1',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );
    });

    it('returns error with custom message on failure', async () => {
      mockAuthFetch.mockResolvedValue(jsonResponse({}, 404));

      const result = await updateGlobalSymbol('team-1', 'nonexistent', { name: 'x' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update global symbol');
    });
  });

  describe('deleteGlobalSymbol', () => {
    it('calls DELETE on the correct endpoint', async () => {
      mockAuthFetch.mockResolvedValue(jsonResponse({ message: 'Deleted' }));

      const result = await deleteGlobalSymbol('team-1', 's1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: 'Deleted' });
      expect(mockAuthFetch).toHaveBeenCalledWith(
        '/api/teams/team-1/symbols/s1',
        { method: 'DELETE' }
      );
    });

    it('returns error with custom message on failure', async () => {
      mockAuthFetch.mockResolvedValue(jsonResponse({ message: 'Forbidden' }, 403));

      const result = await deleteGlobalSymbol('team-1', 's1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Forbidden');
    });

    it('uses default error when server provides no message', async () => {
      mockAuthFetch.mockResolvedValue(jsonResponse({}, 500));

      const result = await deleteGlobalSymbol('team-1', 's1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete global symbol');
    });
  });
});
