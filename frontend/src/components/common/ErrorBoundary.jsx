import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      eventId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // Here you would typically send the error to your error reporting service
    // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      eventId: null 
    });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="flex justify-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-error-500" />
            </div>
            <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Something went wrong
            </h1>
            <p className="mt-2 text-center text-base text-gray-600">
              We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="card">
              <div className="card-body">
                <div className="space-y-4">
                  <button
                    onClick={this.handleReset}
                    className="btn-primary w-full flex items-center justify-center"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Try Again
                  </button>
                  
                  <button
                    onClick={() => window.location.reload()}
                    className="btn-secondary w-full"
                  >
                    Refresh Page
                  </button>

                  {process.env.NODE_ENV === 'development' && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                        Technical Details (Development Only)
                      </summary>
                      <div className="mt-2 p-3 bg-gray-100 rounded-md">
                        <div className="text-xs font-mono text-gray-600 whitespace-pre-wrap">
                          <strong>Error:</strong> {this.state.error?.toString()}
                        </div>
                        {this.state.errorInfo && (
                          <div className="mt-2 text-xs font-mono text-gray-600 whitespace-pre-wrap">
                            <strong>Component Stack:</strong>
                            {this.state.errorInfo.componentStack}
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const withErrorBoundary = (Component, fallback) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Simple error fallback component
export const ErrorFallback = ({ 
  error, 
  resetError, 
  message = "Something went wrong",
  className = ""
}) => {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-error-500" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">
        {message}
      </h3>
      {error && (
        <p className="mt-2 text-sm text-gray-500">
          {error.message}
        </p>
      )}
      {resetError && (
        <button
          onClick={resetError}
          className="mt-4 btn-primary"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Try again
        </button>
      )}
    </div>
  );
};

// Network error component
export const NetworkError = ({ onRetry, className = "" }) => {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="mx-auto h-12 w-12 text-error-500">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">
        Connection Error
      </h3>
      <p className="mt-2 text-sm text-gray-500">
        Unable to connect to the server. Please check your internet connection and try again.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 btn-primary"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Retry
        </button>
      )}
    </div>
  );
};

// Not found component
export const NotFound = ({ 
  title = "Page not found",
  message = "The page you're looking for doesn't exist.",
  showBackButton = true,
  className = ""
}) => {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="mx-auto h-12 w-12 text-gray-400">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">
        {title}
      </h3>
      <p className="mt-2 text-sm text-gray-500">
        {message}
      </p>
      {showBackButton && (
        <button
          onClick={() => window.history.back()}
          className="mt-4 btn-secondary"
        >
          Go Back
        </button>
      )}
    </div>
  );
};

export default ErrorBoundary;