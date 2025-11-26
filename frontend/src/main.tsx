import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'

// Initialize Sentry for error tracking
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
const sentryEnvironment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development'

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: sentryEnvironment,

    // Performance Monitoring
    tracesSampleRate: sentryEnvironment === 'production' ? 0.1 : 1.0,

    // Session Replay (optional - captures user sessions for debugging)
    replaysSessionSampleRate: sentryEnvironment === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Filter out common non-error messages
    beforeSend(event, hint) {
      // Filter out network errors from ad blockers or extensions
      const error = hint.originalException
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message)
        if (
          message.includes('adblock') ||
          message.includes('extension') ||
          message.includes('chrome-extension')
        ) {
          return null
        }
      }
      return event
    },
  })


  // Expose Sentry to window for testing (dev only)
  if (sentryEnvironment === 'development') {
    (window as any).Sentry = Sentry
  }
} else {
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)