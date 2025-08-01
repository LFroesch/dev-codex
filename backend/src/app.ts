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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();