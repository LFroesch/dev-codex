import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { publicAPI, authAPI } from '../api';
import { apiClient } from '../api/base';
import { getContrastTextColor } from '../utils/contrastTextColor';
import FollowButton from '../components/FollowButton';
import LikeButton from '../components/LikeButton';

const PublicProfilePage: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize activeTab from URL params
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    return tabParam || 'projects';
  });

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

  // Update tab when URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  const loadUser = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await publicAPI.getUserProfile(identifier!);
      setUser(response.user);

      // Load posts after user is loaded
      if (response.user && response.user.id) {
        loadPosts(response.user.id);
      }
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

  const loadPosts = async (userId: string) => {
    try {
      setPostsLoading(true);
      const response = await apiClient.get(`/posts/user/${userId}`, {
        params: { limit: 10, page: 1 }
      });
      if (response.data.success) {
        setPosts(response.data.posts || []);
      }
    } catch (err) {
      console.error('Error loading posts:', err);
      // Don't show error - just leave posts empty
    } finally {
      setPostsLoading(false);
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
          <div className="section-content p-4 sm:p-6">
            {/* Action Buttons - Top Right */}
            <div className="flex justify-end gap-2 mb-4">
              {currentUser && currentUser.id === user.id && (
                <button
                  onClick={() => navigate('/account-settings')}
                  className="btn btn-sm btn-ghost gap-2 border border-base-content/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
              )}

              {currentUser && currentUser.id !== user.id && (
                <FollowButton type="user" id={user.id} size="md" />
              )}

              <button
                onClick={copyProfileUrl}
                className="btn btn-sm btn-ghost gap-2 border border-base-content/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Share</span>
              </button>

              <button
                onClick={() => navigate('/discover')}
                className="btn btn-sm btn-primary gap-2 border-thick"
                style={{ color: getContrastTextColor('primary') }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
            </div>

            {/* Display Name */}
            <div className="mb-4">
              <h1
                className="text-3xl sm:text-4xl font-bold px-4 py-2 rounded-lg inline-block border-2 border-base-content/20 bg-primary"
                style={{ color: getContrastTextColor('primary') }}
              >
                {user.displayName}
              </h1>
            </div>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {/* Username */}
              {user.publicSlug && (
                <>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    <span className="text-sm font-medium text-base-content/80">@{user.publicSlug}</span>
                  </div>

                  <span className="text-base-content/30">•</span>
                </>
              )}

              {/* Member Since */}
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-base-content/80">
                  Joined {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <div className="px-4 py-3 rounded-lg bg-base-200/50 border border-base-content/20">
                <p className="text-sm text-base-content/80 leading-relaxed">
                  {user.bio}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <div className="flex justify-center pt-4">
          {/* Tab Navigation */}
          <div className="tabs-container p-1">
            <button
              className={`tab-button ${activeTab === 'projects' ? 'tab-active' : ''} gap-2`}
              style={activeTab === 'projects' ? { color: getContrastTextColor('primary') } : {}}
              onClick={() => setActiveTab('projects')}
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Projects
            </button>
            <button
              className={`tab-button ${activeTab === 'posts' ? 'tab-active' : ''} gap-2`}
              style={activeTab === 'posts' ? { color: getContrastTextColor('primary') } : {}}
              onClick={() => setActiveTab('posts')}
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Posts
            </button>
          </div>
        </div>

        <div className="section-container mb-8">

          {/* Tab Content */}
          <div className="section-content p-6">
            {/* Projects Tab */}
            {activeTab === 'projects' && (
              user.projects && user.projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {user.projects.map((project: any) => (
                <Link
                  key={project.id}
                  to={`/discover/project/${project.publicSlug || project.id}`}
                  className="section-container transition-all duration-300 hover:border-secondary w-full group block"
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
                      {(project.publicShortDescription || project.description) && (
                        <div className={"inline-flex items-start px-2 py-0.5 rounded-md text-xs font-medium text-base-content/80 h-full w-full input input-bordered"}>
                          <p className="text-sm text-base-content/70 line-clamp-2 leading-relaxed">
                            {project.publicShortDescription || project.description}
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
              ) : (
                <div className="text-center py-16 text-base-content/60">
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
              )
            )}

            {/* Posts Tab */}
            {activeTab === 'posts' && (
              postsLoading ? (
                <div className="text-center py-8">
                  <span className="loading loading-spinner loading-lg"></span>
                  <p className="text-base-content/60 mt-4">Loading posts...</p>
                </div>
              ) : posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.map((post: any) => (
                    <div key={post._id} className="bg-base-200 rounded-lg border-2 border-base-content/20 shadow-sm p-4 hover:border-primary/50 transition-all">
                      {/* Post header with author info */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-semibold text-base-content">
                          {user.displayName}
                        </span>
                        <span className="text-xs text-base-content/50">
                          {new Date(post.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                        {post.isEdited && (
                          <span className="text-xs text-base-content/40">(edited)</span>
                        )}
                      </div>

                      {/* Post content */}
                      <p className="text-sm text-base-content whitespace-pre-wrap mb-3 leading-relaxed">
                        {post.content}
                      </p>

                      {/* Post metadata */}
                      <div className="flex items-center gap-4 text-xs text-base-content/60">
                        {post.postType === 'project' && post.projectId && (
                          <Link
                            to={`/discover/project/${post.projectId.publicSlug || post.projectId._id}`}
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            {post.projectId.name}
                          </Link>
                        )}
                        <LikeButton
                          postId={post._id}
                          initialLikes={post.likes || 0}
                          size="sm"
                          showCount={true}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-base-content/60">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-2xl font-bold text-base-content mb-2">No posts yet</h3>
                  <p className="text-base-content/60 max-w-md mx-auto">
                    This user hasn't posted anything yet.
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfilePage;