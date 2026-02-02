/**
 * Custom render function with providers for testing
 *
 * Provides render utilities that wrap components with all necessary
 * providers (Router, Auth, etc.) for comprehensive testing.
 */

import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';

/**
 * Options for custom render
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial route for MemoryRouter (if using memory routing) */
  initialEntries?: string[];
  /** Whether to use MemoryRouter instead of BrowserRouter */
  useMemoryRouter?: boolean;
  /** Whether to include AuthProvider (defaults to true) */
  withAuth?: boolean;
}

/**
 * Provider wrapper for tests
 */
function AllProviders({
  children,
  initialEntries,
  useMemoryRouter = false,
  withAuth = true,
}: {
  children: React.ReactNode;
  initialEntries?: string[];
  useMemoryRouter?: boolean;
  withAuth?: boolean;
}) {
  const Router = useMemoryRouter ? MemoryRouter : BrowserRouter;
  const routerProps = useMemoryRouter && initialEntries ? { initialEntries } : {};

  const content = withAuth ? <AuthProvider>{children}</AuthProvider> : children;

  return <Router {...routerProps}>{content}</Router>;
}

/**
 * Custom render function that wraps components with necessary providers
 *
 * @example
 * // Basic usage
 * const { getByText } = render(<MyComponent />);
 *
 * @example
 * // With memory router for navigation tests
 * render(<Editor />, { useMemoryRouter: true, initialEntries: ['/edit/my-proto'] });
 *
 * @example
 * // Without auth provider (for testing auth-related edge cases)
 * render(<Login />, { withAuth: false });
 */
function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): ReturnType<typeof render> {
  const { initialEntries, useMemoryRouter, withAuth = true, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders
        initialEntries={initialEntries}
        useMemoryRouter={useMemoryRouter}
        withAuth={withAuth}
      >
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
}

/**
 * Render with memory router for navigation tests
 *
 * @example
 * renderWithRouter(<Editor />, ['/edit/my-prototype']);
 */
function renderWithRouter(
  ui: ReactElement,
  initialEntries: string[] = ['/'],
  options: Omit<CustomRenderOptions, 'initialEntries' | 'useMemoryRouter'> = {}
): ReturnType<typeof render> {
  return customRender(ui, {
    ...options,
    initialEntries,
    useMemoryRouter: true,
  });
}

/**
 * Alias for customRender - matches the naming convention in the plan
 */
const renderWithProviders = customRender;

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render with custom version
export { customRender as render, renderWithRouter, renderWithProviders };
