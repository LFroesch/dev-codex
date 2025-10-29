import activityLogger from '../../services/activityLogger';
import ActivityLog from '../../models/ActivityLog';
import { User } from '../../models/User';
import { Project } from '../../models/Project';

describe('ActivityLogger Service', () => {
  let user: any;
  let project: any;

  beforeEach(async () => {
    user = await User.create({
      email: 'activity@example.com',
      password: 'StrongPass123!',
      firstName: 'Activity',
      lastName: 'User',
      username: 'activityuser',
      planTier: 'free'
    });

    project = await Project.create({
      name: 'Activity Project',
      description: 'Activity logger test project',
      ownerId: user._id,
      userId: user._id
    });
  });

  describe('log', () => {
    it('should create activity log entry', async () => {
      const activity = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'test-session',
        action: 'viewed',
        resourceType: 'project',
        resourceId: project._id.toString()
      });

      expect(activity).toBeDefined();
      expect(activity).toHaveProperty('projectId');
      expect(activity).toHaveProperty('userId');
      expect(activity).toHaveProperty('action', 'viewed');

      // Verify in DB
      const dbActivity = await ActivityLog.findById(activity._id);
      expect(dbActivity).toBeDefined();
    });

    it('should include metadata', async () => {
      const activity = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'test-session',
        action: 'todo_created',
        resourceType: 'todo',
        resourceId: 'todo123',
        details: {
          metadata: {
            title: 'Test Todo',
            priority: 'high'
          }
        }
      });

      expect(activity.details).toBeDefined();
      expect(activity.details?.metadata).toHaveProperty('title', 'Test Todo');
    });

    it('should include user agent and IP', async () => {
      const activity = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'test-session',
        action: 'viewed',
        resourceType: 'project',
        resourceId: project._id.toString(),
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1'
      });

      expect(activity.userAgent).toBe('Mozilla/5.0');
      expect(activity.ipAddress).toBe('127.0.0.1');
    });
  });

  describe('getProjectActivities', () => {
    beforeEach(async () => {
      // Create some activities
      for (let i = 0; i < 5; i++) {
        await activityLogger.log({
          projectId: project._id.toString(),
          userId: user._id.toString(),
          sessionId: 'test-session',
          action: `action_${i}`,
          resourceType: 'project',
          resourceId: project._id.toString()
        });
      }
    });

    it('should get activities for a project', async () => {
      const result = await activityLogger.getProjectActivities(project._id.toString(), {
        limit: 10,
        offset: 0
      });

      expect(result).toHaveProperty('activities');
      expect(result).toHaveProperty('total');
      expect(result.activities.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const page1 = await activityLogger.getProjectActivities(project._id.toString(), {
        limit: 3,
        offset: 0
      });

      const page2 = await activityLogger.getProjectActivities(project._id.toString(), {
        limit: 3,
        offset: 3
      });

      expect(page1.activities.length).toBeLessThanOrEqual(3);
      expect(page2.activities.length).toBeGreaterThan(0);
    });

    it('should filter by user', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        password: 'StrongPass123!',
        firstName: 'Other',
        lastName: 'User',
        username: 'otheruser',
        planTier: 'free'
      });

      await activityLogger.log({
        projectId: project._id.toString(),
        userId: otherUser._id.toString(),
        sessionId: 'test-session',
        action: 'other_action',
        resourceType: 'project',
        resourceId: project._id.toString()
      });

      const result = await activityLogger.getProjectActivities(project._id.toString(), {
        limit: 10,
        offset: 0,
        userId: user._id.toString()
      });

      expect(result.activities.every(a => a.userId.toString() === user._id.toString())).toBe(true);
    });

    it('should filter by date range', async () => {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      const result = await activityLogger.getProjectActivities(project._id.toString(), {
        limit: 10,
        offset: 0,
        startDate,
        endDate
      });

      expect(result).toHaveProperty('activities');
    });
  });

  describe('getUserActivities', () => {
    beforeEach(async () => {
      // Create user activities
      for (let i = 0; i < 3; i++) {
        await activityLogger.log({
          projectId: project._id.toString(),
          userId: user._id.toString(),
          sessionId: 'test-session',
          action: `user_action_${i}`,
          resourceType: 'project',
          resourceId: project._id.toString()
        });
      }
    });

    it('should get activities for a user', async () => {
      const result = await activityLogger.getUserActivities(user._id.toString(), {
        limit: 10,
        offset: 0
      });

      expect(result).toHaveProperty('activities');
      expect(result).toHaveProperty('total');
      expect(result.activities.length).toBeGreaterThan(0);
    });

    it('should filter by project', async () => {
      const result = await activityLogger.getUserActivities(user._id.toString(), {
        limit: 10,
        offset: 0,
        projectId: project._id.toString()
      });

      expect(result.activities.every(a => a.projectId.toString() === project._id.toString())).toBe(true);
    });
  });

  describe('getRecentActivity', () => {
    it('should get recent activity', async () => {
      await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'test-session',
        action: 'recent_action',
        resourceType: 'project',
        resourceId: project._id.toString()
      });

      const activities = await activityLogger.getRecentActivity(project._id.toString(), 5);

      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThan(0);
    });

    it('should only return activities within time window', async () => {
      const activities = await activityLogger.getRecentActivity(project._id.toString(), 1);

      // All activities should be recent
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      expect(activities.every(a => new Date(a.timestamp) > oneMinuteAgo)).toBe(true);
    });
  });

  describe('logProjectJoin', () => {
    it('should log project join', async () => {
      const activity = await activityLogger.logProjectJoin(
        project._id.toString(),
        user._id.toString(),
        'join-session',
        'Mozilla/5.0',
        '127.0.0.1'
      );

      expect(activity).toBeDefined();
      expect(activity?.action).toContain('joined');
    });

    it('should prevent duplicate joins within time window', async () => {
      const activity1 = await activityLogger.logProjectJoin(
        project._id.toString(),
        user._id.toString(),
        'dup-session',
        'Mozilla/5.0',
        '127.0.0.1'
      );

      // Immediate second join should be skipped
      const activity2 = await activityLogger.logProjectJoin(
        project._id.toString(),
        user._id.toString(),
        'dup-session',
        'Mozilla/5.0',
        '127.0.0.1'
      );

      expect(activity1).toBeDefined();
      expect(activity2).toBeNull();
    });
  });
});
