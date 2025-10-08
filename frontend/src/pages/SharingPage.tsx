import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { teamAPI } from '../api';
import type { Project } from '../api/types';
import TeamManagement from '../components/TeamManagement';
import ActivityLog from '../components/ActivityLog';
import ConfirmationModal from '../components/ConfirmationModal';
import { getContrastTextColor } from '../utils/contrastTextColor';

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
        <div className="tabs-container">
          <button 
            className={`tab-button ${activeSection === 'overview' ? 'tab-active' : ''}`}
            style={activeSection === 'overview' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveSection('overview')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Overview
          </button>
          {selectedProject.isShared && (
            <button 
              className={`tab-button ${activeSection === 'team' ? 'tab-active' : ''}`}
              style={activeSection === 'team' ? {color: getContrastTextColor()} : {}}
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
              className={`tab-button ${activeSection === 'activity' ? 'tab-active' : ''}`}
              style={activeSection === 'activity' ? {color: getContrastTextColor()} : {}}
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
                  {selectedProject.isShared ? (
                    <svg className="w-4 h-4 text-base-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
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
                <div className="flex items-center justify-center gap-0 bg-base-200 border-thick rounded-lg p-1 w-fit">
                  <button
                    type="button"
                    onClick={() => {
                      // If making private, show confirmation
                      if (selectedProject.isShared) {
                        setMakePrivateConfirm(true);
                      }
                    }}
                    className={`px-4 sm:px-6 py-2 rounded-md font-semibold transition-all ${
                      !selectedProject.isShared
                        ? 'bg-warning text-warning-content shadow-md'
                        : 'text-base-content/60 hover:text-base-content'
                    }`}
                    style={!selectedProject.isShared ? { color: getContrastTextColor('warning') } : {}}
                  >
                    Private
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // If making shared, just do it directly
                      if (!selectedProject.isShared) {
                        onProjectUpdate(selectedProject.id, { isShared: true }).then(() => {
                          onProjectRefresh();
                        });
                      }
                    }}
                    className={`px-4 sm:px-6 py-2 rounded-md font-semibold transition-all ${
                      selectedProject.isShared
                        ? 'bg-success text-success-content shadow-md'
                        : 'text-base-content/60 hover:text-base-content'
                    }`}
                    style={selectedProject.isShared ? { color: getContrastTextColor('success') } : {}}
                  >
                    Shared
                  </button>
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