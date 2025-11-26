import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { getContrastTextColor } from '../utils/contrastTextColor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PublicVisibilityOptions {
  description: boolean;
  tags: boolean;
  components: boolean;
  techStack: boolean;
  timestamps: boolean;
}

const PublicPage: React.FC = () => {
  const { selectedProject, onProjectUpdate, activePublicTab } = useOutletContext<any>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [isPublic, setIsPublic] = useState(false);
  const [publicSlug, setPublicSlug] = useState('');
  const [publicShortDescription, setPublicShortDescription] = useState('');
  const [publicDescription, setPublicDescription] = useState('');

  // Visibility controls
  const [visibilityOptions, setVisibilityOptions] = useState<PublicVisibilityOptions>({
    description: true,
    tags: true,
    components: true,
    techStack: true,
    timestamps: true,
  });

  useEffect(() => {
    if (selectedProject) {
      setIsPublic(selectedProject.isPublic || false);
      setPublicSlug(selectedProject.publicSlug || '');
      setPublicShortDescription(selectedProject.publicShortDescription || '');
      setPublicDescription(selectedProject.publicDescription || '');

      // Load visibility options from project or set defaults
      if (selectedProject.publicVisibility) {
        setVisibilityOptions(selectedProject.publicVisibility);
      }
    }
  }, [selectedProject?.id]); // Only reset form when project ID changes, not on every selectedProject update

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
        publicShortDescription: publicShortDescription.trim() || undefined,
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
      components: true,
      techStack: true,
      timestamps: true,
    };
    
    const visibilityChanged = Object.keys(visibilityOptions).some(
      key => visibilityOptions[key as keyof PublicVisibilityOptions] !== currentVisibility[key as keyof PublicVisibilityOptions]
    );
    
    return (
      isPublic !== (selectedProject.isPublic || false) ||
      publicSlug !== (selectedProject.publicSlug || '') ||
      publicShortDescription !== (selectedProject.publicShortDescription || '') ||
      publicDescription !== (selectedProject.publicDescription || '') ||
      visibilityChanged
    );
  };

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-4">No project selected</h2>
          <p className="text-base-content/60">Select a project to configure its public sharing settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {/* Overview & Settings Section */}
      {activePublicTab === 'overview' && (
        <div className="space-y-4">
          {/* Overview */}
          <div className="section-container mb-4">
            <div className="section-header">
              <div className="flex items-center gap-3">
                <div className="section-icon">📊</div>
                <span>Public Sharing Overview</span>
              </div>
            </div>
            <div className="section-content">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4">
              <div className="flex-1 w-full">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3
                    className="text-lg sm:text-xl font-semibold px-2 sm:px-3 py-1 rounded-md inline-block border border-thick border-base-content/20 capitalize"
                    style={{
                      backgroundColor: selectedProject.color,
                      color: getContrastTextColor(selectedProject.color)
                    }}
                  >
                    {selectedProject.name}
                  </h3>
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium text-base-content border border-thick border-base-content/20 ${isPublic ? 'bg-success' : 'bg-warning'}`}
                  style={{
                    color: isPublic ? getContrastTextColor('success') : getContrastTextColor('warning')
                  }}>
                    {isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
                <p className="text-sm sm:text-base text-base-content/70 -mb-1">{selectedProject.description}</p>
              </div>
            </div>
            
            {isPublic && (
              <div className="flex flex-col sm:flex-row gap-2">
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
                  className="btn btn-outline btn-sm gap-2 truncate"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <span className="truncate">View: /project/{publicSlug || selectedProject.id}</span>
                </Link>
              </div>
            )}
            </div>
          </div>

          {/* Public Settings */}
          <div className="section-container mb-4">
            <div className="section-header">
              <div className="flex items-center gap-3">
                <div className="section-icon">🌐</div>
                <span>Public Settings</span>
                <button
                  onClick={handleSave}
                  disabled={loading || !hasChanges()}
                  className={`btn ml-auto ${hasChanges() ? 'btn-primary' : 'btn-ghost'}`}
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
            </div>
            <div className="section-content">
            <div className="space-y-3">
              <p className="text-sm text-base-content/60">
                Toggle your project's visibility in the community discover page.
                <br />
                Others will be able to view your project details, tech stack, and documentation.
              </p>

              <div className="flex items-center justify-center gap-0 bg-base-200 border-thick rounded-lg p-1 w-fit mx-auto sm:mx-0">
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`px-4 sm:px-6 py-2 rounded-md font-semibold transition-all ${
                    !isPublic
                      ? 'bg-warning text-warning-content shadow-md'
                      : 'text-base-content/60 hover:text-base-content'
                  }`}
                  style={!isPublic ? { color: getContrastTextColor('warning') } : {}}
                >
                  Private
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`px-4 sm:px-6 py-2 rounded-md font-semibold transition-all ${
                    isPublic
                      ? 'bg-success text-success-content shadow-md'
                      : 'text-base-content/60 hover:text-base-content'
                  }`}
                  style={isPublic ? { color: getContrastTextColor('success') } : {}}
                >
                  Public
                </button>
              </div>

              {isPublic && (
                <p className="text-sm bg-success inline-block rounded-lg px-3 py-2 font-medium border-thick"
                style={{ color: getContrastTextColor('success') }}>
                  ☑️ Your project is publicly accessible
                </p>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* URL & Preview Section */}
      {activePublicTab === 'url' && isPublic && (
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">🔗</div>
              <span>URL & Preview</span>
              <button
                onClick={handleSave}
                disabled={loading || !hasChanges()}
                className={`btn ml-auto ${hasChanges() ? 'btn-primary' : 'btn-ghost'}`}
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
          </div>
          <div className="section-content">
            <div className="space-y-4">
            {/* Custom Slug */}
            <div className="form-control">
              <div className="label flex-col sm:flex-row justify-start items-start gap-2">
                <span className="label-text font-medium text-sm sm:text-base">Custom URL Slug:</span>
                <span className="label-text-alt text-xs flex flex-wrap items-center gap-1">
                  <span className="hidden sm:inline">Accessible at:</span>
                  {publicSlug ? (
                    <Link
                      to={`/project/${publicSlug}`}
                      className="font-bold bg-primary/50 rounded-lg px-2 py-0.5 text-xs border border-base-content/20 hover:bg-primary transition inline-flex items-center gap-1"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      <span className="truncate max-w-[120px]">/project/{publicSlug}</span>
                    </Link>
                  ) : (
                    <Link
                      to={`/project/${selectedProject.id}`}
                      className="font-bold bg-primary/50 rounded-lg px-2 py-0.5 text-xs border border-base-content/20 hover:bg-primary transition inline-flex items-center gap-1"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      <span className="truncate max-w-[120px]">/project/{selectedProject.id}</span>
                    </Link>
                  )}
                </span>
                <span className="label-text-alt sm:ml-auto">
                  <button
                    type="button"
                    onClick={generateSlugFromName}
                    className="btn btn-ghost btn-xs text-xs bg-base-200 border border-base-content/20 hover:bg-base-300"
                  >
                    Generate
                  </button>
                </span>
              </div>
              <div className="flex flex-row border-2 border-base-content/20 rounded-lg overflow-hidden">
                <span className="bg-base-200 px-2 sm:px-3 py-2 text-xs sm:text-sm text-base-content/70 flex items-center whitespace-nowrap">
                  <span className="hidden md:inline">{window.location.origin}/project/</span>
                  <span className="md:hidden">...project/</span>
                </span>
                <input
                  type="text"
                  className="input flex-1 border-none text-xs sm:text-sm w-0 min-w-0"
                  placeholder={selectedProject.id}
                  value={publicSlug}
                  onChange={(e) => setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
              </div>
            </div>

            {/* Short Description */}
            <div className="form-control">
              <label className="label flex-col sm:flex-row justify-start items-start gap-2">
                <span className="label-text font-medium">Short Description:</span>
                <span className="label-text-alt text-xs">
                  Shown in search/discovery (keep it concise!)
                </span>
                <span className="label-text-alt sm:ml-auto px-2 rounded-lg py-0.5 text-xs font-semibold bg-base-200 border border-thick border-base-content/20">
                  {publicShortDescription.length}/500
                </span>
              </label>
              <textarea
                className="textarea textarea-bordered resize-y text-sm min-h-20"
                placeholder="A brief overview of your project (1-2 sentences)"
                value={publicShortDescription}
                onChange={(e) => setPublicShortDescription(e.target.value.slice(0, 500))}
              />
              <div className="label">
                <span className="label-text-alt text-xs text-base-content/60">
                  This appears in discovery cards. Keep it under 200 characters for best results.
                </span>
              </div>
            </div>

            {/* README / Full Description */}
            <div className="form-control">
              <label className="label flex-col sm:flex-row justify-start items-start gap-2">
                <span className="label-text font-medium">README (Optional):</span>
                <span className="label-text-alt text-xs">
                  Full project documentation with Markdown support
                </span>
                <span className="label-text-alt sm:ml-auto px-2 rounded-lg py-0.5 text-xs font-semibold bg-base-200 border border-thick border-base-content/20">
                  {publicDescription.length}/10,000
                </span>
              </label>
              <textarea
                className="textarea textarea-bordered resize-y text-sm min-h-32"
                placeholder="Write your project's README using Markdown formatting..."
                value={publicDescription}
                onChange={(e) => setPublicDescription(e.target.value.slice(0, 10000))}
              />
              <div className="mt-2 p-3 bg-primary/10 rounded-lg border-2 border-primary/30">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h5 className="font-semibold text-primary mb-1">Full Markdown Support</h5>
                    <p className="text-xs text-base-content/70 mb-2">
                      This appears in its own README tab on your project page. Use Markdown for rich formatting.
                    </p>
                    <p className="text-xs text-base-content/60 font-mono">
                      **bold** | *italic* | [links](url) | `code` | lists & more
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="divider text-sm sm:text-base">Preview</div>
            <div className="mockup-browser border border-thick border-base-content/20 bg-base-300">
              <div className="mockup-browser-toolbar">
                <div className="input text-xs sm:text-sm truncate">
                  {window.location.origin}/project/{publicSlug || selectedProject.id}
                </div>
              </div>
              <div className="bg-base-100 p-3 sm:p-4">
                <div className="flex flex-col gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className="text-lg font-semibold px-2 py-1 rounded-md inline-block capitalize"
                      style={{
                        backgroundColor: selectedProject.color,
                        color: getContrastTextColor(selectedProject.color)
                      }}
                    >
                      {selectedProject.name}
                    </h3>
                    <span className="badge badge-primary badge-sm h-6 border-2 border-base-content/20 font-semibold capitalize"
                    style={{ color: getContrastTextColor("primary") }}>{selectedProject.category}</span>
                    {selectedProject.tags?.slice(0, 3).map((tag: string, index: number) => (
                      <span key={index} className="badge badge-outline badge-sm h-6 border-2 border-base-content/20 font-semibold capitalize">{tag}</span>
                    ))}
                  </div>
                  {publicShortDescription && (
                    <div className="mt-2">
                      <p className="text-sm text-base-content/80 leading-relaxed">
                        {publicShortDescription}
                      </p>
                    </div>
                  )}
                  {publicDescription && (
                    <div className="mt-3 pt-3 border-t border-base-content/20">
                      <h4 className="text-sm font-bold mb-2">README</h4>
                      <div className="prose prose-sm max-w-none text-base-content/70">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {publicDescription}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Visibility & Privacy Section */}
      {activePublicTab === 'visibility' && isPublic && (
        <div className="space-y-4">
          {/* Visibility Controls */}
          <div className="section-container mb-4">
            <div className="section-header">
              <div className="flex items-center gap-3">
                <div className="section-icon">🔧</div>
                <span>Visibility Controls</span>
                <button
                  onClick={handleSave}
                  disabled={loading || !hasChanges()}
                  className={`btn ml-auto ${hasChanges() ? 'btn-primary' : 'btn-ghost'}`}
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
            </div>
            <div className="section-content">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="label cursor-pointer justify-start p-3 card-interactive">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary mr-3"
                  checked={visibilityOptions.description}
                  onChange={() => toggleVisibilityOption('description')}
                />
                <div className="flex-1">
                  <span className="label-text font-medium block">Description</span>
                  <span className="label-text-alt text-xs opacity-70">Show project description</span>
                </div>
              </label>

              <label className="label cursor-pointer justify-start p-3 card-interactive">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary mr-3"
                  checked={visibilityOptions.tags}
                  onChange={() => toggleVisibilityOption('tags')}
                />
                <div className="flex-1">
                  <span className="label-text font-medium block">Tags</span>
                  <span className="label-text-alt text-xs opacity-70">Show project tags</span>
                </div>
              </label>

              <label className="label cursor-pointer justify-start p-3 card-interactive">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary mr-3"
                  checked={visibilityOptions.components}
                  onChange={() => toggleVisibilityOption('components')}
                />
                <div className="flex-1">
                  <span className="label-text font-medium block">Architecture & Components</span>
                  <span className="label-text-alt text-xs opacity-70">Show models, routes, APIs, utils</span>
                </div>
              </label>

              <label className="label cursor-pointer justify-start p-3 card-interactive">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary mr-3"
                  checked={visibilityOptions.techStack}
                  onChange={() => toggleVisibilityOption('techStack')}
                />
                <div className="flex-1">
                  <span className="label-text font-medium block">Tech Stack</span>
                  <span className="label-text-alt text-xs opacity-70">Show technologies & frameworks</span>
                </div>
              </label>

              <label className="label cursor-pointer justify-start p-3 card-interactive">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary mr-3"
                  checked={visibilityOptions.timestamps}
                  onChange={() => toggleVisibilityOption('timestamps')}
                />
                <div className="flex-1">
                  <span className="label-text font-medium block">Timestamps</span>
                  <span className="label-text-alt text-xs opacity-70">Show created/updated dates</span>
                </div>
              </label>
            </div>
            </div>
          </div>

          {/* Privacy Information */}
          <div className="section-container mb-4">
            <div className="section-header">
              <div className="flex items-center gap-3">
                <div className="section-icon">📋</div>
                <span>Privacy Information</span>
              </div>
            </div>
            <div className="section-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-base-content border-thick inline-block p-1 rounded-lg bg-base-200">✅ Always Included</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-base-content"></div>
                    Project name and category
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-base-content"></div>
                    Project color/theme
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-base-content"></div>
                    Your name/username
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-base-content border-thick inline-block p-1 rounded-lg bg-base-200">❌ Never Included</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-base-content"></div>
                    Notes and todos
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-base-content"></div>
                    Development log entries
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-base-content"></div>
                    Team member information
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-base-content"></div>
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
                <div className="">
                  <h5 className="font-medium text-info mb-1">Privacy & Control</h5>
                  <p className="text-sm text-base-content/70">
                    Use the visibility controls above to customize what appears on your public page.
                    < br />
                    You can disable public sharing at any time. Your private information always remains secure.
                  </p>
                </div>
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