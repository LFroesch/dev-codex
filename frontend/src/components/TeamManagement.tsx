import React, { useState, useEffect } from 'react';
import { teamAPI, TeamMember, InviteUserData } from '../api/client';

interface TeamManagementProps {
  projectId: string;
  canManageTeam: boolean;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ projectId, canManageTeam }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);

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
      setInviteEmail('');
      alert(`Invitation sent successfully to ${inviteEmail}!`);
      console.log('Invite response:', response);
    } catch (error: any) {
      console.error('Failed to invite user:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send invitation';
      alert(`Error: ${errorMessage}`);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      await teamAPI.removeMember(projectId, userId);
      setMembers(prev => prev.filter(m => m.userId._id !== userId));
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove team member');
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
      alert('Failed to update role');
    }
  };

  return (
    <div className="space-y-4">
      {/* Invite form */}
      {canManageTeam && (
        <div className="bg-base-200 p-4 rounded-lg">
          <h4 className="font-medium mb-3">Invite Team Member</h4>
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            placeholder="Enter email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="input input-bordered flex-1"
            required
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
            className="select select-bordered"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <button type="submit" className="btn btn-primary" disabled={inviting}>
            {inviting ? <span className="loading loading-spinner loading-sm"></span> : 'Invite'}
          </button>
        </form>
        </div>
      )}

      {/* Members list */}
      <div>
        <h4 className="font-medium mb-3">Team Members</h4>
        <div className="space-y-2">
        {members.map((member) => (
          <div key={member._id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-8">
                  <span className="text-xs">
                    {member.userId.firstName[0]}{member.userId.lastName[0]}
                  </span>
                </div>
              </div>
              <div>
                <div className="font-medium">{member.userId.firstName} {member.userId.lastName}</div>
                <div className="text-sm text-base-content/70">{member.userId.email}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {member.isOwner ? (
                <span className="badge badge-primary">Owner</span>
              ) : (
                <>
                  {canManageTeam ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.userId._id, e.target.value as 'editor' | 'viewer')}
                      className="select select-sm"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                  ) : (
                    <span className="badge">{member.role}</span>
                  )}
                  
                  {canManageTeam && (
                    <button
                      onClick={() => handleRemoveMember(member.userId._id)}
                      className="btn btn-sm btn-error"
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
      </div>
    </div>
  );
};

export default TeamManagement;