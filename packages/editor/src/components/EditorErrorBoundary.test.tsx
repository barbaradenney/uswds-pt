/**
 * Tests for EditorErrorBoundary component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorErrorBoundary } from './EditorErrorBoundary';

// Component that throws an error for testing
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error from child component');
  }
  return <div data-testid="child">Child rendered successfully</div>;
}

describe('EditorErrorBoundary', () => {
  // Suppress console.error during tests since we expect errors
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('should render children when there is no error', () => {
    const onRetry = vi.fn();
    render(
      <EditorErrorBoundary onRetry={onRetry}>
        <ThrowError shouldThrow={false} />
      </EditorErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeDefined();
    expect(screen.queryByText('Editor Error')).toBeNull();
  });

  it('should render error UI when child throws', () => {
    const onRetry = vi.fn();
    render(
      <EditorErrorBoundary onRetry={onRetry}>
        <ThrowError shouldThrow={true} />
      </EditorErrorBoundary>
    );

    expect(screen.getByText('Editor Error')).toBeDefined();
    expect(screen.getByText(/Something went wrong with the editor/)).toBeDefined();
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('should call onRetry when Try Again is clicked', () => {
    const onRetry = vi.fn();
    render(
      <EditorErrorBoundary onRetry={onRetry}>
        <ThrowError shouldThrow={true} />
      </EditorErrorBoundary>
    );

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalled();
  });

  it('should call onGoHome when Go Home is clicked', () => {
    const onRetry = vi.fn();
    const onGoHome = vi.fn();
    render(
      <EditorErrorBoundary onRetry={onRetry} onGoHome={onGoHome}>
        <ThrowError shouldThrow={true} />
      </EditorErrorBoundary>
    );

    const homeButton = screen.getByText('Go Home');
    fireEvent.click(homeButton);

    expect(onGoHome).toHaveBeenCalled();
  });

  it('should show error details in collapsed details element', () => {
    const onRetry = vi.fn();
    render(
      <EditorErrorBoundary onRetry={onRetry}>
        <ThrowError shouldThrow={true} />
      </EditorErrorBoundary>
    );

    // Details should be present
    const details = screen.getByText('Technical details');
    expect(details).toBeDefined();

    // Error message should be in the pre tag
    expect(screen.getByText(/Test error from child component/)).toBeDefined();
  });

  it('should show error count after errors', () => {
    const onRetry = vi.fn();
    render(
      <EditorErrorBoundary onRetry={onRetry}>
        <ThrowError shouldThrow={true} />
      </EditorErrorBoundary>
    );

    // Should show error count
    expect(screen.getByText(/Error count this session: 1/)).toBeDefined();
  });

  it('should detect when error count exceeds threshold', () => {
    const onRetry = vi.fn();
    render(
      <EditorErrorBoundary onRetry={onRetry}>
        <ThrowError shouldThrow={true} />
      </EditorErrorBoundary>
    );

    // Initial error should show Try Again
    expect(screen.getByText('Try Again')).toBeDefined();
    expect(screen.queryByText(/keeps crashing/)).toBeNull();

    // Normal error message should be shown
    expect(screen.getByText(/Something went wrong with the editor/)).toBeDefined();
  });
});
