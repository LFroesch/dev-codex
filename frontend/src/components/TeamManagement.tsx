import React, { useState, useEffect } from 'react';
import { teamAPI, TeamMember, analyticsAPI } from '../api';
import { activityLogsAPI, ActiveUser } from '../api/activityLogs';
import ActivityLog from './ActivityLog';
import ConfirmationModal from './ConfirmationModal';
import InfoModal from './InfoModal';
import { toast } from '../services/toast';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { csrfFetch } from '../utils/csrf';
import { analyticsService } from '../services/analytics';

interface TeamManagementProps {
  projectId: string;
  canManageTeam: boolean;
  currentUserId?: string;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ projectId, canManageTeam, currentUserId }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);
  
  // Simple team time tracking like Layout.tsx
  const [teamTimeData, setTeamTimeData] = useState<{ [userId: string]: number }>({});
  
  // Active users state
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  
  // Activity log state
  const [activityCollapsed, setActivityCollapsed] = useState(false);
  const [refreshingActivity, setRefreshingActivity] = useState(false);
  const [clearingActivity, setClearingActivity] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  
  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [projectId]);

  // Load team time data after members are loaded
  useEffect(() => {
    if (members.length > 0) {
      loadTeamTimeData();
    }
  }, [members, projectId]);

  // Auto-update team time data every 30 seconds (copy from Layout.tsx)
  useEffect(() => {
    const interval = setInterval(() => {
      loadTeamTimeData();
    }, 30000);

    return () => clearInterval(interval);
  }, [projectId]);

  // Load and auto-update active users
  useEffect(() => {
    loadActiveUsers();
    
    const interval = setInterval(loadActiveUsers, 5000); // 5 seconds for responsive feel
    return () => clearInterval(interval);
  }, [projectId, currentUserId]);

  const fetchMembers = async () => {
    try {
      const response = await teamAPI.getMembers(projectId);
      setMembers(response.members);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadTeamTimeData = async () => {
    try {
      const response = await analyticsAPI.getProjectTeamTime(projectId, 30) as any;
      
      if (response && response.teamTimeData && Array.isArray(response.teamTimeData)) {
        const timeMap: { [userId: string]: number } = {};
        response.teamTimeData.forEach((data: any) => {
          timeMap[data._id] = data.totalTime || 0;
        });
        setTeamTimeData(timeMap);
      }
    } catch (err) {
    }
  };

  const loadActiveUsers = async () => {
    try {
      const response = await activityLogsAPI.getActiveUsers(projectId, 3); // Consider active if seen in last 3 minutes
      setActiveUsers(response.activeUsers);
    } catch (err) {
    }
  };

  const getActivityStatus = (userId: string): 'active' | 'recent' | 'away' => {
    const user = activeUsers.find(u => u.userId === userId);
    if (!user) return 'away';

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

  const formatProjectTime = (userId: string): string => {
    const timeMs = teamTimeData[userId] || 0;
    const totalMinutes = Math.floor(timeMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '0m';
    }
  };

  const getTotalProjectTime = (): string => {
    const totalMs = Object.values(teamTimeData).reduce((sum, time) => sum + time, 0);
    const totalMinutes = Math.floor(totalMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '0m';
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      await teamAPI.inviteUser(projectId, { email: inviteEmail, role: inviteRole });

      // Track team invite feature usage
      analyticsService.trackFeatureUsage('team_invite', {
        projectId,
        role: inviteRole,
        inviteEmail,
        hasMultipleMembers: members.length > 0
      });

      toast.success(`Invitation sent successfully to ${inviteEmail}!`);
      setInviteEmail('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send invitation';
      toast.error(errorMessage);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const member = members.find(m => m.userId._id === userId);
    if (member) {
      setMemberToRemove({
        id: userId,
        name: (member.userId as any).displayName || `${member.userId.firstName} ${member.userId.lastName}`
      });
      setShowRemoveModal(true);
    }
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      await teamAPI.removeMember(projectId, memberToRemove.id);
      setMembers(prev => prev.filter(m => m.userId._id !== memberToRemove.id));
      setShowRemoveModal(false);
      setMemberToRemove(null);
      toast.success(`${memberToRemove.name} removed from team successfully!`);
    } catch (error) {
      toast.error('Failed to remove team member. Please try again.');
      setShowRemoveModal(false);
      setMemberToRemove(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'editor' | 'viewer') => {
    try {
      await teamAPI.updateMemberRole(projectId, userId, newRole);
      setMembers(prev => prev.map(m => 
        m.userId._id === userId ? { ...m, role: newRole } : m
      ));
      const member = members.find(m => m.userId._id === userId);
      const memberName = (member?.userId as any)?.displayName || member?.userId?.firstName || 'Member';
      toast.success(`${memberName}'s role updated to ${newRole}!`);
    } catch (error) {
      toast.error('Failed to update member role. Please try again.');
      setModalMessage('Failed to update role');
      setShowErrorModal(true);
    }
  };

  const handleClearActivity = async () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }

    setClearingActivity(true);
    try {
      const response = await csrfFetch(`/api/activity-logs/project/${projectId}/clear`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setModalMessage('Activity log cleared successfully');
        setShowSuccessModal(true);
        // Refresh the activity log after clearing
        setActivityRefreshKey(prev => prev + 1);
      } else {
        throw new Error('Failed to clear activities');
      }
    } catch (error) {
      setModalMessage('Failed to clear activity log');
      setShowErrorModal(true);
    } finally {
      setClearingActivity(false);
      setShowClearConfirm(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Invite Team Member */}
      {canManageTeam && (
        <div className="bg-base-200/40 border-2 border-base-content/20 rounded-lg p-4">
          <div>
            <h3 className="text-sm sm:text-base font-semibold mb-3">Invite Team Member</h3>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input
                type="text"
                placeholder="email@company.com or username"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="input input-bordered input-sm text-base-content/40 flex-1"
                required
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                className="select select-bordered select-sm w-full sm:w-24"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button type="submit" className="btn btn-primary btn-sm sm:px-6" disabled={inviting}>
                {inviting ? <span className="loading loading-spinner loading-xs mr-2"></span> : null}
                {inviting ? 'Sending' : 'Send Invite'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-base-100 border-2 border-base-content/20 rounded-lg p-4">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <h3 className="text-base font-semibold">Team Members</h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-base-content/60">Members:</span>
                <span className="badge badge-primary border-thick font-semibold text-xs sm:text-sm">{members.length}</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-base-content/60 hidden sm:inline">Total Time (30d):</span>
                <span className="text-base-content/60 sm:hidden">Time (30d):</span>
                <span className="badge badge-success border-thick font-semibold text-xs sm:text-sm">{getTotalProjectTime()}</span>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="loading loading-spinner loading-sm"></div>
              <p className="text-sm text-base-content/60 mt-2">Loading team members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-4 text-base-content/60">
              <p className="text-sm">No team members yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {members.map((member) => {
                const activityStatus = getActivityStatus(member.userId._id);
                const statusColor = getStatusColor(activityStatus);
                
                return (
                  <div key={member._id} className="bg-base-200/50 border-thick rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      {/* Avatar with status indicator */}
                      <div className="avatar placeholder flex-shrink-0 relative">
                        <div className="bg-primary text-primary-content rounded-full w-10 h-10">
                          <span className="text-sm font-medium">
                            {member.userId.firstName[0]}{member.userId.lastName[0]}
                          </span>
                        </div>
                        {/* Online status indicator */}
                        <div 
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-base-200 ${statusColor}`}
                          title={activityStatus === 'active' ? 'Active now' : activityStatus === 'recent' ? 'Recently active' : 'Offline'}
                        >
                          {activityStatus === 'active' && (
                            <div className={`w-full h-full rounded-full ${statusColor} animate-pulse`}></div>
                          )}
                        </div>
                      </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name and Role Row */}
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm truncate pr-2">
                          {(member.userId as any).displayName || `${member.userId.firstName} ${member.userId.lastName}`}
                        </h4>
                        
                        {/* Role Badge/Select */}
                        <div className="flex-shrink-0">
                          {member.isOwner ? (
                            <span className="badge badge-primary badge-sm">Owner</span>
                          ) : (
                            <>
                              {canManageTeam ? (
                                <select
                                  value={member.role}
                                  onChange={(e) => handleRoleChange(member.userId._id, e.target.value as 'editor' | 'viewer')}
                                  className="select select-xs select-bordered w-20 text-xs"
                                >
                                  <option value="viewer">Viewer</option>
                                  <option value="editor">Editor</option>
                                </select>
                              ) : (
                                <span className="badge badge-sm badge-outline capitalize">{member.role}</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Time and Actions Row */}
                      <div className="flex items-center justify-between">
                        {/* Time Display */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium bg-success border-thick rounded px-1 py-0.5"
                          style={{ color: getContrastTextColor('success') }}>
                            {formatProjectTime(member.userId._id)}
                          </span>
                        </div>
                        
                        {/* Remove Button */}
                        {canManageTeam && !member.isOwner && (
                          <button
                            onClick={() => handleRemoveMember(member.userId._id)}
                            className="btn btn-xs btn-ghost btn-circle text-error hover:bg-error/10"
                            title="Remove member"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>


      {/* Activity Log Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-semibold text-lg sm:text-xl p-2">Recent Activity</h3>
          <div className="flex items-center gap-2 border-thick rounded-lg p-2">
            <button
              onClick={() => {
                setRefreshingActivity(true);
                setActivityRefreshKey(prev => prev + 1);
                setTimeout(() => setRefreshingActivity(false), 1000);
              }}
              disabled={refreshingActivity}
              className="btn btn-xs h-7 border-thick bg-warning/50"
              style={{color:getContrastTextColor('warning/50')}}
            >
              {refreshingActivity ? (
                <div className="loading loading-spinner loading-xs"></div>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>
            <button
              onClick={handleClearActivity}
              disabled={clearingActivity || !canManageTeam}
              className={`btn btn-xs bg-error/60 border-thick h-7 ${showClearConfirm ? 'btn-error' : 'btn-ghost'}`}
              style={{color:getContrastTextColor('error/60')}}
            >
              {clearingActivity ? (
                <div className="loading loading-spinner loading-xs"></div>
              ) : showClearConfirm ? (
                <>
                  <span className="hidden sm:inline">Confirm Clear</span>
                  <span className="sm:hidden">Confirm</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Clear</span>
                </>
              )}
            </button>
            {showClearConfirm && (
              <button
                onClick={() => setShowClearConfirm(false)}
                className="btn btn-ghost btn-xs"
                disabled={clearingActivity}
              >
                <span className="hidden sm:inline">Cancel</span>
                <span className="sm:hidden">X</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="border-2 border-base-content/20 rounded-lg mb-4 p-4">
          <ActivityLog 
            key={activityRefreshKey}
            projectId={projectId}
            showTitle={false}
            limit={10}
            autoRefresh={true}
            refreshInterval={30000}
            showClearButton={false}
          />
        </div>
      </div>

      <InfoModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Success"
        message={modalMessage}
        variant="success"
      />

      <InfoModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Error"
        message={modalMessage}
        variant="error"
      />

      <ConfirmationModal
        isOpen={showRemoveModal && !!memberToRemove}
        onConfirm={confirmRemoveMember}
        onCancel={() => {
          setShowRemoveModal(false);
          setMemberToRemove(null);
        }}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${memberToRemove?.name} from this project?`}
        confirmText="Remove"
        variant="warning"
      />
    </div>
  );
};

export default TeamManagement;