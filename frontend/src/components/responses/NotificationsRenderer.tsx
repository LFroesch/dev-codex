import React from 'react';

interface RelatedProject {
  name: string;
}

interface RelatedUser {
  firstName: string;
  lastName: string;
}

interface Notification {
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedProject?: RelatedProject;
  relatedUser?: RelatedUser;
}

interface NotificationsRendererProps {
  notifications: Notification[];
}

const NotificationsRenderer: React.FC<NotificationsRendererProps> = ({ notifications }) => {
  const typeIcons: Record<string, string> = {
    'project_invitation': '📬',
    'project_shared': '🤝',
    'team_member_added': '👥',
    'team_member_removed': '👋',
    'todo_assigned': '📝',
    'todo_due_soon': '⏰',
    'todo_overdue': '🚨',
    'subtask_completed': '✅'
  };

  return (
    <div className="mt-3 space-y-2">
      {notifications.length === 0 ? (
        <div className="p-3 bg-base-200 rounded-lg border-thick text-center text-xs text-base-content/60">
          No notifications
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, index) => {
            const icon = typeIcons[notif.type] || '🔔';

            return (
              <div
                key={index}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  notif.isRead
                    ? 'bg-base-200 border-base-content/20'
                    : 'bg-primary/10 border-primary/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-xl flex-shrink-0">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-semibold text-sm text-base-content/90 break-words">
                        {notif.title}
                      </div>
                      {!notif.isRead && (
                        <span className="badge badge-xs badge-primary flex-shrink-0">New</span>
                      )}
                    </div>
                    <div className="text-xs text-base-content/70 break-words mb-2">
                      {notif.message}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                      <span>{new Date(notif.createdAt).toLocaleString()}</span>
                      {notif.relatedProject && (
                        <span className="badge badge-xs badge-ghost">
                          📁 {notif.relatedProject.name}
                        </span>
                      )}
                      {notif.relatedUser && (
                        <span className="badge badge-xs badge-ghost">
                          👤 {notif.relatedUser.firstName} {notif.relatedUser.lastName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="text-xs text-base-content/60 mt-3">
        💡 Use <code className="bg-base-200 px-1 rounded">/clear notifications</code> to clear all notifications
      </div>
    </div>
  );
};

export default NotificationsRenderer;
