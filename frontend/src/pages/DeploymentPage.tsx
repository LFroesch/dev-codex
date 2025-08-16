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

  useEffect(() => {
    if (selectedProject) {
      console.log('Loading deployment data from project:', {
        selectedProject,
        deploymentData: selectedProject.deploymentData
      });
      
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
      
      console.log('Setting deployment data to:', loadedData);
      setDeploymentData(loadedData);
      setHasUnsavedChanges(false);
    }
  }, [selectedProject]);

  const handleSave = async () => {
    if (!selectedProject) return;
    
    console.log('Saving deployment data:', {
      projectId: selectedProject.id,
      deploymentData: deploymentData
    });
    
    setLoading(true);
    try {
      const response = await onProjectUpdate(selectedProject.id, {
        deploymentData
      });
      console.log('Save response:', response);
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
          <h2 className="text-2xl font-semibold mb-4">No project selected</h2>
          <p className="text-base-content/60">Select a project to manage deployment settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Deployment</h1>
          <p className="text-base-content/60 mt-1">Manage deployment settings, commands, and environment configuration</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading || !hasUnsavedChanges}
          className={`btn ${hasUnsavedChanges ? 'btn-primary' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
        >
          {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Deployment Info */}
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">Basic Information</h2>
            
            <div className="form-control mb-4">
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

            <div className="form-control mb-4">
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

            <div className="form-control mb-4">
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

        {/* Build & Deploy Commands */}
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">Build & Deploy</h2>
            
            <div className="form-control mb-4">
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

            <div className="form-control mb-4">
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

            <div className="form-control mb-4">
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


        {/* Environment Variables */}
        <div className="card bg-base-200 shadow-lg lg:col-span-2">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title text-xl">Environment Variables</h2>
              <button
                onClick={addEnvironmentVariable}
                className="btn btn-primary btn-sm"
              >
                Add Variable
              </button>
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
                <p className="text-base-content/60 text-center py-4">No environment variables configured</p>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card bg-base-200 shadow-lg lg:col-span-2">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">📝 Deployment Notes</h2>
            <textarea
              className="textarea textarea-bordered w-full h-32"
              placeholder="Add notes about deployment process, issues, or configurations..."
              value={deploymentData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeploymentPage;