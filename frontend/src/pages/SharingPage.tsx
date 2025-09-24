import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { teamAPI } from '../api';
import type { Project } from '../api/types';
import TeamManagement from '../components/TeamManagement';
import ActivityLog from '../components/ActivityLog';
import ConfirmationModal from '../components/ConfirmationModal';

interface ContextType {
  selectedProject: Project | null;
  user: any;
  onProjectUpdate: (projectId: string, updatedData: any) => Promise<any>;
  onProjectRefresh: () => Promise<void>;
}

const SharingPage: React.FC = () => {
  const { selectedProject, user, onProjectUpdate, onProjectRefresh } = useOutletContext<ContextType>();
  
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
    <div className="space-y-4">
      {/* Navigation Tabs */}
      <div className="flex justify-center px-2">
        <div className="tabs tabs-boxed border-2 border-base-content/20 shadow-sm">
          <button 
            className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'overview' ? 'tab-active' : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Overview
          </button>
          {selectedProject.isShared && (
            <button 
              className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'team' ? 'tab-active' : ''}`}
              onClick={() => setActiveSection('team')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Team Management
            </button>
          )}
          {!selectedProject.isShared && (
            <button 
              className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'activity' ? 'tab-active' : ''}`}
              onClick={() => setActiveSection('activity')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Activity Log
            </button>
          )}
        </div>
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
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">👥</div>
              <span>Sharing Overview</span>
            </div>
          </div>
          <div className="section-content">
            <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg border-thick">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center border-thick justify-center ${
                  selectedProject.isShared ? 'bg-success/50 ' : 'bg-base-300'
                }`}>
                  <svg className={`w-4 h-4 ${selectedProject.isShared ? 'text-base-content' : 'text-base-content/60'}`} 
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d={selectedProject.isShared 
                            ? "M17 20h5v-2a3 3 0 00-5.196-2.121M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.196-2.121M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            : "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"} />
                  </svg>
                </div>
                <div>
                  <div className={`font-medium text-md ${selectedProject.isShared ? 'text-base-content' : 'text-base-content'}`}>
                    {selectedProject.isShared ? 'Sharing Enabled' : 'Private Project'}
                  </div>
                  <div className="text-sm font-semibold text-base-content/60">
                      Toggle sharing to allow team collaboration.
                      <br />
                      You will be able to manage team members once sharing is enabled.
                      <br />
                    {selectedProject.isShared 
                      ? 'Team members can access this project' 
                      : 'Only you can access this project'}
                  </div>
                </div>
              </div>
              
              {(selectedProject.canManageTeam !== false) && (
                <div className="flex items-center gap-3 h-10 bg-base-200 border-thick rounded-lg p-1">
                  <input
                    type="checkbox"
                    className="toggle toggle-success toggle-lg"
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
                    id="sharing-toggle"
                  />
                  <label htmlFor="sharing-toggle" className="font-semibold text-base-content cursor-pointer select-none">
                    {selectedProject.isShared ? (
                      <span className="text-base-content">Shared</span>
                    ) : (
                      <span className="text-base-content">Private</span>
                    )}
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Management Section */}
      {activeSection === 'team' && selectedProject.isShared && (
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">👥</div>
              <span>Team Management</span>
            </div>
          </div>
          <div className="section-content">
            <TeamManagement 
              projectId={selectedProject.id} 
              canManageTeam={selectedProject.canManageTeam ?? selectedProject.isOwner ?? false}
              currentUserId={user?.id}
            />
          </div>
        </div>
      )}

      {/* Activity Log Section */}
      {activeSection === 'activity' && (
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">📊</div>
              <span>Activity Log</span>
            </div>
          </div>
          <div className="section-content">
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