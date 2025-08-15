import React, { useState, useEffect } from 'react';
import { teamAPI, TeamMember, InviteUserData, analyticsAPI } from '../api';
import ActivityLog from './ActivityLog';
import ActiveUsers from './ActiveUsers';
import ConfirmationModal from './ConfirmationModal';
import InfoModal from './InfoModal';

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
  
  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchMembers();
    loadTeamTimeData();
  }, [projectId]);

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
      console.log('Team time response:', response);
      if (response && response.teamTimeData && Array.isArray(response.teamTimeData)) {
        const timeMap: { [userId: string]: number } = {};
        response.teamTimeData.forEach((data: any) => {
          timeMap[data._id] = data.totalTime || 0;
        });
        console.log('Team time map:', timeMap);
        setTeamTimeData(timeMap);
      }
    } catch (err) {
      console.error('Failed to load team time data:', err);
    }
  };

  // Copy exact formatProjectTime from Layout.tsx
  const formatProjectTime = (userId: string): string => {
    const timeMs = teamTimeData[userId] || 0;
    const totalMinutes = Math.floor(timeMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const response = await teamAPI.inviteUser(projectId, { email: inviteEmail, role: inviteRole });
      setModalMessage(`Invitation sent successfully to ${inviteEmail}!`);
      setShowSuccessModal(true);
      setInviteEmail('');
      console.log('Invite response:', response);
    } catch (error: any) {
      console.error('Failed to invite user:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send invitation';
      setModalMessage(errorMessage);
      setShowErrorModal(true);
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
    } catch (error) {
      console.error('Failed to remove member:', error);
      setModalMessage('Failed to remove team member');
      setShowErrorModal(true);
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
    } catch (error) {
      console.error('Failed to update role:', error);
      setModalMessage('Failed to update role');
      setShowErrorModal(true);
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
            <h3 className="card-title text-base">Team Members</h3>
            <span className="badge badge-ghost">{members.length}</span>
          </div>
          
          {members.length === 0 ? (
            <div className="text-center py-4 text-base-content/60">
              <p className="text-sm">No team members yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {members.map((member) => (
                <div key={member._id} className="bg-base-200/50 border border-base-content/10 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="avatar placeholder flex-shrink-0">
                      <div className="bg-primary text-primary-content rounded-full w-8">
                        <span className="text-xs font-medium">
                          {member.userId.firstName[0]}{member.userId.lastName[0]}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-xs truncate">
                            {member.userId.firstName} {member.userId.lastName}
                          </h4>
                          <div className="flex items-center gap-1 mt-0.5">
                            <svg className="w-2.5 h-2.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs text-success font-medium">
                              {formatProjectTime(member.userId._id)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          {member.isOwner ? (
                            <span className="badge badge-primary badge-xs">Owner</span>
                          ) : (
                            <>
                              {canManageTeam ? (
                                <select
                                  value={member.role}
                                  onChange={(e) => handleRoleChange(member.userId._id, e.target.value as 'editor' | 'viewer')}
                                  className="select select-xs select-bordered w-16 h-5"
                                >
                                  <option value="viewer">View</option>
                                  <option value="editor">Edit</option>
                                </select>
                              ) : (
                                <span className="badge badge-xs capitalize">{member.role}</span>
                              )}
                              {canManageTeam && (
                                <button
                                  onClick={() => handleRemoveMember(member.userId._id)}
                                  className="btn btn-xs btn-error btn-outline h-4 min-h-4 px-1"
                                  title="Remove member"
                                >
                                  ×
                                </button>
                              )}
                            </>
                          )}
                        </div>
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
      <div className="mt-6">
        <ActiveUsers 
          projectId={projectId} 
          currentUserId={currentUserId}
          showTitle={true}
          showDetails={true}
        />
      </div>

      {/* Activity Log Section */}
      <div className="mt-6">
        <ActivityLog 
          projectId={projectId}
          showTitle={true}
          limit={10}
          autoRefresh={true}
          refreshInterval={30000}
        />
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