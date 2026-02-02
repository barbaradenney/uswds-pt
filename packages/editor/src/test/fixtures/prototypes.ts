/**
 * Test fixtures for prototype data
 */

import type { Prototype } from '@uswds-pt/shared';

/**
 * Create a mock prototype with optional overrides
 */
export function mockPrototype(overrides: Partial<Prototype> = {}): Prototype {
  const now = new Date();

  return {
    id: 'test-proto-123',
    slug: 'test-proto-123',
    name: 'Test Prototype',
    htmlContent: '<div class="test-content">Hello World</div>',
    grapesData: {
      pages: [
        {
          id: 'page-1',
          name: 'Home',
          frames: [
            {
              component: {
                type: 'wrapper',
                components: [
                  {
                    type: 'text',
                    tagName: 'div',
                    classes: ['test-content'],
                    components: [{ type: 'textnode', content: 'Hello World' }],
                  },
                ],
              },
            },
          ],
        },
      ],
      styles: [],
      assets: [],
    },
    teamId: 'team-123',
    createdBy: 'user-123',
    createdAt: now,
    updatedAt: now,
    isPublic: false,
    ...overrides,
  };
}

/**
 * Create a mock prototype with multiple pages
 */
export function mockMultiPagePrototype(overrides: Partial<Prototype> = {}): Prototype {
  const base = mockPrototype(overrides);

  return {
    ...base,
    name: 'Multi-Page Prototype',
    grapesData: {
      pages: [
        {
          id: 'page-1',
          name: 'Home',
          frames: [
            {
              component: {
                type: 'wrapper',
                components: [
                  { type: 'text-block', tagName: 'h1', content: 'Home Page' },
                ],
              },
            },
          ],
        },
        {
          id: 'page-2',
          name: 'About',
          frames: [
            {
              component: {
                type: 'wrapper',
                components: [
                  { type: 'text-block', tagName: 'h1', content: 'About Page' },
                ],
              },
            },
          ],
        },
        {
          id: 'page-3',
          name: 'Contact',
          frames: [
            {
              component: {
                type: 'wrapper',
                components: [
                  { type: 'text-block', tagName: 'h1', content: 'Contact Page' },
                ],
              },
            },
          ],
        },
      ],
      styles: [],
      assets: [],
    },
  };
}

/**
 * Create an empty prototype (blank template)
 */
export function mockEmptyPrototype(overrides: Partial<Prototype> = {}): Prototype {
  return mockPrototype({
    name: 'Untitled Prototype',
    htmlContent: '',
    grapesData: {
      pages: [
        {
          id: 'page-1',
          name: 'Prototype',
          frames: [
            {
              component: { type: 'wrapper', components: [] },
            },
          ],
        },
      ],
      styles: [],
      assets: [],
    },
    ...overrides,
  });
}

/**
 * Create a list of mock prototypes for list views
 */
export function mockPrototypeList(count = 3): Prototype[] {
  return Array.from({ length: count }, (_, i) =>
    mockPrototype({
      id: `proto-${i + 1}`,
      slug: `proto-${i + 1}`,
      name: `Prototype ${i + 1}`,
    })
  );
}

/**
 * Mock version history entry
 */
export interface MockVersion {
  id: string;
  versionNumber: number;
  htmlContent: string;
  grapesData: object;
  createdAt: string;
  createdBy: string;
}

/**
 * Create mock version history
 */
export function mockVersionHistory(prototypeSlug: string, count = 5): MockVersion[] {
  const now = Date.now();

  return Array.from({ length: count }, (_, i) => ({
    id: `version-${prototypeSlug}-${count - i}`,
    versionNumber: count - i,
    htmlContent: `<div>Version ${count - i} content</div>`,
    grapesData: {
      pages: [
        {
          id: 'page-1',
          name: 'Home',
          frames: [
            {
              component: {
                type: 'wrapper',
                components: [
                  { type: 'text', content: `Version ${count - i} content` },
                ],
              },
            },
          ],
        },
      ],
      styles: [],
      assets: [],
    },
    createdAt: new Date(now - i * 60000).toISOString(), // 1 minute apart
    createdBy: 'user-123',
  }));
}

/**
 * Mock team for organization context
 */
export interface MockTeam {
  id: string;
  name: string;
  organizationId: string;
}

export function mockTeam(overrides: Partial<MockTeam> = {}): MockTeam {
  return {
    id: 'team-123',
    name: 'Test Team',
    organizationId: 'org-123',
    ...overrides,
  };
}

/**
 * Mock user
 */
export interface MockUser {
  id: string;
  email: string;
  name: string;
}

export function mockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    ...overrides,
  };
}
