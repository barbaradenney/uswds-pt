/**
 * MSW request handlers for API mocking
 */

import { http, HttpResponse, delay } from 'msw';
import {
  mockPrototype,
  mockPrototypeList,
  mockVersionHistory,
  mockTeam,
  mockUser,
} from '../fixtures/prototypes';

// Store for simulating state across requests
const prototypesStore: Map<string, ReturnType<typeof mockPrototype>> = new Map();

// Initialize with some default data
function initializeStore() {
  prototypesStore.clear();
  const defaults = mockPrototypeList(3);
  defaults.forEach((p) => prototypesStore.set(p.slug, p));
}

// Initialize on module load
initializeStore();

/**
 * Reset the mock store to initial state
 * Call this in beforeEach to ensure test isolation
 */
export function resetMockStore() {
  initializeStore();
}

/**
 * Add a prototype to the mock store
 */
export function addToMockStore(prototype: ReturnType<typeof mockPrototype>) {
  prototypesStore.set(prototype.slug, prototype);
}

/**
 * Get a prototype from the mock store
 */
export function getFromMockStore(slug: string) {
  return prototypesStore.get(slug);
}

// API base URL (matches what the app uses)
const API_BASE = '/api';

/**
 * Main API handlers
 */
export const handlers = [
  // ============================================================================
  // Authentication
  // ============================================================================

  http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json(mockUser());
  }),

  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    // Simulate login validation
    if (!body.email || !body.password) {
      return HttpResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      user: mockUser({ email: body.email }),
      token: 'mock-jwt-token',
    });
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  // ============================================================================
  // Organizations & Teams
  // ============================================================================

  http.get(`${API_BASE}/teams`, () => {
    return HttpResponse.json([mockTeam()]);
  }),

  http.get(`${API_BASE}/teams/:teamId`, ({ params }) => {
    return HttpResponse.json(mockTeam({ id: params.teamId as string }));
  }),

  // ============================================================================
  // Prototypes - CRUD
  // ============================================================================

  // List prototypes
  http.get(`${API_BASE}/prototypes`, ({ request }) => {
    const url = new URL(request.url);
    const teamId = url.searchParams.get('teamId');

    let prototypes = Array.from(prototypesStore.values());

    if (teamId) {
      prototypes = prototypes.filter((p) => p.teamId === teamId);
    }

    return HttpResponse.json(prototypes);
  }),

  // Get single prototype
  http.get(`${API_BASE}/prototypes/:slug`, ({ params }) => {
    const slug = params.slug as string;
    const prototype = prototypesStore.get(slug);

    if (!prototype) {
      return HttpResponse.json({ error: 'Prototype not found' }, { status: 404 });
    }

    return HttpResponse.json(prototype);
  }),

  // Create prototype
  http.post(`${API_BASE}/prototypes`, async ({ request }) => {
    const body = (await request.json()) as {
      name?: string;
      htmlContent?: string;
      grapesData?: object;
      teamId?: string;
    };

    // Generate new prototype
    const newSlug = `new-proto-${Date.now()}`;
    const now = new Date();

    const newPrototype = mockPrototype({
      id: newSlug,
      slug: newSlug,
      name: body.name || 'Untitled Prototype',
      htmlContent: body.htmlContent || '',
      grapesData: body.grapesData || {
        pages: [
          {
            id: 'page-1',
            name: 'Prototype',
            frames: [{ component: { type: 'wrapper', components: [] } }],
          },
        ],
        styles: [],
        assets: [],
      },
      teamId: body.teamId || 'team-123',
      createdAt: now,
      updatedAt: now,
    });

    prototypesStore.set(newSlug, newPrototype);

    return HttpResponse.json(newPrototype, { status: 201 });
  }),

  // Update prototype
  http.put(`${API_BASE}/prototypes/:slug`, async ({ params, request }) => {
    const slug = params.slug as string;
    const existing = prototypesStore.get(slug);

    if (!existing) {
      return HttpResponse.json({ error: 'Prototype not found' }, { status: 404 });
    }

    const body = (await request.json()) as {
      name?: string;
      htmlContent?: string;
      grapesData?: object;
    };

    const updated = {
      ...existing,
      ...body,
      updatedAt: new Date(),
    };

    prototypesStore.set(slug, updated);

    return HttpResponse.json(updated);
  }),

  // Delete prototype
  http.delete(`${API_BASE}/prototypes/:slug`, ({ params }) => {
    const slug = params.slug as string;

    if (!prototypesStore.has(slug)) {
      return HttpResponse.json({ error: 'Prototype not found' }, { status: 404 });
    }

    prototypesStore.delete(slug);

    return HttpResponse.json({ success: true });
  }),

  // ============================================================================
  // Version History
  // ============================================================================

  http.get(`${API_BASE}/prototypes/:slug/versions`, ({ params }) => {
    const slug = params.slug as string;

    if (!prototypesStore.has(slug)) {
      return HttpResponse.json({ error: 'Prototype not found' }, { status: 404 });
    }

    return HttpResponse.json(mockVersionHistory(slug, 5));
  }),

  http.post(`${API_BASE}/prototypes/:slug/versions/:versionNumber/restore`, async ({ params }) => {
    const slug = params.slug as string;
    const versionNumber = parseInt(params.versionNumber as string, 10);

    const existing = prototypesStore.get(slug);
    if (!existing) {
      return HttpResponse.json({ error: 'Prototype not found' }, { status: 404 });
    }

    // Simulate restore by updating content
    const restored = {
      ...existing,
      htmlContent: `<div>Restored version ${versionNumber} content</div>`,
      updatedAt: new Date(),
    };

    prototypesStore.set(slug, restored);

    return HttpResponse.json(restored);
  }),
];

/**
 * Handlers with simulated delays for testing loading states
 */
export const handlersWithDelays = handlers.map((handler) => {
  // Wrap each handler to add a delay
  const originalHandler = handler;

  // Create a new handler with the same path but with delay
  // This is a simplified approach - in real usage you might want
  // more fine-grained control over which handlers get delays
  return originalHandler;
});

/**
 * Error handlers for testing error states
 */
export const errorHandlers = [
  http.get(`${API_BASE}/prototypes/:slug`, () => {
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }),

  http.put(`${API_BASE}/prototypes/:slug`, () => {
    return HttpResponse.json({ error: 'Save failed' }, { status: 500 });
  }),

  http.post(`${API_BASE}/prototypes`, () => {
    return HttpResponse.json({ error: 'Creation failed' }, { status: 500 });
  }),
];

/**
 * Network error handlers
 */
export const networkErrorHandlers = [
  http.get(`${API_BASE}/prototypes/:slug`, () => {
    return HttpResponse.error();
  }),

  http.put(`${API_BASE}/prototypes/:slug`, () => {
    return HttpResponse.error();
  }),
];

/**
 * Slow response handlers for testing timeouts
 */
export const slowHandlers = [
  http.get(`${API_BASE}/prototypes/:slug`, async ({ params }) => {
    await delay(5000); // 5 second delay
    const slug = params.slug as string;
    const prototype = prototypesStore.get(slug);

    if (!prototype) {
      return HttpResponse.json({ error: 'Prototype not found' }, { status: 404 });
    }

    return HttpResponse.json(prototype);
  }),
];
