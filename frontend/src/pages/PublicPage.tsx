import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { projectAPI } from '../api/client';

interface PublicPageData {
  isPublic?: boolean;
  publicTitle?: string;
  publicDescription?: string;
  publicTags?: string[];
  publicBanner?: string;
  showProgress?: boolean;
  showTechStack?: boolean;
  showTeamMembers?: boolean;
  customSections?: Array<{ title: string; content: string; order: number }>;
  publicUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  socialImage?: string;
}

const PublicPage: React.FC = () => {
  const { selectedProject, onProjectUpdate } = useOutletContext<any>();
  const [publicData, setPublicData] = useState<PublicPageData>({});
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (selectedProject?.publicPageData) {
      setPublicData(selectedProject.publicPageData);
    }
  }, [selectedProject]);

  const handleSave = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    try {
      await onProjectUpdate(selectedProject.id, {
        publicPageData: publicData
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save public page data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof PublicPageData, value: any) => {
    setPublicData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const addTag = () => {
    if (newTag.trim() && !publicData.publicTags?.includes(newTag.trim())) {
      const currentTags = publicData.publicTags || [];
      updateField('publicTags', [...currentTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = publicData.publicTags || [];
    updateField('publicTags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const addCustomSection = () => {
    const currentSections = publicData.customSections || [];
    const nextOrder = Math.max(...currentSections.map(s => s.order), 0) + 1;
    updateField('customSections', [
      ...currentSections,
      { title: 'New Section', content: '', order: nextOrder }
    ]);
  };

  const updateCustomSection = (index: number, field: 'title' | 'content', value: string) => {
    const currentSections = [...(publicData.customSections || [])];
    currentSections[index] = { ...currentSections[index], [field]: value };
    updateField('customSections', currentSections);
  };

  const removeCustomSection = (index: number) => {
    const currentSections = [...(publicData.customSections || [])];
    currentSections.splice(index, 1);
    updateField('customSections', currentSections);
  };

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">No project selected</h2>
          <p className="text-base-content/60">Select a project to manage its public page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Public Page</h1>
          <p className="text-base-content/60 mt-1">Configure your project's public-facing page</p>
        </div>
        <div className="flex gap-2">
          {publicData.isPublic && publicData.publicUrl && (
            <a
              href={publicData.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              View Public Page
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={loading || !hasUnsavedChanges}
            className={`btn ${hasUnsavedChanges ? 'btn-primary' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
          >
            {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Public Status Toggle */}
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <div className="form-control">
            <label className="label cursor-pointer">
              <div>
                <span className="label-text text-lg font-medium">Make Project Public</span>
                <p className="text-sm text-base-content/60 mt-1">
                  Enable this to make your project discoverable and shareable
                </p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-lg"
                checked={publicData.isPublic || false}
                onChange={(e) => updateField('isPublic', e.target.checked)}
              />
            </label>
          </div>
        </div>
      </div>

      {publicData.isPublic && (
        <>
          {/* Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="card bg-base-200 shadow-lg">
              <div className="card-body">
                <h2 className="card-title text-xl mb-4">Basic Information</h2>
                
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-medium">Public Title</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Project name for public display"
                    className="input input-bordered w-full"
                    value={publicData.publicTitle || ''}
                    onChange={(e) => updateField('publicTitle', e.target.value)}
                  />
                </div>

                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-medium">Public Description</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered w-full h-24"
                    placeholder="Brief description of your project for public viewing"
                    value={publicData.publicDescription || ''}
                    onChange={(e) => updateField('publicDescription', e.target.value)}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Banner Image URL</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/banner.jpg"
                    className="input input-bordered w-full"
                    value={publicData.publicBanner || ''}
                    onChange={(e) => updateField('publicBanner', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Display Options */}
            <div className="card bg-base-200 shadow-lg">
              <div className="card-body">
                <h2 className="card-title text-xl mb-4">Display Options</h2>
                
                <div className="space-y-4">
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">Show Progress/Roadmap</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={publicData.showProgress || false}
                        onChange={(e) => updateField('showProgress', e.target.checked)}
                      />
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">Show Tech Stack</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={publicData.showTechStack || false}
                        onChange={(e) => updateField('showTechStack', e.target.checked)}
                      />
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">Show Team Members</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={publicData.showTeamMembers || false}
                        onChange={(e) => updateField('showTeamMembers', e.target.checked)}
                      />
                    </label>
                  </div>
                </div>

                <div className="form-control mt-6">
                  <label className="label">
                    <span className="label-text font-medium">Public URL Slug</span>
                  </label>
                  <div className="input-group">
                    <span className="bg-base-300 text-base-content/60 px-3 py-2 text-sm">
                      /public/
                    </span>
                    <input
                      type="text"
                      placeholder="my-awesome-project"
                      className="input input-bordered flex-1"
                      value={publicData.publicUrl?.replace('/public/', '') || ''}
                      onChange={(e) => updateField('publicUrl', `/public/${e.target.value}`)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4">Tags</h2>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {(publicData.publicTags || []).map((tag, index) => (
                  <div key={index} className="badge badge-primary badge-lg gap-2">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="btn btn-ghost btn-xs text-primary-content"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a tag"
                  className="input input-bordered flex-1"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <button onClick={addTag} className="btn btn-primary">
                  Add Tag
                </button>
              </div>
            </div>
          </div>

          {/* Custom Sections */}
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h2 className="card-title text-xl">Custom Sections</h2>
                <button onClick={addCustomSection} className="btn btn-primary btn-sm">
                  Add Section
                </button>
              </div>
              
              <div className="space-y-4">
                {(publicData.customSections || []).map((section, index) => (
                  <div key={index} className="card bg-base-100 shadow">
                    <div className="card-body">
                      <div className="flex justify-between items-start mb-2">
                        <input
                          type="text"
                          className="input input-bordered font-medium"
                          value={section.title}
                          onChange={(e) => updateCustomSection(index, 'title', e.target.value)}
                          placeholder="Section title"
                        />
                        <button
                          onClick={() => removeCustomSection(index)}
                          className="btn btn-error btn-sm ml-2"
                        >
                          Remove
                        </button>
                      </div>
                      <textarea
                        className="textarea textarea-bordered w-full h-24"
                        value={section.content}
                        onChange={(e) => updateCustomSection(index, 'content', e.target.value)}
                        placeholder="Section content..."
                      />
                    </div>
                  </div>
                ))}
                {(!publicData.customSections || publicData.customSections.length === 0) && (
                  <p className="text-base-content/60 text-center py-4">No custom sections added</p>
                )}
              </div>
            </div>
          </div>

          {/* SEO Settings */}
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4">SEO Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">SEO Title</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Title for search engines"
                    className="input input-bordered w-full"
                    value={publicData.seoTitle || ''}
                    onChange={(e) => updateField('seoTitle', e.target.value)}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Social Image URL</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/social-image.jpg"
                    className="input input-bordered w-full"
                    value={publicData.socialImage || ''}
                    onChange={(e) => updateField('socialImage', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-control mt-4">
                <label className="label">
                  <span className="label-text font-medium">SEO Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-20"
                  placeholder="Description for search engines and social media"
                  value={publicData.seoDescription || ''}
                  onChange={(e) => updateField('seoDescription', e.target.value)}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {!publicData.isPublic && (
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-base-300 flex items-center justify-center">
              <svg className="w-8 h-8 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Project is Private</h3>
            <p className="text-base-content/60 mb-4">
              Enable "Make Project Public" to configure your public page settings and make it discoverable to others.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicPage;