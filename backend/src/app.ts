import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import passport from 'passport';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { connectDatabase } from './config/database';
import { logInfo, logError } from './config/logger';
import { requestLogger } from './middleware/requestLogger';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import billingRoutes from './routes/billing';
import adminRoutes from './routes/admin';
import ticketRoutes from './routes/tickets';
import analyticsRoutes from './routes/analytics';
import activityLogRoutes from './routes/activityLogs';
import debugRoutes from './routes/debug';
import invitationRoutes from './routes/invitations';
import notificationRoutes from './routes/notifications';
import publicRoutes from './routes/public';
import ideasRoutes from './routes/ideas';
import newsRoutes from './routes/news';
import healthRoutes from './routes/health';
import terminalRoutes from './routes/terminal';
import { normalRateLimit, authRateLimit, devRateLimit, publicRateLimit, adminRateLimit } from './middleware/rateLimit';
import { terminalExecuteSecurity, terminalSuggestionsSecurity } from './middleware/commandSecurity';
import { sessionMiddleware, AnalyticsService } from './middleware/analytics';
import ReminderService from './services/reminderService';
import UserSession from './models/UserSession';

dotenv.config();

import { initSentry } from './config/sentry';
initSentry();

// Environment variable validation for production
const validateProductionEnv = () => {
  if (process.env.NODE_ENV !== 'production') {
    return; // Skip validation in development
  }

  const isSelfHosted = process.env.SELF_HOSTED === 'true';

  // Base required variables for all deployments
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'CSRF_SECRET',
    'CORS_ORIGINS',
    'FRONTEND_URL',
  ];

  // Add SMTP requirements only if not self-hosted
  if (!isSelfHosted) {
    requiredEnvVars.push(
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASS',
      'SMTP_FROM'
    );
  }

  const missingVars: string[] = [];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName] || process.env[varName]?.trim() === '') {
      missingVars.push(varName);
    }
  }

  // Check CSRF_SECRET is not the default weak value
  if (process.env.CSRF_SECRET === 'your-csrf-secret-change-in-production') {
    logError('CRITICAL: CSRF_SECRET must be changed from default value in production', undefined, {
      severity: 'critical',
      component: 'app',
      action: 'env_validation'
    });
    process.exit(1);
  }

  // Check JWT_SECRET is sufficiently long
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logError('CRITICAL: JWT_SECRET must be at least 32 characters in production', undefined, {
      severity: 'critical',
      component: 'app',
      action: 'env_validation'
    });
    process.exit(1);
  }

  // Validate Stripe keys if payments are enabled (skip for self-hosted)
  if (!isSelfHosted && process.env.STRIPE_SECRET_KEY) {
    if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
      logError('CRITICAL: STRIPE_SECRET_KEY must use live key (sk_live_) in production, not test key', undefined, {
        severity: 'critical',
        component: 'app',
        action: 'env_validation'
      });
      process.exit(1);
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      logError('CRITICAL: STRIPE_WEBHOOK_SECRET is required when Stripe is enabled', undefined, {
        severity: 'critical',
        component: 'app',
        action: 'env_validation'
      });
      process.exit(1);
    }
  }

  if (missingVars.length > 0) {
    logError(`CRITICAL: Missing required environment variables in production: ${missingVars.join(', ')}`, undefined, {
      severity: 'critical',
      component: 'app',
      action: 'env_validation',
      missingVars
    });
    process.exit(1);
  }

  if (isSelfHosted) {
    logInfo('Self-hosted mode enabled - billing and rate limiting are disabled', {
      component: 'app',
      action: 'env_validation',
      selfHosted: true
    });
  }

  logInfo('All required environment variables validated successfully', { component: 'app', action: 'env_validation' });
};

// Run validation before initializing app
validateProductionEnv();


const app = express();
const PORT = process.env.PORT || 5003;

const isDevelopment = process.env.NODE_ENV !== 'production';

// Determines allowed CORS origins based on environment
const getAllowedOrigins = () => {
  if (isDevelopment) {
    return ['http://localhost:5002', 'http://localhost:5003'];
  }
  
  const corsOrigins = process.env.CORS_ORIGINS;
  if (!corsOrigins) {
    logError('CRITICAL: CORS_ORIGINS environment variable is required for production', undefined, { severity: 'critical', component: 'app', action: 'cors_setup' });
    process.exit(1);
  }
  
  return corsOrigins.split(',').map(origin => origin.trim());
};

const allowedOrigins = getAllowedOrigins();

if (isDevelopment) {
  app.use(cors({
    origin: allowedOrigins,
    credentials: true
  }));
} else {
  app.use(cors({
    origin: function (origin, callback) {
      if (!origin && isDevelopment) return callback(null, true);
      
      if (!origin && !isDevelopment) {
        return callback(new Error('Origin header is required'), false);
      }
      
      if (origin && allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));
}
app.use(cookieParser());

app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(passport.initialize());

// Security headers middleware using Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for compatibility
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  xssFilter: true,
  noSniff: true,
  ieNoOpen: true,
  hidePoweredBy: true
}));

