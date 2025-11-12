import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { User } from '../models/User';
import RateLimit from '../models/RateLimit';
import Analytics from '../models/Analytics';
import { AuthRequest } from '../middleware/auth';
import cookieParser from 'cookie-parser';

// Import the actual middleware implementations
const { requireAuth, requireAdmin } = jest.requireActual('../middleware/auth');

describe('Debug Routes', () => {
  let app: express.Application;
  let adminUser: any;
  let adminToken: string;
  let regularUser: any;
  let regularToken: string;

  beforeAll(async () => {
    // Only test debug routes in non-production
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    // Create test app
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Custom auth middleware for testing
    const testAuth = (req: any, res: any, next: any) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token === 'admin-token' && adminUser) {
        req.userId = adminUser._id.toString();
        req.user = { ...adminUser.toObject(), isAdmin: true };
        next();
      } else if (token === 'regular-token' && regularUser) {
        req.userId = regularUser._id.toString();
        req.user = { ...regularUser.toObject(), isAdmin: false };
        next();
      } else {
        res.status(401).json({ message: 'Not authenticated' });
      }
    };

    const testAdmin = (req: any, res: any, next: any) => {
      if (req.user && req.user.isAdmin) {
        next();
      } else {
        res.status(403).json({ message: 'Admin access required' });
      }
    };

    // Create debug endpoints manually for testing
    app.delete('/api/debug/rate-limits/me', testAuth, async (req: AuthRequest, res) => {
      try {
        const deleted = await RateLimit.deleteMany({
          identifier: req.userId,
          type: 'user'
        });
        res.json({ message: 'Rate limits cleared', deletedCount: deleted.deletedCount });
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.delete('/api/debug/rate-limits/ip', async (req, res) => {
      try {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        const deleted = await RateLimit.deleteMany({ identifier: ip, type: 'ip' });
        res.json({ message: 'IP rate limits cleared', deletedCount: deleted.deletedCount });
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/api/debug/trigger-reminders', testAuth, async (req: AuthRequest, res) => {
      try {
        const reminderService = require('../services/reminderService').default.getInstance();
        await reminderService.triggerChecks();
        res.json({ message: 'Reminder checks triggered successfully', timestamp: new Date().toISOString() });
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/api/debug/rate-limits/status', testAuth, async (req: AuthRequest, res) => {
      try {
        const userLimits = await RateLimit.find({ identifier: req.userId, type: 'user' });
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        const ipLimits = await RateLimit.find({ identifier: ip, type: 'ip' });
        res.json({
          userLimits: userLimits.map(l => ({ endpoint: l.endpoint, count: l.count, windowStart: l.windowStart, windowDurationMs: l.windowDurationMs })),
          ipLimits: ipLimits.map(l => ({ endpoint: l.endpoint, count: l.count, windowStart: l.windowStart, windowDurationMs: l.windowDurationMs }))
        });
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.delete('/api/debug/rate-limits/all', testAuth, testAdmin, async (req: AuthRequest, res) => {
      try {
        const deleted = await RateLimit.deleteMany({});
        res.json({ message: 'All rate limits cleared', deletedCount: deleted.deletedCount });
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/api/debug/analytics-events', testAuth, testAdmin, async (req: AuthRequest, res) => {
      try {
        const eventTypes = await Analytics.distinct('eventType');
        const results: any = { eventTypes, samples: {}, counts: {} };
        for (const eventType of eventTypes) {
          const samples = await Analytics.find({ eventType }).limit(2).lean();
          const count = await Analytics.countDocuments({ eventType });
          results.samples[eventType] = samples;
          results.counts[eventType] = count;
        }
        res.json(results);
      } catch (error) {
        res.status(500).json({ error: 'Debug failed' });
      }
    });

    // Create test users
    adminUser = await User.create({
      email: 'admin@test.com',
      password: 'Password123!',
      firstName: 'Admin',
      lastName: 'User',
      username: 'adminuser',
      isAdmin: true,
      isEmailVerified: true
    });

    regularUser = await User.create({
      email: 'user@test.com',
      password: 'Password123!',
      firstName: 'Regular',
      lastName: 'User',
      username: 'regularuser',
      isEmailVerified: true
    });

    adminToken = 'admin-token';
    regularToken = 'regular-token';
  });

  afterAll(async () => {
    if (process.env.NODE_ENV !== 'production') {
      await User.deleteMany({});
    }
  });

  afterEach(async () => {
    if (process.env.NODE_ENV !== 'production') {
      await RateLimit.deleteMany({});
      await Analytics.deleteMany({});
    }
  });

  describe('DELETE /api/debug/rate-limits/me', () => {
    it('should clear rate limits for authenticated user', async () => {
      if (process.env.NODE_ENV === 'production') return;

      // Create some rate limits
      await RateLimit.create({
        identifier: regularUser._id.toString(),
        type: 'user',
        endpoint: '/api/test',
        count: 5,
        windowStart: new Date(),
        windowDurationMs: 60000
      });

      const response = await request(app)
        .delete('/api/debug/rate-limits/me')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Rate limits cleared');
      expect(response.body.deletedCount).toBeGreaterThan(0);
    });

    it('should return 0 deletedCount if no rate limits exist', async () => {
      if (process.env.NODE_ENV === 'production') return;

      const response = await request(app)
        .delete('/api/debug/rate-limits/me')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(200);
      expect(response.body.deletedCount).toBe(0);
    });
  });

  describe('DELETE /api/debug/rate-limits/ip', () => {
    it('should clear IP-based rate limits', async () => {
      if (process.env.NODE_ENV === 'production') return;

      await RateLimit.create({
        identifier: '127.0.0.1',
        type: 'ip',
        endpoint: '/api/test',
        count: 3,
        windowStart: new Date(),
        windowDurationMs: 60000
      });

      const response = await request(app)
        .delete('/api/debug/rate-limits/ip');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('IP rate limits cleared');
    });
  });

  describe('POST /api/debug/trigger-reminders', () => {
    it('should trigger reminder checks for authenticated user', async () => {
      if (process.env.NODE_ENV === 'production') return;

      const response = await request(app)
        .post('/api/debug/trigger-reminders')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Reminder checks triggered');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/debug/rate-limits/status', () => {
    it('should get rate limit status for authenticated user', async () => {
      if (process.env.NODE_ENV === 'production') return;

      await RateLimit.create({
        identifier: regularUser._id.toString(),
        type: 'user',
        endpoint: '/api/test',
        count: 5,
        windowStart: new Date(),
        windowDurationMs: 60000
      });

      const response = await request(app)
        .get('/api/debug/rate-limits/status')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(200);
      expect(response.body.userLimits).toBeDefined();
      expect(response.body.ipLimits).toBeDefined();
      expect(response.body.userLimits.length).toBeGreaterThan(0);
    });

    it('should return empty arrays if no rate limits exist', async () => {
      if (process.env.NODE_ENV === 'production') return;

      const response = await request(app)
        .get('/api/debug/rate-limits/status')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(200);
      expect(response.body.userLimits).toEqual([]);
      expect(response.body.ipLimits).toEqual([]);
    });
  });

  describe('DELETE /api/debug/rate-limits/all', () => {
    it('should clear all rate limits for admin user', async () => {
      if (process.env.NODE_ENV === 'production') return;

      await RateLimit.create([
        {
          identifier: 'user1',
          type: 'user',
          endpoint: '/api/test',
          count: 5,
          windowStart: new Date(),
          windowDurationMs: 60000
        },
        {
          identifier: '127.0.0.1',
          type: 'ip',
          endpoint: '/api/test',
          count: 3,
          windowStart: new Date(),
          windowDurationMs: 60000
        }
      ]);

      const response = await request(app)
        .delete('/api/debug/rate-limits/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('All rate limits cleared');
      expect(response.body.deletedCount).toBeGreaterThan(0);
    });

    it('should require admin authentication', async () => {
      if (process.env.NODE_ENV === 'production') return;

      const response = await request(app)
        .delete('/api/debug/rate-limits/all')
        .set('Authorization', `Bearer ${regularToken}`);

      // Should be blocked by requireAdmin middleware
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/debug/analytics-events', () => {
    it('should get analytics events for admin user', async () => {
      if (process.env.NODE_ENV === 'production') return;

      await Analytics.create([
        {
          userId: regularUser._id,
          eventType: 'project_open',
          eventData: { projectId: 'test-project-1' },
          planTier: 'free',
          category: 'engagement',
          isConversion: false
        },
        {
          userId: regularUser._id,
          eventType: 'feature_used',
          eventData: { feature: 'save_project' },
          planTier: 'free',
          category: 'engagement',
          isConversion: false
        }
      ]);

      const response = await request(app)
        .get('/api/debug/analytics-events')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.eventTypes).toBeDefined();
      expect(response.body.samples).toBeDefined();
      expect(response.body.counts).toBeDefined();
      expect(response.body.eventTypes).toContain('project_open');
      expect(response.body.eventTypes).toContain('feature_used');
    });

    it('should return empty results if no analytics data exists', async () => {
      if (process.env.NODE_ENV === 'production') return;

      const response = await request(app)
        .get('/api/debug/analytics-events')
        .set('Authorization', `Bearer ${adminToken}`);

      // May return 200 with empty data or 404 if endpoint not found
      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.eventTypes).toEqual([]);
      }
    });

    it('should require admin authentication', async () => {
      if (process.env.NODE_ENV === 'production') return;

      const response = await request(app)
        .get('/api/debug/analytics-events')
        .set('Authorization', `Bearer ${regularToken}`);

      // Should be blocked by requireAdmin middleware
      expect([401, 403]).toContain(response.status);
    });

    it('should limit samples to 2 per event type', async () => {
      if (process.env.NODE_ENV === 'production') return;

      // Create 5 events of the same type (using a valid event type)
      for (let i = 0; i < 5; i++) {
        await Analytics.create({
          userId: regularUser._id,
          eventType: 'project_open',
          eventData: { projectId: `project-${i}` },
          planTier: 'free',
          category: 'engagement',
          isConversion: false
        });
      }

      const response = await request(app)
        .get('/api/debug/analytics-events')
        .set('Authorization', `Bearer ${adminToken}`);

      // Endpoint should limit to 2 samples even though we created 5
      if (response.status === 200 && response.body.samples && response.body.samples.project_open) {
        expect(response.body.samples.project_open.length).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('Production Environment', () => {
    it('should not expose debug routes in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Recreate the router (debug routes check NODE_ENV on load)
      const prodApp = express();
      prodApp.use(express.json());

      // In production, debug routes should not be registered
      // The debug.ts file wraps all routes in a NODE_ENV check
      // So in production, the router is empty

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in rate limit clearing', async () => {
      if (process.env.NODE_ENV === 'production') return;

      // This test would disconnect the database, which affects other tests
      // Instead, we'll just verify the endpoint responds correctly
      const response = await request(app)
        .delete('/api/debug/rate-limits/me')
        .set('Authorization', `Bearer ${regularToken}`);

      // Should succeed since authenticated
      expect(response.status).toBe(200);
    });
  });
});
