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
import { normalRateLimit, authRateLimit, devRateLimit } from './middleware/rateLimit';
import { sessionMiddleware, AnalyticsService } from './middleware/analytics';
import ReminderService from './services/reminderService';
import UserSession from './models/UserSession';

dotenv.config();


const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
const isDevelopment = process.env.NODE_ENV !== 'production';
if (isDevelopment) {
  app.use(cors({
    origin: 'http://localhost:5002',
    credentials: true
  }));
} else {
  // Production CORS - only allow specific domains
  const allowedOrigins = [
    'https://yourdomain.com', // Replace with your actual production domain
    'https://www.yourdomain.com', // Replace with your actual www domain
    // Add any additional production domains here
  ];
  
  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
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
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    // End all active sessions
    const activeSessions = await UserSession.find({ isActive: true });
    console.log(`Ending ${activeSessions.length} active sessions...`);
    
    const endPromises = activeSessions.map(session => 
      AnalyticsService.endSession(session.sessionId, session.userId)
    );
    
    await Promise.allSettled(endPromises);
    console.log('All sessions ended successfully');
    
    // Close database connections
    await new Promise<void>((resolve) => {
      // Give time for final database operations
      setTimeout(() => {
        console.log('Graceful shutdown complete');
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
        origin: isDevelopment ? 'http://localhost:5002' : true,
        credentials: true
      }
    });

    // Socket.IO for real-time updates (lock signaling and notifications)
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Join project room for lock updates
      socket.on('join-project', (projectId: string) => {
        socket.join(`project-${projectId}`);
        console.log(`Socket ${socket.id} joined project-${projectId}`);
      });

      // Leave project room
      socket.on('leave-project', (projectId: string) => {
        socket.leave(`project-${projectId}`);
        console.log(`Socket ${socket.id} left project-${projectId}`);
      });

      // Join user notification room
      socket.on('join-user-notifications', (userId: string) => {
        socket.join(`user-${userId}`);
        console.log(`Socket ${socket.id} joined user-${userId} notifications`);
      });

      // Leave user notification room
      socket.on('leave-user-notifications', (userId: string) => {
        socket.leave(`user-${userId}`);
        console.log(`Socket ${socket.id} left user-${userId} notifications`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    // Make io available globally for lock signaling
    (global as any).io = io;
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
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