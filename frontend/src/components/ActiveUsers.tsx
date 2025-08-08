import React, { useState, useEffect } from 'react';
import { activityLogsAPI, ActiveUser } from '../api/activityLogs';

interface ActiveUsersProps {
  projectId: string;
  currentUserId?: string;
  showTitle?: boolean;
  refreshInterval?: number;
  showDetails?: boolean;
}

const ActiveUsers: React.FC<ActiveUsersProps> = ({
  projectId,
  currentUserId,
  showTitle = true,
  refreshInterval = 5000, // 5 seconds for more responsive feel
  showDetails = false
}) => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActiveUsers = async () => {
    try {
      setError(null);
      const response = await activityLogsAPI.getActiveUsers(projectId, 3); // Consider active if seen in last 3 minutes
      
      // Filter out current user if specified
      const filteredUsers = currentUserId
        ? response.activeUsers.filter(user => user.userId !== currentUserId)
        : response.activeUsers;
      
      setActiveUsers(filteredUsers);
    } catch (err) {
      console.error('Failed to load active users:', err);
      setError('Failed to load active users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveUsers();
    
    const interval = setInterval(loadActiveUsers, refreshInterval);
    return () => clearInterval(interval);
  }, [projectId, currentUserId, refreshInterval]);

  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  const getLastSeenText = (lastActivity: string): string => {
    const now = new Date();
    const activity = new Date(lastActivity);
    const diffInSeconds = Math.floor((now.getTime() - activity.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Active now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 3) {
      return `${diffInMinutes}m ago`;
    }
    
    return 'Recently active';
  };

  const getActivityStatus = (user: ActiveUser): 'active' | 'recent' | 'away' => {
    const now = new Date();
    const lastActivity = new Date(user.lastActivity);
    const diffInSeconds = Math.floor((now.getTime() - lastActivity.getTime()) / 1000);

    if (diffInSeconds < 60) return 'active'; // Active in last minute
    if (diffInSeconds < 180) return 'recent'; // Recent in last 3 minutes
    return 'away';
  };

  const getStatusColor = (status: 'active' | 'recent' | 'away'): string => {
    switch (status) {
      case 'active':
        return 'bg-success';
      case 'recent':
        return 'bg-warning';
      case 'away':
        return 'bg-base-content/30';
    }
  };

  const getStatusText = (status: 'active' | 'recent' | 'away'): string => {
    switch (status) {
      case 'active':
        return 'Active now';
      case 'recent':
        return 'Recently active';
      case 'away':
        return 'Away';
    }
  };

  if (loading && activeUsers.length === 0) {
    return showTitle ? (
      <div className="flex items-center gap-2">
        <div className="loading loading-spinner loading-sm"></div>
        <span className="text-sm text-base-content/60">Loading...</span>
      </div>
    ) : null;
  }

  if (error) {
    return showTitle ? (
      <div className="text-sm text-error">
        {error}
      </div>
    ) : null;
  }

  if (activeUsers.length === 0) {
    return showTitle ? (
      <div className="text-sm text-base-content/60">
        No other active users
      </div>
    ) : null;
  }

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Active Team Members</h3>
          <span className="text-xs text-base-content/60">
            {activeUsers.length} active
          </span>
        </div>
      )}

      <div className="space-y-2">
        {activeUsers.map((user) => {
          const status = getActivityStatus(user);
          const statusColor = getStatusColor(status);
          
          return (
            <div
              key={user.sessionId}
              className="flex items-center gap-3 p-2 bg-base-100 rounded-lg border border-base-content/5"
            >
              {/* Status indicator */}
              <div className="flex-shrink-0 relative">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-content text-sm font-medium">
                  {user.user.firstName.charAt(0)}{user.user.lastName.charAt(0)}
                </div>
                <div 
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-base-100 ${statusColor}`}
                  title={getStatusText(status)}
                >
                  {status === 'active' && (
                    <div className={`w-full h-full rounded-full ${statusColor} animate-pulse`}></div>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {user.user.firstName} {user.user.lastName}
                    </p>
                    {showDetails && (
                      <p className="text-xs text-base-content/60">
                        {user.currentPage ? `Viewing ${user.currentPage}` : 'In project'}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-base-content/60">
                      {getLastSeenText(user.lastActivity)}
                    </p>
                    {showDetails && user.duration > 0 && (
                      <p className="text-xs text-base-content/40">
                        {formatDuration(user.duration)} session
                      </p>
                    )}
                  </div>
                </div>

                {showDetails && user.isVisible !== undefined && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${user.isVisible ? 'bg-success' : 'bg-base-content/30'}`}></div>
                    <span className="text-xs text-base-content/50">
                      {user.isVisible ? 'Tab visible' : 'Tab hidden'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveUsers;