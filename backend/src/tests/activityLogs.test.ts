import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Project } from '../models/Project';
import ActivityLog from '../models/ActivityLog';
import UserSession from '../models/UserSession';
import activityLogsRoutes from '../routes/activityLogs';
import authRoutes from '../routes/auth';

// Create test app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/activity', activityLogsRoutes);

// Helper function
async function createAuthenticatedUser(email: string, username: string) {
  const user = await User.create({
    email,
    password: 'StrongPass123!',
    firstName: 'Test',
    lastName: 'User',
    username,
    planTier: 'free'
  });

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'StrongPass123!' });

  const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
  const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
  const token = tokenCookie?.split('=')[1].split(';')[0] || '';

  return { user, token };
}

describe('Activity Logs Routes', () => {
  describe('GET /api/activity/project/:projectId', () => {
    it('should get activity logs for a project', async () => {
      const { user, token } = await createAuthenticatedUser('logs@example.com', 'logs');

      const project = await Project.create({
        name: 'Test Project',
        description: 'Activity test project',
        ownerId: user._id,
        userId: user._id
      });

      // Create some activity logs
      await ActivityLog.create({
        projectId: project._id,
        userId: user._id,
        sessionId: 'session123',
        action: 'viewed',
        resourceType: 'project',
        resourceId: project._id,
        timestamp: new Date()
      });

      const response = await request(app)
        .get(`/api/activity/project/${project._id}`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('activities');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.activities.length).toBeGreaterThan(0);
    });

    it('should support pagination with limit and offset', async () => {
      const { user, token } = await createAuthenticatedUser('paginate@example.com', 'paginate');

      const project = await Project.create({
        name: 'Paginated Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });

      // Create multiple logs
      for (let i = 0; i < 10; i++) {
        await ActivityLog.create({
          projectId: project._id,
          userId: user._id,
          sessionId: 'session',
          action: 'created',
          resourceType: 'project',
          resourceId: project._id,
          timestamp: new Date(Date.now() - i * 1000)
        });
      }

      const response = await request(app)
        .get(`/api/activity/project/${project._id}?limit=5&offset=0`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.pagination).toHaveProperty('limit', 5);
      expect(response.body.pagination).toHaveProperty('offset', 0);
      expect(response.body.pagination).toHaveProperty('hasMore');
    });

    it('should support filtering by date range', async () => {
      const { user, token } = await createAuthenticatedUser('filter@example.com', 'filter');

      const project = await Project.create({
        name: 'Filtered Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const response = await request(app)
        .get(`/api/activity/project/${project._id}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should require authentication', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/activity/project/${fakeId}`)
        .expect(401);
    });
  });

  describe('GET /api/activity/project/:projectId/recent', () => {
    it('should get recent activity for a project', async () => {
      const { user, token } = await createAuthenticatedUser('recent@example.com', 'recent');

      const project = await Project.create({
        name: 'Recent Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });

      // Create recent activity
      await ActivityLog.create({
        projectId: project._id,
        userId: user._id,
        sessionId: 'session',
        action: 'viewed',
        resourceType: 'project',
        resourceId: project._id,
        timestamp: new Date()
      });

      const response = await request(app)
        .get(`/api/activity/project/${project._id}/recent`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('activities');
      expect(Array.isArray(response.body.activities)).toBe(true);
    });

    it('should support custom time window in minutes', async () => {
      const { user, token } = await createAuthenticatedUser('window@example.com', 'window');

      const project = await Project.create({
        name: 'Window Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });

      const response = await request(app)
        .get(`/api/activity/project/${project._id}/recent?minutes=10`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should require authentication', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/activity/project/${fakeId}/recent`)
        .expect(401);
    });
  });

  describe('GET /api/activity/project/:projectId/active-users', () => {
    it('should get active users for a project', async () => {
      const { user, token } = await createAuthenticatedUser('active@example.com', 'active');

      const project = await Project.create({
        name: 'Active Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });

      // Create active session
      await UserSession.create({
        sessionId: 'active-session',
        userId: user._id,
        currentProjectId: project._id,
        isActive: true,
        lastActivity: new Date(),
        isVisible: true
      });

      const response = await request(app)
        .get(`/api/activity/project/${project._id}/active-users`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('activeUsers');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.activeUsers)).toBe(true);
    });

    it('should support custom activity window', async () => {
      const { user, token } = await createAuthenticatedUser('window2@example.com', 'window2');

      const project = await Project.create({
        name: 'Window Project 2',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });

      const response = await request(app)
        .get(`/api/activity/project/${project._id}/active-users?minutes=5`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should not show inactive sessions', async () => {
      const { user, token } = await createAuthenticatedUser('inactive@example.com', 'inactive');

      const project = await Project.create({
        name: 'Inactive Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });

      // Create inactive session (old lastActivity)
      await UserSession.create({
        sessionId: 'old-session',
        userId: user._id,
        currentProjectId: project._id,
        isActive: true,
        lastActivity: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        isVisible: true
      });

      const response = await request(app)
        .get(`/api/activity/project/${project._id}/active-users?minutes=3`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.activeUsers).toHaveLength(0);
    });

    it('should require authentication', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/activity/project/${fakeId}/active-users`)
        .expect(401);
    });
  });

  describe('GET /api/activity/user/:userId', () => {
    it('should get user\'s own activity logs', async () => {
      const { user, token } = await createAuthenticatedUser('userlog@example.com', 'userlog');

      const project = await Project.create({
        name: 'User Log Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });

      await ActivityLog.create({
        projectId: project._id,
        userId: user._id,
        sessionId: 'session',
        action: 'viewed',
        resourceType: 'project',
        resourceId: project._id,
        timestamp: new Date()
      });

      const response = await request(app)
        .get(`/api/activity/user/${user._id}`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('activities');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should reject viewing other users\' activities', async () => {
      const { user: user1, token } = await createAuthenticatedUser('user1@example.com', 'user1');
      const { user: user2 } = await createAuthenticatedUser('user2@example.com', 'user2');

      const response = await request(app)
        .get(`/api/activity/user/${user2._id}`)
        .set('Cookie', `token=${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Access denied');
    });

    it('should support filtering by project', async () => {
      const { user, token } = await createAuthenticatedUser('filtered@example.com', 'filtered');

      const project = await Project.create({
        name: 'Filter Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });

      const response = await request(app)
        .get(`/api/activity/user/${user._id}?projectId=${project._id}`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should require authentication', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/activity/user/${fakeId}`)
        .expect(401);
    });
  });

  describe('POST /api/activity/smart-join', () => {
    it('should log project join', async () => {
      const { user, token } = await createAuthenticatedUser('join@example.com', 'join');

      const project = await Project.create({
        name: 'Join Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });

      const response = await request(app)
        .post('/api/activity/smart-join')
        .set('Cookie', `token=${token}`)
        .send({
          projectId: project._id.toString(),
          sessionId: 'join-session'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('logged');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/activity/smart-join')
        .send({ projectId: 'test', sessionId: 'test' })
        .expect(401);
    });
  });

  describe('DELETE /api/activity/project/:projectId/clear', () => {
    it('should clear all activity logs for a project', async () => {
      const { user, token } = await createAuthenticatedUser('clear@example.com', 'clear');

      const project = await Project.create({
        name: 'Clear Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });

      // Create logs to clear
      await ActivityLog.create({
        projectId: project._id,
        userId: user._id,
        sessionId: 'session',
        action: 'created',
        resourceType: 'project',
        resourceId: project._id,
        timestamp: new Date()
      });

      const response = await request(app)
        .delete(`/api/activity/project/${project._id}/clear`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('deletedCount');
      expect(response.body).toHaveProperty('message');

      // Verify logs were deleted (except the clear action itself)
      const remainingLogs = await ActivityLog.find({ projectId: project._id });
      const clearLog = remainingLogs.find(log => log.action === 'cleared_activity_log');
      expect(clearLog).toBeTruthy();
    });

    it('should require authentication', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .delete(`/api/activity/project/${fakeId}/clear`)
        .expect(401);
    });
  });

  describe('POST /api/activity/log', () => {
    it('should log custom activity', async () => {
      const { user, token } = await createAuthenticatedUser('custom@example.com', 'custom');

      const project = await Project.create({
        name: 'Custom Log Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });

      const response = await request(app)
        .post('/api/activity/log')
        .set('Cookie', `token=${token}`)
        .send({
          projectId: project._id.toString(),
          action: 'custom_action',
          resourceType: 'custom',
          resourceId: 'custom123',
          details: { info: 'test' },
          sessionId: 'custom-session'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('activity');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/activity/log')
        .send({
          projectId: 'test',
          action: 'test',
          resourceType: 'test',
          resourceId: 'test'
        })
        .expect(401);
    });
  });
});
