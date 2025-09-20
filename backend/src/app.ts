import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import dotenv from 'dotenv';
import path from 'path';
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
import { normalRateLimit, authRateLimit, devRateLimit, publicRateLimit } from './middleware/rateLimit';
import { sessionMiddleware, AnalyticsService } from './middleware/analytics';
import ReminderService from './services/reminderService';
import UserSession from './models/UserSession';

dotenv.config();

import { initSentry } from './config/sentry';
initSentry();


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

// Request logging middleware
app.use(requestLogger as any);

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRateLimit, publicRoutes);
const rateLimitMiddleware = isDevelopment ? devRateLimit : normalRateLimit;
app.use('/api/projects', rateLimitMiddleware, sessionMiddleware, projectRoutes);
app.use('/api/invitations', rateLimitMiddleware, invitationRoutes);
app.use('/api/notifications', rateLimitMiddleware, notificationRoutes);
app.use('/api/billing', rateLimitMiddleware, billingRoutes);
app.use('/api/admin', rateLimitMiddleware, adminRoutes);
app.use('/api/tickets', rateLimitMiddleware, ticketRoutes);
app.use('/api/analytics', rateLimitMiddleware, sessionMiddleware, analyticsRoutes);
app.use('/api/activity-logs', rateLimitMiddleware, activityLogRoutes);
app.use('/api/ideas', rateLimitMiddleware, ideasRoutes);
app.use('/api/news', rateLimitMiddleware, newsRoutes);

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