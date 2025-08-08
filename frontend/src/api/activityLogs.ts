import { apiClient } from './index';

export interface ActivityLogEntry {
  _id: string;
  projectId: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  sessionId: string;
  action: string;
  resourceType: 'project' | 'note' | 'todo' | 'doc' | 'devlog' | 'link' | 'tech' | 'package' | 'team' | 'settings';
  resourceId?: string;
  details: {
    field?: string;
    oldValue?: any;
    newValue?: any;
    resourceName?: string;
    fileName?: string;
    metadata?: Record<string, any>;
  };
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface ActiveUser {
  sessionId: string;
  userId: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  currentPage?: string;
  lastActivity: string;
  isVisible: boolean;
  duration: number;
}

export interface ActivityLogResponse {
  success: boolean;
  activities: ActivityLogEntry[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ActiveUsersResponse {
  success: boolean;
  activeUsers: ActiveUser[];
  count: number;
}

export const activityLogsAPI = {
  // Get activity logs for a project
  getProjectActivities: async (
    projectId: string,
    options: {
      limit?: number;
      offset?: number;
      userId?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<ActivityLogResponse> => {
    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.userId) params.append('userId', options.userId);
    if (options.resourceType) params.append('resourceType', options.resourceType);
    if (options.startDate) params.append('startDate', options.startDate.toISOString());
    if (options.endDate) params.append('endDate', options.endDate.toISOString());

    const response = await apiClient.get(`/activity-logs/project/${projectId}?${params}`);
    return response.data;
  },

  // Get recent activity for a project (last few minutes)
  getRecentActivities: async (projectId: string, minutes: number = 5): Promise<ActivityLogEntry[]> => {
    const response = await apiClient.get(`/activity-logs/project/${projectId}/recent?minutes=${minutes}`);
    return response.data.activities;
  },

  // Get active users currently working on a project
  getActiveUsers: async (projectId: string, minutes: number = 3): Promise<ActiveUsersResponse> => {
    const response = await apiClient.get(`/activity-logs/project/${projectId}/active-users?minutes=${minutes}`);
    return response.data;
  },

  // Log a custom activity
  logActivity: async (activityData: {
    projectId: string;
    action: string;
    resourceType: ActivityLogEntry['resourceType'];
    resourceId?: string;
    details?: ActivityLogEntry['details'];
    sessionId?: string;
  }): Promise<{ success: boolean; activity: ActivityLogEntry }> => {
    const response = await apiClient.post('/activity-logs/log', activityData);
    return response.data;
  },

  // Get user's own activity logs
  getUserActivities: async (
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      projectId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<ActivityLogResponse> => {
    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.projectId) params.append('projectId', options.projectId);
    if (options.startDate) params.append('startDate', options.startDate.toISOString());
    if (options.endDate) params.append('endDate', options.endDate.toISOString());

    const response = await apiClient.get(`/activity-logs/user/${userId}?${params}`);
    return response.data;
  }
};

// Helper function to format activity log messages
export const formatActivityMessage = (activity: ActivityLogEntry): string => {
  const userName = `${activity.userId.firstName} ${activity.userId.lastName}`;
  const resourceType = activity.resourceType;
  const resourceName = activity.details?.resourceName;
  const fileName = activity.details?.fileName;
  const field = activity.details?.field;
  
  // Helper to get resource display name
  const getResourceDisplay = () => {
    if (fileName) return `"${fileName}"`;
    if (resourceName) return `"${resourceName}"`;
    return `${resourceType}`;
  };

  // Helper to format field name
  const getFieldDisplay = (fieldName?: string) => {
    if (!fieldName) return '';
    
    // Convert camelCase to readable format
    const readable = fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    
    return readable;
  };
  
  switch (activity.action) {
    case 'created':
      if (resourceName || fileName) {
        return `${userName} created ${getResourceDisplay()}`;
      }
      return `${userName} created a ${resourceType}`;
      
    case 'updated':
      if (field && (resourceName || fileName)) {
        return `${userName} edited ${getFieldDisplay(field)} in ${getResourceDisplay()}`;
      } else if (field) {
        return `${userName} updated ${getFieldDisplay(field)}`;
      } else if (resourceName || fileName) {
        return `${userName} updated ${getResourceDisplay()}`;
      }
      return `${userName} updated a ${resourceType}`;
      
    case 'deleted':
      if (resourceName || fileName) {
        return `${userName} deleted ${getResourceDisplay()}`;
      }
      return `${userName} deleted a ${resourceType}`;
      
    case 'viewed':
      if (resourceName || fileName) {
        return `${userName} viewed ${getResourceDisplay()}`;
      }
      return `${userName} viewed ${resourceType}`;
      
    case 'invited_member':
      const invitedName = activity.details?.metadata?.memberName;
      if (invitedName) {
        return `${userName} invited ${invitedName} to the team`;
      }
      return `${userName} invited a team member`;
      
    case 'removed_member':
      const removedName = activity.details?.metadata?.memberName;
      if (removedName) {
        return `${userName} removed ${removedName} from the team`;
      }
      return `${userName} removed a team member`;
      
    case 'updated_role':
      const roleMemberName = activity.details?.metadata?.memberName;
      const newRole = activity.details?.newValue;
      if (roleMemberName && newRole) {
        return `${userName} changed ${roleMemberName}'s role to ${newRole}`;
      } else if (newRole) {
        return `${userName} updated a team member's role to ${newRole}`;
      }
      return `${userName} updated a team member's role`;
      
    case 'added_tech':
      const techName = activity.details?.metadata?.techName || activity.details?.newValue;
      if (techName) {
        return `${userName} added "${techName}" technology`;
      }
      return `${userName} added a technology`;
      
    case 'removed_tech':
      const removedTech = activity.details?.metadata?.techName || activity.details?.oldValue;
      if (removedTech) {
        return `${userName} removed "${removedTech}" technology`;
      }
      return `${userName} removed a technology`;
      
    case 'added_package':
      const packageName = activity.details?.metadata?.packageName || activity.details?.newValue;
      if (packageName) {
        return `${userName} added package "${packageName}"`;
      }
      return `${userName} added a package`;
      
    case 'removed_package':
      const removedPackage = activity.details?.metadata?.packageName || activity.details?.oldValue;
      if (removedPackage) {
        return `${userName} removed package "${removedPackage}"`;
      }
      return `${userName} removed a package`;
      
    case 'shared_project':
      return `${userName} made the project public`;
    case 'unshared_project':
      return `${userName} made the project private`;
    case 'archived_project':
      return `${userName} archived the project`;
    case 'unarchived_project':
      return `${userName} unarchived the project`;
    case 'joined_project':
      return `${userName} started working on the project`;
    case 'left_project':
      return `${userName} stopped working on the project`;
    case 'exported_data':
      const exportFormat = activity.details?.metadata?.format;
      if (exportFormat) {
        return `${userName} exported project data as ${exportFormat.toUpperCase()}`;
      }
      return `${userName} exported project data`;
    case 'imported_data':
      const importSource = activity.details?.metadata?.source;
      if (importSource) {
        return `${userName} imported data from ${importSource}`;
      }
      return `${userName} imported project data`;
    case 'cleared_activity_log':
      const deletedCount = activity.details?.metadata?.deletedCount;
      if (deletedCount) {
        return `${userName} cleared ${deletedCount} activity log entries`;
      }
      return `${userName} cleared the activity log`;
    default:
      return `${userName} performed ${activity.action} on ${getResourceDisplay()}`;
  }
};

// Helper function to get relative time
export const getRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  
  return time.toLocaleDateString();
};