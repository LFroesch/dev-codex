import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { publicAPI } from '../api';

const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadFilters();
    loadProjects();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    loadProjects();
  }, [debouncedSearchTerm, selectedCategory, selectedTag, sortBy]);

  useEffect(() => {
    if (currentPage > 1) {
      loadProjects();
    }
  }, [currentPage]);

  const loadFilters = async () => {
    try {
      const response = await publicAPI.getFilters();
      setCategories(response.categories || []);
      setTags(response.tags || []);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await publicAPI.getProjects({
        page: currentPage,
        limit: 12,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        tag: selectedTag || undefined,
        search: debouncedSearchTerm || undefined
      });
      setProjects(response.projects || []);
      setPagination(response.pagination);
    } catch (err: any) {
      setError('Failed to load projects');
      console.error('Load projects error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadProjects();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedTag('');
    setCurrentPage(1);
  };

  if (loading && currentPage === 1) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Error State */}
      {error && (
        <div className="alert alert-error shadow-md">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span>{error}</span>
          <button onClick={loadProjects} className="btn btn-sm">
            Retry
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
        <input type="checkbox" defaultChecked />
        <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10 flex items-center justify-between">
          <span>🔍 Search & Filter Projects</span>
          <div className="flex items-center gap-2 text-sm text-base-content/60" onClick={(e) => e.stopPropagation()}>
            {pagination && (
              <span>
                {pagination.total} projects found
              </span>
            )}
            {(debouncedSearchTerm || selectedCategory !== 'all' || selectedTag) && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn btn-ghost btn-xs"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
        <div className="collapse-content">
          <div className="pt-4">
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Search Bar */}
              <div className="form-control">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search projects, technologies, or descriptions..."
                    className="input input-bordered w-full pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap gap-3">
                {/* Category Filter */}
                <select
                  className="select select-bordered select-sm"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>

                {/* Tag Filter */}
                <select
                  className="select select-bordered select-sm"
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                >
                  <option value="">All Tags</option>
                  {tags.slice(0, 20).map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>

                {/* Sort */}
                <select
                  className="select select-bordered select-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="recent">Recently Updated</option>
                  <option value="popular">Most Popular</option>
                  <option value="trending">Trending</option>
                </select>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Projects Results */}
      <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
        <input type="checkbox" defaultChecked />
        <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
          🚀 Community Projects {pagination && `(${pagination.total})`}
        </div>
        <div className="collapse-content">
          <div className="pt-4 space-y-6">
            {/* Results Info */}
            {pagination && (
              <div className="flex justify-between items-center text-sm text-base-content/60 pb-2 border-b border-base-300">
                <div>
                  Showing {((currentPage - 1) * 12) + 1}-{Math.min(currentPage * 12, pagination.total)} of {pagination.total} projects
                </div>
                {(debouncedSearchTerm || selectedCategory !== 'all' || selectedTag) && (
                  <div>
                    Filtered results
                  </div>
                )}
              </div>
            )}

            {/* Projects Grid */}
            {projects.length === 0 && debouncedSearchTerm && !loading ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">No projects found</h3>
                <p className="text-base-content/60 mb-4">
                  {debouncedSearchTerm || selectedCategory !== 'all' || selectedTag
                    ? 'Try adjusting your search criteria'
                    : 'No public projects available yet'}
                </p>
                {(debouncedSearchTerm || selectedCategory !== 'all' || selectedTag) && (
                  <button onClick={clearFilters} className="btn btn-primary">
                    Clear Filters
                  </button>
                )}
              </div>
            ) : projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/discover/project/${project.publicSlug || project.id}`}
                    className="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] border border-base-content/10"
                  >
                    <div className="card-body">
                      {/* Project Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: project.color }}
                        >
                          {project.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="card-title text-lg truncate">{project.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="badge badge-outline badge-sm">
                              {project.category}
                            </span>
                            <span className="text-xs text-base-content/60">
                              {new Date(project.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-base-content/70 line-clamp-3 mb-3">
                        {project.publicDescription || project.description}
                      </p>

                      {/* Tags */}
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {project.tags.slice(0, 3).map((tag: string, index: number) => (
                            <span key={index} className="badge badge-ghost badge-xs">
                              {tag}
                            </span>
                          ))}
                          {project.tags.length > 3 && (
                            <span className="badge badge-ghost badge-xs">
                              +{project.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Technologies */}
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {project.technologies.map((tech: any, index: number) => (
                            <span key={index} className="badge badge-primary badge-xs">
                              {tech.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex justify-between items-center mt-auto pt-2">
                        {project.owner ? (
                          <div className="text-sm text-base-content/60">
                            by{' '}
                            {project.owner.isPublic || project.owner.publicSlug ? (
                              <Link 
                                to={`/discover/user/${project.owner.publicSlug || project.owner.id}`}
                                className="font-medium text-primary hover:text-primary-focus transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {project.owner.firstName} {project.owner.lastName}
                                {project.owner.publicSlug && (
                                  <span className="ml-1">
                                    @{project.owner.publicSlug}
                                  </span>
                                )}
                              </Link>
                            ) : (
                              <span className="font-medium">
                                {project.owner.firstName} {project.owner.lastName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-base-content/60">
                            Anonymous
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              /* Empty State for New Users */
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🚀</div>
                <h3 className="text-xl font-semibold mb-2">Be the first to share!</h3>
                <p className="text-base-content/60 mb-4">
                  No public projects yet. Make your projects public to share them with the community.
                </p>
                <button 
                  onClick={() => navigate('/public')}
                  className="btn btn-primary"
                >
                  Go to Project Public Settings
                </button>
              </div>
            )}

            {/* Loading More */}
            {loading && currentPage > 1 && (
              <div className="text-center py-4">
                <div className="loading loading-spinner loading-md"></div>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center pt-4 border-t border-base-300">
                <div className="join">
                  <button 
                    className="join-item btn btn-sm"
                    disabled={!pagination.hasPrev}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const startPage = Math.max(1, currentPage - 2);
                    const pageNum = startPage + i;
                    if (pageNum > pagination.pages) return null;
                    
                    return (
                      <button
                        key={pageNum}
                        className={`join-item btn btn-sm ${currentPage === pageNum ? 'btn-active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button 
                    className="join-item btn btn-sm"
                    disabled={!pagination.hasNext}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscoverPage;