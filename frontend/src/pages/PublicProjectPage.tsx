import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { publicAPI } from '../api';

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


  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4">📂</div>
          <h1 className="text-3xl font-bold mb-2">{error}</h1>
          <p className="text-base-content/60 mb-6">
            The project you're looking for is not available or doesn't exist.
          </p>
          <div className="space-x-4">
            <button onClick={() => navigate('/discover')} className="btn btn-primary">
              Discover Projects
            </button>
            <button onClick={() => navigate('/')} className="btn btn-ghost">
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
    { value: 'Model', label: 'Model', emoji: '🗃️', description: 'Database models and schemas' },
    { value: 'Route', label: 'Route', emoji: '🛣️', description: 'API routes and endpoints' },
    { value: 'API', label: 'API', emoji: '🔌', description: 'API specifications and contracts' },
    { value: 'Util', label: 'Util', emoji: '🔧', description: 'Utility functions and helpers' },
    { value: 'ENV', label: 'ENV', emoji: '⚙️', description: 'Environment variables and config' },
    { value: 'Auth', label: 'Auth', emoji: '🔐', description: 'Authentication and authorization' },
    { value: 'Runtime', label: 'Runtime', emoji: '⚡', description: 'Runtime configuration and setup' },
    { value: 'Framework', label: 'Framework', emoji: '🏗️', description: 'Framework setup and structure' }
  ];

  // Get visibility settings with defaults
  const visibility = project.publicVisibility || {
    description: true,
    tags: true,
    links: true,
    docs: true,
    techStack: true,
    timestamps: true,
  };

  const hasAnyDocs = project.docs && project.docs.length > 0 && visibility.docs;
  const hasTechStack = project.technologies && project.technologies.length > 0 && visibility.techStack;
  const hasLinks = project.links && project.links.length > 0 && visibility.links;

  return (
    <div className="p-6 space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/discover')}
            className="btn btn-ghost btn-sm gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold text-white"
            style={{ backgroundColor: project.color }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
          
          <div>
            <h1 className="text-xl font-bold">{project.name}</h1>
            {visibility.description && <p className="text-sm text-base-content/60">{project.publicDescription || project.description}</p>}
          </div>
        </div>
        
        <button
          onClick={copyProjectUrl}
          className="btn btn-outline btn-sm gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Share
        </button>
      </div>

      {/* Project Meta Info */}
      <div className="flex flex-wrap gap-4 items-center text-sm text-base-content/60">
        <div className="badge badge-outline badge-sm">{project.category}</div>
        {project.owner && (
          <div>
            {project.owner.isPublic || project.owner.publicSlug ? (
              <Link 
                to={`/discover/user/${project.owner.publicSlug || project.owner.id}`}
                className="link link-primary font-medium"
              >
                @{project.owner.publicSlug || `${project.owner.firstName}${project.owner.lastName}`.toLowerCase()}
              </Link>
            ) : (
              <span className="font-medium">
                @{`${project.owner.firstName}${project.owner.lastName}`.toLowerCase()}
              </span>
            )}
          </div>
        )}
        {visibility.timestamps && <div>Updated {new Date(project.updatedAt).toLocaleDateString()}</div>}
      </div>

      {/* Tags */}
      {visibility.tags && project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.tags.map((tag: string, index: number) => (
            <span key={index} className="badge badge-ghost badge-sm">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Documentation */}
      {hasAnyDocs && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">📚 Documentation</h3>
          <div className="space-y-4">
            {docTypes.map((docType) => {
              const docs = docsByType[docType.value];
              if (!docs || docs.length === 0) return null;

              return (
                <div key={docType.value}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{docType.emoji}</span>
                    <h4 className="font-medium text-sm">{docType.label}</h4>
                    <span className="text-xs text-base-content/50">({docs.length})</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {docs.map((doc: any) => (
                      <div key={doc.id} className="card bg-base-100 shadow-lg border border-base-content/10 hover:shadow-xl transition-all duration-200">
                        <div className="card-body p-5">
                          <h5 className="font-semibold text-sm mb-3">{doc.title}</h5>
                          <pre className="whitespace-pre-wrap text-xs bg-base-200/70 p-3 rounded-lg border overflow-x-auto max-h-32 font-mono">
                            {doc.content}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tech Stack & Links - Compact Grid */}
      {(hasTechStack || hasLinks) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tech Stack */}
          {hasTechStack && (
            <div className="card bg-base-100 shadow-lg border border-base-content/10 hover:shadow-xl transition-all duration-200">
              <div className="card-body p-5">
                <h3 className="font-semibold text-sm mb-3">🚀 Tech Stack ({project.technologies.length})</h3>
                <div className="flex flex-wrap gap-1">
                  {project.technologies.map((tech: any, index: number) => (
                    <span key={index} className="badge badge-primary badge-sm" title={tech.purpose || tech.version}>
                      {tech.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Project Links */}
          {hasLinks && (
            <div className="card bg-base-100 shadow-lg border border-base-content/10 hover:shadow-xl transition-all duration-200">
              <div className="card-body p-5">
                <h3 className="font-semibold text-sm mb-3">🔗 Links ({project.links.length})</h3>
                <div className="space-y-2">
                  {project.links.map((link: any, index: number) => (
                    <div key={index}>
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="link link-primary text-sm font-medium"
                      >
                        {link.title}
                      </a>
                      {link.description && (
                        <p className="text-xs text-base-content/60 mt-1">{link.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Content State */}
      {!hasAnyDocs && !hasTechStack && !hasLinks && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-xl font-semibold mb-2">No additional details</h3>
          <p className="text-base-content/60">
            This project doesn't have any documentation, tech stack, or links shared publicly yet.
          </p>
        </div>
      )}
    </div>
  );
};

export default PublicProjectPage;