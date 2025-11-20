import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { publicAPI, authAPI } from '../api';
import { getContrastTextColor } from '../utils/contrastTextColor';
import ProjectComments from '../components/ProjectComments';
import FavoriteButton from '../components/FavoriteButton';
import PostComposer from '../components/PostComposer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const PublicProjectPage: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initialize activeTab from URL params
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) return tabParam;
    if (window.location.hash === '#comments') return 'comments';
    return 'readme';
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

      // Load the project
      if (identifier) {
        await loadProject();
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
    } else if (location.hash === '#comments') {
      setActiveTab('comments');
    }
  }, [location.search, location.hash]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await publicAPI.getProject(identifier!);
      setProject(response.project);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Project not found');
      } else if (err.response?.status === 403) {
        setError('This project is private');
      } else {
        setError('Failed to load project');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyProjectUrl = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const ensureHttps = (url: string) => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-base-content/60">Loading project...</p>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-base-content mb-3">{error}</h1>
          <p className="text-base-content/60 mb-8">
            The project you're looking for is not available or doesn't exist.
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => navigate('/discover')} 
              className="btn btn-primary"
              style={{ color: getContrastTextColor('primary') }}
            >
              Discover Projects
            </button>
            <button 
              onClick={() => navigate('/')} 
              className="btn btn-ghost"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  // Group components by feature for better organization
  const componentsByFeature = project.components?.reduce((acc: any, component: any) => {
    const feature = component.feature || 'Uncategorized';
    if (!acc[feature]) acc[feature] = [];
    acc[feature].push(component);
    return acc;
  }, {}) || {};

  const componentTypes = [
    { value: 'Model', label: 'Models', emoji: '🗃️', description: 'Database schemas' },
    { value: 'Route', label: 'Routes', emoji: '🛣️', description: 'API endpoints' },
    { value: 'API', label: 'APIs', emoji: '🔌', description: 'API documentation' },
    { value: 'Util', label: 'Utils', emoji: '🔧', description: 'Helper functions' },
    { value: 'ENV', label: 'Config', emoji: '⚙️', description: 'Environment setup' },
    { value: 'Auth', label: 'Auth', emoji: '🔐', description: 'Authentication' },
    { value: 'Runtime', label: 'Runtime', emoji: '⚡', description: 'Runtime config' },
    { value: 'Framework', label: 'Framework', emoji: '🏗️', description: 'Framework setup' }
  ];

  // Helper function to get type info
  const getTypeInfo = (type: string) => {
    return componentTypes.find(t => t.value === type) || { emoji: '📄', description: type };
  };

  // Get visibility settings with defaults
  const visibility = project.publicVisibility || {
    description: true,
    tags: true,
    components: true,
    techStack: true,
    timestamps: true,
    devLog: true,
  };

  const hasAnyComponents = project.components && project.components.length > 0 && visibility.components;
  const hasTechStack = project.technologies && project.technologies.length > 0 && visibility.techStack;
  const hasDeploymentLinks = project.deploymentData && (project.deploymentData.liveUrl || project.deploymentData.githubRepo);
  const hasDevLog = project.devLog && project.devLog.length > 0 && visibility.devLog;
  const hasContent = hasAnyComponents || hasTechStack || hasDeploymentLinks || hasDevLog;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-2 sm:p-4 bg-base-100 flex flex-col mb-4 min-h-0 overflow-hidden">
      <div className="space-y-6 max-w-full">
        {/* Project Header */}
        <div className="section-container max-w-full">
          <div className="section-content p-4 sm:p-6 max-w-full">
            {/* Title Row with Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {/* Project Title */}
              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-bold px-4 py-2 rounded-lg border-2 border-base-content/20"
                style={{
                  backgroundColor: project.color,
                  color: getContrastTextColor(project.color)
                }}
              >
                {project.name}
              </h1>

              {/* Spacer to push buttons to the right */}
              <div className="flex-1 min-w-[20px]"></div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {currentUser && project.owner && currentUser.id === project.owner.id && (
                  <button
                    onClick={() => {
                      localStorage.setItem('selectedProjectId', project.id);
                      navigate('/public');
                    }}
                    className="btn btn-sm btn-ghost gap-2 border border-base-content/20"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                )}

                <button
                  onClick={copyProjectUrl}
                  className="btn btn-sm btn-ghost gap-2 border border-base-content/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Share</span>
                </button>

                <button
                  onClick={() => navigate('/discover')}
                  className="btn btn-sm btn-primary gap-2 border-thick"
                  style={{ color: getContrastTextColor('primary') }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Back</span>
                </button>

                {/* Favorite Button */}
                <FavoriteButton projectId={project.id} size="md" showCount={true} />
              </div>
            </div>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {/* Category */}
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-sm font-medium text-base-content/80">{project.category}</span>
              </div>

              {/* Divider */}
              <span className="text-base-content/30">•</span>

              {/* Owner */}
              {project.owner && (
                <>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {project.owner.isPublic || project.owner.publicSlug ? (
                      <Link
                        to={`/discover/user/${project.owner.publicSlug || project.owner.username || project.owner.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {project.owner.displayName}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-base-content/80">
                        {project.owner.displayName}
                      </span>
                    )}
                  </div>

                  {visibility.timestamps && <span className="text-base-content/30">•</span>}
                </>
              )}

              {/* Timestamp */}
              {visibility.timestamps && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-base-content/80">
                    Updated {new Date(project.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Short Description */}
            {project.publicShortDescription && (
              <div className="mt-3">
                <p className="text-sm sm:text-base text-base-content/80 leading-relaxed">
                  {project.publicShortDescription}
                </p>
              </div>
            )}

            {/* Tags */}
            {visibility.tags && project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {project.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-base-200 text-base-content border border-base-content/20 hover:bg-base-300 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* Tabs Section */}
        {(hasContent || project.publicDescription) && (
          <div className="flex justify-center">
            {/* Tab Navigation */}
            <div className="tabs-container p-1">
              {project.publicDescription && (
                <button
                  className={`tab-button ${activeTab === 'readme' ? 'tab-active' : ''} gap-2`}
                  style={activeTab === 'readme' ? { color: getContrastTextColor('primary') } : {}}
                  onClick={() => setActiveTab('readme')}
                >
                  <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  README
                </button>
              )}
              <button
                className={`tab-button ${activeTab === 'overview' ? 'tab-active' : ''} gap-2`}
                style={activeTab === 'overview' ? { color: getContrastTextColor('primary') } : {}}
                onClick={() => setActiveTab('overview')}
              >
                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Links
              </button>
              {hasTechStack && (
                <button
                  className={`tab-button ${activeTab === 'tech' ? 'tab-active' : ''} gap-2`}
                  style={activeTab === 'tech' ? { color: getContrastTextColor('primary') } : {}}
                  onClick={() => setActiveTab('tech')}
                >
                  <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Tech Stack
                </button>
              )}
              {hasAnyComponents && (
                <button
                  className={`tab-button ${activeTab === 'architecture' ? 'tab-active' : ''} gap-2`}
                  style={activeTab === 'architecture' ? { color: getContrastTextColor('primary') } : {}}
                  onClick={() => setActiveTab('architecture')}
                >
                  <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Features
                </button>
              )}
              {hasDevLog && (
                <button
                  className={`tab-button ${activeTab === 'devlog' ? 'tab-active' : ''} gap-2`}
                  style={activeTab === 'devlog' ? { color: getContrastTextColor('primary') } : {}}
                  onClick={() => setActiveTab('devlog')}
                >
                  <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  DevLog
                </button>
              )}
              <button
                className={`tab-button ${activeTab === 'comments' ? 'tab-active' : ''} gap-2`}
                style={activeTab === 'comments' ? { color: getContrastTextColor('primary') } : {}}
                onClick={() => setActiveTab('comments')}
              >
                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Comments
              </button>
            </div>
          </div>
        )}

        {(hasContent || project.publicDescription) && (
          <div className="section-container mb-8">

            {/* Tab Content */}
            <div className="section-content p-6">
              {/* README Tab */}
              {activeTab === 'readme' && project.publicDescription && (
                <div>
                  <h3 className="text-xl font-bold mb-4">README</h3>
                  <div className="prose prose-base max-w-none [&>*]:text-base-content [&_a]:text-primary [&_code]:text-accent [&_pre]:bg-base-200 [&_blockquote]:border-primary">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-4 mb-3 text-base-content" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-3 mb-2 text-base-content" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-3 mb-2 text-base-content" {...props} />,
                        p: ({node, ...props}) => <p className="mb-3 text-base-content/90 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="text-base-content/90" {...props} />,
                        code: ({node, inline, ...props}: any) =>
                          inline
                            ? <code className="bg-base-200 px-1.5 py-0.5 rounded text-sm font-mono text-accent" {...props} />
                            : <code className="block bg-base-200 p-3 rounded-lg text-sm font-mono overflow-x-auto" {...props} />,
                        pre: ({node, ...props}) => <pre className="bg-base-200 p-3 rounded-lg overflow-x-auto mb-3" {...props} />,
                        a: ({node, ...props}) => <a className="text-primary hover:underline font-medium" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-4 italic my-3 text-base-content/80" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-base-content" {...props} />,
                        em: ({node, ...props}) => <em className="italic text-base-content" {...props} />,
                      }}
                    >
                      {project.publicDescription}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {hasDeploymentLinks && (
                    <div>
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <span>Live Project</span>
                      </h3>
                      <div className="flex flex-col md:flex-row gap-3">
                        {project.deploymentData.liveUrl && (
                          <a
                            href={ensureHttps(project.deploymentData.liveUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 bg-primary hover:bg-primary/90 rounded-lg border-2 border-base-content/20 transition-colors group flex-1"
                            style={{ color: getContrastTextColor('primary') }}
                          >
                            <svg className="icon-sm flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm">View Live Site</div>
                              <div className="text-xs opacity-80 truncate">
                                {project.deploymentData.liveUrl}
                              </div>
                            </div>
                          </a>
                        )}

                        {project.deploymentData.githubRepo && (
                          <a
                            href={ensureHttps(project.deploymentData.githubRepo)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 bg-base-200 hover:bg-base-300 rounded-lg border-2 border-base-content/20 transition-colors group flex-1"
                          >
                            <svg className="icon-sm flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm">View Source Code</div>
                              <div className="text-xs opacity-70 truncate">
                                {project.deploymentData.githubRepo}
                              </div>
                            </div>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {!hasDeploymentLinks && (
                    <div className="text-center py-16 text-base-content/60">
                      <svg className="w-16 h-16 mx-auto mb-4 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg font-medium">Project Overview</p>
                      <p className="text-sm mt-2">No deployment information available</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tech Stack Tab */}
              {activeTab === 'tech' && hasTechStack && (
                <div>
                  <h3 className="text-xl font-bold mb-4">Technologies Used</h3>
                  <div className="flex flex-wrap gap-3">
                    {project.technologies.map((tech: any, index: number) => (
                      <div
                        key={index}
                        className="badge badge-outline border-thick p-3 border-secondary font-bold badge-lg hover:shadow-lg transition-colors"
                      >
                        {tech.name + (tech.version ? ` (v${tech.version})` : '')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Architecture Tab */}
              {activeTab === 'architecture' && hasAnyComponents && (
                <div>
                  <h3 className="text-xl font-bold mb-4">Features & Components</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.keys(componentsByFeature).sort().map((featureName) => {
                  const components = componentsByFeature[featureName];
                  if (!components || components.length === 0) return null;

                  return (
                    <div key={featureName} className="bg-base-200 rounded-lg border-2 border-base-content/20 shadow-sm p-3 hover:border-primary/50 transition-all">
                      <div className="flex items-start gap-2 mb-2">
                        <svg className="icon-sm text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-base-content mb-1 truncate">{featureName}</h4>
                          <span className="text-xs text-base-content/60">
                            {components.length} component{components.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 mt-2">
                        {components.map((comp: any, idx: number) => {
                          const typeInfo = getTypeInfo(comp.type);
                          return (
                            <div
                              key={idx}
                              className="text-xs text-base-content/70 truncate"
                              title={`${comp.title || comp.name} (${comp.type})`}
                            >
                              <span className="mr-1">{typeInfo.emoji}</span>
                              <span className="font-mono">{comp.title || comp.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                  </div>
                </div>
              )}

              {/* DevLog Tab */}
              {activeTab === 'devlog' && hasDevLog && (
                <div>
                  <h3 className="text-xl font-bold mb-4">Development Timeline</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {project.devLog
                  ?.slice()
                  .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((entry: any, idx: number) => (
                    <div
                      key={entry.id || idx}
                      className="bg-base-200 rounded-lg border-2 border-base-content/20 shadow-sm p-3 hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <svg className="icon-sm text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          {entry.title && (
                            <h4 className="font-bold text-sm text-base-content mb-1 truncate">
                              {entry.title}
                            </h4>
                          )}
                          <span className="text-xs text-base-content/60">
                            {new Date(entry.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      {entry.description && (
                        <p className="text-xs text-base-content/70 line-clamp-2 leading-relaxed">
                          {entry.description}
                        </p>
                      )}
                    </div>
                  ))}
                  </div>
                </div>
              )}

              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <div>
                  <h3 className="text-xl font-bold mb-4">Comments & Discussion</h3>
                  {currentUser && project.userId === currentUser.id && (
                    <div className="mb-6 p-4 bg-base-200 rounded-lg border-2 border-base-content/20">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                        Post Update
                      </h4>
                      <PostComposer postType="project" projectId={project.id} />
                    </div>
                  )}
                  {currentUser ? (
                    <ProjectComments projectId={project.id} currentUserId={currentUser.id} />
                  ) : (
                    <div className="text-center py-12 text-base-content/60">
                      <svg className="w-16 h-16 mx-auto mb-4 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-lg mb-4">Sign in to comment on this project</p>
                      <button
                        onClick={() => navigate('/login')}
                        className="btn btn-primary border-thick"
                        style={{ color: getContrastTextColor('primary') }}
                      >
                        Sign In
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PublicProjectPage;