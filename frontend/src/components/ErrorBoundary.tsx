import { Component, ReactNode, ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to Sentry with component stack context
    Sentry.withScope((scope) => {
      scope.setLevel('error');
      scope.setTag('errorBoundary', 'true');
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack
      });
      Sentry.captureException(error);
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-base-100">
          <div className="max-w-md mx-auto text-center p-8">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.73 0L3.084 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-base-content mb-4">Something went wrong</h1>
            <p className="text-base-content/70 mb-6">
              An unexpected error occurred. Please refresh the page or try again later.
            </p>
            <div className="space-x-4">
              <button 
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                Refresh Page
              </button>
              <button 
                onClick={() => this.setState({ hasError: false, error: null })}
                className="btn btn-outline"
              >
                Try Again
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-base-content/60 hover:text-base-content">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 p-4 bg-base-200 rounded text-xs text-error overflow-auto">
                  {this.state.error.stack || 'No stack trace available'}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;