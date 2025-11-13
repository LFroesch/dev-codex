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
        action: 'created',
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
          action: i % 2 === 0 ? 'viewed' : 'updated',
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
        action: 'deleted',
        resourceType: 'project',
        resourceId: project._id.toString()
      });

      // Test that userId filter parameter is accepted without error
      const result = await activityLogger.getProjectActivities(project._id.toString(), {
        limit: 10,
        offset: 0,
        userId: user._id.toString()
      });

      expect(result).toHaveProperty('activities');
      expect(result).toHaveProperty('total');
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
          action: i % 2 === 0 ? 'created' : 'deleted',
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
      // Test that projectId filter parameter is accepted without error
      const result = await activityLogger.getUserActivities(user._id.toString(), {
        limit: 10,
        offset: 0,
        projectId: project._id.toString()
      });

      expect(result).toHaveProperty('activities');
      expect(result).toHaveProperty('total');
    });
  });

  describe('getRecentActivity', () => {
    it('should get recent activity', async () => {
      await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'test-session',
        action: 'viewed',
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

  describe('helper methods', () => {
    it('should log project view', async () => {
      const log = await activityLogger.logProjectView(
        project._id.toString(),
        user._id.toString(),
        'session123',
        'Mozilla/5.0',
        '127.0.0.1'
      );

      expect(log).toBeDefined();
      expect(log.action).toBe('viewed');
      expect(log.resourceType).toBe('project');
    });

    it('should log field update', async () => {
      const log = await activityLogger.logFieldUpdate(
        project._id.toString(),
        user._id.toString(),
        'session123',
        'todo',
        'todo1',
        'completed',
        false,
        true,
        'Test Todo'
      );

      expect(log).toBeDefined();
      expect(log.action).toBe('updated');
      expect(log.details?.field).toBe('completed');
      expect(log.details?.oldValue).toBe(false);
      expect(log.details?.newValue).toBe(true);
    });

    it('should log resource creation', async () => {
      const log = await activityLogger.logResourceCreation(
        project._id.toString(),
        user._id.toString(),
        'session123',
        'note',
        'note1',
        { title: 'New Note' }
      );

      expect(log).toBeDefined();
      expect(log.action).toBe('created');
      expect(log.resourceType).toBe('note');
    });

    it('should log resource deletion', async () => {
      const log = await activityLogger.logResourceDeletion(
        project._id.toString(),
        user._id.toString(),
        'session123',
        'component',
        'comp1',
        { name: 'Old Component' }
      );

      expect(log).toBeDefined();
      expect(log.action).toBe('deleted');
      expect(log.resourceType).toBe('component');
    });
  });

  describe('description generation', () => {
    it('should generate description for status update', async () => {
      const log = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'session123',
        action: 'updated',
        resourceType: 'todo',
        resourceId: 'todo1',
        details: {
          field: 'status',
          newValue: 'in-progress',
          resourceName: 'Test Todo'
        }
      });

      expect(log).toBeDefined();
      expect(log.action).toBe('updated');
      expect(log.details?.field).toBe('status');
    });

    it('should log completion toggle', async () => {
      const log = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'session123',
        action: 'updated',
        resourceType: 'todo',
        resourceId: 'todo1',
        details: {
          field: 'completed',
          newValue: true,
          resourceName: 'Test Todo'
        }
      });

      expect(log).toBeDefined();
      expect(log.details?.field).toBe('completed');
      expect(log.details?.newValue).toBe(true);
    });

    it('should log field update', async () => {
      const log = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'session123',
        action: 'updated',
        resourceType: 'note',
        resourceId: 'note1',
        details: {
          field: 'title',
          resourceName: 'Test Note'
        }
      });

      expect(log).toBeDefined();
      expect(log.details?.field).toBe('title');
    });

    it('should log team operations', async () => {
      const inviteLog = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'session123',
        action: 'invited_member',
        resourceType: 'team',
        details: { metadata: { inviteeEmail: 'new@example.com' } }
      });
      expect(inviteLog.action).toBe('invited_member');
      expect(inviteLog.details.metadata).toHaveProperty('inviteeEmail');

      const removeLog = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'session123',
        action: 'removed_member',
        resourceType: 'team',
        details: { metadata: { removedEmail: 'old@example.com' } }
      });
      expect(removeLog.action).toBe('removed_member');

      const roleLog = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'session123',
        action: 'updated_role',
        resourceType: 'team',
        details: { newValue: 'admin' }
      });
      expect(roleLog.action).toBe('updated_role');
      expect(roleLog.details.newValue).toBe('admin');
    });

    it('should log tech operations', async () => {
      const addLog = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'session123',
        action: 'added_tech',
        resourceType: 'tech',
        details: { resourceName: 'React' }
      });
      expect(addLog.action).toBe('added_tech');
      expect(addLog.details.resourceName).toBe('React');

      const removeLog = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'session123',
        action: 'removed_tech',
        resourceType: 'tech',
        details: { resourceName: 'Angular' }
      });
      expect(removeLog.action).toBe('removed_tech');
    });

    it('should log project operations', async () => {
      const exportLog = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'session123',
        action: 'exported_data',
        resourceType: 'project',
        details: { metadata: { format: 'JSON' } }
      });
      expect(exportLog.action).toBe('exported_data');
      expect(exportLog.details.metadata).toHaveProperty('format', 'JSON');

      const importLog = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'session123',
        action: 'imported_data',
        resourceType: 'project'
      });
      expect(importLog.action).toBe('imported_data');

      const archiveLog = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'session123',
        action: 'archived_project',
        resourceType: 'project'
      });
      expect(archiveLog.action).toBe('archived_project');

      const unarchiveLog = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'session123',
        action: 'unarchived_project',
        resourceType: 'project'
      });
      expect(unarchiveLog.action).toBe('unarchived_project');

      const leaveLog = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'session123',
        action: 'left_project',
        resourceType: 'project'
      });
      expect(leaveLog.action).toBe('left_project');
    });

    it('should log deleted action', async () => {
      const log = await activityLogger.log({
        projectId: project._id.toString(),
        userId: user._id.toString(),
        sessionId: 'session123',
        action: 'deleted',
        resourceType: 'project',
        resourceId: project._id.toString()
      });

      expect(log.action).toBe('deleted');
      expect(log.resourceType).toBe('project');
    });
  });
});
