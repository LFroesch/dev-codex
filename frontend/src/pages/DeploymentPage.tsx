import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import { getContrastTextColor } from '../utils/contrastTextColor';

interface DeploymentData {
  liveUrl?: string;
  githubRepo?: string;
  deploymentPlatform?: string;
  deploymentStatus?: 'active' | 'inactive' | 'error';
  buildCommand?: string;
  startCommand?: string;
  lastDeployDate?: string;
  deploymentBranch?: string;
  environmentVariables?: Array<{ key: string; value: string }>;
  notes?: string;
}

const DeploymentPage: React.FC = () => {
  const { selectedProject, onProjectUpdate } = useOutletContext<any>();
  const [deploymentData, setDeploymentData] = useState<DeploymentData>({});
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Section visibility states
  const [activeSection, setActiveSection] = useState<'overview' | 'deployment' | 'env' | 'notes'>('overview');
  
  // Confirmation modal state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ 
    isOpen: boolean; 
    index: number; 
    envKey: string 
  }>({ 
    isOpen: false, 
    index: -1, 
    envKey: '' 
  });

  useEffect(() => {
    if (selectedProject) {
      
      const projectDeploymentData = selectedProject.deploymentData || {};
      const loadedData = {
        liveUrl: projectDeploymentData.liveUrl || '',
        githubRepo: projectDeploymentData.githubRepo || '',
        deploymentPlatform: projectDeploymentData.deploymentPlatform || '',
        deploymentStatus: projectDeploymentData.deploymentStatus || 'inactive',
        buildCommand: projectDeploymentData.buildCommand || '',
        startCommand: projectDeploymentData.startCommand || '',
        lastDeployDate: projectDeploymentData.lastDeployDate || '',
        deploymentBranch: projectDeploymentData.deploymentBranch || 'main',
        environmentVariables: projectDeploymentData.environmentVariables || [],
        notes: projectDeploymentData.notes || ''
      };
      
      setDeploymentData(loadedData);
      setHasUnsavedChanges(false);
    }
  }, [selectedProject]);

  const handleSave = async () => {
    if (!selectedProject) return;
    
    
    setLoading(true);
    try {
      await onProjectUpdate(selectedProject.id, {
        deploymentData
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save deployment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof DeploymentData, value: any) => {
    setDeploymentData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const addEnvironmentVariable = () => {
    const currentVars = deploymentData.environmentVariables || [];
    updateField('environmentVariables', [...currentVars, { key: '', value: '' }]);
  };

  const updateEnvironmentVariable = (index: number, field: 'key' | 'value', value: string) => {
    const currentVars = [...(deploymentData.environmentVariables || [])];
    currentVars[index] = { ...currentVars[index], [field]: value };
    updateField('environmentVariables', currentVars);
  };

  const removeEnvironmentVariable = async (index: number) => {
    const currentVars = [...(deploymentData.environmentVariables || [])];
    currentVars.splice(index, 1);

    // Update the deployment data immediately
    const updatedData = { ...deploymentData, environmentVariables: currentVars };
    setDeploymentData(updatedData);

    // Auto-save after removal
    if (selectedProject) {
      setLoading(true);
      try {
        await onProjectUpdate(selectedProject.id, {
          deploymentData: updatedData
        });
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Failed to save after removal:', error);
        setHasUnsavedChanges(true);
      } finally {
        setLoading(false);
      }
    }

    setDeleteConfirmation({ isOpen: false, index: -1, envKey: '' });
  };

  const confirmRemoveEnvironmentVariable = (index: number, envKey: string) => {
    setDeleteConfirmation({ isOpen: true, index, envKey });
  };

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-lg font-semibold mb-2">Select a project</h2>
          <p className="text-base-content/60">Select a project to manage deployment settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Navigation */}
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
        <button 
          className={`tab-button ${activeSection === 'deployment' ? 'tab-active' : ''}`}
          style={activeSection === 'deployment' ? {color: getContrastTextColor()} : {}}
          onClick={() => setActiveSection('deployment')}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Deployment
        </button>
        <button 
          className={`tab-button ${activeSection === 'env' ? 'tab-active' : ''}`}
          style={activeSection === 'env' ? {color: getContrastTextColor()} : {}}
          onClick={() => setActiveSection('env')}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Environment
        </button>
        <button 
          className={`tab-button ${activeSection === 'notes' ? 'tab-active' : ''}`}
          style={activeSection === 'notes' ? {color: getContrastTextColor()} : {}}
          onClick={() => setActiveSection('notes')}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Notes
        </button>
        </div>
      </div>

      {/* Section Content */}
      {activeSection === 'overview' && (
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">
                📊
              </div>
              <span>Deployment Overview</span>
            </div>
          </div>
          <div className="section-content">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-base-200/40 border-thick rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm badge-neutral badge badge-md w-8 h-6">📶</span>
                <span className="font-medium text-sm">Status</span>
              </div>
              <p className="text-sm badge-primary badge badge-md border-2 border-base-content/20 p-2"
              style={{ color: getContrastTextColor("primary") }}>
                {deploymentData.deploymentStatus === 'active' ? '🟢 Active' :
                 deploymentData.deploymentStatus === 'error' ? '🔴 Error' : '🟡 Inactive'}
              </p>
            </div>
            
            <div className="bg-base-200/40 border-thick rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm badge-neutral badge badge-md w-8 h-6">🌐</span>
                <span className="font-medium text-sm">Platform</span>
              </div>
              <p className="text-sm badge-primary badge badge-md border-2 border-base-content/20 p-2"
              style={{ color: getContrastTextColor("primary") }}>
                {deploymentData.deploymentPlatform || 'Not configured'}
              </p>
            </div>
            
            <div className="bg-base-200/40 border-thick rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm badge-neutral badge badge-md w-8 h-6">🔗</span>
                <span className="font-medium text-sm">Live URL</span>
              </div>
              <p className="text-sm truncate badge-primary badge badge-md border-2 border-base-content/20 p-2"
              style={{ color: getContrastTextColor("primary") }}>
                {deploymentData.liveUrl || 'Not configured'}
              </p>
            </div>
            
            <div className="bg-base-200/40 border-thick rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm badge-neutral badge badge-md w-8 h-6">📅</span>
                <span className="font-medium text-sm">Last Deploy</span>
              </div>
              <p className="text-sm badge-primary badge badge-md border-2 border-base-content/20 p-2"
              style={{ color: getContrastTextColor("primary") }}>
                {deploymentData.lastDeployDate ? 
                  new Date(deploymentData.lastDeployDate).toLocaleDateString() : 
                  'Never deployed'}
              </p>
            </div>
          </div>
          
          {deploymentData.liveUrl && (
            <div className="mt-4 ">
              <a 
                href={deploymentData.liveUrl.startsWith('http') ? deploymentData.liveUrl : `https://${deploymentData.liveUrl}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm gap-2 border-2 border-base-content/20 p-3 h-[3rem]"
                onClick={(e) => {
                  const url = deploymentData.liveUrl?.startsWith('http') ? deploymentData.liveUrl : `https://${deploymentData.liveUrl}`;
                  if (!url || url === 'https://') {
                    e.preventDefault();
                    alert('Please enter a valid URL first');
                  }
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke={getContrastTextColor("primary")} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span style={{ color: getContrastTextColor("primary") }}>Open Live Site</span>
              </a>
            </div>
          )}
          </div>
        </div>
      )}

      {activeSection === 'deployment' && (
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">🚀</div>
              <span>Deployment Configuration</span>
              <button
                onClick={handleSave}
                disabled={loading || !hasUnsavedChanges}
                className={`btn btn-sm ml-auto ${hasUnsavedChanges ? 'bg-success border-thick' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
                style={hasUnsavedChanges ? { color: getContrastTextColor('success') } : undefined}
              >
                {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
              </button>
            </div>
          </div>
          <div className="section-content">
            
            {/* Basic Information Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>📋</span>
                Basic Information
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Live URL</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://myapp.com"
                    className="input input-bordered w-full font-mono"
                    value={deploymentData.liveUrl || ''}
                    onChange={(e) => updateField('liveUrl', e.target.value)}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">GitHub Repository</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/username/repo"
                    className="input input-bordered w-full font-mono"
                    value={deploymentData.githubRepo || ''}
                    onChange={(e) => updateField('githubRepo', e.target.value)}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Deployment Platform</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Vercel, Netlify, AWS, Railway, etc."
                    className="input input-bordered w-full font-mono"
                    value={deploymentData.deploymentPlatform || ''}
                    onChange={(e) => updateField('deploymentPlatform', e.target.value)}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Deployment Status</span>
                  </label>
                  <select
                    className="select select-bordered w-full font-mono font-semibold"
                    value={deploymentData.deploymentStatus || 'inactive'}
                    onChange={(e) => updateField('deploymentStatus', e.target.value as 'active' | 'inactive' | 'error')}
                  >
                    <option value="active">🟢 Active</option>
                    <option value="inactive">🟡 Inactive</option>
                    <option value="error">🔴 Error</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Build & Deploy Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>⚙️</span>
                Build & Deploy Settings
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Build Command</span>
                  </label>
                  <input
                    type="text"
                    placeholder="npm run build"
                    className="input input-bordered w-full font-mono"
                    value={deploymentData.buildCommand || ''}
                    onChange={(e) => updateField('buildCommand', e.target.value)}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Start Command</span>
                  </label>
                  <input
                    type="text"
                    placeholder="npm start"
                    className="input input-bordered w-full font-mono"
                    value={deploymentData.startCommand || ''}
                    onChange={(e) => updateField('startCommand', e.target.value)}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Deployment Branch</span>
                  </label>
                  <input
                    type="text"
                    placeholder="main"
                    className="input input-bordered w-full font-mono"
                    value={deploymentData.deploymentBranch || ''}
                    onChange={(e) => updateField('deploymentBranch', e.target.value)}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Last Deploy Date</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="input input-bordered w-full font-mono"
                    value={deploymentData.lastDeployDate ? (() => {
                      try {
                        return new Date(deploymentData.lastDeployDate!).toISOString().slice(0, 16);
                      } catch {
                        return '';
                      }
                    })() : ''}
                    onChange={(e) => updateField('lastDeployDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'env' && (
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-2">
              <div className="section-icon">🔐</div>
              <span className="text-sm sm:text-base truncate">Env Variables</span>
              <div className="flex gap-1 sm:gap-2 ml-auto shrink-0">
                <button
                  onClick={addEnvironmentVariable}
                  className="btn btn-primary btn-sm h-8 sm:h-10 min-h-0"
                  title="Add environment variable"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="hidden md:inline text-xs sm:text-sm">Add</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !hasUnsavedChanges}
                  className={`btn btn-sm h-8 sm:h-10 min-h-0 ${hasUnsavedChanges ? 'bg-success border-thick' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
                  title={loading ? 'Saving...' : hasUnsavedChanges ? 'Save changes' : 'All changes saved'}
                  style={hasUnsavedChanges ? { color: getContrastTextColor('success') } : undefined}
                >
                  {!loading && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span className="hidden md:inline text-xs sm:text-sm">{loading ? 'Saving' : hasUnsavedChanges ? 'Save' : 'Saved'}</span>
                </button>
              </div>
            </div>
          </div>
          <div className="section-content">
            <div className="alert alert-warning bg-warning/50 mb-4">
            <svg className="w-6 h-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm">
              <strong>Security Warning:</strong> Never store actual secrets or API keys here. Use this for documentation only (variable names, with dummy values or locations).
            </span>
          </div>
          
          <div className="space-y-2">
            {(deploymentData.environmentVariables || []).map((envVar, index) => (
              <div key={index} className="flex gap-1 sm:gap-2">
                <input
                  type="text"
                  placeholder="KEY"
                  className="input input-bordered input-sm sm:input-md w-[30%] sm:w-1/3 font-mono text-xs sm:text-sm"
                  value={envVar.key}
                  onChange={(e) => updateEnvironmentVariable(index, 'key', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="value"
                  className="input input-bordered input-sm sm:input-md flex-1 font-mono text-xs sm:text-sm"
                  value={envVar.value}
                  onChange={(e) => updateEnvironmentVariable(index, 'value', e.target.value)}
                />
                <button
                  onClick={() => confirmRemoveEnvironmentVariable(index, envVar.key || `Variable ${index + 1}`)}
                  className="btn btn-error btn-square h-8 sm:h-12 w-8 sm:w-12 min-h-0 shrink-0"
                  title="Remove variable"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {(!deploymentData.environmentVariables || deploymentData.environmentVariables.length === 0) && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-base-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🔐</span>
                </div>
                <h3 className="text-lg font-medium mb-2 text-base-content/80">No environment variables</h3>
                <p className="text-sm text-base-content/60">Add your first environment variable above</p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {activeSection === 'notes' && (
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">📝</div>
              <span>Deployment Notes</span>
              <button
                onClick={handleSave}
                disabled={loading || !hasUnsavedChanges}
                className={`btn btn-sm ml-auto ${hasUnsavedChanges ? 'bg-success border-thick' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
                style={hasUnsavedChanges ? { color: getContrastTextColor('success') } : undefined}
              >
                {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
              </button>
            </div>
          </div>
          <div className="section-content">
            <textarea
              className="textarea textarea-bordered w-full h-64"
              placeholder="Add notes about deployment process, issues, configurations, or any important information..."
              value={deploymentData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onConfirm={() => removeEnvironmentVariable(deleteConfirmation.index)}
        onCancel={() => setDeleteConfirmation({ isOpen: false, index: -1, envKey: '' })}
        title="Remove Environment Variable"
        message={`Are you sure you want to remove the environment variable "${deleteConfirmation.envKey}"?`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
};

export default DeploymentPage;