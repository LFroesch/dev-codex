import React, { useState, useEffect } from 'react';
import { activityLogsAPI, ActivityLogEntry, formatActivityMessage, getRelativeTime } from '../api/activityLogs';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { csrfFetch } from '../utils/csrf';

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

  // Filter states
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedResourceType, setSelectedResourceType] = useState<string>(resourceType || 'all');
  const [showFilters, setShowFilters] = useState(false);

  const loadActivities = async (page: number = 1, append: boolean = false) => {
    try {
      setError(null);
      if (append) {
        setLoadingMore(true);
      }

      const offset = (page - 1) * limit;

      // Build filter options
      const filterOptions: any = {
        limit,
        offset,
        userId
      };

      // Apply resource type filter
      if (selectedResourceType !== 'all') {
        filterOptions.resourceType = selectedResourceType;
      } else if (resourceType && resourceType !== 'all') {
        filterOptions.resourceType = resourceType;
      }

      const response = await activityLogsAPI.getProjectActivities(projectId, filterOptions);

      // Apply client-side action filter
      let filteredActivities = response.activities;
      if (selectedAction !== 'all') {
        filteredActivities = response.activities.filter(activity => activity.action === selectedAction);
      }

      if (append) {
        setActivities(prev => [...prev, ...filteredActivities]);
      } else {
        setActivities(filteredActivities);
        setCurrentPage(page);
      }
      setTotal(selectedAction !== 'all' ? filteredActivities.length : response.total);
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
      const response = await csrfFetch(`/api/activity-logs/project/${projectId}/clear`, {
        method: 'DELETE',
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
  }, [projectId, userId, resourceType, limit, selectedAction, selectedResourceType]);

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
      case 'component':
        return '📚';
      case 'devlog':
        return '🐛';
      case 'link':
        return '🔗';
      case 'tech':
        return '⚡';
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
    <div className="space-y-3 max-w-full overflow-hidden">
      {showTitle && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h3 className="font-semibold text-base p-2">Recent Activity</h3>
            <div className="flex items-center flex-wrap gap-2 border-thick rounded-lg p-2">
              <span className="text-xs bg-success border-thick h-7 rounded-lg p-1 whitespace-nowrap" style={{ color: getContrastTextColor('success') }}>{total} Total</span>
              {autoRefresh && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-xs text-base-content/60">Live</span>
                </div>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn btn-xs h-7 border-thick ${showFilters ? 'bg-primary' : 'bg-base-content/20'}`}
                style={showFilters ? {color:getContrastTextColor('primary')} : {}}
                title="Toggle filters"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              <button
                onClick={() => loadActivities(1, false)}
                className="btn btn-xs h-7 border-thick bg-warning"
                style={{color:getContrastTextColor('warning')}}
                disabled={loading}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            {showClearButton && activities.length > 0 && (
              <>
                <button
                  onClick={handleClearActivities}
                  className={`btn btn-xs bg-error border-thick h-7 ${showClearConfirm ? 'btn-error' : 'btn-ghost'}`}
                  style={{color:getContrastTextColor('error')}}
                  disabled={clearing}
                >
                  {clearing ? (
                    <div className="loading loading-spinner loading-xs"></div>
                  ) : showClearConfirm ? (
                    'Confirm Clear'
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Clear</span>
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

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-base-200/50 p-4 rounded-lg border-thick space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Action Filter */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Action</span>
                  </label>
                  <select
                    className="select select-bordered select-sm"
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                  >
                    <option value="all">All Actions</option>
                    <option value="created">Created</option>
                    <option value="updated">Updated</option>
                    <option value="deleted">Deleted</option>
                    <option value="viewed">Viewed</option>
                    <option value="joined_project">Joined Project</option>
                    <option value="left_project">Left Project</option>
                    <option value="invited_member">Invited Member</option>
                    <option value="removed_member">Removed Member</option>
                    <option value="updated_role">Updated Role</option>
                    <option value="added_tech">Added Tech</option>
                    <option value="removed_tech">Removed Tech</option>
                    <option value="shared_project">Shared Project</option>
                    <option value="unshared_project">Unshared Project</option>
                    <option value="archived_project">Archived Project</option>
                    <option value="unarchived_project">Unarchived Project</option>
                  </select>
                </div>

                {/* Resource Type Filter */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Resource Type</span>
                  </label>
                  <select
                    className="select select-bordered select-sm"
                    value={selectedResourceType}
                    onChange={(e) => setSelectedResourceType(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="project">Project</option>
                    <option value="note">Note</option>
                    <option value="todo">Todo</option>
                    <option value="component">Component</option>
                    <option value="devlog">DevLog</option>
                    <option value="link">Link</option>
                    <option value="tech">Tech</option>
                    <option value="team">Team</option>
                    <option value="settings">Settings</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSelectedAction('all');
                    setSelectedResourceType(resourceType || 'all');
                  }}
                  className="btn btn-ghost btn-xs"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="space-y-1">
        {activities.map((activity) => (
          <div
            key={activity._id}
            className="p-3 bg-base-200/50 min-h-[70px] rounded-lg border-thick hover:bg-base-200/50 max-w-full"
          >
            {/* Mobile Layout: Vertical with badges at bottom corners */}
            <div className="flex sm:hidden flex-col">
              {/* Top: Main content */}
              <div className="flex-1 min-w-0 mb-3">
                <p className="text-xs text-base-content break-words">
                  {formatActivityMessage(activity)}
                </p>

                {activity.details?.field && (
                  <div className="mt-2 text-xs text-base-content/60">
                    <div className="font-medium mb-1">{activity.details?.field}:</div>
                    {(activity.details?.oldValue !== undefined || activity.details?.newValue !== undefined) && (
                      <div className="flex flex-col gap-1 items-start">
                        {activity.details?.oldValue !== undefined && (
                          <div className="line-through break-words">
                            "{formatFieldValue(activity.details?.field, activity.details?.oldValue).slice(0, 30)}"
                          </div>
                        )}
                        {activity.details?.oldValue !== undefined && activity.details?.newValue !== undefined && (
                          <div className="text-base-content/40">↓</div>
                        )}
                        {activity.details?.newValue !== undefined && (
                          <span className="inline-block text-base-content bg-success border-thick rounded p-1 break-words" style={{ color: getContrastTextColor('success') }}>
                            "{formatFieldValue(activity.details?.field, activity.details?.newValue).slice(0, 30)}"
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom: Resource type badge (left) and Date badge (right) */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex-shrink-0 flex items-center gap-1 border-thick rounded-lg p-2 bg-base-content/20 w-12 h-10 justify-center text-base">
                  {getActionIcon(activity.action)}
                  <span className="text-xs">{getResourceTypeIcon(activity.resourceType)}</span>
                </div>

                <div className="flex items-center border-thick rounded-lg p-1 bg-primary gap-2 font-semibold text-xs text-neutral-content flex-shrink-0">
                  <span title={new Date(activity.timestamp).toLocaleString()} className="whitespace-nowrap" style={{ color: getContrastTextColor('primary') }}>
                    {getRelativeTime(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Layout: Original horizontal layout */}
            <div className="hidden sm:flex gap-2 sm:gap-3 items-center">
              <div className="flex-shrink-0 flex items-center gap-1 border-thick rounded-lg p-2 bg-base-content/20 w-14 h-10 justify-center text-lg">
                {getActionIcon(activity.action)}
                <span className="text-xs">{getResourceTypeIcon(activity.resourceType)}</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-base-content break-words">
                  {formatActivityMessage(activity)}
                </p>

                {activity.details?.field && (
                  <div className="mt-1 text-xs text-base-content/60">
                    <span className="font-medium">{activity.details?.field}:</span>
                    {(activity.details?.oldValue !== undefined || activity.details?.newValue !== undefined) && (
                      <span className="ml-1">
                        {activity.details?.oldValue !== undefined && (
                          <span className="line-through">
                            "{formatFieldValue(activity.details?.field, activity.details?.oldValue).slice(0, 30)}"
                          </span>
                        )}
                        {activity.details?.oldValue !== undefined && activity.details?.newValue !== undefined && (
                          <span className='mx-1'> → </span>
                        )}
                        {activity.details?.newValue !== undefined && (
                          <span className="inline-block text-base-content bg-success border-thick rounded p-1" style={{ color: getContrastTextColor('success') }}>
                            "{formatFieldValue(activity.details?.field, activity.details?.newValue).slice(0, 30)}"
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center border-thick rounded-lg p-1 bg-primary gap-2 font-semibold text-sm text-neutral-content flex-shrink-0">
                <span title={new Date(activity.timestamp).toLocaleString()} className="whitespace-nowrap" style={{ color: getContrastTextColor('primary') }}>
                  {getRelativeTime(activity.timestamp)}
                </span>
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