import express, { Express } from 'express';
import cookieParser from 'cookie-parser';

/**
 * Creates a standard test Express app with common middleware
 */
export function createTestApp(routes: Record<string, any>): Express {
  const app = express();

  // Standard middleware
  app.use(express.json());
  app.use(cookieParser());

  // Mount routes
  for (const [path, router] of Object.entries(routes)) {
    app.use(path, router);
  }

  return app;
}
