import express from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/errorHandler';

const router = express.Router();

// Basic health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Readiness check (includes database connectivity)
router.get('/ready', asyncHandler(async (req: express.Request, res: express.Response) => {
  // Check database connection
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      status: 'not ready',
      reason: 'database not connected',
      timestamp: new Date().toISOString()
    });
  }

  // Simple database ping
  await mongoose.connection.db.admin().ping();

  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    database: 'connected',
    uptime: process.uptime()
  });
}));

// Liveness check (always returns ok if server is running)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

export default router;