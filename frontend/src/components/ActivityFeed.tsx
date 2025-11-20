import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/base';
import LikeButton from './LikeButton';

// Helper function to format relative time
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

interface ActivityItem {
  _id: string;
  type: 'project_activity' | 'comment' | 'favorite' | 'user_post' | 'project_update';
  action: string;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  linkedProjectId?: any;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    username?: string;
    displayPreference?: 'name' | 'username';
  };
  content?: string;
  timestamp: string;
  resourceType?: string;
  details?: any;
}

interface GroupedActivity {
  _id: string;
  type: 'project_activity' | 'comment' | 'favorite' | 'user_post' | 'project_update';
  action: string;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  linkedProjectId?: any;
  users: Array<{
    firstName: string;
    lastName: string;
    email: string;
    username?: string;
    displayPreference?: 'name' | 'username';
  }>;
  content?: string;
  timestamp: string;
  resourceType?: string;
  details?: any;
  count: number;
  activities: ActivityItem[];
}

interface ActivityFeedProps {
  projectId?: string;
  userId?: string;
  limit?: number;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ projectId, userId, limit = 50 }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'posts' | 'projects' | 'comments' | 'favorites'>('all');

  useEffect(() => {
    fetchActivities();
  }, [projectId, userId, limit]);

  const fetchActivities = async () => {
    try {
      setLoading(true);

      // If no specific filters, fetch personalized feed
      if (!projectId && !userId) {
        // Fetch multiple sources in parallel
        const [postsResponse, commentsResponse, favoritesResponse] = await Promise.allSettled([
          apiClient.get('/posts/feed', { params: { limit, page: 1 } }),
          apiClient.get('/comments/my-projects', { params: { limit: 20 } }),
          apiClient.get('/favorites/my-projects', { params: { limit: 20 } })
        ]);

        const allActivities: ActivityItem[] = [];

        // Add posts
        if (postsResponse.status === 'fulfilled' && postsResponse.value.data.success) {
          const posts = postsResponse.value.data.posts || [];
          posts.forEach((post: any) => {
            allActivities.push({
              _id: post._id,
              type: post.postType === 'project' ? 'project_update' : 'user_post',
              action: post.postType === 'project' ? 'posted_update' : 'shared_post',
              projectId: post.projectId?._id,
              projectName: post.projectId?.name,
              projectColor: post.projectId?.color,
              linkedProjectId: post.linkedProjectId,
              user: post.userId,
              content: post.content,
              timestamp: post.createdAt,
              resourceType: 'post',
              details: {
                isEdited: post.isEdited,
                likes: post.likes
              }
            });
          });
        }

        // Add comments on user's projects
        if (commentsResponse.status === 'fulfilled' && commentsResponse.value.data.success) {
          const comments = commentsResponse.value.data.comments || [];
          comments.forEach((comment: any) => {
            allActivities.push({
              _id: comment._id,
              type: 'comment',
              action: 'commented',
              projectId: comment.projectId?._id || comment.projectId,
              projectName: comment.projectId?.name,
              projectColor: comment.projectId?.color,
              user: comment.userId,
              content: comment.content,
              timestamp: comment.createdAt,
              resourceType: 'comment',
              details: {}
            });
          });
        }

        // Add favorites on user's projects
        if (favoritesResponse.status === 'fulfilled' && favoritesResponse.value.data.success) {
          const favorites = favoritesResponse.value.data.favorites || [];
          favorites.forEach((favorite: any) => {
            allActivities.push({
              _id: favorite._id,
              type: 'favorite',
              action: 'favorited',
              projectId: favorite.projectId?._id || favorite.projectId,
              projectName: favorite.projectId?.name,
              projectColor: favorite.projectId?.color,
              user: favorite.userId,
              timestamp: favorite.createdAt,
              resourceType: 'favorite',
              details: {}
            });
          });
        }

        // Sort by timestamp
        allActivities.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setActivities(allActivities.slice(0, limit));
      } else {
        // Fetch project or user-specific activities
        const activityPromises = [];

        if (projectId) {
          activityPromises.push(
            apiClient.get(`/activity-logs/project/${projectId}`, {
              params: { limit }
            })
          );
        } else if (userId) {
          activityPromises.push(
            apiClient.get(`/activity-logs/user/${userId}`, {
              params: { limit }
            })
          );
        }

        const results = await Promise.allSettled(activityPromises);
        const allActivities: ActivityItem[] = [];

        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.data.success) {
            const items = result.value.data.activities || [];
            items.forEach((item: any) => {
              allActivities.push({
                _id: item._id,
                type: 'project_activity',
                action: item.action,
                projectId: item.projectId,
                projectName: item.details?.projectName,
                projectColor: item.details?.projectColor,
                user: item.user,
                timestamp: item.timestamp,
                resourceType: item.resourceType,
                details: item.details
              });
            });
          }
        });

        allActivities.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setActivities(allActivities.slice(0, limit));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'comment':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'favorite':
        return (
          <svg className="w-5 h-5" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        );
      default:
        // Project activity icons based on action
        if (activity.action.includes('created')) {
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          );
        } else if (activity.action.includes('updated') || activity.action.includes('edited')) {
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          );
        } else if (activity.action.includes('deleted') || activity.action.includes('removed')) {
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          );
        } else if (activity.action.includes('completed')) {
          return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        }
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
  };

  const getActivityColor = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'comment':
        return 'text-info';
      case 'favorite':
        return 'text-warning';
      default:
        if (activity.action.includes('created')) return 'text-success';
        if (activity.action.includes('deleted')) return 'text-error';
        if (activity.action.includes('completed')) return 'text-success';
        return 'text-primary';
    }
  };

  const getDisplayName = (user: any) => {
    if (!user) return 'Someone';
    if (user.displayPreference === 'username') {
      return `@${user.username}`;
    }
    return `${user.firstName} ${user.lastName}`;
  };

  const getGroupedActivityDescription = (activity: GroupedActivity): JSX.Element => {
    const projectName = activity.projectName || 'a project';
    const hasProject = activity.projectId && activity.projectName;
    const users = activity.users;
    const count = activity.count;

    const ProjectLink = ({ children }: { children: React.ReactNode }) =>
      hasProject ? (
        <span
          className="font-semibold text-secondary hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/discover/project/${activity.projectId}`;
          }}
        >
          {children}
        </span>
      ) : (
        <span>{children}</span>
      );

    const UserLink = ({ user, children }: { user: any; children: React.ReactNode }) => {
      const userSlug = user?.publicSlug || user?.username || user?._id;
      const isPublicUser = user?.isPublic || user?.publicSlug;
      return isPublicUser ? (
        <span
          className="font-semibold text-primary hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/discover/user/${userSlug}`;
          }}
        >
          {children}
        </span>
      ) : (
        <span className="font-semibold">{children}</span>
      );
    };

    const renderUserList = () => {
      if (users.length === 1) {
        const userName = getDisplayName(users[0]);
        return <UserLink user={users[0]}>{userName}</UserLink>;
      } else if (users.length === 2) {
        return (
          <>
            <UserLink user={users[0]}>{getDisplayName(users[0])}</UserLink> and <UserLink user={users[1]}>{getDisplayName(users[1])}</UserLink>
          </>
        );
      } else if (users.length === 3) {
        return (
          <>
            <UserLink user={users[0]}>{getDisplayName(users[0])}</UserLink>, <UserLink user={users[1]}>{getDisplayName(users[1])}</UserLink>, and <UserLink user={users[2]}>{getDisplayName(users[2])}</UserLink>
          </>
        );
      } else {
        return (
          <>
            <UserLink user={users[0]}>{getDisplayName(users[0])}</UserLink>, <UserLink user={users[1]}>{getDisplayName(users[1])}</UserLink>, and {users.length - 2} {users.length - 2 === 1 ? 'other' : 'others'}
          </>
        );
      }
    };

    switch (activity.type) {
      case 'comment':
        return (
          <>
            {renderUserList()} {count > 1 ? `commented (${count} comments)` : 'commented'} on <ProjectLink>{projectName}</ProjectLink>
          </>
        );
      case 'favorite':
        return (
          <>
            {renderUserList()} favorited <ProjectLink>{projectName}</ProjectLink>
          </>
        );
      case 'user_post':
        return (
          <>
            {renderUserList()} shared a post
          </>
        );
      case 'project_update':
        return (
          <>
            {renderUserList()} posted an update to <ProjectLink>{projectName}</ProjectLink>
          </>
        );
      default:
        return (
          <>
            {renderUserList()} {activity.action.replace(/_/g, ' ')}
          </>
        );
    }
  };

  // Group activities by type and project/context within same day
  const groupActivities = (activities: ActivityItem[]): GroupedActivity[] => {
    const groups: { [key: string]: GroupedActivity } = {};

    activities.forEach(activity => {
      // Only group comments and favorites on same project
      if ((activity.type === 'comment' || activity.type === 'favorite') && activity.projectId) {
        const date = new Date(activity.timestamp).toDateString();
        const groupKey = `${activity.type}-${activity.projectId}-${date}`;

        if (groups[groupKey]) {
          groups[groupKey].users.push(activity.user!);
          groups[groupKey].count++;
          groups[groupKey].activities.push(activity);
          // Keep the most recent timestamp
          if (new Date(activity.timestamp) > new Date(groups[groupKey].timestamp)) {
            groups[groupKey].timestamp = activity.timestamp;
          }
        } else {
          groups[groupKey] = {
            _id: activity._id,
            type: activity.type,
            action: activity.action,
            projectId: activity.projectId,
            projectName: activity.projectName,
            projectColor: activity.projectColor,
            linkedProjectId: activity.linkedProjectId,
            users: [activity.user!],
            content: activity.content,
            timestamp: activity.timestamp,
            resourceType: activity.resourceType,
            details: activity.details,
            count: 1,
            activities: [activity]
          };
        }
      } else {
        // Don't group posts or project updates - show them individually
        const uniqueKey = `${activity.type}-${activity._id}`;
        groups[uniqueKey] = {
          _id: activity._id,
          type: activity.type,
          action: activity.action,
          projectId: activity.projectId,
          projectName: activity.projectName,
          projectColor: activity.projectColor,
          linkedProjectId: activity.linkedProjectId,
          users: activity.user ? [activity.user] : [],
          content: activity.content,
          timestamp: activity.timestamp,
          resourceType: activity.resourceType,
          details: activity.details,
          count: 1,
          activities: [activity]
        };
      }
    });

    return Object.values(groups).sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  const groupedActivities = groupActivities(activities);

  const filteredActivities = groupedActivities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'posts') return activity.type === 'user_post' || activity.type === 'project_update';
    if (filter === 'comments') return activity.type === 'comment';
    if (filter === 'favorites') return activity.type === 'favorite';
    if (filter === 'projects') return activity.type === 'project_activity';
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Activity Feed</h2>
        <div className="join border-2 border-base-content/20 rounded-lg border-thick">
          <button
            className={`join-item btn btn-sm border-thick ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`join-item btn btn-sm border-thick ${filter === 'posts' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('posts')}
          >
            Posts
          </button>
          <button
            className={`join-item btn btn-sm border-thick ${filter === 'comments' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('comments')}
          >
            Comments
          </button>
          <button
            className={`join-item btn btn-sm border-thick ${filter === 'favorites' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('favorites')}
          >
            Favorites
          </button>
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="text-center py-12 text-base-content/60">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-xl font-semibold mb-2">Your feed is empty</p>
          <p className="text-sm max-w-md mx-auto">
            To see activity here:
            <br />
            • Follow users to see their posts
            <br />
            • Favorite projects (⭐) to see project updates
            <br />
            • Or create your own posts above!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredActivities.map((activity) => (
            <div
              key={activity._id}
              className="card bg-base-100 border-2 border-base-content/10 hover:border-base-content/20 transition-all border-thick"
            >
              <div className="card-body p-4">
                <div className="flex items-start gap-3">
                  <div className={`${getActivityColor(activity)} mt-1`}>
                    {getActivityIcon(activity)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{getGroupedActivityDescription(activity)}</p>
                    {activity.content && (
                      <div className="mt-2 p-3 bg-base-200 rounded-lg border-thick">
                        <p className="text-sm text-base-content whitespace-pre-wrap">
                          {activity.content}
                        </p>
                        {activity.details?.isEdited && (
                          <span className="text-xs text-base-content/50 mt-1 inline-block">(edited)</span>
                        )}
                      </div>
                    )}
                    {/* Linked Project Card */}
                    {activity.linkedProjectId && (
                      <div
                        className="mt-2 p-3 bg-base-200/50 rounded-lg border-2 border-primary/30 hover:border-primary/50 transition-all cursor-pointer"
                        onClick={() => {
                          const slug = activity.linkedProjectId.publicSlug || activity.linkedProjectId._id;
                          window.location.href = `/discover/project/${slug}`;
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                          </svg>
                          <span className="font-semibold text-sm">{activity.linkedProjectId.name}</span>
                          {activity.linkedProjectId.category && (
                            <span className="badge badge-sm badge-outline">{activity.linkedProjectId.category}</span>
                          )}
                        </div>
                        {activity.linkedProjectId.description && (
                          <p className="text-xs text-base-content/70 line-clamp-2">
                            {activity.linkedProjectId.description}
                          </p>
                        )}
                      </div>
                    )}
                    {activity.details && activity.details.metadata && (
                      <div className="text-xs text-base-content/60 mt-1">
                        {Object.entries(activity.details.metadata).map(([key, value]) => (
                          <span key={key} className="mr-3">
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-base-content/50">
                        {formatRelativeTime(new Date(activity.timestamp))}
                      </p>
                      {(activity.type === 'user_post' || activity.type === 'project_update') && (
                        <LikeButton postId={activity._id} initialLikes={activity.details?.likes || 0} size="sm" />
                      )}
                    </div>
                  </div>
                  {activity.projectColor && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: activity.projectColor }}
                      title={activity.projectName}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
