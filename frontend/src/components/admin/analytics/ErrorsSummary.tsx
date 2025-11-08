import React from 'react';

interface ErrorsSummaryProps {
  hours?: number;
}

/**
 * ErrorsSummary component - redirects to Sentry for error tracking
 * Error tracking is now handled entirely by Sentry for better insights and analysis
 */
const ErrorsSummary: React.FC<ErrorsSummaryProps> = ({ hours = 24 }) => {
  const sentryUrl = import.meta.env.VITE_SENTRY_DSN
    ? `https://sentry.io/organizations/${import.meta.env.VITE_SENTRY_ORG || 'your-org'}/issues/`
    : 'https://sentry.io';

  return (
    <div className="card bg-base-100 shadow-lg border-2 border-base-content/20">
      <div className="card-body">
        <h3 className="card-title">Error Tracking</h3>

        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h4 className="font-bold">Error tracking powered by Sentry</h4>
            <p className="text-sm">
              All application errors are now tracked with Sentry for advanced error monitoring,
              release tracking, user impact analysis, and performance correlation.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <a
            href={sentryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            View Errors in Sentry
          </a>
        </div>

        <div className="mt-4 text-sm opacity-70">
          <p className="font-semibold mb-2">Sentry provides:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Smart error grouping and deduplication</li>
            <li>Stack traces with source maps</li>
            <li>User impact and breadcrumb tracking</li>
            <li>Release and environment filtering</li>
            <li>Performance monitoring integration</li>
            <li>Automated alerting and notifications</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ErrorsSummary;
