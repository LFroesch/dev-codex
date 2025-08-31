import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';

interface PublicVisibilityOptions {
  description: boolean;
  tags: boolean;
  links: boolean;
  docs: boolean;
  techStack: boolean;
  timestamps: boolean;
}

const PublicPage: React.FC = () => {
  const { selectedProject, onProjectUpdate } = useOutletContext<any>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [isPublic, setIsPublic] = useState(false);
  const [publicSlug, setPublicSlug] = useState('');
  const [publicDescription, setPublicDescription] = useState('');
  
  // Visibility controls
  const [visibilityOptions, setVisibilityOptions] = useState<PublicVisibilityOptions>({
    description: true,
    tags: true,
    links: true,
    docs: true,
    techStack: true,
    timestamps: true,
  });

  
  // Section navigation state
  const [activeSection, setActiveSection] = useState<'overview' | 'sharing' | 'url' | 'visibility' | 'privacy'>('overview');

  useEffect(() => {
    if (selectedProject) {
      setIsPublic(selectedProject.isPublic || false);
      setPublicSlug(selectedProject.publicSlug || '');
      setPublicDescription(selectedProject.publicDescription || '');
      
      // Load visibility options from project or set defaults
      if (selectedProject.publicVisibility) {
        setVisibilityOptions(selectedProject.publicVisibility);
      }
    }
  }, [selectedProject]);

  const generateSlugFromName = () => {
    if (selectedProject?.name) {
      const slug = selectedProject.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      setPublicSlug(slug);
    }
  };

  const toggleVisibilityOption = (key: keyof PublicVisibilityOptions) => {
    setVisibilityOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleAllVisibility = (value: boolean) => {
    setVisibilityOptions(prev => 
      Object.keys(prev).reduce((acc, key) => ({
        ...acc,
        [key]: value
      }), {} as PublicVisibilityOptions)
    );
  };

  const handleSave = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await onProjectUpdate(selectedProject.id, {
        isPublic,
        publicSlug: publicSlug.trim() || undefined,
        publicDescription: publicDescription.trim() || undefined,
        publicVisibility: visibilityOptions
      });
      setSuccess('Public settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save public settings');
    } finally {
      setLoading(false);
    }
  };

  const copyPublicUrl = () => {
    const url = `${window.location.origin}/project/${publicSlug || selectedProject?.id}`;
    navigator.clipboard.writeText(url);
    setSuccess('Public URL copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const hasChanges = () => {
    if (!selectedProject) return false;
    
    const currentVisibility = selectedProject.publicVisibility || {
      description: true,
      tags: true,
      links: true,
      docs: true,
      techStack: true,
      timestamps: true,
    };
    
    const visibilityChanged = Object.keys(visibilityOptions).some(
      key => visibilityOptions[key as keyof PublicVisibilityOptions] !== currentVisibility[key as keyof PublicVisibilityOptions]
    );
    
    return (
      isPublic !== (selectedProject.isPublic || false) ||
      publicSlug !== (selectedProject.publicSlug || '') ||
      publicDescription !== (selectedProject.publicDescription || '') ||
      visibilityChanged
    );
  };

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">🌐</div>
          <h2 className="text-2xl font-semibold mb-4">No project selected</h2>
          <p className="text-base-content/60">Select a project to configure its public sharing settings</p>
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
        <button 
          className={`tab ${activeSection === 'sharing' ? 'tab-active' : ''}`}
          onClick={() => setActiveSection('sharing')}
        >
          Public Settings
        </button>
        {isPublic && (
          <>
            <button 
              className={`tab ${activeSection === 'url' ? 'tab-active' : ''}`}
              onClick={() => setActiveSection('url')}
            >
              URL & Preview
            </button>
            <button 
              className={`tab ${activeSection === 'visibility' ? 'tab-active' : ''}`}
              onClick={() => setActiveSection('visibility')}
            >
              Visibility Controls
            </button>
            <button 
              className={`tab ${activeSection === 'privacy' ? 'tab-active' : ''}`}
              onClick={() => setActiveSection('privacy')}
            >
              Privacy Info
            </button>
          </>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="alert alert-success shadow-md mb-6">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error shadow-md mb-6">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
              <h2 className="text-xl font-bold mb-0">Public Sharing Overview</h2>
            </div>
            <button
              onClick={handleSave}
              disabled={loading || !hasChanges()}
              className={`btn ${hasChanges() ? 'btn-primary' : 'btn-ghost'}`}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Saving...
                </>
              ) : hasChanges() ? (
                'Save Changes'
              ) : (
                'Saved'
              )}
            </button>
          </div>
          
          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
            <div className="flex items-center gap-4 mb-4">
              <div 
                className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: selectedProject.color }}
              >
                {selectedProject.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold">{selectedProject.name}</h3>
                <p className="text-base-content/70 mb-2">{selectedProject.description}</p>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${isPublic ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                    {isPublic ? '🌐 Public' : '🔒 Private'}
                  </span>
                  {isPublic && (
                    <span className="text-sm text-base-content/60">
                      Accessible at: /project/{publicSlug || selectedProject.id}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {isPublic && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={copyPublicUrl}
                  className="btn btn-outline btn-sm gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy URL
                </button>
                <Link
                  to={`/project/${publicSlug || selectedProject.id}`}
                  className="btn btn-outline btn-sm gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  View Public Page
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sharing Settings Section */}
      {activeSection === 'sharing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
              <h2 className="text-xl font-bold mb-0">🌐 Public Settings</h2>
            </div>
            <button
              onClick={handleSave}
              disabled={loading || !hasChanges()}
              className={`btn ${hasChanges() ? 'btn-primary' : 'btn-ghost'}`}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Saving...
                </>
              ) : hasChanges() ? (
                'Save Changes'
              ) : (
                'Saved'
              )}
            </button>
          </div>
          
          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
            <div className="form-control">
              <label className="label cursor-pointer">
                <div className="flex-1">
                  <span className="label-text text-lg font-semibold">🔓 Make Project Public</span>
                  <p className="text-sm text-base-content/60 mt-1">
                    Enable this to make your project discoverable in the community discover page. 
                    Others will be able to view your project details, tech stack, and documentation.
                  </p>
                  {isPublic && (
                    <p className="text-sm text-success font-medium mt-2">
                      ✅ Your project is publicly accessible
                    </p>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-lg"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* URL & Preview Section */}
      {activeSection === 'url' && isPublic && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
              <h2 className="text-xl font-bold mb-0">🔗 URL & Preview</h2>
            </div>
            <button
              onClick={handleSave}
              disabled={loading || !hasChanges()}
              className={`btn ${hasChanges() ? 'btn-primary' : 'btn-ghost'}`}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Saving...
                </>
              ) : hasChanges() ? (
                'Save Changes'
              ) : (
                'Saved'
              )}
            </button>
          </div>
          
          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4 space-y-4">
            {/* Custom Slug */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Custom URL Slug (Optional)</span>
                <span className="label-text-alt">
                  <button
                    type="button"
                    onClick={generateSlugFromName}
                    className="btn btn-ghost btn-xs"
                  >
                    Generate from name
                  </button>
                </span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                <span className="bg-base-200 px-3 py-2 text-sm sm:text-base text-base-content/70 rounded-lg sm:rounded-r-none sm:rounded-l-lg border border-base-300 sm:border-r-0">
                  {window.location.origin}/project/
                </span>
                <input
                  type="text"
                  className="input input-bordered flex-1 rounded-lg sm:rounded-l-none sm:rounded-r-lg"
                  placeholder={selectedProject.id}
                  value={publicSlug}
                  onChange={(e) => setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  pattern="^[a-z0-9-]+$"
                />
              </div>
              <div className="label">
                <span className="label-text-alt">
                  {publicSlug ? (
                    <>Your project will be accessible at: <Link 
                      to={`/project/${publicSlug}`} 
                      className="link link-primary font-bold"
                    >
                      /project/{publicSlug}
                    </Link></>
                  ) : (
                    <>Your project will be accessible at: <Link 
                      to={`/project/${selectedProject.id}`} 
                      className="link link-primary font-bold"
                    >
                      /project/{selectedProject.id}
                    </Link></>
                  )}
                </span>
              </div>
            </div>

            {/* Public Description */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Public Description (Optional)</span>
                <span className="label-text-alt">
                  {publicDescription.length}/300 characters
                </span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24 resize-none"
                placeholder="Describe your project for public viewers (will override the regular description)"
                value={publicDescription}
                onChange={(e) => setPublicDescription(e.target.value.slice(0, 300))}
              />
              <div className="label">
                <span className="label-text-alt">
                  Leave empty to use your regular project description: "{selectedProject.description}"
                </span>
              </div>
            </div>

            {/* Preview */}
            <div className="divider">Preview</div>
            <div className="mockup-browser border bg-base-300">
              <div className="mockup-browser-toolbar">
                <div className="input">
                  {window.location.origin}/project/{publicSlug || selectedProject.id}
                </div>
              </div>
              <div className="bg-base-100 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-white"
                    style={{ backgroundColor: selectedProject.color }}
                  >
                    {selectedProject.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedProject.name}</h3>
                    <p className="text-sm text-base-content/70">
                      {publicDescription || selectedProject.description}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="badge badge-primary badge-sm">{selectedProject.category}</span>
                  {selectedProject.tags?.slice(0, 3).map((tag: string, index: number) => (
                    <span key={index} className="badge badge-outline badge-sm">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visibility Controls Section */}
      {activeSection === 'visibility' && isPublic && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
              <h2 className="text-xl font-bold mb-0">🔧 Visibility Controls</h2>
            </div>
            <button
              onClick={handleSave}
              disabled={loading || !hasChanges()}
              className={`btn ${hasChanges() ? 'btn-primary' : 'btn-ghost'}`}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Saving...
                </>
              ) : hasChanges() ? (
                'Save Changes'
              ) : (
                'Saved'
              )}
            </button>
          </div>
          
          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
            <p className="text-sm text-base-content/60 mb-4">
              Choose what information to include on your public project page.
            </p>
            
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium">
                Select Information ({Object.values(visibilityOptions).filter(Boolean).length}/{Object.keys(visibilityOptions).length})
              </span>
              <div className="flex gap-2">
                <button onClick={() => toggleAllVisibility(true)} className="btn btn-ghost btn-xs">
                  Show All
                </button>
                <button onClick={() => toggleAllVisibility(false)} className="btn btn-ghost btn-xs">
                  Hide All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(visibilityOptions).map(([key, checked]) => (
                <label key={key} className="label cursor-pointer justify-start p-2 border border-base-content/10 rounded-lg hover:bg-base-200/50">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm mr-3"
                    checked={checked}
                    onChange={() => toggleVisibilityOption(key as keyof PublicVisibilityOptions)}
                  />
                  <span className="label-text text-sm font-medium capitalize">
                    {key === 'techStack' ? 'Tech Stack' : key}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Privacy Info Section */}
      {activeSection === 'privacy' && isPublic && (
        <div className="space-y-4">
          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
            <h2 className="text-xl font-bold mb-0">📋 Privacy Information</h2>
          </div>
          
          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-success">✅ Always Included</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success"></div>
                    Project name and category
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success"></div>
                    Project color/theme
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success"></div>
                    Your name (if profile public)
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-error">❌ Never Included</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-error"></div>
                    Notes and todos
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-error"></div>
                    Development log entries
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-error"></div>
                    Team member information
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-error"></div>
                    Internal project data
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-4 bg-info/10 rounded-lg border border-info/20">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-info mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h5 className="font-medium text-info mb-1">Privacy & Control</h5>
                  <p className="text-sm text-base-content/70">
                    Use the visibility controls above to customize what appears on your public page. 
                    You can disable public sharing at any time. Your private information always remains secure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicPage;