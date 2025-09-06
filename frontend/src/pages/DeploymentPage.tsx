import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

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
  const [activeSection, setActiveSection] = useState<'overview' | 'basic' | 'build' | 'env' | 'notes'>('overview');

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

  const removeEnvironmentVariable = (index: number) => {
    const currentVars = [...(deploymentData.environmentVariables || [])];
    currentVars.splice(index, 1);
    updateField('environmentVariables', currentVars);
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
        <button 
          className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'basic' ? 'tab-active' : ''}`}
          onClick={() => setActiveSection('basic')}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Basic Info
        </button>
        <button 
          className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'build' ? 'tab-active' : ''}`}
          onClick={() => setActiveSection('build')}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Build & Deploy
        </button>
        <button 
          className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'env' ? 'tab-active' : ''}`}
          onClick={() => setActiveSection('env')}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Environment
        </button>
        <button 
          className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'notes' ? 'tab-active' : ''}`}
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
        <div className="border-2 border-base-content/20 rounded-lg mb-4 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-xl">📊</span>
              <span className='px-2 py-1 rounded-md bg-base-300 inline-block w-fit'>Deployment Overview</span>
            </h2>

          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-base-200 border-thick rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm badge-neutral badge badge-md">📶</span>
                <span className="font-medium text-sm">Status</span>
              </div>
              <p className="text-sm badge-primary badge badge-md">
                {deploymentData.deploymentStatus === 'active' ? '🟢 Active' :
                 deploymentData.deploymentStatus === 'error' ? '🔴 Error' : '🟡 Inactive'}
              </p>
            </div>
            
            <div className="bg-base-200 border-thick rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm badge-neutral badge badge-md">🌐</span>
                <span className="font-medium text-sm">Platform</span>
              </div>
              <p className="text-sm badge-primary badge badge-md">{deploymentData.deploymentPlatform || 'Not configured'}</p>
            </div>
            
            <div className="bg-base-200 border-thick rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm badge-neutral badge badge-md">🔗</span>
                <span className="font-medium text-sm">Live URL</span>
              </div>
              <p className="text-sm truncate badge-primary badge badge-md">{deploymentData.liveUrl || 'Not configured'}</p>
            </div>
            
            <div className="bg-base-200 border-thick rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm badge-neutral badge badge-md">📅</span>
                <span className="font-medium text-sm">Last Deploy</span>
              </div>
              <p className="text-sm badge-primary badge badge-md">
                {deploymentData.lastDeployDate ? 
                  new Date(deploymentData.lastDeployDate).toLocaleDateString() : 
                  'Never deployed'}
              </p>
            </div>
          </div>
          
          {deploymentData.liveUrl && (
            <div className="mt-4">
              <a 
                href={deploymentData.liveUrl.startsWith('http') ? deploymentData.liveUrl : `https://${deploymentData.liveUrl}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm gap-2"
                onClick={(e) => {
                  const url = deploymentData.liveUrl?.startsWith('http') ? deploymentData.liveUrl : `https://${deploymentData.liveUrl}`;
                  if (!url || url === 'https://') {
                    e.preventDefault();
                    alert('Please enter a valid URL first');
                  }
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Live Site
              </a>
            </div>
          )}
        </div>
      )}

      {activeSection === 'basic' && (
        <div className="border-2 border-base-content/20 rounded-lg mb-4 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-xl">📋</span>
              <span className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">Basic Information</span>
            </h2>
            <button
              onClick={handleSave}
              disabled={loading || !hasUnsavedChanges}
              className={`btn btn-sm ${hasUnsavedChanges ? 'btn-primary' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
            >
              {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Live URL</span>
              </label>
              <input
                type="url"
                placeholder="https://myapp.com"
                className="input input-bordered w-full"
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
                className="input input-bordered w-full"
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
                className="input input-bordered w-full"
                value={deploymentData.deploymentPlatform || ''}
                onChange={(e) => updateField('deploymentPlatform', e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Deployment Status</span>
              </label>
              <select
                className="select select-bordered w-full"
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
      )}

      {activeSection === 'build' && (
        <div className="border-2 border-base-content/20 rounded-lg mb-4 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              <span className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">Build & Deploy</span>
            </h2>
            <button
              onClick={handleSave}
              disabled={loading || !hasUnsavedChanges}
              className={`btn btn-sm ${hasUnsavedChanges ? 'btn-primary' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
            >
              {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
            </button>
          </div>
          
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
                className="input input-bordered w-full"
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
      )}

      {activeSection === 'env' && (
        <div className="border-2 border-base-content/20 rounded-lg mb-4 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-xl">🔐</span>
              <span className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">Environment Variables</span>
            </h2>
            <div className="flex gap-2">
              <button
                onClick={addEnvironmentVariable}
                className="btn btn-primary btn-sm"
              >
                Add Variable
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !hasUnsavedChanges}
                className={`btn btn-sm ${hasUnsavedChanges ? 'btn-primary' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
              >
                {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
              </button>
            </div>
          </div>
          
          <div className="alert alert-warning mb-4">
            <svg className="w-6 h-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm">
              <strong>Security Warning:</strong> Never store actual secrets or API keys here. Use this for documentation only (variable names, with dummy values or locations).
            </span>
          </div>
          
          <div className="space-y-2">
            {(deploymentData.environmentVariables || []).map((envVar, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Key"
                  className="input input-bordered w-1/3 font-mono"
                  value={envVar.key}
                  onChange={(e) => updateEnvironmentVariable(index, 'key', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Value"
                  className="input input-bordered flex-1 font-mono"
                  value={envVar.value}
                  onChange={(e) => updateEnvironmentVariable(index, 'value', e.target.value)}
                />
                <button
                  onClick={() => removeEnvironmentVariable(index)}
                  className="btn btn-error btn-sm"
                >
                  Remove
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
      )}

      {activeSection === 'notes' && (
        <div className="border-2 border-base-content/20 rounded-lg mb-4 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-xl">📝</span>
              <span className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">Deployment Notes</span>
            </h2>
            <button
              onClick={handleSave}
              disabled={loading || !hasUnsavedChanges}
              className={`btn btn-sm ${hasUnsavedChanges ? 'btn-primary' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
            >
              {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
            </button>
          </div>
          <textarea
            className="textarea textarea-bordered w-full h-64"
            placeholder="Add notes about deployment process, issues, configurations, or any important information..."
            value={deploymentData.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
          />
        </div>
      )}
    </div>
  );
};

export default DeploymentPage;