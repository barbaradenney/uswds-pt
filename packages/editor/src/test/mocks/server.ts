/**
 * MSW Server Setup for Tests
 */

import { setupServer } from 'msw/node';
import { handlers, resetMockStore } from './handlers';

/**
 * MSW server instance for use in tests
 */
export const server = setupServer(...handlers);

/**
 * Setup function to be called in test setup file
 */
export function setupMSW() {
  // Start server before all tests
  beforeAll(() => {
    server.listen({
      onUnhandledRequest: 'warn',
    });
  });

  // Reset handlers and store after each test
  afterEach(() => {
    server.resetHandlers();
    resetMockStore();
  });

  // Clean up after all tests
  afterAll(() => {
    server.close();
  });
}

/**
 * Utility to add handlers for a specific test
 */
export function useHandlers(...additionalHandlers: Parameters<typeof server.use>) {
  server.use(...additionalHandlers);
}

export { resetMockStore };
