import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI, invitationAPI, Notification } from '../api';
import { unsavedChangesManager } from '../utils/unsavedChanges';

const NotificationBell: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Notification | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showInviteSuccessModal, setShowInviteSuccessModal] = useState(false);
  const [showInviteErrorModal, setShowInviteErrorModal] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);
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
    const interval = setInterval(fetchNotifications, 30000); // Check every 30 seconds for testing
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

  // Close this dropdown when another header dropdown opens
  useEffect(() => {
    const handleDropdownOpen = (event: CustomEvent) => {
      if (event.detail.component !== 'notificationbell') {
        setIsOpen(false);
      }
    };

    window.addEventListener('headerDropdownOpen' as any, handleDropdownOpen);
    return () => window.removeEventListener('headerDropdownOpen' as any, handleDropdownOpen);
  }, []);

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
      // Check if invitation is still pending before showing modal
      try {
        const pendingInvitations = await invitationAPI.getPending();
        const invitation = pendingInvitations.invitations.find(inv => inv._id === notification.relatedInvitationId);

        if (invitation) {
          // Show invitation modal for pending invitations
          setSelectedInvitation(notification);
          setShowInvitationModal(true);
        } else {
          // Invitation already processed, redirect to project
          if (notification.relatedProjectId) {
            // Check for unsaved changes before navigation
            const canNavigate = await unsavedChangesManager.checkNavigationAllowed();
            if (canNavigate) {
              const projectId = typeof notification.relatedProjectId === 'string' ? notification.relatedProjectId : notification.relatedProjectId._id;
              window.dispatchEvent(new CustomEvent('selectProject', { detail: { projectId } }));
              navigate('/notes');
            }
          }
        }
      } catch (error) {
        console.error('Failed to check invitation status:', error);
        // Fallback: show modal anyway
        setSelectedInvitation(notification);
        setShowInvitationModal(true);
      }
    } else if (notification.type === 'team_member_added' || notification.type === 'team_member_removed') {
      // Team-related notifications go to the sharing/team management page
      const canNavigate = await unsavedChangesManager.checkNavigationAllowed();
      if (canNavigate) {
        if (notification.relatedProjectId) {
          const projectId = typeof notification.relatedProjectId === 'string' ? notification.relatedProjectId : notification.relatedProjectId._id;
          window.dispatchEvent(new CustomEvent('selectProject', { detail: { projectId } }));
        }
        navigate('/sharing');
      }
    } else if (['todo_assigned', 'todo_due_soon', 'todo_overdue', 'subtask_completed'].includes(notification.type)) {
      // Todo-related notifications go to the todos section with the specific todo selected
      const canNavigate = await unsavedChangesManager.checkNavigationAllowed();
      if (canNavigate) {
        if (notification.relatedProjectId) {
          const projectId = typeof notification.relatedProjectId === 'string' ? notification.relatedProjectId : notification.relatedProjectId._id;
          window.dispatchEvent(new CustomEvent('selectProject', { detail: { projectId } }));
        }

        // Navigate to todos section with todoId in URL
        const todoId = (notification as any).relatedTodoId;
        if (todoId) {
          navigate(`/notes?section=todos&todoId=${todoId}`);
        } else {
          navigate('/notes?section=todos');
        }
      }
    } else if (notification.relatedProjectId) {
      // For other notification types, redirect to the notes section
      const canNavigate = await unsavedChangesManager.checkNavigationAllowed();
      if (canNavigate) {
        const projectId = typeof notification.relatedProjectId === 'string' ? notification.relatedProjectId : notification.relatedProjectId._id;

        window.dispatchEvent(new CustomEvent('selectProject', { detail: { projectId } }));
        navigate('/notes');
      }
    }
  };

  const handleAcceptInvitation = async () => {
    if (!selectedInvitation || isProcessingInvite) return;
    
    setIsProcessingInvite(true);
    
    try {
      // Get pending invitations to find the token
      const pendingInvitations = await invitationAPI.getPending();
      const invitation = pendingInvitations.invitations.find(inv => inv._id === selectedInvitation.relatedInvitationId);
      
      if (invitation) {
        await invitationAPI.acceptInvitation(invitation.token);
        setShowInvitationModal(false);
        setSelectedInvitation(null);
        setInviteMessage(`Successfully joined ${selectedInvitation.relatedProjectId?.name || 'the project'}!`);
        setShowInviteSuccessModal(true);
        
        // Navigate to the project after a short delay
        setTimeout(async () => {
          if (selectedInvitation.relatedProjectId) {
            // Check for unsaved changes before navigation
            const canNavigate = await unsavedChangesManager.checkNavigationAllowed();
            if (canNavigate) {
              const projectId = typeof selectedInvitation.relatedProjectId === 'string' ? selectedInvitation.relatedProjectId : selectedInvitation.relatedProjectId._id;
              
              // Dispatch custom event to notify Layout component
              window.dispatchEvent(new CustomEvent('selectProject', { detail: { projectId } }));
              navigate('/notes');
            }
          }
        }, 1500);
      } else {
        setInviteMessage('Invitation not found or already processed');
        setShowInvitationModal(false);
        setSelectedInvitation(null);
        setShowInviteErrorModal(true);
      }
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to accept invitation';
      setInviteMessage(errorMessage);
      setShowInvitationModal(false);
      setSelectedInvitation(null);
      setShowInviteErrorModal(true);
    } finally {
      setIsProcessingInvite(false);
    }
  };

  const handleDeclineInvitation = () => {
    setShowInvitationModal(false);
    setSelectedInvitation(null);
    setInviteMessage('Invitation declined');
    setShowInviteSuccessModal(true);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="btn btn-ghost btn-circle relative"
        onClick={() => {
          const newState = !isOpen;
          setIsOpen(newState);
          if (newState) {
            window.dispatchEvent(new CustomEvent('headerDropdownOpen', { detail: { component: 'notificationbell' } }));
          }
        }}
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
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-base-100 rounded-box z-[10000] p-2 shadow-lg border-2 border-base-content/20">
        <div className="flex justify-between items-center p-2">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <button 
              className="btn btn-xs btn-ghost text-sm"
              onClick={() => {
                setShowClearAllModal(true);
                setIsOpen(false);
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

      {/* Project Invitation Modal */}
      {showInvitationModal && selectedInvitation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 translate-y-48 ">
          <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-center mb-4">Project Invitation</h3>
            
            <p className="text-center text-base-content/70 mb-6">
              Accept invitation to join "{selectedInvitation.relatedProjectId?.name || 'this project'}"?
            </p>

            <div className="flex gap-3">
              <button 
                className="btn btn-ghost flex-1"
                onClick={handleDeclineInvitation}
                disabled={isProcessingInvite}
              >
                Decline
              </button>
              <button 
                className="btn btn-primary flex-1"
                onClick={handleAcceptInvitation}
                disabled={isProcessingInvite}
              >
                {isProcessingInvite ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Accepting...
                  </>
                ) : (
                  'Accept'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Notifications Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 translate-y-48 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-warning/10 rounded-full">
              <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-center mb-4">Clear All Notifications</h3>
            
            <p className="text-center text-base-content/70 mb-6">
              Are you sure you want to clear all notifications? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button 
                className="btn btn-ghost flex-1"
                onClick={() => setShowClearAllModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-warning flex-1"
                onClick={async () => {
                  try {
                    await notificationAPI.clearAllNotifications();
                    setNotifications([]);
                    setUnreadCount(0);
                    setShowClearAllModal(false);
                  } catch (error) {
                    console.error('Failed to clear notifications:', error);
                    setShowClearAllModal(false);
                  }
                }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitation Success Modal */}
      {showInviteSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 translate-y-48">
          <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-success/10 rounded-full">
              <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-center mb-4">Success</h3>
            
            <p className="text-center text-base-content/70 mb-6">
              {inviteMessage}
            </p>

            <div className="flex justify-center">
              <button 
                className="btn btn-primary"
                onClick={() => setShowInviteSuccessModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitation Error Modal */}
      {showInviteErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 translate-y-48">
          <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-error/10 rounded-full">
              <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-center mb-4">Error</h3>
            
            <p className="text-center text-base-content/70 mb-6">
              {inviteMessage}
            </p>

            <div className="flex justify-center">
              <button 
                className="btn btn-primary"
                onClick={() => setShowInviteErrorModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;