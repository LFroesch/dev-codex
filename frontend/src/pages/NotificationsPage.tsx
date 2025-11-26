import React, { useEffect, useState } from 'react';
import { notificationAPI } from '../api/notifications';
import type { Notification } from '../api/types';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import { getContrastTextColor } from '../utils/contrastTextColor';

interface StaleItem {
  projectId: string;
  projectName: string;
  itemId: string;
  itemType: 'note' | 'todo';
  title: string;
  daysSinceUpdate: number;
  updatedAt: string;
}

interface DueTodoItem {
  projectId: string;
  projectName: string;
  todoId: string;
  title: string;
  dueDate?: string;
  status: 'overdue' | 'due_today';
  daysPastDue?: number;
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.getNotifications({ limit: 50 });
      setNotifications(response.notifications);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    } catch (error) {
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationAPI.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
    } catch (error) {
    }
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClearAll = async () => {
    try {
      await notificationAPI.clearAllNotifications();
      setNotifications([]);
      setShowClearConfirm(false);
    } catch (error) {
      setShowClearConfirm(false);
    }
  };

  const toggleExpanded = (notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const handleStaleItemClick = (item: StaleItem) => {
    // Dispatch event to set active project
    window.dispatchEvent(new CustomEvent('selectProject', { detail: { projectId: item.projectId } }));

    // Navigate to the appropriate page based on item type
    if (item.itemType === 'note') {
      window.location.href = '/notes';
    } else {
      window.location.href = '/notes?section=todos';
    }
  };

  const handleDueTodoClick = (item: DueTodoItem) => {
    // Dispatch event to set active project
    window.dispatchEvent(new CustomEvent('selectProject', { detail: { projectId: item.projectId } }));

    // Navigate to todos section
    window.location.href = '/notes?section=todos';
  };

  const handleTodoNotificationClick = (notification: Notification) => {
    if (notification.relatedProjectId) {
      // Extract the project ID - handle both populated object and string cases
      const projectId = typeof notification.relatedProjectId === 'string'
        ? notification.relatedProjectId
        : (notification.relatedProjectId as any)._id?.toString() || (notification.relatedProjectId as any)._id || notification.relatedProjectId;

      // Dispatch event to set active project
      window.dispatchEvent(new CustomEvent('selectProject', {
        detail: { projectId: projectId.toString() }
      }));

      // Navigate to todos section
      window.location.href = '/notes?section=todos';

      // Mark as read
      if (!notification.isRead) {
        handleMarkAsRead(notification._id);
      }
    }
  };

  const handleSocialNotificationClick = (notification: Notification) => {
    // Mark as read first
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }

    // Navigate using actionUrl if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'project_invitation':
        return '✉️';
      case 'project_shared':
        return '🔗';
      case 'team_member_added':
        return '👥';
      case 'team_member_removed':
        return '👤';
      case 'todo_assigned':
        return '📋';
      case 'todo_due_soon':
        return '⏰';
      case 'todo_overdue':
        return '🚨';
      case 'subtask_completed':
        return '✅';
      case 'stale_items_summary':
        return '⏱️';
      case 'daily_todo_summary':
        return '📅';
      case 'admin_message':
        return '👨‍💼';
      case 'post_like':
        return '❤️';
      case 'comment_on_project':
        return '💬';
      case 'reply_to_comment':
        return '↩️';
      case 'project_favorited':
        return '⭐';
      case 'project_followed':
        return '👁️';
      case 'new_follower':
        return '👤';
      case 'user_post':
        return '📝';
      case 'project_update':
        return '🔄';
      default:
        return '🔔';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-3 badge badge-primary border-thick border-2 border-base-content/20">{unreadCount} unread</span>
          )}
        </h1>
        <div className="flex gap-2 flex-wrap">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead} className="btn btn-sm btn-outline border-thick">
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={handleClearAll} className="btn btn-sm btn-error btn-outline border-thick">
              Clear all
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔔</div>
          <p className="text-xl text-base-content/60">No notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notification => (
            <div
              key={notification._id}
              className={`card bg-base-200 shadow-md border-thick border-2 border-base-content/20 ${
                !notification.isRead ? 'border-l-4 border-primary' : ''
              }`}
            >
              <div className="card-body p-4">
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`flex items-start gap-3 flex-1 ${
                      ((notification.type === 'todo_overdue' || notification.type === 'todo_due_soon' || notification.type === 'todo_assigned') && notification.relatedProjectId) ||
                      (['post_like', 'comment_on_project', 'reply_to_comment', 'project_favorited', 'project_followed', 'new_follower', 'user_post', 'project_update'].includes(notification.type) && notification.actionUrl)
                        ? 'cursor-pointer hover:opacity-80 transition-opacity'
                        : ''
                    }`}
                    onClick={() => {
                      if ((notification.type === 'todo_overdue' || notification.type === 'todo_due_soon' || notification.type === 'todo_assigned') && notification.relatedProjectId) {
                        handleTodoNotificationClick(notification);
                      } else if (['post_like', 'comment_on_project', 'reply_to_comment', 'project_favorited', 'project_followed', 'new_follower', 'user_post', 'project_update'].includes(notification.type) && notification.actionUrl) {
                        handleSocialNotificationClick(notification);
                      }
                    }}
                  >
                    <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {notification.title}
                        {(notification.type === 'todo_overdue' || notification.type === 'todo_due_soon' || notification.type === 'todo_assigned') && notification.relatedProjectId && (
                          <span className="ml-2 text-sm text-primary">→ Click to view</span>
                        )}
                        {['post_like', 'comment_on_project', 'reply_to_comment', 'project_favorited', 'project_followed', 'new_follower', 'user_post', 'project_update'].includes(notification.type) && notification.actionUrl && (
                          <span className="ml-2 text-sm text-primary">→ Click to view</span>
                        )}
                      </h3>
                      <p className="text-base-content/70 mt-1">{notification.message}</p>

                      {/* Stale items summary expansion */}
                      {notification.type === 'stale_items_summary' && notification.metadata && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleExpanded(notification._id)}
                            className="btn btn-sm btn-ghost"
                          >
                            {expandedNotifications.has(notification._id) ? '▼ Hide' : '▶ View'}{' '}
                            items ({notification.metadata.totalCount})
                          </button>

                          {expandedNotifications.has(notification._id) && (
                            <div className="mt-3 space-y-4">
                              {notification.metadata.staleNotes && notification.metadata.staleNotes.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2">
                                    Stale Notes ({notification.metadata.staleNotes.length})
                                  </h4>
                                  <div className="space-y-1">
                                    {notification.metadata.staleNotes.map((item: StaleItem) => (
                                      <button
                                        key={item.itemId}
                                        onClick={() => handleStaleItemClick(item)}
                                        className="block w-full text-left p-2 bg-base-300 hover:bg-base-100 rounded transition-colors"
                                      >
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium">{item.title}</span>
                                          <span className="text-sm text-base-content/60">
                                            {item.daysSinceUpdate}d ago
                                          </span>
                                        </div>
                                        <div className="text-sm text-base-content/60">
                                          {item.projectName}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {notification.metadata.staleTodos && notification.metadata.staleTodos.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2">
                                    Stale Todos ({notification.metadata.staleTodos.length})
                                  </h4>
                                  <div className="space-y-1">
                                    {notification.metadata.staleTodos.map((item: StaleItem) => (
                                      <button
                                        key={item.itemId}
                                        onClick={() => handleStaleItemClick(item)}
                                        className="block w-full text-left p-2 bg-base-300 hover:bg-base-100 rounded transition-colors"
                                      >
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium">{item.title}</span>
                                          <span className="text-sm text-base-content/60">
                                            {item.daysSinceUpdate}d ago
                                          </span>
                                        </div>
                                        <div className="text-sm text-base-content/60">
                                          {item.projectName}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Daily todo summary expansion */}
                      {notification.type === 'daily_todo_summary' && notification.metadata && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleExpanded(notification._id)}
                            className="btn btn-sm btn-ghost"
                          >
                            {expandedNotifications.has(notification._id) ? '▼ Hide' : '▶ View'}{' '}
                            todos ({notification.metadata.totalCount})
                          </button>

                          {expandedNotifications.has(notification._id) && (
                            <div className="mt-3 space-y-4">
                              {notification.metadata.overdueTodos && notification.metadata.overdueTodos.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2 text-error">
                                    Overdue Todos ({notification.metadata.overdueTodos.length})
                                  </h4>
                                  <div className="space-y-1">
                                    {notification.metadata.overdueTodos.map((item: DueTodoItem) => (
                                      <button
                                        key={item.todoId}
                                        onClick={() => handleDueTodoClick(item)}
                                        className="block w-full text-left p-2 bg-error/10 hover:bg-error/20 rounded transition-colors border border-error/20"
                                      >
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium">{item.title}</span>
                                          <span className="text-sm text-error font-semibold">
                                            {item.daysPastDue}d overdue
                                          </span>
                                        </div>
                                        <div className="text-sm text-base-content/60">
                                          {item.projectName}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {notification.metadata.dueTodayTodos && notification.metadata.dueTodayTodos.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2 text-warning">
                                    Due Today ({notification.metadata.dueTodayTodos.length})
                                  </h4>
                                  <div className="space-y-1">
                                    {notification.metadata.dueTodayTodos.map((item: DueTodoItem) => (
                                      <button
                                        key={item.todoId}
                                        onClick={() => handleDueTodoClick(item)}
                                        className="block w-full text-left p-2 bg-warning/10 hover:bg-warning/20 rounded transition-colors border border-warning/20"
                                      >
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium">{item.title}</span>
                                          <span className="text-sm text-warning font-semibold">
                                            Due today
                                          </span>
                                        </div>
                                        <div className="text-sm text-base-content/60">
                                          {item.projectName}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-sm text-base-content/60">
                        <span>{formatDate(notification.createdAt)}</span>
                        {notification.relatedProjectId && (
                          <>
                            <span>•</span>
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border-2 border-base-content/20 border-thick"
                              style={{
                                backgroundColor: notification.relatedProjectId.color,
                                color: getContrastTextColor(notification.relatedProjectId.color)
                              }}
                            >
                              {notification.relatedProjectId.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="btn btn-xs btn-primary border-thick"
                        title="Mark as read"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification._id)}
                      className="btn btn-xs btn-ghost border-thick"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        onConfirm={handleConfirmClearAll}
        onCancel={() => setShowClearConfirm(false)}
        title="Clear All Notifications?"
        message="Are you sure you want to clear all notifications? This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
};

export default NotificationsPage;
