import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Check if error is a chunk loading failure (common after deployments)
 */
function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('loading css chunk') ||
    message.includes('failed to load')
  );
}

/**
 * Get the base path for the app (handles GitHub Pages subdirectory)
 */
function getBasePath(): string {
  // Get path before the hash (e.g., /uswds-pt/ from /uswds-pt/#/preview/123)
  const pathBeforeHash = window.location.pathname;
  // Ensure it ends with /
  return pathBeforeHash.endsWith('/') ? pathBeforeHash : pathBeforeHash + '/';
}

/**
 * Error Boundary component for catching and displaying React errors gracefully
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    // For chunk loading errors, do a hard refresh to get new assets
    if (isChunkLoadError(this.state.error)) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  handleGoHome = (): void => {
    // Navigate to home using HashRouter-compatible path
    const basePath = getBasePath();
    window.location.href = `${basePath}#/`;
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError = isChunkLoadError(this.state.error);

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h1>{isChunkError ? 'App Updated' : 'Something went wrong'}</h1>
            <p>
              {isChunkError
                ? 'A new version of the app is available. Please refresh to load the latest version.'
                : "We're sorry, but something unexpected happened."}
            </p>
            {this.state.error && !isChunkError && (
              <details className="error-boundary-details">
                <summary>Error details</summary>
                <pre>{this.state.error.message}</pre>
              </details>
            )}
            <div className="error-boundary-actions">
              <button className="btn btn-primary" onClick={this.handleRetry}>
                {isChunkError ? 'Refresh Page' : 'Try Again'}
              </button>
              <button className="btn btn-secondary" onClick={this.handleGoHome}>
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
