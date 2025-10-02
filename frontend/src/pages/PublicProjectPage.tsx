import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { publicAPI } from '../api';
import { getContrastTextColor } from '../utils/contrastTextColor';

const PublicProjectPage: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (identifier) {
      loadProject();
    }
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
      <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-base-content/60">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200 flex items-center justify-center">
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

  // Group docs by type for better organization
  const docsByType = project.docs?.reduce((acc: any, doc: any) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {}) || {};

  const docTypes = [
    { value: 'Model', label: 'Models', emoji: '🗃️', description: 'Database schemas' },
    { value: 'Route', label: 'Routes', emoji: '🛣️', description: 'API endpoints' },
    { value: 'API', label: 'APIs', emoji: '🔌', description: 'API documentation' },
    { value: 'Util', label: 'Utils', emoji: '🔧', description: 'Helper functions' },
    { value: 'ENV', label: 'Config', emoji: '⚙️', description: 'Environment setup' },
    { value: 'Auth', label: 'Auth', emoji: '🔐', description: 'Authentication' },
    { value: 'Runtime', label: 'Runtime', emoji: '⚡', description: 'Runtime config' },
    { value: 'Framework', label: 'Framework', emoji: '🏗️', description: 'Framework setup' }
  ];

  // Get visibility settings with defaults
  const visibility = project.publicVisibility || {
    description: true,
    tags: true,
    docs: true,
    techStack: true,
    timestamps: true,
  };

  const hasAnyDocs = project.docs && project.docs.length > 0 && visibility.docs;
  const hasTechStack = project.technologies && project.technologies.length > 0 && visibility.techStack;
  const hasDeploymentLinks = project.deploymentData && (project.deploymentData.liveUrl || project.deploymentData.githubRepo);
  const hasContent = hasAnyDocs || hasTechStack || hasDeploymentLinks;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-2 sm:p-4 bg-base-100 flex flex-col mb-4 min-h-0">
      <div className="space-y-6">
        {/* Project Header */}
        <div className="section-container">
          <div className="section-content p-3 sm:p-4">
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
                    style={{ color: getContrastTextColor() }}
                  >
                    {project.owner.isPublic || project.owner.publicSlug ? (
                      <Link
                        to={`/discover/user/${project.owner.publicSlug || project.owner.id}`}
                        className="font-semibold hover:underline"
                      >
                        @{project.owner.publicSlug || `${project.owner.firstName}${project.owner.lastName}`.toLowerCase()}
                      </Link>
                    ) : (
                      <span className="font-semibold">
                        @{`${project.owner.firstName}${project.owner.lastName}`.toLowerCase()}
                      </span>
                    )}
                  </div>
                )}

                {/* Timestamp Badge */}
                {visibility.timestamps && (
                  <div className="flex items-center bg-accent gap-1.5 border-2 border-base-content/20 px-2 py-1 rounded-md">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke={getContrastTextColor()} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span
                      className="text-xs font-semibold whitespace-nowrap"
                      style={{ color: getContrastTextColor() }}
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
              <div className="flex gap-2 flex-shrink-0">
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
            <div className="h-[3.5rem] flex-shrink-0">
              {project.description && (
                <div className={"inline-flex items-start px-2 py-0.5 rounded-md text-xs font-medium text-base-content/80 h-full w-full input input-bordered"}>
                  <p className="text-sm text-base-content/70 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>


        {/* Content Grid */}
        {hasContent && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Tech Stack */}
            {hasTechStack && (
              <div className="section-container">
                <div className="section-content">
                  <h2 className="card-title text-2xl">
                    <div className="section-icon">
                      🚀
                    </div>
                    Tech Stack
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {project.technologies.map((tech: any, index: number) => (
                      <div 
                        key={index} 
                        className="badge badge-outline badge-lg hover:shadow-lg transition-colors"
                      >
                        {tech.name + (tech.version ? ` (v${tech.version})` : '')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Deployment */}
            {hasDeploymentLinks && (
              <div className="section-container">
                <div className="section-content">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="card-title text-2xl">
                      <div className="section-icon">
                        🌐
                      </div>
                      Live Project
                    </h2>
                    {project.deploymentData.deploymentPlatform && (
                      <div className={`badge badge-lg border-thick ${
                        project.deploymentData.deploymentStatus === 'active' 
                          ? 'badge-success' 
                          : project.deploymentData.deploymentStatus === 'error'
                          ? 'badge-error'
                          : 'badge-warning'
                      }`}>
                        {project.deploymentData.deploymentPlatform}
                      </div>
                    )}
                  </div>
                  
                  
                  <div className="space-y-3">
                    {project.deploymentData.liveUrl && (
                      <a 
                        href={ensureHttps(project.deploymentData.liveUrl)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-block flex-col gap-1"
                        style={{ color: getContrastTextColor('primary') }}
                        >
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View Live Site
                        </div>
                        <div className="text-xs opacity-70 break-all">
                          {project.deploymentData.liveUrl}
                        </div>
                      </a>
                    )}
                    
                    {project.deploymentData.githubRepo && (
                      <a 
                        href={ensureHttps(project.deploymentData.githubRepo)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-block flex-col gap-1"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View Source Code
                        </div>
                        <div className="text-xs opacity-70 break-all">
                          {project.deploymentData.githubRepo}
                        </div>
                      </a>
                    )}
                    
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Documentation */}
        {hasAnyDocs && (
          <div className="section-container">
            <div className="section-content">
              <div className="flex items-center gap-3 mb-6">
                <div className="section-icon">
                  <span className="text-lg">📚</span>
                </div>
                <h2 className="font-semibold text-lg px-2 py-1 rounded-md bg-base-300 inline-block w-fit">Documentation</h2>
              </div>
              <div className="space-y-8">
              {docTypes.map((docType) => {
                const docs = docsByType[docType.value];
                if (!docs || docs.length === 0) return null;

                return (
                  <div key={docType.value}>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="section-icon">
                        <span className="text-2xl">{docType.emoji}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-base-content">{docType.label}</h3>
                        <p className="text-base-content/60">{docType.description}</p>
                      </div>
                      <div className="badge badge-primary badge-lg">{docs.length}</div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {docs.map((doc: any) => (
                        <div key={doc.id} className="section-container">
                          <div className="section-content">
                            <h4 className="font-semibold text-base mb-3 px-2 py-1 rounded-md bg-base-300 inline-block w-fit">{doc.title}</h4>
                            <div className="mockup-code bg-base-200 text-xs">
                              <pre><code>{doc.content}</code></pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasContent && (
          <div className="hero bg-base-100 rounded-2xl shadow-xl">
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
      </div>
    </div>
  );
};

export default PublicProjectPage;