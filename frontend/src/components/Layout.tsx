import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { authAPI, projectAPI, Project } from '../api/client';
import SessionTracker from './SessionTracker';
import { useAnalytics } from '../hooks/useAnalytics';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Initialize analytics
  const analytics = useAnalytics({
    trackPageViews: true,
    projectId: selectedProject?.id,
    projectName: selectedProject?.name
  });
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.querySelector('.dropdown');
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'cyberpunk';
  });
  const [collapsedSections, setCollapsedSections] = useState<{
    [key: string]: boolean;
  }>(() => {
    const saved = localStorage.getItem('collapsedSections');
    return saved ? JSON.parse(saved) : {};
  });

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  // Save collapsed sections to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('collapsedSections', JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  // Helper function to select and persist project
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    localStorage.setItem('selectedProjectId', project.id);
    setSearchTerm(''); // Clear search when selecting a project
  };

  // Toggle section collapse
  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Group projects by category
  const groupProjectsByCategory = (projects: Project[]) => {
    const grouped: { [category: string]: Project[] } = {};
    
    projects.forEach(project => {
      const category = project.category || 'General';
      // Capitalize first letter of each word
      const normalizedCategory = category.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      
      if (!grouped[normalizedCategory]) {
        grouped[normalizedCategory] = [];
      }
      grouped[normalizedCategory].push(project);
    });
    
    // Sort projects within each category alphabetically
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return grouped;
  };

  const loadProjects = async () => {
    try {
      const projectsResponse = await projectAPI.getAll();
      setProjects(projectsResponse.projects);
      
      // Try to restore previously selected project
      const savedProjectId = localStorage.getItem('selectedProjectId');
      if (savedProjectId) {
        const savedProject = projectsResponse.projects.find(p => p.id === savedProjectId);
        if (savedProject) {
          setSelectedProject(savedProject);
          return;
        }
      }
      
      // Fallback to first project if no saved project found
      if (projectsResponse.projects.length > 0) {
        const activeProjects = projectsResponse.projects.filter(p => !p.isArchived);
        const defaultProject = activeProjects.length > 0 ? activeProjects[0] : projectsResponse.projects[0];
        handleProjectSelect(defaultProject);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userResponse, projectsResponse] = await Promise.all([
          authAPI.getMe(),
          projectAPI.getAll()
        ]);
        setUser(userResponse.user);
        setProjects(projectsResponse.projects);
        
        // Set current user for analytics
        analytics.setCurrentUser(userResponse.user?.id || null);
        
        // Try to restore previously selected project
        const savedProjectId = localStorage.getItem('selectedProjectId');
        if (savedProjectId) {
          const savedProject = projectsResponse.projects.find(p => p.id === savedProjectId);
          if (savedProject) {
            setSelectedProject(savedProject);
            return;
          }
        }
        
        // Fallback to first project if no saved project found
        if (projectsResponse.projects.length > 0) {
          const activeProjects = projectsResponse.projects.filter(p => !p.isArchived);
          const defaultProject = activeProjects.length > 0 ? activeProjects[0] : projectsResponse.projects[0];
          handleProjectSelect(defaultProject);
        }
      } catch (err) {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      // Clear user session before logout
      analytics.clearUserSession();
      await authAPI.logout();
      navigate('/login');
    } catch (err) {
      // Clear session even if logout fails
      analytics.clearUserSession();
      navigate('/login');
    }
  };

  const handleProjectUpdate = async (projectId: string, updatedData: any) => {
    try {
      if (!projectId || projectId === 'undefined') {
        throw new Error('Invalid project ID');
      }

      const response = await projectAPI.update(projectId, updatedData);
      await loadProjects();
      return response;
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  };

  const handleProjectArchive = async (projectId: string, isArchived: boolean) => {
    try {
      await projectAPI.archive(projectId, isArchived);
      await loadProjects();
    } catch (error) {
      console.error('Failed to archive project:', error);
      throw error;
    }
  };

  const handleProjectDelete = async (projectId: string) => {
    try {
      await projectAPI.delete(projectId);
      await loadProjects();
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'notes', label: 'Notes / To Dos', path: '/notes' },
    { id: 'roadmap', label: 'Stack / Progress', path: '/roadmap' },
    { id: 'docs', label: 'Docs / Features', path: '/docs' },
    { id: 'deployment', label: 'Deployment', path: '/deployment' },
    { id: 'public', label: 'Public', path: '/public' },
    { id: 'settings', label: 'Settings /Info', path: '/settings' }
  ];

  const currentTab = location.pathname.slice(1) || 'notes';

  // Filter projects and group by category
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const currentProjects = filteredProjects.filter(p => !p.isArchived && !p.isShared);
  const archivedProjects = filteredProjects.filter(p => p.isArchived);
  const sharedProjects = filteredProjects.filter(p => p.isShared);
  
  const groupedCurrentProjects = groupProjectsByCategory(currentProjects);
  const groupedArchivedProjects = groupProjectsByCategory(archivedProjects);
  const groupedSharedProjects = groupProjectsByCategory(sharedProjects);

  return (
    <div className="min-h-screen bg-base-300 flex flex-col">
      {/* Header */}
      <div className="bg-base-100 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-content" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Dev Codex</h1>
          </div>
          
          <div className="absolute left-1/2 transform -translate-x-1/2 flex gap-2">
            <button 
              className={`btn ${searchParams.get('view') === 'projects' ? 'btn-primary' : 'btn-ghost'} gap-2`}
              onClick={() => navigate('/notes?view=projects')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              My Projects
            </button>
            <button 
              className={`btn ${(location.pathname === '/notes' || location.pathname === '/roadmap' || location.pathname === '/docs' || location.pathname === '/deployment' || location.pathname === '/public' || location.pathname === '/settings') && searchParams.get('view') !== 'projects' ? 'btn-primary' : 'btn-ghost'} gap-2`}
              onClick={() => navigate('/notes')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Project Details
            </button>
            <button 
              className={`btn ${location.pathname === '/discover' ? 'btn-primary' : 'btn-ghost'} gap-2`}
              onClick={() => navigate('/discover')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Discover
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <SessionTracker />
            {selectedProject && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-base-200 rounded-lg border border-base-content/10">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedProject.color }}
                ></div>
                <span className="text-sm font-medium">{selectedProject.name}</span>
              </div>
            )}
            <span className="text-sm font-medium">Hi, {user?.firstName}!</span>
            <div className="dropdown dropdown-end">
              <button 
                className="btn btn-circle btn-sm bg-base-200 hover:bg-base-300 border-0"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              {dropdownOpen && (
                <ul className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-xl border border-base-content/10 w-52 z-50">
                  <li>
                    <button onClick={() => { navigate('/billing'); setDropdownOpen(false); }} className="flex items-center gap-3 w-full text-left">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Billing & Plans
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { navigate('/account-settings'); setDropdownOpen(false); }} className="flex items-center gap-3 w-full text-left">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Account Settings
                    </button>
                  </li>
                  {user?.isAdmin && (
                    <li>
                      <button onClick={() => { navigate('/admin'); setDropdownOpen(false); }} className="flex items-center gap-3 w-full text-left">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Admin Dashboard
                      </button>
                    </li>
                  )}
                  <li>
                    <button onClick={() => { navigate('/support'); setDropdownOpen(false); }} className="flex items-center gap-3 w-full text-left">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Contact Support
                    </button>
                  </li>
                  <div className="divider my-1"></div>
                  <li>
                    <button onClick={() => { handleLogout(); setDropdownOpen(false); }} className="text-error flex items-center gap-3 w-full text-left">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-base-100 flex flex-col">
        {/* Render content based on current route */}
        {searchParams.get('view') === 'projects' ? (
          /* My Projects Tab - File Manager Style */
          <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-base-content/10 bg-base-50">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  My Projects
                </h2>
                <span className="text-sm text-base-content/60">{projects.length} projects</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input input-sm input-bordered pl-9 pr-3 w-64"
                  />
                </div>
                <button
                  onClick={() => navigate('/create-project')}
                  className="btn btn-primary btn-sm gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New
                </button>
              </div>
            </div>
            
            {/* File Manager Content */}
            <div className="flex-1 overflow-auto p-4">
              <div className="max-w-3xl mx-auto space-y-1 text-sm">
                {/* Active Projects Section */}
                <div
                  className="flex items-center py-2 px-3 hover:bg-base-200 rounded cursor-pointer"
                  onClick={() => toggleSection('active')}
                >
                  <svg 
                    className={`w-4 h-4 mr-2 transition-transform ${collapsedSections.active ? '' : 'rotate-90'}`}
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <span className="font-medium text-blue-500">Active</span>
                  <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{currentProjects.length}</span>
                </div>
                
                {/* Active Projects Contents */}
                {!collapsedSections.active && (
                  <div className="ml-6 space-y-0.5">
                    {Object.keys(groupedCurrentProjects).length === 0 ? (
                      <div className="flex items-center py-6 text-base-content/60">
                        <span className="text-sm">No active projects</span>
                      </div>
                    ) : (
                      Object.entries(groupedCurrentProjects).map(([category, categoryProjects]) => (
                        <div key={category}>
                          {/* Category */}
                          <div
                            className="flex items-center py-1.5 px-2 hover:bg-base-200 rounded cursor-pointer"
                            onClick={() => toggleSection(`active-${category}`)}
                          >
                            <svg 
                              className={`w-3 h-3 mr-2 transition-transform ${collapsedSections[`active-${category}`] ? '' : 'rotate-90'}`}
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <svg className="w-4 h-4 mr-2 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                            </svg>
                            <span className="font-medium text-orange-600">{category}</span>
                            <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">{categoryProjects.length}</span>
                          </div>
                          
                          {/* Category Projects */}
                          {!collapsedSections[`active-${category}`] && (
                            <div className="ml-5 space-y-0.5">
                              {categoryProjects.map((project) => (
                                <div
                                  key={project.id}
                                  onClick={() => {
                                    handleProjectSelect(project);
                                    navigate('/notes');
                                  }}
                                  className={`flex items-center py-1.5 px-2 rounded cursor-pointer transition-all ${
                                    selectedProject?.id === project.id 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'hover:bg-base-200'
                                  }`}
                                >
                                  <div 
                                    className="w-4 h-4 mr-2 rounded-sm"
                                    style={{ backgroundColor: project.color }}
                                  ></div>
                                  <span className="font-medium flex-1">{project.name}</span>
                                  {selectedProject?.id === project.id && (
                                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Archived Projects Section */}
                {archivedProjects.length > 0 && (
                  <>
                    <div
                      className="flex items-center py-2 px-3 hover:bg-base-200 rounded cursor-pointer"
                      onClick={() => toggleSection('archived')}
                    >
                      <svg 
                        className={`w-4 h-4 mr-2 transition-transform ${collapsedSections.archived ? '' : 'rotate-90'}`}
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <svg className="w-4 h-4 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                      <span className="font-medium text-red-500">Archived Projects</span>
                      <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{archivedProjects.length}</span>
                    </div>
                    
                    {!collapsedSections.archived && (
                      <div className="ml-6 space-y-0.5">
                        {Object.entries(groupedArchivedProjects).map(([category, categoryProjects]) => (
                          <div key={category}>
                            <div
                              className="flex items-center py-1.5 px-2 hover:bg-base-200 rounded cursor-pointer"
                              onClick={() => toggleSection(`archived-${category}`)}
                            >
                              <svg 
                                className={`w-3 h-3 mr-2 transition-transform ${collapsedSections[`archived-${category}`] ? '' : 'rotate-90'}`}
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              <svg className="w-4 h-4 mr-2 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                              </svg>
                              <span className="font-medium text-orange-600">{category}</span>
                              <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">{categoryProjects.length}</span>
                            </div>
                            
                            {!collapsedSections[`archived-${category}`] && (
                              <div className="ml-5 space-y-0.5">
                                {categoryProjects.map((project) => (
                                  <div
                                    key={project.id}
                                    onClick={() => {
                                      handleProjectSelect(project);
                                      navigate('/notes');
                                    }}
                                    className="flex items-center py-1.5 px-2 hover:bg-base-200 rounded cursor-pointer transition-all opacity-75 hover:opacity-100"
                                  >
                                    <div 
                                      className="w-4 h-4 mr-2 rounded-sm"
                                      style={{ backgroundColor: project.color }}
                                    ></div>
                                    <span className="font-medium">{project.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Shared Projects Section */}
                {sharedProjects.length > 0 && (
                  <>
                    <div
                      className="flex items-center py-2 px-3 hover:bg-base-200 rounded cursor-pointer"
                      onClick={() => toggleSection('shared')}
                    >
                      <svg 
                        className={`w-4 h-4 mr-2 transition-transform ${collapsedSections.shared ? '' : 'rotate-90'}`}
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                      <span className="font-medium text-purple-500">Shared</span>
                      <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{sharedProjects.length}</span>
                    </div>
                    
                    {!collapsedSections.shared && (
                      <div className="ml-6 space-y-0.5">
                        {Object.entries(groupedSharedProjects).map(([category, categoryProjects]) => (
                          <div key={category}>
                            <div
                              className="flex items-center py-1.5 px-2 hover:bg-base-200 rounded cursor-pointer"
                              onClick={() => toggleSection(`shared-${category}`)}
                            >
                              <svg 
                                className={`w-3 h-3 mr-2 transition-transform ${collapsedSections[`shared-${category}`] ? '' : 'rotate-90'}`}
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              <svg className="w-4 h-4 mr-2 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                              </svg>
                              <span className="font-medium text-orange-600">{category}</span>
                              <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">{categoryProjects.length}</span>
                            </div>
                            
                            {!collapsedSections[`shared-${category}`] && (
                              <div className="ml-5 space-y-0.5">
                                {categoryProjects.map((project) => (
                                  <div
                                    key={project.id}
                                    onClick={() => {
                                      handleProjectSelect(project);
                                      navigate('/notes');
                                    }}
                                    className="flex items-center py-1.5 px-2 hover:bg-base-200 rounded cursor-pointer transition-all"
                                  >
                                    <div 
                                      className="w-4 h-4 mr-2 rounded-sm"
                                      style={{ backgroundColor: project.color }}
                                    ></div>
                                    <span className="font-medium">{project.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : location.pathname === '/discover' ? (
          /* Discover Tab - Keep as is */
          <div className="flex-1 overflow-auto border border-base-content/10 bg-gradient-to-br from-base-50 to-base-100/50 m-4 rounded-2xl shadow-2xl backdrop-blur-sm">
            <div className="p-1">
              <Outlet />
            </div>
          </div>
        ) : (
          /* Project Details Tab - Show project content with tabs */
          <>
            {/* Tab Navigation */}
            {selectedProject && (
              <div className="flex justify-center px-4 py-6">
                <div className="tabs tabs-boxed tabs-lg">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => navigate(tab.path)}
                      className={`tab tab-lg font-bold text-base ${currentTab === tab.id ? 'tab-active' : ''}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Page Content */}
            <div className="flex-1 overflow-auto border border-base-content/10 bg-gradient-to-br from-base-50 to-base-100/50 m-4 rounded-2xl shadow-2xl backdrop-blur-sm">
              {selectedProject ? (
                <div className="p-1">
                  <Outlet context={{ 
                    selectedProject, 
                    onProjectUpdate: handleProjectUpdate,
                    onProjectArchive: handleProjectArchive,
                    onProjectDelete: handleProjectDelete,
                    onProjectRefresh: loadProjects
                  }} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-4">Select a project to get started</h2>
                    <p className="text-base-content/60 mb-6">Go to My Projects to choose a project</p>
                    <button
                      onClick={() => navigate('/projects')}
                      className="btn btn-primary"
                    >
                      View My Projects
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Layout;