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
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4">👤</div>
          <h1 className="text-3xl font-bold mb-2">{error}</h1>
          <p className="text-base-content/60 mb-6">
            The profile you're looking for is not available.
          </p>
          <button onClick={() => navigate('/discover')} className="btn btn-primary">
            Back to Discover
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/discover')}
            className="btn btn-ghost gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Discover
          </button>
          
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
            </span>
          </div>
          
          <div>
            <h1 className="text-3xl font-bold">{user.firstName} {user.lastName}</h1>
            {user.publicSlug && <p className="text-lg text-base-content/60">@{user.publicSlug}</p>}
            <p className="text-base-content/60">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <button onClick={copyProfileUrl} className="btn btn-outline gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Share Profile
        </button>
      </div>

      {/* Bio */}
      {user.bio && (
        <div className="card bg-base-100 shadow-lg border border-base-content/10">
          <div className="card-body">
            <p className="text-base leading-relaxed">{user.bio}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats stats-vertical lg:stats-horizontal shadow-lg w-full border border-base-content/10">
        <div className="stat">
          <div className="stat-title">Public Projects</div>
          <div className="stat-value">{user.projects?.length || 0}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Total Technologies</div>
          <div className="stat-value">
            {user.projects?.reduce((total: number, project: any) => 
              total + (project.technologies?.length || 0), 0) || 0}
          </div>
        </div>
      </div>

      {/* Projects */}
      {user.projects && user.projects.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Public Projects</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {user.projects.map((project: any) => (
              <Link
                key={project.id}
                to={`/discover/project/${project.publicSlug || project.id}`}
                className="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] border border-base-content/10 h-full"
              >
                <div className="card-body p-5 flex flex-col h-full">
                  <div className="flex items-start gap-3 mb-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    >
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="card-title text-lg truncate mb-2">{project.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-outline badge-sm">
                          {project.category}
                        </span>
                        <span className="text-sm text-base-content/60">
                          {new Date(project.updatedAt).toLocaleDateString()}
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
                        {project.tags.slice(0, 4).map((tag: string, index: number) => (
                          <span key={index} className="badge badge-ghost badge-sm">
                            {tag}
                          </span>
                        ))}
                        {project.tags.length > 4 && (
                          <span className="badge badge-ghost badge-sm">
                            +{project.tags.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Technologies */}
                    {project.technologies && project.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.technologies.slice(0, 6).map((tech: any, index: number) => (
                          <span key={index} className="badge badge-primary badge-sm">
                            {tech.name}
                          </span>
                        ))}
                        {project.technologies.length > 6 && (
                          <span className="badge badge-primary badge-sm">
                            +{project.technologies.length - 6}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💼</div>
          <h3 className="text-xl font-semibold mb-2">No public projects</h3>
          <p className="text-base-content/60">
            This user hasn't shared any projects publicly yet.
          </p>
        </div>
      )}
    </div>
  );
};

export default PublicProfilePage;