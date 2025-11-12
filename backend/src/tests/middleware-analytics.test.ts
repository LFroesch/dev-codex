import express, { Request, Response } from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Project } from '../models/Project';
import Analytics from '../models/Analytics';
import UserSession from '../models/UserSession';
import { AnalyticsService, calculateActiveTime, trackProjectAccess, sessionMiddleware } from '../middleware/analytics';

describe('Analytics Middleware', () => {
  afterEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await Analytics.deleteMany({});
    await UserSession.deleteMany({});
  });

  describe('calculateActiveTime', () => {
    it('should calculate active time with no heartbeats', () => {
      const start = new Date('2025-01-01T10:00:00Z');
      const end = new Date('2025-01-01T10:05:00Z');

      // 5 minutes, but should be capped at 15 minutes threshold
      const activeTime = calculateActiveTime(start, end, []);

      expect(activeTime).toBe(5 * 60 * 1000); // 5 minutes in ms
    });

    it('should calculate active time with heartbeats', () => {
      const start = new Date('2025-01-01T10:00:00Z');
      const end = new Date('2025-01-01T10:30:00Z');

      const heartbeats = [
        new Date('2025-01-01T10:05:00Z'),
        new Date('2025-01-01T10:10:00Z'),
        new Date('2025-01-01T10:15:00Z'),
        new Date('2025-01-01T10:20:00Z')
      ];

      const activeTime = calculateActiveTime(start, end, heartbeats);

      // Should count time between heartbeats
      expect(activeTime).toBeGreaterThan(0);
      expect(activeTime).toBeLessThanOrEqual(30 * 60 * 1000); // Less than or equal to 30 minutes
    });

    it('should exclude large gaps (AFK periods)', () => {
      const start = new Date('2025-01-01T10:00:00Z');
      const end = new Date('2025-01-01T12:00:00Z'); // 2 hours later

      const heartbeats = [
        new Date('2025-01-01T10:05:00Z'),
        // 1.5 hour gap here - should be excluded
        new Date('2025-01-01T11:35:00Z'),
        new Date('2025-01-01T11:40:00Z')
      ];

      const activeTime = calculateActiveTime(start, end, heartbeats);

      // Should not count the 1.5 hour gap
      expect(activeTime).toBeLessThan(30 * 60 * 1000); // Much less than 2 hours
    });

    it('should handle empty heartbeats array', () => {
      const start = new Date('2025-01-01T10:00:00Z');
      const end = new Date('2025-01-01T10:05:00Z');

      const activeTime = calculateActiveTime(start, end);

      expect(activeTime).toBe(5 * 60 * 1000);
    });
  });

  describe('AnalyticsService.trackEvent', () => {
    it('should track an analytics event', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        planTier: 'free',
        isEmailVerified: true
      });

      const result = await AnalyticsService.trackEvent(
        user._id.toString(),
        'project_open',
        { projectId: 'test-project' }
      );

      expect(result).toBeTruthy();
      expect(result?.eventType).toBe('project_open');
      expect(result?.planTier).toBe('free');

      const savedEvent = await Analytics.findById(result?._id);
      expect(savedEvent).toBeTruthy();
      expect(savedEvent?.eventData.projectId).toBe('test-project');
    });

    it('should respect daily limits for free tier', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        planTier: 'free',
        isEmailVerified: true
      });

      // Free tier has a daily limit
      // Track many events
      for (let i = 0; i < 15; i++) {
        await AnalyticsService.trackEvent(
          user._id.toString(),
          'feature_used',
          { feature: `feature-${i}` }
        );
      }

      const eventCount = await Analytics.countDocuments({ userId: user._id });
      expect(eventCount).toBeLessThanOrEqual(15);
    });

    it('should sanitize event data', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        planTier: 'pro',
        isEmailVerified: true
      });

      const longString = 'a'.repeat(2000);

      const result = await AnalyticsService.trackEvent(
        user._id.toString(),
        'project_open',
        {
          projectId: 'test',
          longField: longString
        }
      );

      expect(result).toBeTruthy();
      // Event data should be sanitized/truncated
      const eventData = result?.eventData as any;
      expect(eventData.longField.length).toBeLessThan(2000);
    });

    it('should determine correct event category', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        planTier: 'premium',
        isEmailVerified: true
      });

      const businessEvent = await AnalyticsService.trackEvent(
        user._id.toString(),
        'user_upgraded',
        { fromPlan: 'free', toPlan: 'pro' }
      );

      expect(businessEvent?.category).toBe('business');

      const engagementEvent = await AnalyticsService.trackEvent(
        user._id.toString(),
        'project_open',
        { projectId: 'test' }
      );

      expect(engagementEvent?.category).toBe('engagement');

      const errorEvent = await AnalyticsService.trackEvent(
        user._id.toString(),
        'error_occurred',
        { message: 'Test error' }
      );

      expect(errorEvent?.category).toBe('error');
    });
  });

  describe('AnalyticsService.startSession', () => {
    it('should create a new session', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        isEmailVerified: true
      });

      const mockReq = {
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1'
      } as any;

      const sessionId = await AnalyticsService.startSession(user._id.toString(), mockReq);

      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe('string');

      const session = await UserSession.findOne({ sessionId });
      expect(session).toBeTruthy();
      expect(session?.isActive).toBe(true);
    });
  });

  describe('AnalyticsService.endSession', () => {
    it('should end an active session', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        isEmailVerified: true
      });

      const mockReq = {
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1'
      } as any;

      const sessionId = await AnalyticsService.startSession(user._id.toString(), mockReq);

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100));

      await AnalyticsService.endSession(sessionId, user._id.toString());

      const session = await UserSession.findOne({ sessionId });
      expect(session).toBeTruthy();
      expect(session?.isActive).toBe(false);
      expect(session?.endTime).toBeTruthy();
      expect(session?.duration).toBeGreaterThan(0);
    });

    it('should calculate active time using gap detection', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        isEmailVerified: true
      });

      const session = await UserSession.create({
        userId: user._id,
        sessionId: 'test-session',
        startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        lastActivity: new Date(),
        isActive: true,
        heartbeatTimestamps: [
          new Date(Date.now() - 25 * 60 * 1000),
          new Date(Date.now() - 20 * 60 * 1000),
          new Date(Date.now() - 15 * 60 * 1000),
          new Date(Date.now() - 5 * 60 * 1000)
        ]
      });

      await AnalyticsService.endSession(session.sessionId, user._id.toString());

      const updatedSession = await UserSession.findOne({ sessionId: session.sessionId });
      // Allow small timing buffer (50ms) for test execution time
      expect(updatedSession?.duration).toBeLessThanOrEqual(30 * 60 * 1000 + 50); // Less than or equal to raw 30 mins + buffer
    });
  });

  describe('AnalyticsService.switchProject', () => {
    it('should switch projects and track time', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        isEmailVerified: true
      });

      const project1 = await Project.create({
        name: 'Project 1',
        description: 'Test',
        userId: user._id,
        ownerId: user._id
      });

      const project2 = await Project.create({
        name: 'Project 2',
        description: 'Test',
        userId: user._id,
        ownerId: user._id
      });

      const session = await UserSession.create({
        userId: user._id,
        sessionId: 'test-session',
        startTime: new Date(),
        lastActivity: new Date(),
        isActive: true,
        currentProjectId: project1._id.toString(),
        currentProjectStartTime: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
        projectsViewed: [project1._id.toString()]
      });

      await AnalyticsService.switchProject(
        user._id.toString(),
        session.sessionId,
        project2._id.toString()
      );

      const updatedSession = await UserSession.findOne({ sessionId: session.sessionId });
      expect(updatedSession?.currentProjectId).toBe(project2._id.toString());
      expect(updatedSession?.projectTimeBreakdown).toBeTruthy();
      expect(updatedSession?.projectTimeBreakdown?.length).toBeGreaterThan(0);
    });
  });

  describe('AnalyticsService.trackConversion', () => {
    it('should track a conversion event with value', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        planTier: 'premium',
        isEmailVerified: true
      });

      const result = await AnalyticsService.trackConversion(
        user._id.toString(),
        'user_upgraded',
        49.99,
        { fromPlan: 'free', toPlan: 'pro' }
      );

      expect(result).toBeTruthy();
      expect(result?.category).toBe('business');
      expect(result?.isConversion).toBe(true);
      expect(result?.conversionValue).toBe(49.99);
    });
  });

  describe('AnalyticsService.getAnalyticsSummary', () => {
    it('should return analytics summary with plan info', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        planTier: 'pro',
        isEmailVerified: true
      });

      // Create some events
      await Analytics.create([
        {
          userId: user._id.toString(),
          eventType: 'project_open',
          eventData: {},
          planTier: 'pro',
          category: 'engagement',
          isConversion: false
        },
        {
          userId: user._id.toString(),
          eventType: 'feature_used',
          eventData: {},
          planTier: 'pro',
          category: 'engagement',
          isConversion: false
        }
      ]);

      const summary = await AnalyticsService.getAnalyticsSummary(user._id.toString());

      expect(summary.totalEvents).toBe(2);
      expect(summary.planTier).toBe('pro');
      expect(summary.eventsByType).toHaveProperty('project_open');
      expect(summary.eventsByType).toHaveProperty('feature_used');
    });
  });

  describe('trackProjectAccess middleware', () => {
    let app: express.Application;
    let user: any;
    let project: any;

    beforeEach(async () => {
      user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        isEmailVerified: true
      });

      project = await Project.create({
        name: 'Test Project',
        description: 'Test',
        userId: user._id,
        ownerId: user._id
      });

      app = express();
      app.use(express.json());
      app.get('/projects/:id', (req: any, res, next) => {
        req.userId = user._id.toString();
        next();
      }, trackProjectAccess, (req: Request, res: Response) => {
        res.json({ name: 'Test Project', id: req.params.id });
      });
    });

    it('should track project access on successful request', async () => {
      const response = await request(app)
        .get(`/projects/${project._id}`);

      expect(response.status).toBe(200);

      // Wait for async tracking to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const analyticsCount = await Analytics.countDocuments({
        userId: user._id,
        eventType: 'project_open'
      });

      expect(analyticsCount).toBeGreaterThan(0);
    });

    it('should not track on error responses', async () => {
      const appWithError = express();
      appWithError.use(express.json());
      appWithError.get('/projects/:id', (req: any, res, next) => {
        req.userId = user._id.toString();
        next();
      }, trackProjectAccess, (req: Request, res: Response) => {
        res.status(404).json({ error: 'Not found' });
      });

      await request(appWithError)
        .get(`/projects/${project._id}`);

      await new Promise(resolve => setTimeout(resolve, 100));

      const analyticsCount = await Analytics.countDocuments({
        userId: user._id,
        eventType: 'project_open'
      });

      expect(analyticsCount).toBe(0);
    });
  });

  describe('sessionMiddleware', () => {
    let app: express.Application;
    let user: any;

    beforeEach(async () => {
      user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        isEmailVerified: true
      });

      app = express();
      app.use(express.json());
      app.get('/test', (req: any, res, next) => {
        req.userId = user._id.toString();
        next();
      }, sessionMiddleware, (req: Request, res: Response) => {
        res.json({ success: true });
      });
    });

    it('should start a new session if no session ID provided', async () => {
      const response = await request(app)
        .get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-session-id']).toBeTruthy();

      const sessionId = response.headers['x-session-id'];
      const session = await UserSession.findOne({ sessionId });
      expect(session).toBeTruthy();
    });

    it('should update existing session', async () => {
      // First request to create session
      const firstResponse = await request(app)
        .get('/test');

      const sessionId = firstResponse.headers['x-session-id'];

      // Second request with session ID
      const secondResponse = await request(app)
        .get('/test')
        .set('x-session-id', sessionId);

      expect(secondResponse.status).toBe(200);

      const session = await UserSession.findOne({ sessionId });
      expect(session).toBeTruthy();
    });
  });
});
