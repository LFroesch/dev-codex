import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI, invitationAPI, Notification } from '../api';

const NotificationBell: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await notificationAPI.getNotifications({ limit: 5 });
        setNotifications(response.notifications);
        setUnreadCount(response.unreadCount);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    
    setIsOpen(false);

    // Handle different notification types
    if (notification.type === 'project_invitation' && notification.relatedInvitationId) {
      // Show invitation modal or accept directly
      const confirmAccept = confirm(`Accept invitation to join "${notification.relatedProjectId?.name}"?`);
      if (confirmAccept) {
        try {
          // We need the invitation token, but we only have ID. Let's get pending invitations
          const pendingInvitations = await invitationAPI.getPending();
          const invitation = pendingInvitations.invitations.find(inv => inv._id === notification.relatedInvitationId);
          
          if (invitation) {
            await invitationAPI.acceptInvitation(invitation.token);
            alert('Invitation accepted! Redirecting to project...');
            navigate('/');
          } else {
            alert('Invitation not found or already processed');
          }
        } catch (error) {
          console.error('Failed to accept invitation:', error);
          alert('Failed to accept invitation');
        }
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="btn btn-ghost btn-circle relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-error text-error-content text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-base-100 rounded-box z-[60] p-2 shadow-lg border border-base-300">
        <div className="flex justify-between items-center p-2">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <button 
              className="btn btn-xs btn-ghost"
              onClick={async () => {
                if (!confirm('Clear all notifications?')) return;
                try {
                  // Delete all notifications
                  for (const notification of notifications) {
                    await notificationAPI.deleteNotification(notification._id);
                  }
                  setNotifications([]);
                  setUnreadCount(0);
                } catch (error) {
                  console.error('Failed to clear notifications:', error);
                }
              }}
            >
              Clear all
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-center p-4 text-base-content/60">No notifications</p>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification._id} 
                className={`p-2 rounded cursor-pointer hover:bg-base-200 ${!notification.isRead ? 'bg-primary/10' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="font-medium text-sm">{notification.title}</div>
                <div className="text-xs text-base-content/70">{notification.message}</div>
              </div>
            ))
          )}
        </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;