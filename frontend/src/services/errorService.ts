import { toast } from './toast';
import * as Sentry from '@sentry/react';

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  projectId?: string;
  timestamp?: Date;
  userAgent?: string;
  url?: string;
}

interface ErrorReport {
  name: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorService {
  private static instance: ErrorService;

  private constructor() {}

  public static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  // Centralized error handler
  public handleError(
    error: Error | string,
    context: ErrorContext = {},
    severity: ErrorReport['severity'] = 'medium'
  ): void {
    const errorReport: ErrorReport = {
      name: typeof error === 'string' ? 'ApplicationError' : error.name,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      context: {
        ...context,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        url: window.location.href
      },
      severity
    };

    // Send to Sentry for error tracking
    try {
      Sentry.withScope((scope) => {
        scope.setLevel(severity === 'critical' ? 'fatal' : severity === 'high' ? 'error' : 'warning');
        scope.setContext('errorDetails', {
          name: errorReport.name,
          message: errorReport.message,
          context: errorReport.context
        });

        if (context.userId) scope.setUser({ id: context.userId });
        if (context.component) scope.setTag('component', context.component);
        if (context.action) scope.setTag('action', context.action);
        if (context.projectId) scope.setTag('projectId', context.projectId);

        if (typeof error === 'string') {
          Sentry.captureMessage(error);
        } else {
          Sentry.captureException(error);
        }
      });
    } catch (e) {
      // Fail silently
    }

    // Show user-friendly toast for critical errors
    if (severity === 'critical') {
      toast.error('A critical error occurred. Please refresh the page.');
    } else if (severity === 'high') {
      toast.error('Something went wrong. Please try again.');
    }
  }

  // Handle API errors specifically
  public handleAPIError(
    error: any,
    context: ErrorContext = {},
    showToast: boolean = true
  ): void {
    let message = 'An error occurred';
    let severity: ErrorReport['severity'] = 'medium';

    if (error.response) {
      // HTTP error response
      const status = error.response.status;
      message = error.response.data?.message || error.message || 'Server error';
      
      if (status >= 500) {
        severity = 'high';
      } else if (status === 401) {
        severity = 'medium';
        message = 'Authentication required. Please log in.';
      } else if (status === 403) {
        severity = 'medium'; 
        message = 'Access denied.';
      } else if (status === 404) {
        severity = 'low';
        message = 'Resource not found.';
      }
    } else if (error.request) {
      // Network error
      severity = 'high';
      message = 'Network error. Please check your connection.';
    } else {
      // Other error
      message = error.message || 'Unknown error occurred';
    }

    this.handleError(error, {
      ...context,
      action: 'api_request'
    }, severity);

    if (showToast) {
      toast.error(message);
    }
  }

  // Handle async operation errors
  public handleAsyncError(
    error: Error,
    context: ErrorContext = {},
    fallbackMessage: string = 'Operation failed'
  ): void {
    this.handleError(error, {
      ...context,
      action: 'async_operation'
    }, 'medium');

    toast.error(fallbackMessage);
  }
}

// Export singleton instance
export const errorService = ErrorService.getInstance();

// Helper functions for common use cases
export const handleAPIError = (error: any, context?: ErrorContext, showToast?: boolean) => {
  errorService.handleAPIError(error, context, showToast);
};

export const handleError = (error: Error | string, context?: ErrorContext, severity?: ErrorReport['severity']) => {
  errorService.handleError(error, context, severity);
};

export const handleAsyncError = (error: Error, context?: ErrorContext, fallbackMessage?: string) => {
  errorService.handleAsyncError(error, context, fallbackMessage);
};