// SEC-003 FIX: Modern CSRF Protection using csrf-csrf (double-submit cookie pattern)
const csrfProtection = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'your-csrf-secret-change-in-production',
  cookieName: isDevelopment ? 'csrf-token' : '__Host-csrf-token',
  cookieOptions: {
    sameSite: 'lax',
    path: '/',
    secure: !isDevelopment,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getSessionIdentifier: (req) => {
    // Use session ID if available, otherwise use a default identifier
    return (req as any).session?.id || 'anonymous';
  },
  getCsrfTokenFromRequest: (req) => {
    return (req.headers['x-csrf-token'] as string) || req.body?._csrf;
  },
});

// Conditional CSRF middleware - skip in development or for specific routes
const conditionalCSRF = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Skip CSRF in development
  if (isDevelopment) {
    return next();
  }
  // Skip for webhook endpoint
  if (req.path.includes('/webhook')) {
    return next();
  }
  // Skip for auth routes (login, register - they need to get token first)
  if (req.path.startsWith('/api/auth/') && ['POST'].includes(req.method)) {
    return next();
  }
  return csrfProtection.doubleCsrfProtection(req, res, next);
};

// Request logging middleware
app.use(requestLogger as any);

// CSRF token endpoint for frontend
app.get('/api/csrf-token', (req, res) => {
  const token = csrfProtection.generateCsrfToken(req, res);
  res.json({ csrfToken: token });
});

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRateLimit, publicRoutes);
const rateLimitMiddleware = isDevelopment ? devRateLimit : normalRateLimit;
app.use('/api/projects', conditionalCSRF, rateLimitMiddleware, sessionMiddleware, projectRoutes);
app.use('/api/invitations', conditionalCSRF, rateLimitMiddleware, invitationRoutes);
app.use('/api/notifications', conditionalCSRF, rateLimitMiddleware, notificationRoutes);
app.use('/api/billing', conditionalCSRF, rateLimitMiddleware, billingRoutes);
// Admin routes - no rate limiting (admins should have unrestricted access)
app.use('/api/admin', conditionalCSRF, adminRoutes);
app.use('/api/tickets', conditionalCSRF, rateLimitMiddleware, ticketRoutes);
app.use('/api/analytics', conditionalCSRF, rateLimitMiddleware, sessionMiddleware, analyticsRoutes);
app.use('/api/activity-logs', conditionalCSRF, rateLimitMiddleware, activityLogRoutes);
app.use('/api/ideas', conditionalCSRF, rateLimitMiddleware, ideasRoutes);
app.use('/api/news', conditionalCSRF, rateLimitMiddleware, newsRoutes);
app.use('/api/terminal', conditionalCSRF, rateLimitMiddleware, terminalRoutes);

if (isDevelopment) {
  app.use('/api/debug', debugRoutes);
}

if (!isDevelopment) {
  const frontendDistPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDistPath));
  
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
}
// Health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'OK' });
});


// Handles graceful server shutdown and cleanup
const gracefulShutdown = async (_signal: string) => {
  
  try {
    const activeSessions = await UserSession.find({ isActive: true });
    
    const endPromises = activeSessions.map(session => 
      AnalyticsService.endSession(session.sessionId, session.userId)
    );
    
    await Promise.allSettled(endPromises);
    
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });
    
    process.exit(0);
  } catch (error) {
    logError('Error during graceful shutdown', error as Error, { component: 'app', action: 'graceful_shutdown' });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initializes and starts the Express server with all middleware and routes
const startServer = async () => {
  try {
    await connectDatabase();
    
    const reminderService = ReminderService.getInstance();
    reminderService.initialize();
    
    const server = createServer(app);
    
    const io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        credentials: true
      }
    });

    io.on('connection', (socket) => {
      socket.on('join-project', (projectId: string) => {
        socket.join(`project-${projectId}`);
      });

      socket.on('leave-project', (projectId: string) => {
        socket.leave(`project-${projectId}`);
      });

      socket.on('join-user-notifications', (userId: string) => {
        socket.join(`user-${userId}`);
      });

      socket.on('leave-user-notifications', (userId: string) => {
        socket.leave(`user-${userId}`);
      });

      socket.on('disconnect', () => {
      });
    });

    (global as any).io = io;
    
    server.listen(PORT, () => {
      logInfo('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        cors: allowedOrigins,
        pid: process.pid
      });
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logError('Uncaught Exception', error as Error, { severity: 'critical', component: 'app', action: 'uncaught_exception' });
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logError('Unhandled Promise Rejection', new Error(String(reason)), { severity: 'critical', component: 'app', action: 'unhandled_rejection', promise: String(promise) });
      gracefulShutdown('UNHANDLED_REJECTION');
    });
    
  } catch (error) {
    logError('Server startup failed', error as Error, { severity: 'critical', component: 'app', action: 'server_start' });
    process.exit(1);
  }
};

startServer();