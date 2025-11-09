import React, { useEffect, useState } from 'react';
import { notificationAPI } from '../api/notifications';
import type { Notification } from '../api/types';
import { useNavigate } from 'react-router-dom';

interface StaleItem {
  projectId: string;
  projectName: string;
  itemId: string;
  itemType: 'note' | 'todo';
  title: string;
  daysSinceUpdate: number;
  updatedAt: string;
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
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
      console.error('Failed to load notifications:', error);
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
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationAPI.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) {
      return;
    }
    try {
      await notificationAPI.clearAllNotifications();
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
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
      navigate('/notes');
    } else {
      navigate('/notes?section=todos');
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-3 badge badge-primary">{unreadCount} unread</span>
          )}
        </h1>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead} className="btn btn-sm btn-outline">
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={handleClearAll} className="btn btn-sm btn-error btn-outline">
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
              className={`card bg-base-200 shadow-md ${
                !notification.isRead ? 'border-l-4 border-primary' : ''
              }`}
            >
              <div className="card-body p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{notification.title}</h3>
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

                      <div className="flex items-center gap-3 mt-2 text-sm text-base-content/60">
                        <span>{formatDate(notification.createdAt)}</span>
                        {notification.relatedProjectId && (
                          <>
                            <span>•</span>
                            <span
                              className="badge badge-sm"
                              style={{ backgroundColor: notification.relatedProjectId.color }}
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
                        className="btn btn-xs btn-primary"
                        title="Mark as read"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification._id)}
                      className="btn btn-xs btn-ghost"
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
    </div>
  );
};

export default NotificationsPage;
