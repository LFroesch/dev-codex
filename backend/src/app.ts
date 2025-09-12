import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import dotenv from 'dotenv';
import path from 'path';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { connectDatabase } from './config/database';
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
import { normalRateLimit, authRateLimit, devRateLimit } from './middleware/rateLimit';
import { sessionMiddleware, AnalyticsService } from './middleware/analytics';
import ReminderService from './services/reminderService';
import UserSession from './models/UserSession';

dotenv.config();


const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
const isDevelopment = process.env.NODE_ENV !== 'production';

// Get allowed origins from environment variable or use defaults for development
const getAllowedOrigins = () => {
  if (isDevelopment) {
    return ['http://localhost:5002', 'http://localhost:5003'];
  }
  
  // Production: require CORS_ORIGINS environment variable
  const corsOrigins = process.env.CORS_ORIGINS;
  if (!corsOrigins) {
    console.error('CRITICAL: CORS_ORIGINS environment variable is required for production');
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
  // Production CORS - strict origin checking
  
  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests) - only in development
      if (!origin && isDevelopment) return callback(null, true);
      
      // In production, be more strict about no-origin requests
      if (!origin && !isDevelopment) {
        return callback(new Error('Origin header is required'), false);
      }
      
      // At this point origin is guaranteed to exist due to checks above
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

// Auth routes FIRST - NO rate limiting on authentication
app.use('/api/auth', authRoutes);

// Public routes - NO authentication required, light rate limiting
app.use('/api/public', normalRateLimit, publicRoutes);

// Apply rate limiting to all OTHER routes
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

// Debug routes (only in development)
if (isDevelopment) {
  app.use('/api/debug', debugRoutes);
}

// Serve static files in production
if (!isDevelopment) {
  const frontendDistPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDistPath));
  
  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
}

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'OK' });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  
  try {
    // End all active sessions
    const activeSessions = await UserSession.find({ isActive: true });
    
    const endPromises = activeSessions.map(session => 
      AnalyticsService.endSession(session.sessionId, session.userId)
    );
    
    await Promise.allSettled(endPromises);
    
    // Close database connections
    await new Promise<void>((resolve) => {
      // Give time for final database operations
      setTimeout(() => {
        resolve();
      }, 1000);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    
    // Initialize reminder service
    const reminderService = ReminderService.getInstance();
    reminderService.initialize();
    
    const server = createServer(app);
    
    // Initialize Socket.IO
    const io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        credentials: true
      }
    });

    // Socket.IO for real-time updates (lock signaling and notifications)
    io.on('connection', (socket) => {

      // Join project room for lock updates
      socket.on('join-project', (projectId: string) => {
        socket.join(`project-${projectId}`);
      });

      // Leave project room
      socket.on('leave-project', (projectId: string) => {
        socket.leave(`project-${projectId}`);
      });

      // Join user notification room
      socket.on('join-user-notifications', (userId: string) => {
        socket.join(`user-${userId}`);
      });

      // Leave user notification room
      socket.on('leave-user-notifications', (userId: string) => {
        socket.leave(`user-${userId}`);
      });

      socket.on('disconnect', () => {
      });
    });

    // Make io available globally for lock signaling
    (global as any).io = io;
    
    server.listen(PORT, () => {
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();