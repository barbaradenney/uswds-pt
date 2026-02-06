/**
 * Editor Error Boundary
 *
 * Specialized error boundary for the GrapesJS editor component.
 * Provides recovery options specifically designed for editor crashes.
 */

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Called when user clicks "Try Again" to trigger editor remount */
  onRetry: () => void;
  /** Called when user clicks "Go Home" */
  onGoHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

/**
 * Error Boundary specifically for the GrapesJS editor.
 *
 * Provides:
 * - Graceful error display
 * - Retry mechanism that triggers editor remount
 * - Error count tracking to detect repeated failures
 * - Clear messaging specific to editor context
 */
export class EditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[EditorErrorBoundary] Editor crashed:', error);
    console.error('[EditorErrorBoundary] Component stack:', errorInfo.componentStack);

    // Increment error count
    this.setState(prev => ({ errorCount: prev.errorCount + 1 }));
  }

  handleRetry = (): void => {
    // Reset error state
    this.setState({ hasError: false, error: null });
    // Trigger editor remount via parent callback
    this.props.onRetry();
  };

  handleGoHome = (): void => {
    if (this.props.onGoHome) {
      this.props.onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { error, errorCount } = this.state;
      const isRepeatedFailure = errorCount > 2;

      return (
        <div
          className="editor-error-boundary"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '2rem',
            backgroundColor: '#f8f8f8',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '500px' }}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#d63e4d"
              strokeWidth="2"
              style={{ width: '64px', height: '64px', marginBottom: '1rem' }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>

            <h2 style={{ margin: '0 0 1rem', color: '#1b1b1b' }}>
              Editor Error
            </h2>

            <p style={{ margin: '0 0 1rem', color: '#565656' }}>
              {isRepeatedFailure
                ? 'The editor keeps crashing. This may be due to corrupted data in your prototype.'
                : 'Something went wrong with the editor. Your changes may not have been saved.'}
            </p>

            {error && (
              <details
                style={{
                  marginBottom: '1.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  textAlign: 'left',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 500 }}>
                  Technical details
                </summary>
                <pre
                  style={{
                    margin: '0.5rem 0 0',
                    padding: '0.5rem',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '0.75rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              {!isRepeatedFailure && (
                <button
                  onClick={this.handleRetry}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#005ea2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Try Again
                </button>
              )}
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: isRepeatedFailure ? '#005ea2' : '#fff',
                  color: isRepeatedFailure ? '#fff' : '#005ea2',
                  border: isRepeatedFailure ? 'none' : '2px solid #005ea2',
                  borderRadius: '4px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Go Home
              </button>
            </div>

            {errorCount > 0 && (
              <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#71767a' }}>
                Error count this session: {errorCount}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
