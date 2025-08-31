import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { teamAPI } from '../api';
import type { BaseProject } from '../../../shared/types';
import TeamManagement from '../components/TeamManagement';
import ActivityLog from '../components/ActivityLog';
import ConfirmationModal from '../components/ConfirmationModal';

interface ContextType {
  selectedProject: BaseProject | null;
  onProjectUpdate: (projectId: string, updatedData: any) => Promise<any>;
  onProjectRefresh: () => Promise<void>;
}

const SharingPage: React.FC = () => {
  const { selectedProject, onProjectUpdate, onProjectRefresh } = useOutletContext<ContextType>();
  
  const [makePrivateConfirm, setMakePrivateConfirm] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'overview' | 'team' | 'activity'>('overview');

  const handleMakePrivate = async () => {
    if (!selectedProject) return;

    try {
      // First, get all team members to remove non-owner users
      const response = await teamAPI.getMembers(selectedProject.id);
      
      // Remove all non-owner members
      for (const member of response.members) {
        if (!member.isOwner) {
          await teamAPI.removeMember(selectedProject.id, member.userId._id);
        }
      }

      // Then set the project to not shared
      await onProjectUpdate(selectedProject.id, { isShared: false });
      await onProjectRefresh();
      setMakePrivateConfirm(false);
    } catch (err) {
      console.error('Failed to make project private:', err);
      setError('Failed to make project private');
      setMakePrivateConfirm(false);
    }
  };

  if (!selectedProject) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-lg font-semibold mb-2">Select a project</h2>
          <p className="text-base-content/60">Choose a project from the sidebar to view sharing settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Navigation Tabs */}
      <div className="tabs tabs-boxed border-subtle shadow-sm opacity-90 mb-6">
        <button 
          className={`tab ${activeSection === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          Overview
        </button>
        {selectedProject.isShared && (
          <button 
            className={`tab ${activeSection === 'team' ? 'tab-active' : ''}`}
            onClick={() => setActiveSection('team')}
          >
            Team Management
          </button>
        )}
        <button 
          className={`tab ${activeSection === 'activity' ? 'tab-active' : ''}`}
          onClick={() => setActiveSection('activity')}
        >
          Activity Log
        </button>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="alert alert-error shadow-md mb-6">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError('')} className="btn btn-ghost btn-sm">×</button>
        </div>
      )}

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
            <h2 className="text-xl font-bold mb-0">👥 Sharing Overview</h2>
          </div>
          
          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
            <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  selectedProject.isShared ? 'bg-success/20' : 'bg-base-300'
                }`}>
                  <svg className={`w-4 h-4 ${selectedProject.isShared ? 'text-success' : 'text-base-content/60'}`} 
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d={selectedProject.isShared 
                            ? "M17 20h5v-2a3 3 0 00-5.196-2.121M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.196-2.121M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            : "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"} />
                  </svg>
                </div>
                <div>
                  <div className={`font-medium text-sm ${selectedProject.isShared ? 'text-success' : 'text-base-content'}`}>
                    {selectedProject.isShared ? 'Sharing Enabled' : 'Private Project'}
                  </div>
                  <div className="text-xs text-base-content/60">
                    {selectedProject.isShared 
                      ? 'Team members can access this project' 
                      : 'Only you can access this project'}
                  </div>
                </div>
              </div>
              
              {(selectedProject.canManageTeam !== false) && (
                <label className="label cursor-pointer gap-2">
                  <span className="label-text text-xs">Enable</span>
                  <input 
                    type="checkbox" 
                    className="toggle toggle-success toggle-sm" 
                    checked={selectedProject.isShared}
                    onChange={() => {
                      // If toggling off (making private), show confirmation
                      if (selectedProject.isShared) {
                        setMakePrivateConfirm(true);
                      } else {
                        // If toggling on (making shared), just do it directly
                        onProjectUpdate(selectedProject.id, { isShared: true }).then(() => {
                          onProjectRefresh();
                        });
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Management Section */}
      {activeSection === 'team' && selectedProject.isShared && (
        <div className="space-y-4">
          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
            <h2 className="text-xl font-bold mb-0">👥 Team Management</h2>
          </div>
          
          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
            <TeamManagement 
              projectId={selectedProject.id} 
              canManageTeam={selectedProject.canManageTeam ?? selectedProject.isOwner ?? false}
              currentUserId={undefined} // TODO: Get current user ID from auth context
            />
          </div>
        </div>
      )}

      {/* Activity Log Section */}
      {activeSection === 'activity' && (
        <div className="space-y-4">
          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
            <h2 className="text-xl font-bold mb-0">📊 Activity Log</h2>
          </div>
          
          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
            <p className="text-sm text-base-content/60 mb-4">Your project activity is being tracked</p>
            <ActivityLog 
              projectId={selectedProject.id}
            />
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={makePrivateConfirm}
        onConfirm={handleMakePrivate}
        onCancel={() => setMakePrivateConfirm(false)}
        title="Make Project Private"
        message={`Are you sure you want to make "<strong>${selectedProject?.name}</strong>" private? This will remove all team members except the owner from the project.`}
        confirmText="Make Private"
        variant="warning"
      />
    </div>
  );
};

export default SharingPage;