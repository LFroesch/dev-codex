import { activityLogsAPI } from '../api/activityLogs';
import analyticsService from './analytics';

class ActivityTracker {
  private static instance: ActivityTracker;
  private currentProjectId: string | null = null;
  private currentUserId: string | null = null;

  private constructor() {}

  static getInstance(): ActivityTracker {
    if (!ActivityTracker.instance) {
      ActivityTracker.instance = new ActivityTracker();
    }
    return ActivityTracker.instance;
  }

  setContext(projectId: string | null, userId: string | null) {
    this.currentProjectId = projectId;
    this.currentUserId = userId;
  }

  // Track when user creates something
  async trackCreate(
    resourceType: 'note' | 'todo' | 'doc' | 'devlog' | 'link' | 'tech' | 'package',
    resourceId: string,
    resourceName?: string,
    fileName?: string,
    metadata?: Record<string, any>
  ) {
    if (!this.currentProjectId) return;

    try {
      await activityLogsAPI.logActivity({
        projectId: this.currentProjectId,
        action: 'created',
        resourceType,
        resourceId,
        details: { 
          resourceName,
          fileName,
          metadata 
        }
      });

      // Also track in analytics
      await analyticsService.trackAction(`create_${resourceType}`, {
        projectId: this.currentProjectId,
        resourceId,
        ...metadata
      });
    } catch (error) {
      console.error('Failed to track create action:', error);
    }
  }

  // Track when user updates something
  async trackUpdate(
    resourceType: 'note' | 'todo' | 'doc' | 'devlog' | 'link' | 'tech' | 'package' | 'project',
    resourceId: string,
    field: string,
    oldValue: any,
    newValue: any,
    resourceName?: string,
    fileName?: string
  ) {
    if (!this.currentProjectId) return;

    try {
      await activityLogsAPI.logActivity({
        projectId: this.currentProjectId,
        action: 'updated',
        resourceType,
        resourceId,
        details: {
          field,
          oldValue,
          newValue,
          resourceName,
          fileName
        }
      });

      // Also track in analytics (just the action, not field details to avoid duplication)
      await analyticsService.trackAction(`update_${resourceType}`, {
        projectId: this.currentProjectId,
        resourceId,
        field,
        hasResourceName: !!resourceName,
        hasFileName: !!fileName
      });
    } catch (error) {
      console.error('Failed to track update action:', error);
    }
  }

  // Track when user deletes something
  async trackDelete(
    resourceType: 'note' | 'todo' | 'doc' | 'devlog' | 'link' | 'tech' | 'package',
    resourceId: string,
    resourceName?: string,
    fileName?: string,
    metadata?: Record<string, any>
  ) {
    if (!this.currentProjectId) return;

    try {
      await activityLogsAPI.logActivity({
        projectId: this.currentProjectId,
        action: 'deleted',
        resourceType,
        resourceId,
        details: { 
          resourceName,
          fileName,
          metadata 
        }
      });

      // Also track in analytics
      await analyticsService.trackAction(`delete_${resourceType}`, {
        projectId: this.currentProjectId,
        resourceId,
        ...metadata
      });
    } catch (error) {
      console.error('Failed to track delete action:', error);
    }
  }

  // Track when user views something
  async trackView(
    resourceType: 'project' | 'note' | 'doc',
    resourceId: string
  ) {
    if (!this.currentProjectId) return;

    try {
      await activityLogsAPI.logActivity({
        projectId: this.currentProjectId,
        action: 'viewed',
        resourceType,
        resourceId
      });
    } catch (error) {
      console.error('Failed to track view action:', error);
    }
  }

  // Track team-related actions
  async trackTeamAction(
    action: 'invited_member' | 'removed_member' | 'updated_role',
    metadata?: Record<string, any>
  ) {
    if (!this.currentProjectId) return;

    try {
      await activityLogsAPI.logActivity({
        projectId: this.currentProjectId,
        action,
        resourceType: 'team',
        details: { metadata }
      });
    } catch (error) {
      console.error('Failed to track team action:', error);
    }
  }

  // Track project-level actions
  async trackProjectAction(
    action: 'shared_project' | 'unshared_project' | 'archived_project' | 'unarchived_project',
    metadata?: Record<string, any>
  ) {
    if (!this.currentProjectId) return;

    try {
      await activityLogsAPI.logActivity({
        projectId: this.currentProjectId,
        action,
        resourceType: 'project',
        resourceId: this.currentProjectId,
        details: { metadata }
      });
    } catch (error) {
      console.error('Failed to track project action:', error);
    }
  }

  // Convenience method to track when user joins/leaves a project
  async trackProjectPresence(action: 'joined_project' | 'left_project') {
    if (!this.currentProjectId) return;

    try {
      await activityLogsAPI.logActivity({
        projectId: this.currentProjectId,
        action,
        resourceType: 'project',
        resourceId: this.currentProjectId
      });
    } catch (error) {
      console.error('Failed to track project presence:', error);
    }
  }
}

export default ActivityTracker.getInstance();