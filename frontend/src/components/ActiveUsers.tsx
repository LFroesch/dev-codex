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
  refreshInterval = 5000 // 5 seconds for more responsive feel
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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="card-title text-base">Currently Online</h3>
            <span className="badge badge-success border-thick h-6 text-sm font-semibold badge-sm">{activeUsers.length}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {activeUsers.map((user) => {
          const status = getActivityStatus(user);
          const statusColor = getStatusColor(status);
          
          return (
            <div
              key={user.sessionId}
              className="bg-base-200/50 border-thick rounded-lg p-3"
            >
              <div className="flex items-center gap-2">
                {/* Status indicator */}
                <div className="flex-shrink-0 relative">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-content text-xs font-medium">
                    {user.user.firstName.charAt(0)}{user.user.lastName.charAt(0)}
                  </div>
                  <div 
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-base-200 ${statusColor}`}
                    title={getStatusText(status)}
                  >
                    {status === 'active' && (
                      <div className={`w-full h-full rounded-full ${statusColor} animate-pulse`}></div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="ml-2.5 font-medium text-sm truncate">
                        {user.user.firstName} {user.user.lastName}
                      </h4>
                    </div>
                    
                    <div className="text-right">
                      <span className={`badge badge-xs h-6 border-thick font-semibold ${status === 'active' ? 'badge-success' : status === 'recent' ? 'badge-warning' : 'badge-ghost'}`}>
                        {status === 'active' ? 'Active' : status === 'recent' ? 'Recent' : 'Away'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveUsers;