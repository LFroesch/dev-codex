import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { logInfo, logError } from './logger';

// Initialize Sentry
export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  
  if (!dsn) {
    if (environment === 'production') {
      logError('SENTRY_DSN environment variable is required for production', undefined, {
        severity: 'critical',
        component: 'sentry',
        action: 'initialization'
      });
    } else {
      logInfo('Sentry DSN not configured, error tracking disabled', {
        component: 'sentry',
        environment
      });
    }
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment,
      
      // Performance monitoring
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
      
      // Profiling (performance insights)
      profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
      integrations: [
        nodeProfilingIntegration(),
      ],
      
      // Release tracking
      release: process.env.SENTRY_RELEASE || `dev-codex@${process.env.npm_package_version || '1.0.0'}`,
      
      // Error filtering - don't send these errors to Sentry
      beforeSend(event) {
        // Filter out validation errors (user errors, not bugs)
        if (event.exception?.values?.[0]?.type === 'ValidationError') {
          return null;
        }
        
        // Filter out authentication errors (expected behavior)
        if (event.exception?.values?.[0]?.value?.includes('Invalid token')) {
          return null;
        }
        
        return event;
      },
      
      // Add user context and additional data
      beforeSendTransaction(event) {
        // Add server info to transactions
        event.contexts = {
          ...event.contexts,
          runtime: {
            name: 'node',
            version: process.version
          },
          server: {
            name: 'dev-codex-backend',
            version: process.env.npm_package_version || '1.0.0'
          }
        };
        return event;
      }
    });
    
    logInfo('Sentry initialized successfully', {
      component: 'sentry',
      environment,
      dsn: dsn.substring(0, 30) + '...' // Log partial DSN for verification
    });
    
  } catch (error) {
    logError('Failed to initialize Sentry', error as Error, {
      component: 'sentry',
      action: 'initialization'
    });
  }
};

// Helper function to add user context to Sentry
export const setSentryUser = (user: { id: string; email?: string; planTier?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    planTier: user.planTier
  });
};

// Helper function to add custom context
export const setSentryContext = (key: string, data: Record<string, any>) => {
  Sentry.setContext(key, data);
};

// Helper function to capture custom errors with context
export const captureErrorWithContext = (error: Error, context: Record<string, any> = {}) => {
  return Sentry.withScope((scope) => {
    // Add custom tags
    if (context.userId) scope.setTag('userId', context.userId);
    if (context.projectId) scope.setTag('projectId', context.projectId);
    if (context.component) scope.setTag('component', context.component);
    if (context.action) scope.setTag('action', context.action);
    
    // Add extra context
    scope.setContext('custom', context);
    
    return Sentry.captureException(error);
  });
};

// Helper function for performance monitoring
export const startPerformanceTransaction = (name: string, op: string) => {
  return Sentry.startSpan({
    name,
    op
  }, () => {});
};

export { Sentry };