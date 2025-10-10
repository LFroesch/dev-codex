import React, { useState, useEffect } from 'react';
import { activityLogsAPI, ActivityLogEntry, formatActivityMessage, getRelativeTime } from '../api/activityLogs';
import { getContrastTextColor } from '../utils/contrastTextColor';

interface ActivityLogProps {
  projectId: string;
  userId?: string;
  resourceType?: string;
  showTitle?: boolean;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showClearButton?: boolean;
}

const ActivityLog: React.FC<ActivityLogProps> = ({
  projectId,
  userId,
  resourceType,
  showTitle = true,
  limit = 20,
  autoRefresh = false,
  refreshInterval = 30000, // 30 seconds
  showClearButton = true
}) => {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadActivities = async (page: number = 1, append: boolean = false) => {
    try {
      setError(null);
      if (append) {
        setLoadingMore(true);
      }
      
      const offset = (page - 1) * limit;
      const response = await activityLogsAPI.getProjectActivities(projectId, {
        limit,
        offset,
        userId,
        resourceType
      });
      
      if (append) {
        setActivities(prev => [...prev, ...response.activities]);
      } else {
        setActivities(response.activities);
        setCurrentPage(page);
      }
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to load activities:', err);
      setError('Failed to load activity logs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreActivities = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadActivities(nextPage, true);
  };

  // Helper function to format field values for display
  const formatFieldValue = (field: string, value: any): string => {
    if (value === null || value === undefined || value === '') {
      return 'empty';
    }

    // Handle different field types
    switch (field) {
      case 'dueDate':
      case 'reminderDate':
        try {
          return new Date(value).toLocaleDateString() + ' ' + new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
          return String(value);
        }
      
      case 'assignedTo':
        // If it's an ObjectId string, we might not have the user details, just show the ID
        if (typeof value === 'string' && value.length === 24) {
          return `User (${value.slice(-6)})`;
        }
        // Otherwise it should be a user name from the backend
        return String(value);
      
      case 'completed':
        return value ? 'completed' : 'not completed';
      
      case 'status':
        return String(value).replace('_', ' ');
      
      case 'priority':
        return String(value);
      
      case 'tags':
        if (Array.isArray(value)) {
          return value.join(', ') || 'none';
        }
        return String(value);
      
      default:
        return String(value);
    }
  };

  const handleClearActivities = async () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }

    setClearing(true);
    try {
      const response = await fetch(`/api/activity-logs/project/${projectId}/clear`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setActivities([]);
        setTotal(0);
        setCurrentPage(1);
        setShowClearConfirm(false);
      } else {
        throw new Error('Failed to clear activities');
      }
    } catch (err) {
      console.error('Failed to clear activities:', err);
      setError('Failed to clear activity logs');
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadActivities(1, false);
  }, [projectId, userId, resourceType, limit]);

  useEffect(() => {
    if (autoRefresh && !loading) {
      const interval = setInterval(() => loadActivities(1, false), refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, loading]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <span className="text-success">+</span>;
      case 'updated':
        return <span className="text-warning">✎</span>;
      case 'deleted':
        return <span className="text-error">✕</span>;
      case 'viewed':
        return <span className="text-info">👁</span>;
      case 'invited_member':
      case 'removed_member':
      case 'updated_role':
        return <span className="text-primary">👥</span>;
      case 'added_tech':
      case 'removed_tech':
      case 'added_package':
      case 'removed_package':
        return <span className="text-secondary">⚡</span>;
      case 'shared_project':
      case 'unshared_project':
        return <span className="text-accent">🔗</span>;
      case 'archived_project':
      case 'unarchived_project':
        return <span className="text-base-content/60">📦</span>;
      case 'joined_project':
        return <span className="text-success">→</span>;
      case 'left_project':
        return <span className="text-base-content/60">←</span>;
      default:
        return <span className="text-base-content/40">•</span>;
    }
  };

  const getResourceTypeIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'project':
        return '📁';
      case 'note':
        return '📝';
      case 'todo':
        return '✓';
      case 'doc':
        return '📚';
      case 'devlog':
        return '🐛';
      case 'link':
        return '🔗';
      case 'tech':
        return '⚡';
      case 'package':
        return '📦';
      case 'team':
        return '👥';
      case 'settings':
        return '⚙️';
      default:
        return '•';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="loading loading-spinner loading-sm"></div>
        <span className="ml-2 text-sm text-base-content/60">Loading activities...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <span>{error}</span>
        <button onClick={() => loadActivities(1, false)} className="btn btn-ghost btn-sm">
          Retry
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center p-6">
        <div className="text-4xl mb-2">📜</div>
        <p className="text-base-content/60">No activity yet</p>
        <p className="text-sm text-base-content/40">Activity will appear here as team members work on the project</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-xl p-2">Recent Activity</h3>
          <div className="flex items-center gap-2 border-thick rounded-lg p-2">
            <span className="text-xs bg-success border-thick h-7 rounded-lg p-1" style={{ color: getContrastTextColor('success') }}>{total} Total</span>
            {autoRefresh && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-xs text-base-content/60">Live</span>
              </div>
            )}
            <button
              onClick={() => loadActivities(1, false)}
              className="btn btn-xs h-7 border-thick bg-warning"
              disabled={loading}
            >
              <svg className="w-3 h-3" fill="none" stroke={getContrastTextColor('warning')} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {showClearButton && activities.length > 0 && (
              <>
                <button
                  onClick={handleClearActivities}
                  className={`btn btn-xs bg-error border-thick h-7 ${showClearConfirm ? 'btn-error' : 'btn-ghost'}`}
                  disabled={clearing}
                >
                  {clearing ? (
                    <div className="loading loading-spinner loading-xs"></div>
                  ) : showClearConfirm ? (
                    'Confirm Clear'
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke={getContrastTextColor('error')} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span style={{ color: getContrastTextColor('error') }}>Clear</span>
                    </>
                  )}
                </button>
                {showClearConfirm && (
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="btn btn-ghost btn-xs"
                    disabled={clearing}
                  >
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-1">
        {activities.map((activity) => (
          <div
            key={activity._id}
            className="flex gap-3 p-3 bg-base-200/50 min-h-[70px] rounded-lg border-thick hover:bg-base-200/50 items-center"
          >
            <div className="flex-shrink-0 flex items-center gap-1 border-thick rounded-lg p-2 bg-base-content/20 w-14 h-10 justify-center text-lg">
              {getActionIcon(activity.action)}
              <span className="text-xs">{getResourceTypeIcon(activity.resourceType)}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 flex flex-col justify-center">
                  <p className="text-sm text-base-content">
                    {formatActivityMessage(activity)}
                  </p>
                  
                  {activity.details?.field && (
                    <div className="mt-1 text-xs text-base-content/60">
                      <span className="font-medium">{activity.details?.field}:</span>
                      {(activity.details?.oldValue !== undefined || activity.details?.newValue !== undefined) && (
                        <span className="ml-1">
                          {activity.details?.oldValue !== undefined && (
                            <span className="line-through">
                              "{formatFieldValue(activity.details?.field, activity.details?.oldValue).slice(0, 40)}"
                            </span>
                          )}
                          {activity.details?.oldValue !== undefined && activity.details?.newValue !== undefined && (
                            <span className='m-1'> → </span>
                          )}
                          {activity.details?.newValue !== undefined && (
                            <span className="text-base-content bg-success border-thick rounded p-1" style={{ color: getContrastTextColor('success') }}>
                              "{formatFieldValue(activity.details?.field, activity.details?.newValue).slice(0, 40)}"
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center border-thick rounded-lg p-1 bg-primary gap-2 font-semibold text-sm text-neutral-content">
                  <span title={new Date(activity.timestamp).toLocaleString()} style={{ color: getContrastTextColor('primary') }}>
                    {getRelativeTime(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More / Pagination */}
      {activities.length < total && (
        <div className="text-center pt-4">
          <button
            onClick={loadMoreActivities}
            className="btn btn-ghost btn-sm"
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <div className="loading loading-spinner loading-xs mr-2"></div>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Load More ({total - activities.length} remaining)
              </>
            )}
          </button>
          <div className="text-xs text-base-content/60 mt-2">
            Showing {activities.length} of {total} activities
          </div>
        </div>
      )}

      {activities.length === total && total > limit && (
        <div className="text-center pt-2">
          <div className="text-xs text-base-content/60">
            All {total} activities loaded
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;