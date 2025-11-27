import express, { Response } from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import RateLimit from '../models/RateLimit';
import ReminderService from '../services/reminderService';
import Analytics from '../models/Analytics';
import { asyncHandler } from '../utils/errorHandler';

const router = express.Router();

// Only enable debug routes in development
if (process.env.NODE_ENV !== 'production') {
  
  // Clear rate limits for current user
  router.delete('/rate-limits/me', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
    const deleted = await RateLimit.deleteMany({
      identifier: req.userId,
      type: 'user'
    });
    
    res.json({ 
      message: 'Rate limits cleared',
      deletedCount: deleted.deletedCount 
    });
  }));

  // Clear rate limits for current IP
  router.delete('/rate-limits/ip', asyncHandler(async (req: AuthRequest, res: Response) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const deleted = await RateLimit.deleteMany({
      identifier: ip,
      type: 'ip'
    });
    
    res.json({ 
      message: 'IP rate limits cleared',
      deletedCount: deleted.deletedCount 
    });
  }));

  // Trigger reminder checks manually for testing
  router.post('/trigger-reminders', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
    const reminderService = ReminderService.getInstance();
    await reminderService.triggerChecks();
    res.json({ 
      message: 'Reminder checks triggered successfully',
      timestamp: new Date().toISOString()
    });
  }));

  // Get current rate limit status
  router.get('/rate-limits/status', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userLimits = await RateLimit.find({
      identifier: req.userId,
      type: 'user'
    });

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const ipLimits = await RateLimit.find({
      identifier: ip,
      type: 'ip'
    });

    res.json({
      userLimits: userLimits.map(limit => ({
        endpoint: limit.endpoint,
        count: limit.count,
        windowStart: limit.windowStart,
        windowDurationMs: limit.windowDurationMs
      })),
      ipLimits: ipLimits.map(limit => ({
        endpoint: limit.endpoint,
        count: limit.count,
        windowStart: limit.windowStart,
        windowDurationMs: limit.windowDurationMs
      }))
    });
  }));

  // Clear all rate limits (admin only)
  // SEC-007 FIX: Add admin authentication
  router.delete('/rate-limits/all', requireAuth, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
    const deleted = await RateLimit.deleteMany({});

    res.json({
      message: 'All rate limits cleared',
      deletedCount: deleted.deletedCount
    });
  }));

  // Debug endpoint to see what's actually in the analytics database
  // SEC-007 FIX: Add admin authentication
  router.get('/analytics-events', requireAuth, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
    // Get all distinct event types
    const eventTypes = await Analytics.distinct('eventType');
    
    const results: any = {
      eventTypes,
      samples: {},
      counts: {}
    };
    
    // Get sample of each event type and counts
    for (const eventType of eventTypes) {
      const samples = await Analytics.find({ eventType }).limit(2).lean();
      const count = await Analytics.countDocuments({ eventType });
      
      results.samples[eventType] = samples;
      results.counts[eventType] = count;
      
    }
    
    res.json(results);
  }));
}

export default router;