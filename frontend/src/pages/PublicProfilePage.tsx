import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { publicAPI } from '../api';

const PublicProfilePage: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (identifier) {
      loadUser();
    }
  }, [identifier]);

  const loadUser = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await publicAPI.getUserProfile(identifier!);
      setUser(response.user);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('User not found');
      } else if (err.response?.status === 403) {
        setError('This profile is private');
      } else {
        setError('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyProfileUrl = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-base-content/60">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-24 h-24 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-base-content mb-3">{error}</h1>
          <p className="text-base-content/60 mb-8">
            The profile you're looking for is not available.
          </p>
          <button 
            onClick={() => navigate('/discover')} 
            className="btn btn-primary"
          >
            Back to Discover
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-2 sm:p-4 bg-base-100 flex flex-col mb-4 min-h-0">
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30">
          <div className="p-6">
            {/* Header buttons */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigate('/discover')}
                className="btn btn-primary gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Discovery
              </button>
              
              <button
                onClick={copyProfileUrl}
                className="btn btn-outline gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Share Profile
              </button>
            </div>
            
            {/* Profile Content */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/10">
                  <span className="text-2xl font-bold text-primary">
                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                  </span>
                </div>
                <div className="text-left">
                  <h1 className="text-3xl font-bold px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
                    {user.firstName} {user.lastName}
                  </h1>
                  {user.publicSlug && (
                    <p className="text-lg text-primary font-semibold mt-2">@{user.publicSlug}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-base-content/60 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Member since {new Date(user.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="font-semibold text-lg px-2 py-1 rounded-md bg-base-300 inline-block w-fit">About</h2>
              </div>
              <p className="text-base leading-relaxed text-base-content/80">{user.bio}</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="font-semibold text-lg px-2 py-1 rounded-md bg-base-300 inline-block w-fit">Profile Stats</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex justify-center mb-2">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-primary mb-1">{user.projects?.length || 0}</div>
                <div className="text-sm text-base-content/60">Public Projects</div>
              </div>
              
              <div className="text-center p-4 bg-secondary/5 rounded-lg border border-secondary/10">
                <div className="flex justify-center mb-2">
                  <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-secondary mb-1">
                  {user.projects?.reduce((total: number, project: any) => 
                    total + (project.technologies?.length || 0), 0) || 0}
                </div>
                <div className="text-sm text-base-content/60">Technologies Used</div>
              </div>
            </div>
          </div>
        </div>

        {/* Projects */}
        {user.projects && user.projects.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-base-content text-center">Public Projects</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {user.projects.map((project: any) => (
                <Link
                  key={project.id}
                  to={`/discover/project/${project.publicSlug || project.id}`}
                  className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:border-primary/30 border border-base-200 h-full group"
                >
                  <div className="card-body p-6 flex flex-col h-full">
                    <div className="flex items-start gap-3 mb-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0 shadow-lg"
                        style={{ backgroundColor: project.color }}
                      >
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="card-title text-lg mb-2 group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="badge badge-primary badge-sm">
                            {project.category}
                          </div>
                          <span className="text-xs text-base-content/60">
                            Updated {new Date(project.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-base-content/70 line-clamp-3 mb-4 flex-grow">
                      {project.publicDescription || project.description}
                    </p>

                    {/* Tags & Technologies Section */}
                    <div className="space-y-3 mb-4">
                      {/* Tags */}
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.tags.slice(0, 3).map((tag: string, index: number) => (
                            <div key={index} className="badge badge-secondary badge-sm">
                              {tag}
                            </div>
                          ))}
                          {project.tags.length > 3 && (
                            <div className="badge badge-ghost badge-sm">
                              +{project.tags.length - 3}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Technologies */}
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.technologies.slice(0, 4).map((tech: any, index: number) => (
                            <div key={index} className="badge badge-outline badge-sm">
                              {tech.name}
                            </div>
                          ))}
                          {project.technologies.length > 4 && (
                            <div className="badge badge-ghost badge-sm">
                              +{project.technologies.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Deployment status */}
                    {project.deploymentData && project.deploymentData.deploymentStatus && (
                      <div className="flex justify-end">
                        <div className={`badge badge-sm ${
                          project.deploymentData.deploymentStatus === 'active' 
                            ? 'badge-success' 
                            : project.deploymentData.deploymentStatus === 'error'
                            ? 'badge-error'
                            : 'badge-warning'
                        }`}>
                          {project.deploymentData.deploymentPlatform || 
                           (project.deploymentData.deploymentStatus === 'active' ? 'Live' :
                            project.deploymentData.deploymentStatus === 'error' ? 'Error' : 'Inactive')}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="hero bg-base-100 rounded-2xl shadow-xl border border-base-200">
            <div className="hero-content text-center py-16">
              <div>
                <div className="w-24 h-24 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-base-content mb-2">No public projects</h3>
                <p className="text-base-content/60 max-w-md mx-auto">
                  This user hasn't shared any projects publicly yet.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfilePage;