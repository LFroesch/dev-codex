import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { publicAPI, authAPI } from '../api';
import { getContrastTextColor } from '../utils/contrastTextColor';

const PublicProfilePage: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      // Try to load current user (may fail if not logged in)
      try {
        const response = await authAPI.getMe();
        setCurrentUser(response.user);
      } catch {
        // User not logged in, that's okay
        setCurrentUser(null);
      }

      // Load the profile
      if (identifier) {
        await loadUser();
      }
    };

    loadData();
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
            style={{ color: getContrastTextColor('primary') }}
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
        <div className="section-container">
          <div className="section-content p-3 sm:p-4">
            {/* Header with buttons and profile info */}
            <div className="flex flex-wrap items-start gap-2 mb-3">
              {/* Left side: Profile info (wraps internally) */}
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">

                <h1 className="bg-primary text-lg sm:text-xl font-bold text-base-content px-3 py-1.5 rounded-md border-2 border-base-content/20"
                  style={{ color: getContrastTextColor('primary') }}>

                  {user.displayName}
                </h1>
                {user.publicSlug && !(currentUser && currentUser.id === user.id) && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary border-2 border-base-content/20"
                    style={{ color: getContrastTextColor("secondary") }}>
                    @{user.publicSlug}
                  </span>
                )}
                <div className="flex items-center bg-accent gap-1.5 border-2 border-base-content/20 px-2 py-1 rounded-md">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke={getContrastTextColor()} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-semibold whitespace-nowrap" style={{ color: getContrastTextColor() }}>
                    <span className="hidden sm:inline">Member </span>
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short'
                    })}
                  </span>
                </div>
              </div>

              {/* Right side: Action Buttons (stays on top row) */}
              <div className="flex gap-2 flex-shrink-0">
                {currentUser && currentUser.id === user.id && (
                  <button
                  // todo - make this also go to the URL section in account-settings
                    onClick={() => navigate('/account-settings')}
                    className="btn btn-sm btn-secondary gap-1 sm:gap-2 border-thick"
                    style={{ color: getContrastTextColor('secondary') }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="hidden sm:inline">Edit Profile</span>
                    <span className="sm:hidden">Edit</span>
                  </button>
                )}

                <button
                  onClick={() => navigate('/discover')}
                  className="btn btn-sm btn-primary gap-1 sm:gap-2 border-thick"
                  style={{ color: getContrastTextColor('primary') }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Back</span>
                </button>

                <button
                  onClick={copyProfileUrl}
                  className="btn btn-sm btn-outline gap-1 sm:gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </div>

            {/* Bio */}
            <div className="h-[3.5rem] flex-shrink-0">
              {user.bio && (
                <div className="inline-flex items-start px-2 py-0.5 rounded-md text-xs font-medium text-base-content/80 h-full w-full input input-bordered">
                  <p className="text-sm text-base-content/70 line-clamp-2 leading-relaxed">
                    {user.bio}
                  </p>
                </div>
              )}
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
                  className="section-container transition-all duration-300 hover:scale-[1.02] w-full group block"
                >
                  <div className="section-content p-6 flex flex-col h-full">
                    <div className="flex items-start gap-3 mb-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 shadow-lg"
                        style={{ 
                          backgroundColor: project.color,
                          color: getContrastTextColor(project.color)
                        }}
                      >
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="card-title text-lg mb-2 group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-primary border-2 border-base-content/20"
                            style={{ color: getContrastTextColor() }}>
                            {project.category}
                          </span>
                          <span className="text-xs text-base-content/60">
                            <span className="hidden sm:inline">Updated </span>
                            {new Date(project.updatedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-[3.5rem] flex-shrink-0 mb-3">
                      {project.description && (
                        <div className={"inline-flex items-start px-2 py-0.5 rounded-md text-xs font-medium text-base-content/80 h-full w-full input input-bordered"}>
                          <p className="text-sm text-base-content/70 line-clamp-2 leading-relaxed">
                            {project.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Tags & Technologies Section */}
                    <div className="space-y-2 mb-4">
                      {/* Tags */}
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {project.tags.slice(0, 3).map((tag: string, index: number) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-secondary text-base-content/80 border-2 border-base-content/20"
                              style={{ color: getContrastTextColor("secondary") }}>
                              {tag}
                            </span>
                          ))}
                          {project.tags.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-secondary text-base-content/80 border-2 border-base-content/20"
                              style={{ color: getContrastTextColor("secondary") }}>
                              +{project.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      {!project.tags || project.tags.length === 0 ? (
                        <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-secondary text-base-content/80 border-2 border-base-content/20"
                              style={{ color: getContrastTextColor("secondary") }}>
                              No Tags
                            </span>
                        </div>
                      ) : null}

                      {/* Technologies */}
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {project.technologies.slice(0, 4).map((tech: any, index: number) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-base-200 text-base-content/80 border-2 border-base-content/20">
                              {tech.name}
                            </span>
                          ))}
                          {project.technologies.length > 4 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-base-200 text-base-content/80 border-2 border-base-content/20">
                              +{project.technologies.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Deployment status */}
                    {project.deploymentData && project.deploymentData.deploymentStatus && (
                      <div className="flex justify-end">
                        <div className={`badge badge-sm border-thick ${
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
          <div className="section-container">
            <div className="section-content text-center py-16">
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