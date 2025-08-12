import React, { useState, useEffect } from 'react';
import { teamAPI, TeamMember, InviteUserData } from '../api';
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
  
  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchMembers();
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
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member._id} className="flex items-center justify-between py-2 border-b border-base-300 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                      <div className="bg-primary text-primary-content rounded-full w-8">
                        <span className="text-xs font-medium">
                          {member.userId.firstName[0]}{member.userId.lastName[0]}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{member.userId.firstName} {member.userId.lastName}</div>
                      <div className="text-xs text-base-content/60">{member.userId.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {member.isOwner ? (
                      <span className="badge badge-primary badge-sm">Owner</span>
                    ) : (
                      <>
                        {canManageTeam ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.userId._id, e.target.value as 'editor' | 'viewer')}
                            className="select select-xs select-bordered"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>
                        ) : (
                          <span className="badge badge-sm capitalize">{member.role}</span>
                        )}
                        
                        {canManageTeam && (
                          <button
                            onClick={() => handleRemoveMember(member.userId._id)}
                            className="btn btn-xs btn-error btn-outline"
                          >
                            Remove
                          </button>
                        )}
                      </>
                    )}
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