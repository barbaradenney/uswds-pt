/**
 * Custom render function with providers for testing
 */

import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

/**
 * Options for custom render
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial route for MemoryRouter (if using memory routing) */
  initialEntries?: string[];
  /** Whether to use MemoryRouter instead of BrowserRouter */
  useMemoryRouter?: boolean;
}

/**
 * Provider wrapper for tests
 */
function AllProviders({
  children,
  initialEntries,
  useMemoryRouter = false,
}: {
  children: React.ReactNode;
  initialEntries?: string[];
  useMemoryRouter?: boolean;
}) {
  const Router = useMemoryRouter ? MemoryRouter : BrowserRouter;
  const routerProps = useMemoryRouter && initialEntries ? { initialEntries } : {};

  return (
    <Router {...routerProps}>
      {children}
    </Router>
  );
}

/**
 * Custom render function that wraps components with necessary providers
 */
function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): ReturnType<typeof render> {
  const { initialEntries, useMemoryRouter, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders initialEntries={initialEntries} useMemoryRouter={useMemoryRouter}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
}

/**
 * Render with memory router for navigation tests
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

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render with custom version
export { customRender as render, renderWithRouter };
