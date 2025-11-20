import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { publicAPI } from '../api';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { analyticsService } from '../services/analytics';
import FavoriteButton from '../components/FavoriteButton';
import ActivityFeed from '../components/ActivityFeed';
import PostComposer from '../components/PostComposer';

const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortBy] = useState<'recent' | 'popular' | 'trending'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'projects' | 'activity' | 'users'>('projects');
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPagination, setUsersPagination] = useState<any>(null);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearchTerm, setUsersSearchTerm] = useState('');
  const [debouncedUsersSearch, setDebouncedUsersSearch] = useState('');


  // Debounce search term for projects
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce search term for users
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsersSearch(usersSearchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [usersSearchTerm]);

  // Define loadUsers function before useEffects
  const loadUsers = useCallback(async () => {
    console.log('🔍 loadUsers called with:', { debouncedUsersSearch, usersPage });
    try {
      setUsersLoading(true);
      console.log('📡 Calling API...');
      const response = await publicAPI.searchUsers({
        search: debouncedUsersSearch,
        page: usersPage,
        limit: 20
      });
      console.log('✅ API response:', response);
      setUsers(response.users || []);
      setUsersPagination(response.pagination);
    } catch (err: any) {
      console.error('❌ Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [debouncedUsersSearch, usersPage]);

  // Reset to page 1 when search term changes (before loading)
  useEffect(() => {
    if (viewMode === 'users') {
      setUsersPage(1);
    }
  }, [debouncedUsersSearch]);

  // Load users when in users mode, search changes, or page changes
  useEffect(() => {
    if (viewMode === 'users') {
      loadUsers();
    }
  }, [viewMode, loadUsers]);

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

    // Track search usage
    if (searchTerm) {
      analyticsService.trackFeatureUsage('search', {
        searchTerm,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        tag: selectedTag || undefined,
        source: 'discover_page'
      });
    }

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
    <div className="flex-1 w-full max-w-7xl mx-auto bg-base-100 flex flex-col mb-4 min-h-0">
      <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex justify-center pt-4">
        <div className="tabs-container p-1">
          <button
            className={`tab-button ${viewMode === 'projects' ? 'tab-active' : ''} gap-2`}
            style={viewMode === 'projects' ? { color: getContrastTextColor('primary') } : {}}
            onClick={() => setViewMode('projects')}
          >
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Projects
          </button>
          <button
            className={`tab-button ${viewMode === 'users' ? 'tab-active' : ''} gap-2`}
            style={viewMode === 'users' ? { color: getContrastTextColor('primary') } : {}}
            onClick={() => setViewMode('users')}
          >
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            People
          </button>
          <button
            className={`tab-button ${viewMode === 'activity' ? 'tab-active' : ''} gap-2`}
            style={viewMode === 'activity' ? { color: getContrastTextColor('primary') } : {}}
            onClick={() => setViewMode('activity')}
          >
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Activity
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-base-100 rounded-lg border-2 shadow-md hover:shadow-lg border-base-content/20 transition-all duration-200 p-4">
          <div className="flex items-center gap-3 text-error">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="flex-1">{error}</span>
            <button onClick={loadProjects} className="btn btn-primary btn-sm" style={{ color: getContrastTextColor('primary') }}>
              Retry
            </button>
          </div>
        </div>
      )}

      {viewMode === 'activity' ? (
        /* Activity Feed */
        <div className="space-y-4">
          <div className="section-container border-thick">
            <div className="section-header">
              <div className="flex items-center gap-3">
                <div className="section-icon">📢</div>
                <span>Share Something</span>
              </div>
            </div>
            <div className="section-content">
              <PostComposer postType="profile" />
            </div>
          </div>

          <div className="section-container border-thick">
            <div className="section-header">
              <div className="flex items-center gap-3">
                <div className="section-icon">📊</div>
                <span>Your Feed</span>
              </div>
            </div>
            <div className="section-content">
              <ActivityFeed limit={50} />
            </div>
          </div>
        </div>
      ) : viewMode === 'users' ? (
        /* User Search */
        <div className="space-y-4">
          <div className="section-container">
            <div className="section-header">
              <div className="flex items-center gap-3">
                <div className="section-icon">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <span>Find People</span>
                {usersPagination && (
                  <span className="text-sm text-base-content/60 ml-auto">
                    {usersPagination.total} users found
                  </span>
                )}
              </div>
            </div>
            <div className="section-content">
              <div className="form-control">
                <input
                  type="text"
                  placeholder="Search by name or username..."
                  className="input input-bordered w-full border-thick"
                  value={usersSearchTerm}
                  onChange={(e) => setUsersSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {usersLoading ? (
            <div className="flex justify-center p-12">
              <div className="loading loading-spinner loading-lg"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="section-container">
              <div className="section-content">
                <div className="text-center py-12 text-base-content/60">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">No users found</p>
                  <p className="text-sm">Try adjusting your search</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {users.map((user: any) => (
                <div key={user._id} className="section-container">
                  <div className="section-content">
                    <div className="flex flex-col gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {user.displayPreference === 'username' ? `@${user.username}` : `${user.firstName} ${user.lastName}`}
                        </h3>
                        {user.displayPreference === 'name' && user.username && (
                          <p className="text-sm text-base-content/60">@{user.username}</p>
                        )}
                        <p className="text-xs text-base-content/50 mt-1">
                          Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="btn btn-primary btn-sm w-full"
                          style={{ color: getContrastTextColor('primary') }}
                          onClick={() => navigate(`/discover/user/${user.publicSlug || user.username}`)}
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {usersPagination && usersPagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                className="btn btn-sm"
                disabled={usersPage === 1}
                onClick={() => setUsersPage(usersPage - 1)}
              >
                Previous
              </button>
              <span className="flex items-center px-4 text-sm">
                Page {usersPage} of {usersPagination.totalPages}
              </span>
              <button
                className="btn btn-sm"
                disabled={usersPage === usersPagination.totalPages}
                onClick={() => setUsersPage(usersPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
      {/* Search and Filters */}
      <div className="section-container">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <div className="section-icon">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span>Search & Filter Projects</span>
            {pagination && (
              <span className="text-sm text-base-content/60 ml-auto">
                {pagination.total} projects found
              </span>
            )}
          </div>
        </div>
        <div className="section-content">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Bar */}
            <div className="form-control">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search projects, users, technologies, or descriptions..."
                  className="input input-bordered w-full pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content transition-colors"
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
                <option value="all" >All Categories</option>
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
            </div>
          </form>
        </div>
      </div>

      {/* Projects Results */}
      <div className="collapse collapse-arrow section-collapsible">
        <input type="checkbox" defaultChecked />
        <div className="collapse-title section-collapsible-header">
          <div className="flex items-center gap-3">
            <div className="section-icon">
              🚀
            </div>
            Community Projects {pagination && `(${pagination.total})`}
          </div>
        </div>
        <div className="collapse-content">
          <div className="pt-4 space-y-6">
            {/* Results Info */}
            {pagination && (
              <div className="flex justify-between items-center text-sm text-base-content/60">
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
                  <button onClick={clearFilters} className="btn btn-primary" style={{ color: getContrastTextColor('primary') }}>
                    Clear Filters
                  </button>
                )}
              </div>
            ) : projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/discover/project/${project.publicSlug || project.id}`}
                    className="p-4 rounded-lg text-left flex flex-col card-interactive"
                  >
                    {/* Project Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <h3 
                        className="font-semibold text-base truncate px-2 py-1 rounded-md group-hover:opacity-90 transition-opacity border-thick"
                        style={{ 
                          backgroundColor: project.color,
                          color: getContrastTextColor(project.color)
                        }}
                      >
                        {project.name}
                      </h3>
                    </div>
                    
                    {/* Category and Date */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary border-2 border-base-content/20 h-[1.5rem]"
                        style={{ color: getContrastTextColor() }}
                      >
                        {project.category}
                      </span> 
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-base-200 text-base-content/80 border-2 border-base-content/20 h-[1.5rem]">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Description - Fixed height */}
                    <div className="h-[3.5rem] flex-shrink-0 mb-3">
                    {(project.publicShortDescription || project.description) && (
                      <div className={"inline-flex items-start px-2 py-0.5 rounded-md text-xs font-medium text-base-content/80 h-full w-full input input-bordered"}>
                        <p className="text-sm text-base-content/70 line-clamp-2 leading-relaxed">
                          {project.publicShortDescription || project.description}
                        </p>
                      </div>
                      )}
                    </div>

                    {/* Tags - Fixed height */}
                    <div className="mb-3 h-[1.5rem] flex-shrink-0">
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.tags.slice(0, 3).map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-base-content/80 border-2 border-base-content/20 h-[1.5rem]"
                              style={{ color: getContrastTextColor("secondary") }}
                            >
                              {tag}
                            </span>
                          ))}
                          {project.tags.length > 3 && (
                            <span className="text-xs text-base-content/50 font-medium flex items-center bg-secondary px-2 py-0.5 rounded-md border-2 border-base-content/20 h-[1.5rem]"
                            style={{color: getContrastTextColor("secondary") }}
                            >
                              +{project.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Technologies - Fixed height */}
                    <div className="mb-3 h-[1.5rem] flex-shrink-0">
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.technologies.slice(0, 4).map((tech: any, index: number) => (
                            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-base-200 text-base-content/80 border-2 border-base-content/20">
                              {tech.name}
                            </span>
                          ))}
                          {project.technologies.length > 4 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-base-200 text-base-content/80 border-2 border-base-content/20">
                              +{project.technologies.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer - Always at bottom */}
                    <div className="flex items-center justify-between text-sm pt-2 border-t-2 border-base-content/20 mt-auto">
                      <div className="flex items-center gap-2">
                        <FavoriteButton projectId={project.id} size="sm" showCount={true} />
                        {project.owner ? (
                          project.owner.isPublic || project.owner.publicSlug ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary border-2 border-base-content/20 hover:bg-primary hover:text-primary-content transition-colors cursor-pointer"
                              style={{ color: getContrastTextColor() }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/discover/user/${project.owner.publicSlug || project.owner.username || project.owner.id}`);
                              }}
                            >
                              {project.owner.displayName}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary text-base-content/80 border border-base-300/50">
                              {project.owner.displayName}
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary text-base-content/80 border border-base-300/50">@anonymous</span>
                        )}
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
                  style={{ color: getContrastTextColor('primary') }}
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
              <div className="flex justify-center pt-4 border-2 border-base-300">
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
      </>
      )}
      </div>
    </div>
  );
};

export default DiscoverPage;