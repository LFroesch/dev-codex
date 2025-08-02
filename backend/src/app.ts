import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import billingRoutes from './routes/billing';
import adminRoutes from './routes/admin';
import ticketRoutes from './routes/tickets';
import analyticsRoutes from './routes/analytics';
import debugRoutes from './routes/debug';
import { normalRateLimit, authRateLimit, devRateLimit } from './middleware/rateLimit';
import { trackPageView, sessionMiddleware } from './middleware/analytics';

dotenv.config();


const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(cors({
  origin: 'http://localhost:5002', // Your frontend URL
  credentials: true // Allow cookies to be sent
}));
app.use(cookieParser());

// Raw body parser for Stripe webhooks (must be before express.json())
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(passport.initialize());

// Auth routes FIRST - NO rate limiting on authentication
app.use('/api/auth', authRoutes);

// Apply rate limiting to all OTHER routes
const isDevelopment = process.env.NODE_ENV !== 'production';
const rateLimitMiddleware = isDevelopment ? devRateLimit : normalRateLimit;
app.use('/api/projects', rateLimitMiddleware, sessionMiddleware, trackPageView, projectRoutes);
app.use('/api/billing', rateLimitMiddleware, billingRoutes);
app.use('/api/admin', rateLimitMiddleware, adminRoutes);
app.use('/api/tickets', rateLimitMiddleware, ticketRoutes);
app.use('/api/analytics', rateLimitMiddleware, sessionMiddleware, trackPageView, analyticsRoutes);

// Debug routes (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/debug', debugRoutes);
}

// Health check
app.get('/health', (req, res) => {
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