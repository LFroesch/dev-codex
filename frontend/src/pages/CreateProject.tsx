import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI } from '../api';
import { toast } from '../services/toast';
import { getContrastTextColor } from '../utils/contrastTextColor';

const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    color: '#3B82F6',
    tags: [] as string[],
    stagingEnvironment: 'development' as 'development' | 'staging' | 'production'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apply theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'retro';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await projectAPI.create({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        color: formData.color,
        tags: formData.tags,
        stagingEnvironment: formData.stagingEnvironment,
      });
      toast.success(`Project "${formData.name}" created successfully!`);

      // Trigger project list refresh
      window.dispatchEvent(new CustomEvent('refreshProject'));

      navigate('/projects');
    } catch (err: any) {
      let errorMessage = 'An unexpected error occurred';
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleAddTag = () => {
    const input = document.getElementById('new-tag') as HTMLInputElement;
    const newTag = input?.value.trim();
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }));
      input.value = '';
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };


  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-base-content/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigate('/')}
                className="btn btn-error border-thick gap-2"
                style={{ color: getContrastTextColor('error') }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Projects
              </button>
            </div>

            {error && (
              <div className="alert alert-error mb-6">
                <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Project Details</h3>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Project Name *</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="Enter project name..."
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Description *</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="textarea textarea-bordered w-full resize-none"
                    placeholder="Describe your project..."
                    required
                  />
                </div>
              </div>

              {/* Optional Metadata */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-base-content/80">Optional Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Category */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Category</span>
                    </label>
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="input input-bordered w-full"
                      placeholder="e.g. Web App, Mobile, API..."
                    />
                  </div>

                  {/* Color Picker */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Project Color</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        name="color"
                        value={formData.color}
                        onChange={handleChange}
                        className="w-10 h-10 border border-base-300 rounded cursor-pointer flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({...prev, color: e.target.value}))}
                        className="input input-bordered flex-1 font-mono text-sm w-5"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>

                  {/* Environment */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Environment</span>
                    </label>
                    <select
                      name="stagingEnvironment"
                      value={formData.stagingEnvironment}
                      onChange={handleChange}
                      className="select select-bordered w-full"
                    >
                      <option value="development">Development</option>
                      <option value="staging">Staging</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Tags ({formData.tags.length})</span>
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        id="new-tag"
                        type="text"
                        className="input input-bordered flex-1"
                        placeholder="Add a tag..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="btn btn-primary btn-square border-thick"
                        style={{ color: getContrastTextColor('primary') }}
                      >
                        +
                      </button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={`tag-${index}-${tag}`}
                            className="badge badge-info gap-2"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="text-info-content hover:text-error text-lg font-bold leading-none"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.name.trim() || !formData.description.trim()}
                  className="btn btn-primary gap-2 border-thick"
                  style={{ color: getContrastTextColor('primary') }}
                >
                  {loading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Project
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProject;