import React, { useState, useEffect } from 'react';
import { activityLogsAPI, ActiveUser } from '../api/activityLogs';
import analyticsService from '../services/analytics';

interface CollaborationIndicatorProps {
  projectId?: string;
  currentUserId?: string;
  showInSessionTracker?: boolean;
  className?: string;
}

const CollaborationIndicator: React.FC<CollaborationIndicatorProps> = ({
  projectId,
  currentUserId,
  showInSessionTracker = false,
  className = ''
}) => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(false);

  const loadActiveUsers = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const response = await activityLogsAPI.getActiveUsers(projectId, 3); // Last 3 minutes
      
      // Filter out current user
      const filteredUsers = currentUserId
        ? response.activeUsers.filter(user => user.userId !== currentUserId)
        : response.activeUsers;
      
      setActiveUsers(filteredUsers);
    } catch (err) {
      console.error('Failed to load active users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadActiveUsers();
      
      // Refresh every 15 seconds
      const interval = setInterval(loadActiveUsers, 15000);
      return () => clearInterval(interval);
    } else {
      setActiveUsers([]);
    }
  }, [projectId, currentUserId]);

  // Auto-detect current project if not provided
  useEffect(() => {
    if (!projectId) {
      const currentProject = analyticsService.getCurrentProject();
      if (currentProject && currentProject !== projectId) {
        // This would trigger a re-render with the new projectId
        // The parent should manage this state
      }
    }
  }, [projectId]);

  if (!projectId || activeUsers.length === 0) {
    return null;
  }

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getStatusColor = (lastActivity: string): string => {
    const now = new Date();
    const activity = new Date(lastActivity);
    const diffInSeconds = Math.floor((now.getTime() - activity.getTime()) / 1000);

    if (diffInSeconds < 60) return 'ring-success'; // Active in last minute
    if (diffInSeconds < 180) return 'ring-warning'; // Recent in last 3 minutes
    return 'ring-base-content/30';
  };

  if (showInSessionTracker) {
    // Compact mode for session tracker
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="flex -space-x-1">
          {activeUsers.slice(0, 3).map((user) => (
            <div
              key={user.sessionId}
              className={`w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-secondary-content text-xs font-medium ring-2 ring-base-100 ${getStatusColor(user.lastActivity)}`}
              title={`${user.user.firstName} ${user.user.lastName} - Active now`}
            >
              {getInitials(user.user.firstName, user.user.lastName)}
            </div>
          ))}
        </div>
        {activeUsers.length > 3 && (
          <span className="text-xs text-base-content/60 ml-1">
            +{activeUsers.length - 3}
          </span>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
        </svg>
        <span className="text-sm font-medium">{activeUsers.length}</span>
      </div>

      <div className="flex -space-x-2">
        {activeUsers.slice(0, 4).map((user) => (
          <div
            key={user.sessionId}
            className={`w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content text-sm font-medium ring-2 ring-base-100 ${getStatusColor(user.lastActivity)}`}
            title={`${user.user.firstName} ${user.user.lastName} - ${user.currentPage ? `viewing ${user.currentPage}` : 'active now'}`}
          >
            {getInitials(user.user.firstName, user.user.lastName)}
          </div>
        ))}
      </div>

      {activeUsers.length > 4 && (
        <span className="text-xs text-base-content/60">
          +{activeUsers.length - 4} more
        </span>
      )}

      {loading && (
        <div className="loading loading-spinner loading-sm opacity-50"></div>
      )}
    </div>
  );
};

export default CollaborationIndicator;