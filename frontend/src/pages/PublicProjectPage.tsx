import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  const [project, setProject] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

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
          <div className="section-content p-3 sm:p-4 max-w-full">
            {/* Header with buttons and project info */}
            <div className="flex flex-wrap items-start gap-2 mb-3">
              {/* Left side: Project info (wraps internally) */}
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                {/* Project Title */}
                <h3
                  className="border-2 border-base-content/20 font-semibold text-lg sm:text-xl px-3 py-1.5 rounded-md"
                  style={{
                    backgroundColor: project.color,
                    color: getContrastTextColor(project.color)
                  }}
                >
                  {project.name}
                </h3>

                {/* Category Badge */}
                <span
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary border-2 border-base-content/20"
                  style={{ color: getContrastTextColor() }}
                >
                  {project.category}
                </span>

                {/* Owner Badge */}
                {project.owner && (
                  <div
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary border-2 border-base-content/20"
                    style={{ color: getContrastTextColor("secondary") }}
                  >
                    {project.owner.isPublic || project.owner.publicSlug ? (
                      <Link
                        to={`/discover/user/${project.owner.publicSlug || project.owner.username || project.owner.id}`}
                        className="font-semibold hover:underline"
                      >
                        {project.owner.displayName}
                      </Link>
                    ) : (
                      <span className="font-semibold">
                        {project.owner.displayName}
                      </span>
                    )}
                  </div>
                )}

                {/* Timestamp Badge */}
                {visibility.timestamps && (
                  <div className="flex items-center bg-accent gap-1.5 border-2 border-base-content/20 px-2 py-1 rounded-md" style={{ color: getContrastTextColor("accent") }}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span
                      className="text-xs font-semibold whitespace-nowrap"
                    >
                      <span className="hidden sm:inline">Updated </span>
                      {new Date(project.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Right side: Action Buttons (stays on top row) */}
              <div className="flex gap-2 flex-shrink-0 items-center">
                <FavoriteButton projectId={project.id} size="md" showCount={true} />

                {currentUser && project.owner && currentUser.id === project.owner.id && (
                  <button
                    onClick={() => {
                      // Set this project as the selected project before navigating
                      localStorage.setItem('selectedProjectId', project.id);
                      navigate('/public');
                    }}
                    className="btn btn-sm btn-secondary gap-1 sm:gap-2 border-thick"
                    style={{ color: getContrastTextColor('secondary') }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="hidden sm:inline">Edit Project</span>
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
                  onClick={copyProjectUrl}
                  className="btn btn-sm btn-outline gap-1 sm:gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </div>
            
            {/* Tags */}
            {visibility.tags && project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {project.tags.map((tag: string, index: number) => (
                  <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-base-200 text-base-content/80 border-2 border-base-content/20">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            

            {/* Description */}
            {project.description && (
              <div className="px-3 py-2 rounded-md text-base-content/80 w-full border-2 border-base-content/20 bg-base-200/30">
                <div className="prose prose-sm max-w-none text-base-content/90">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {project.description}
                  </ReactMarkdown>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Tabs Section */}
        {hasContent && (
          <div className="flex justify-center">
            {/* Tab Navigation */}
            <div className="tabs-container p-1">
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
            </div>
          </div>
        )}

        {hasContent && (
          <div className="section-container mb-8">

            {/* Tab Content */}
            <div className="section-content p-6">
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
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasContent && (
          <div className="hero bg-base-100 rounded-2xl shadow-xl border-thick">
            <div className="hero-content text-center py-16">
              <div>
                <div className="w-24 h-24 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-base-content mb-2">No additional details</h3>
                <p className="text-base-content/60 max-w-md mx-auto">
                  This project doesn't have any additional information shared publicly yet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Project Updates Section */}
        {currentUser && project.userId === currentUser.id && (
          <div className="section-container border-thick mb-8">
            <div className="section-header">
              <div className="flex items-center gap-3">
                <div className="section-icon">📢</div>
                <span>Post Update</span>
              </div>
            </div>
            <div className="section-content">
              <PostComposer postType="project" projectId={project.id} />
            </div>
          </div>
        )}

        {/* Comments Section - Always visible below all content */}
        <div className="section-container border-thick">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">💬</div>
              <span>Comments & Discussion</span>
            </div>
          </div>
          <div className="section-content">
            {currentUser ? (
              <ProjectComments projectId={project.id} currentUserId={currentUser.id} />
            ) : (
              <div className="text-center py-8 text-base-content/60">
                <p className="mb-4">Sign in to comment on this project</p>
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
        </div>
      </div>
    </div>
  );
};

export default PublicProjectPage;