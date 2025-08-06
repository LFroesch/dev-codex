import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import billingRoutes from './routes/billing';
import adminRoutes from './routes/admin';
import ticketRoutes from './routes/tickets';
import analyticsRoutes from './routes/analytics';
import debugRoutes from './routes/debug';
import invitationRoutes from './routes/invitations';
import notificationRoutes from './routes/notifications';
import { normalRateLimit, authRateLimit, devRateLimit } from './middleware/rateLimit';
import { trackPageView, sessionMiddleware } from './middleware/analytics';

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
  // In production, allow same-origin requests
  app.use(cors({
    origin: true,
    credentials: true
  }));
}
app.use(cookieParser());

app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(passport.initialize());

// Auth routes FIRST - NO rate limiting on authentication
app.use('/api/auth', authRoutes);

// Apply rate limiting to all OTHER routes
const rateLimitMiddleware = isDevelopment ? devRateLimit : normalRateLimit;
app.use('/api/projects', rateLimitMiddleware, sessionMiddleware, trackPageView, projectRoutes);
app.use('/api/invitations', rateLimitMiddleware, invitationRoutes);
app.use('/api/notifications', rateLimitMiddleware, notificationRoutes);
app.use('/api/billing', rateLimitMiddleware, billingRoutes);
app.use('/api/admin', rateLimitMiddleware, adminRoutes);
app.use('/api/tickets', rateLimitMiddleware, ticketRoutes);
app.use('/api/analytics', rateLimitMiddleware, sessionMiddleware, trackPageView, analyticsRoutes);

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

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();