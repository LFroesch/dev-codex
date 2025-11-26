import React, { useState, useEffect } from 'react';
import { getContrastTextColor } from '../../../utils/contrastTextColor';

interface ActivityFeedItem {
  type: 'analytics' | 'activity';
  timestamp: string;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  // Analytics fields
  eventType?: string;
  category?: string;
  data?: any;
  // Activity fields
  action?: string;
  resourceType?: string;
  project?: {
    _id: string;
    name: string;
  };
  details?: any;
}

const AdminActivityFeed: React.FC = () => {
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hours, setHours] = useState(24);
  const [limit, setLimit] = useState(50);
  const [period, setPeriod] = useState('');

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'analytics' | 'activity'>('all');
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterResourceType, setFilterResourceType] = useState<string>('all');
  const [filterUserEmail, setFilterUserEmail] = useState<string>('');
  const [debouncedUserEmail, setDebouncedUserEmail] = useState<string>('');

  const fetchActivityFeed = async () => {
    try {
      // Only show full loading on initial mount
      if (feed.length === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const response = await fetch(`/api/admin/activity/feed?hours=${hours}&limit=${limit}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activity feed');
      }

      const data = await response.json();

      // Apply client-side filters
      let filteredFeed = data.feed || [];

      // Filter by type (analytics vs activity)
      if (filterType !== 'all') {
        filteredFeed = filteredFeed.filter((item: ActivityFeedItem) => item.type === filterType);
      }

      // Filter by event type (for analytics)
      if (filterEventType !== 'all') {
        filteredFeed = filteredFeed.filter((item: ActivityFeedItem) =>
          item.type === 'analytics' && item.eventType === filterEventType
        );
      }

      // Filter by action (for activity logs)
      if (filterAction !== 'all') {
        filteredFeed = filteredFeed.filter((item: ActivityFeedItem) =>
          item.type === 'activity' && item.action === filterAction
        );
      }

      // Filter by resource type (for activity logs)
      if (filterResourceType !== 'all') {
        filteredFeed = filteredFeed.filter((item: ActivityFeedItem) =>
          item.type === 'activity' && item.resourceType === filterResourceType
        );
      }

      // Filter by user email (using debounced value)
      if (debouncedUserEmail.trim()) {
        const searchTerm = debouncedUserEmail.toLowerCase();
        filteredFeed = filteredFeed.filter((item: ActivityFeedItem) => {
          if (!item.user) return false;
          return (
            (item.user.email?.toLowerCase().includes(searchTerm)) ||
            (item.user.firstName?.toLowerCase().includes(searchTerm)) ||
            (item.user.lastName?.toLowerCase().includes(searchTerm))
          );
        });
      }

      setFeed(filteredFeed);
      setPeriod(data.period || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Debounce user email search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserEmail(filterUserEmail);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [filterUserEmail]);

  useEffect(() => {
    fetchActivityFeed();
  }, [hours, limit, filterType, filterEventType, filterAction, filterResourceType, debouncedUserEmail]);

  const getActivityIcon = (item: ActivityFeedItem) => {
    if (item.type === 'analytics') {
      switch (item.eventType) {
        case 'user_signup':
          return <span className="text-success">👤+</span>;
        case 'user_upgraded':
          return <span className="text-primary">⬆</span>;
        case 'user_downgraded':
          return <span className="text-warning">⬇</span>;
        case 'project_created':
          return <span className="text-info">📁+</span>;
        case 'error_occurred':
          return <span className="text-error">⚠️</span>;
        default:
          return <span className="text-base-content/40">📊</span>;
      }
    } else {
      // Activity log
      switch (item.action) {
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
        case 'joined_project':
          return <span className="text-success">→</span>;
        case 'left_project':
          return <span className="text-base-content/60">←</span>;
        default:
          return <span className="text-base-content/40">•</span>;
      }
    }
  };

  const getResourceTypeIcon = (resourceType?: string) => {
    if (!resourceType) return '';

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

  const formatActivityMessage = (item: ActivityFeedItem) => {
    const userName = item.user
      ? `${item.user.firstName} ${item.user.lastName}`
      : 'Unknown user';

    if (item.type === 'analytics') {
      switch (item.eventType) {
        case 'user_signup':
          return `${userName} signed up`;
        case 'user_upgraded':
          return `${userName} upgraded to ${item.data?.newPlan || 'premium'}`;
        case 'user_downgraded':
          return `${userName} downgraded to ${item.data?.newPlan || 'free'}`;
        case 'project_created':
          return `${userName} created a project`;
        case 'error_occurred':
          return `Error: ${item.data?.message || 'Unknown error'}`;
        default:
          return `${userName} - ${item.eventType}`;
      }
    } else {
      // Activity log
      const projectName = item.project?.name || 'Unknown project';
      const action = item.action || 'performed action';
      const resourceType = item.resourceType || 'resource';

      return `${userName} ${action} ${resourceType} in ${projectName}`;
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const getItemBadgeColor = (item: ActivityFeedItem) => {
    if (item.type === 'analytics') {
      switch (item.eventType) {
        case 'user_signup':
          return 'badge-success';
        case 'user_upgraded':
          return 'badge-primary';
        case 'user_downgraded':
          return 'badge-warning';
        case 'project_created':
          return 'badge-info';
        case 'error_occurred':
          return 'badge-error';
        default:
          return 'badge-ghost';
      }
    } else {
      switch (item.action) {
        case 'created':
          return 'badge-success';
        case 'updated':
          return 'badge-warning';
        case 'deleted':
          return 'badge-error';
        default:
          return 'badge-ghost';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-2 text-lg">Loading activity feed...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <span>{error}</span>
        <button onClick={fetchActivityFeed} className="btn btn-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-base-100 p-4 rounded-lg border-2 border-base-content/20">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Activity Feed</h2>
          {period && (
            <span className="badge badge-neutral h-6 px-3 py-1 font-bold text-sm">{period}</span>
          )}
          <span className="text-sm text-base-content/60">{feed.length} events</span>
          {refreshing && (
            <div className="flex items-center gap-1">
              <div className="loading loading-spinner loading-xs"></div>
              <span className="text-xs text-base-content/50">Updating...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-xs">Time Range</span>
            </label>
            <select
              className="select select-bordered select-sm"
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value))}
            >
              <option value={1}>Last 1 hour</option>
              <option value={6}>Last 6 hours</option>
              <option value={12}>Last 12 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={48}>Last 2 days</option>
              <option value={168}>Last 7 days</option>
              <option value={720}>Last 30 days</option>
              <option value={2160}>Last 90 days</option>
              <option value={4380}>Last 6 months</option>
              <option value={8760}>Last 1 year</option>
              <option value={99999}>All Time</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-xs">Limit</span>
            </label>
            <select
              className="select select-bordered select-sm"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-sm mt-6 ${showFilters ? 'btn-primary' : 'btn-ghost'}`}
            style={showFilters ? { color: getContrastTextColor('primary') } : {}}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>

          <button
            onClick={fetchActivityFeed}
            className="btn btn-sm btn-primary mt-6"
            style={{ color: getContrastTextColor('primary') }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-base-100 p-4 rounded-lg border-2 border-base-content/20 space-y-4">
          <h3 className="font-semibold text-lg">Filters</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Type Filter */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Type</span>
              </label>
              <select
                className="select select-bordered select-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'analytics' | 'activity')}
              >
                <option value="all">All Types</option>
                <option value="analytics">Analytics Events</option>
                <option value="activity">Activity Logs</option>
              </select>
            </div>

            {/* User Email Search */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">User Search</span>
              </label>
              <input
                type="text"
                placeholder="Search by name or email..."
                className="input input-bordered input-sm"
                value={filterUserEmail}
                onChange={(e) => setFilterUserEmail(e.target.value)}
              />
            </div>

            {/* Event Type Filter (for analytics) */}
            {(filterType === 'all' || filterType === 'analytics') && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Event Type</span>
                </label>
                <select
                  className="select select-bordered select-sm"
                  value={filterEventType}
                  onChange={(e) => setFilterEventType(e.target.value)}
                >
                  <option value="all">All Events</option>
                  <option value="user_signup">User Signup</option>
                  <option value="user_upgraded">User Upgraded</option>
                  <option value="user_downgraded">User Downgraded</option>
                  <option value="project_created">Project Created</option>
                  <option value="error_occurred">Error Occurred</option>
                </select>
              </div>
            )}

            {/* Action Filter (for activity logs) */}
            {(filterType === 'all' || filterType === 'activity') && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Action</span>
                </label>
                <select
                  className="select select-bordered select-sm"
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
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
                </select>
              </div>
            )}

            {/* Resource Type Filter (for activity logs) */}
            {(filterType === 'all' || filterType === 'activity') && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Resource Type</span>
                </label>
                <select
                  className="select select-bordered select-sm"
                  value={filterResourceType}
                  onChange={(e) => setFilterResourceType(e.target.value)}
                >
                  <option value="all">All Resources</option>
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
            )}
          </div>

          {/* Clear Filters Button */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setFilterType('all');
                setFilterEventType('all');
                setFilterAction('all');
                setFilterResourceType('all');
                setFilterUserEmail('');
              }}
              className="btn btn-ghost btn-sm"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Feed */}
      {feed.length === 0 ? (
        <div className="text-center p-12 bg-base-100 rounded-lg border-2 border-base-content/20">
          <div className="text-4xl mb-4">📜</div>
          <p className="text-lg text-base-content/60">No activity in the selected time range</p>
          <p className="text-sm text-base-content/40 mt-2">Try expanding the time range or adjusting the limit</p>
        </div>
      ) : (
        <div className="space-y-2">
          {feed.map((item, index) => (
            <div
              key={index}
              className="flex gap-3 p-4 bg-base-100 rounded-lg border-2 border-base-content/20 hover:bg-base-200/50 transition-colors"
            >
              {/* Icon */}
              <div className="flex-shrink-0 flex items-center gap-1 border-2 border-base-content/20 rounded-lg p-2 bg-base-content/10 w-16 h-12 justify-center text-lg">
                {getActivityIcon(item)}
                {item.resourceType && (
                  <span className="text-xs">{getResourceTypeIcon(item.resourceType)}</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm text-base-content">
                      {formatActivityMessage(item)}
                    </p>

                    {/* User email for context */}
                    {item.user && (
                      <p className="text-xs text-base-content/50 mt-1">
                        {item.user.email}
                      </p>
                    )}

                    {/* Additional details */}
                    {item.type === 'activity' && item.details?.field && (
                      <div className="mt-1 text-xs text-base-content/60">
                        <span className="font-medium">{item.details.field}:</span>
                        {item.details.oldValue && (
                          <span className="ml-1 line-through">"{String(item.details.oldValue).slice(0, 30)}"</span>
                        )}
                        {item.details.oldValue && item.details.newValue && (
                          <span className="mx-1">→</span>
                        )}
                        {item.details.newValue && (
                          <span className="text-success">"{String(item.details.newValue).slice(0, 30)}"</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Type badge and time */}
                  <div className="flex items-center gap-2">
                    <span className={`badge ${getItemBadgeColor(item)} h-5 px-2 py-0.5 font-bold text-xs`}>
                      {item.type === 'analytics' ? item.eventType : item.action}
                    </span>
                    <span
                      className="text-xs bg-primary border-2 border-base-content/20 rounded-lg px-2 py-1 whitespace-nowrap"
                      style={{ color: getContrastTextColor('primary') }}
                      title={new Date(item.timestamp).toLocaleString()}
                    >
                      {getRelativeTime(item.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminActivityFeed;
