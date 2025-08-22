import React, { useState, useEffect } from 'react';
import { teamAPI, TeamMember, analyticsAPI } from '../api';
import ActivityLog from './ActivityLog';
import ActiveUsers from './ActiveUsers';
import ConfirmationModal from './ConfirmationModal';
import InfoModal from './InfoModal';
import { toast } from '../services/toast';

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

  const fetchMembers = async () => {
    try {
      const response = await teamAPI.getMembers(projectId);
      setMembers(response.members);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
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
      console.error('Failed to load team time data:', err);
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
      toast.success(`Invitation sent successfully to ${inviteEmail}!`);
      setInviteEmail('');
    } catch (error: any) {
      console.error('Failed to invite user:', error);
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
        name: `${member.userId.firstName} ${member.userId.lastName}` 
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
      console.error('Failed to remove member:', error);
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
      toast.success(`${member?.userId?.firstName || 'Member'}'s role updated to ${newRole}!`);
    } catch (error) {
      console.error('Failed to update role:', error);
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
      const response = await fetch(`/api/activity-logs/project/${projectId}/clear`, {
        method: 'DELETE',
        credentials: 'include'
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
      console.error('Failed to clear activities:', error);
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
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-4">
            <h3 className="card-title text-base mb-3">Invite Team Member</h3>
            <form onSubmit={handleInvite} className="flex gap-3">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="input input-bordered input-sm flex-1"
                required
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                className="select select-bordered select-sm w-24"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button type="submit" className="btn btn-primary btn-sm px-6" disabled={inviting}>
                {inviting ? <span className="loading loading-spinner loading-xs mr-2"></span> : null}
                {inviting ? 'Sending' : 'Send Invite'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="card-title text-base">Team Members</h3>
              <div className="flex items-center gap-2">
                <span className="badge badge-primary badge-sm">{members.length}</span>
                <span className="text-sm text-base-content/60">•</span>
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-success">{getTotalProjectTime()}</span>
                </div>
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
              {members.map((member) => (
                <div key={member._id} className="bg-base-200/50 border border-base-content/10 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="avatar placeholder flex-shrink-0">
                      <div className="bg-primary text-primary-content rounded-full w-10 h-10">
                        <span className="text-sm font-medium">
                          {member.userId.firstName[0]}{member.userId.lastName[0]}
                        </span>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name and Role Row */}
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm truncate pr-2">
                          {member.userId.firstName} {member.userId.lastName}
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
                          <svg className="w-3 h-3 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-success font-medium">
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Users Section */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-4">
          <ActiveUsers 
            projectId={projectId} 
            currentUserId={currentUserId}
            showTitle={true}
            showDetails={true}
          />
        </div>
      </div>

      {/* Activity Log Section */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActivityCollapsed(!activityCollapsed)}
                className="btn btn-ghost btn-sm btn-circle bg-base-300 hover:bg-base-200"
                title={activityCollapsed ? 'Expand' : 'Collapse'}
              >
                <svg 
                  className={`w-4 h-4 transition-transform duration-200 ${activityCollapsed ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <h3 className="card-title text-base">Recent Activity</h3>
            </div>
            
            {/* Activity Controls */}
            {!activityCollapsed && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-xs text-base-content/60">Live</span>
                </div>
                <button
                  onClick={() => {
                    setRefreshingActivity(true);
                    // Force ActivityLog to refresh by changing its key
                    setActivityRefreshKey(prev => prev + 1);
                    setTimeout(() => setRefreshingActivity(false), 1000);
                  }}
                  className="btn btn-ghost btn-xs"
                  disabled={refreshingActivity}
                  title="Refresh"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                
                {/* Clear button for team managers */}
                {canManageTeam && (
                  <>
                    <button
                      onClick={handleClearActivity}
                      className={`btn btn-xs ${showClearConfirm ? 'btn-error' : 'btn-ghost'}`}
                      disabled={clearingActivity}
                      title="Clear activity log"
                    >
                      {clearingActivity ? (
                        <div className="loading loading-spinner loading-xs"></div>
                      ) : showClearConfirm ? (
                        'Confirm'
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </>
                      )}
                    </button>
                    {showClearConfirm && (
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="btn btn-ghost btn-xs"
                        disabled={clearingActivity}
                        title="Cancel"
                      >
                        ✕
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          {!activityCollapsed && (
            <ActivityLog 
              key={activityRefreshKey}
              projectId={projectId}
              showTitle={false}
              limit={10}
              autoRefresh={true}
              refreshInterval={30000}
              showClearButton={false}
            />
          )}
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