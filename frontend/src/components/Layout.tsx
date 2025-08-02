import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { authAPI, projectAPI, Project } from '../api/client';
import SessionTracker from './SessionTracker';
import { useAnalytics } from '../hooks/useAnalytics';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Initialize analytics
  useAnalytics({
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
      const normalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
      
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
      await authAPI.logout();
      navigate('/login');
    } catch (err) {
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
      <div className="bg-base-100 shadow-lg border-b border-base-content/10 p-4">
        {/* Top Level Navigation */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold">Dev Codex</h1>
            <div className="tabs tabs-boxed">
              <a 
                className="tab tab-active cursor-pointer"
                onClick={() => navigate('/notes')}
              >
                My Projects
              </a>
              <a 
                className="tab cursor-pointer" 
                onClick={() => navigate('/discover')}
              >
                Discover
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <SessionTracker />
            </div>
            <span className="text-lg">Hi, {user?.firstName}!</span>
            <div className="relative z-50">
              <button 
                className="btn btn-circle shadow-sm border border-base-content/10"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              {dropdownOpen && (
                <ul className="absolute right-0 top-full mt-2 menu p-2 shadow-xl bg-base-100 border border-base-content/10 rounded-box w-52 z-50">
                <li>
                  <a onClick={() => { navigate('/billing'); setDropdownOpen(false); }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Billing & Plans
                  </a>
                </li>
                <li>
                  <a onClick={() => { navigate('/account-settings'); setDropdownOpen(false); }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Account Settings
                  </a>
                </li>
                {user?.isAdmin && (
                  <li>
                    <a onClick={() => { navigate('/admin'); setDropdownOpen(false); }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Admin Dashboard
                    </a>
                  </li>
                )}
                <li>
                  <a onClick={() => { navigate('/support'); setDropdownOpen(false); }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Contact Support
                  </a>
                </li>
                <div className="divider my-1"></div>
                <li>
                  <a onClick={() => { handleLogout(); setDropdownOpen(false); }} className="text-error">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </a>
                </li>
                </ul>
              )}
            </div>
          </div>
        </div>
        
        {/* Project Controls */}
        <div className="flex justify-between items-center">
          {/* Left section - Project Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/create-project')}
              className="btn btn-primary btn-sm shadow-sm"
            >
              Create Project
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="bg-gradient-to-b from-base-100 to-base-200/50 backdrop-blur-sm border-r border-base-content/20 p-6" style={{ width: '320px' }}>
          {/* Search Projects */}
          <div className="mb-8">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input input-bordered w-full pl-10 pr-4 py-3 rounded-xl bg-base-200/50 border-base-content/10 focus:border-primary/50 focus:bg-base-100 transition-all duration-200 placeholder:text-base-content/50"
              />
            </div>
          </div>
          
          {/* Active Projects */}
          <div className="mb-4">
            <div 
              className="group flex items-center cursor-pointer mb-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 transition-all duration-300 hover:shadow-md hover:scale-[1.01]"
              onClick={() => toggleSection('active')}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg mr-4">
                <svg 
                  className={`w-5 h-5 text-white transition-transform duration-300 ${collapsedSections.active ? 'rotate-0' : 'rotate-90'}`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-base-content group-hover:text-primary transition-colors duration-200">
                  Active
                </h3>
                <p className="text-xs text-base-content/60">{currentProjects.length} projects</p>
              </div>
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/20 text-primary text-xs font-bold shadow-sm">
                {currentProjects.length}
              </div>
            </div>
            {!collapsedSections.active && (
              <div className="ml-4 space-y-2">
                {Object.keys(groupedCurrentProjects).length === 0 ? (
                  <div className="text-center py-4 bg-gradient-to-br from-base-200/30 to-base-300/20 rounded-xl border-2 border-dashed border-primary/20">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-md">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <p className="text-base-content/70 mb-3 text-sm font-medium">No active projects</p>
                    <button
                      onClick={() => navigate('/create-project')}
                      className="btn btn-primary btn-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary to-primary/80"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Project
                    </button>
                  </div>
                ) : (
                  Object.entries(groupedCurrentProjects).map(([category, categoryProjects]) => (
                    <div key={category} className="mb-3">
                      <div 
                        className="group flex items-center cursor-pointer p-2 rounded-lg hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-amber-400/5 transition-all duration-300 hover:shadow-sm hover:scale-[1.005]"
                        onClick={() => toggleSection(`active-${category}`)}
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 shadow-md mr-3">
                          <svg 
                            className={`w-3 h-3 text-white transition-transform duration-300 ${collapsedSections[`active-${category}`] ? 'rotate-0' : 'rotate-90'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <span className="text-base font-semibold text-base-content group-hover:text-amber-600 transition-colors duration-200">
                            {category}
                          </span>
                          <p className="text-xs text-base-content/60">{categoryProjects.length} projects</p>
                        </div>
                        <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-amber-500/20 text-amber-700 text-xs font-bold shadow-sm">
                          {categoryProjects.length}
                        </div>
                      </div>
                      {!collapsedSections[`active-${category}`] && (
                        <div className="ml-9 space-y-1 mt-2">
                          {categoryProjects.map((project) => (
                            <div
                              key={project.id}
                              onClick={() => handleProjectSelect(project)}
                              className={`group flex items-center cursor-pointer p-3 rounded-xl transition-all duration-300 ${
                                selectedProject?.id === project.id 
                                  ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary/30 shadow-lg scale-[1.01] ring-1 ring-primary/20' 
                                  : 'hover:bg-gradient-to-r hover:from-base-200/50 hover:to-base-300/30 hover:shadow-md hover:scale-[1.005] border-2 border-transparent'
                              }`}
                            >
                              <div 
                                className="w-4 h-4 rounded-full mr-3 shadow-md ring-2 ring-white/50"
                                style={{ backgroundColor: project.color }}
                              ></div>
                              <span className={`font-medium truncate transition-colors duration-200 ${
                                selectedProject?.id === project.id ? 'text-primary' : 'text-base-content group-hover:text-base-content/90'
                              }`}>{project.name}</span>
                              {selectedProject?.id === project.id && (
                                <div className="ml-auto">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                </div>
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
          </div>

          {/* Archived Projects */}
          <div className="mb-4">
            <div 
              className="group flex items-center cursor-pointer mb-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-red-500/10 hover:to-red-400/5 transition-all duration-300 hover:shadow-md hover:scale-[1.01]"
              onClick={() => toggleSection('archived')}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg mr-4">
                <svg 
                  className={`w-5 h-5 text-white transition-transform duration-300 ${collapsedSections.archived ? 'rotate-0' : 'rotate-90'}`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-base-content group-hover:text-red-600 transition-colors duration-200">
                  Archived
                </h3>
                <p className="text-xs text-base-content/60">{archivedProjects.length} projects</p>
              </div>
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/20 text-red-700 text-xs font-bold shadow-sm">
                {archivedProjects.length}
              </div>
            </div>
            {!collapsedSections.archived && (
              <div className="ml-4 space-y-2">
                {Object.keys(groupedArchivedProjects).length === 0 ? (
                  <div className="text-center py-4 bg-gradient-to-br from-base-200/30 to-base-300/20 rounded-xl border-2 border-dashed border-red-500/20">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-red-500/20 to-red-400/10 flex items-center justify-center shadow-md">
                      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4 6-6" />
                      </svg>
                    </div>
                    <p className="text-base-content/70 text-sm font-medium">No archived projects</p>
                  </div>
                ) : (
                  Object.entries(groupedArchivedProjects).map(([category, categoryProjects]) => (
                    <div key={category} className="mb-3">
                      <div 
                        className="group flex items-center cursor-pointer p-2 rounded-lg hover:bg-gradient-to-r hover:from-red-500/10 hover:to-red-400/5 transition-all duration-300 hover:shadow-sm hover:scale-[1.005]"
                        onClick={() => toggleSection(`archived-${category}`)}
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-red-400 to-red-500 shadow-md mr-3">
                          <svg 
                            className={`w-3 h-3 text-white transition-transform duration-300 ${collapsedSections[`archived-${category}`] ? 'rotate-0' : 'rotate-90'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <span className="text-base font-semibold text-base-content group-hover:text-red-600 transition-colors duration-200">
                            {category}
                          </span>
                          <p className="text-xs text-base-content/60">{categoryProjects.length} projects</p>
                        </div>
                        <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-red-500/20 text-red-700 text-xs font-bold shadow-sm">
                          {categoryProjects.length}
                        </div>
                      </div>
                      {!collapsedSections[`archived-${category}`] && (
                        <div className="ml-9 space-y-1 mt-2">
                          {categoryProjects.map((project) => (
                            <div
                              key={project.id}
                              onClick={() => handleProjectSelect(project)}
                              className={`group flex items-center cursor-pointer p-3 rounded-xl transition-all duration-300 ${
                                selectedProject?.id === project.id 
                                  ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary/30 shadow-lg scale-[1.01] ring-1 ring-primary/20' 
                                  : 'hover:bg-gradient-to-r hover:from-base-200/50 hover:to-base-300/30 hover:shadow-md hover:scale-[1.005] border-2 border-transparent'
                              }`}
                            >
                              <div 
                                className="w-4 h-4 rounded-full mr-3 shadow-md ring-2 ring-white/50"
                                style={{ backgroundColor: project.color }}
                              ></div>
                              <span className={`font-medium truncate transition-colors duration-200 ${
                                selectedProject?.id === project.id ? 'text-primary' : 'text-base-content group-hover:text-base-content/90'
                              }`}>{project.name}</span>
                              {selectedProject?.id === project.id && (
                                <div className="ml-auto">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                </div>
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
          </div>

          {/* Shared Projects */}
          {sharedProjects.length > 0 && (
            <div className="mb-6">
              <div 
                className="flex items-center cursor-pointer mb-3 p-2 rounded-lg hover:bg-base-200 transition-colors"
                onClick={() => toggleSection('shared')}
              >
                <svg 
                  className={`w-4 h-4 mr-2 transition-transform ${collapsedSections.shared ? 'rotate-0' : 'rotate-90'}`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <svg className="w-4 h-4 mr-2 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <h3 className="font-bold text-xl text-warning">
                  Shared
                  <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                    {sharedProjects.length}
                  </span>
                </h3>
              </div>
              {!collapsedSections.shared && (
                <div className="ml-6 space-y-1">
                  {Object.entries(groupedSharedProjects).map(([category, categoryProjects]) => (
                    <div key={category} className="mb-3">
                      <div 
                        className="flex items-center cursor-pointer p-2 rounded hover:bg-base-200 transition-colors"
                        onClick={() => toggleSection(`shared-${category}`)}
                      >
                        <svg 
                          className={`w-3 h-3 mr-2 transition-transform ${collapsedSections[`shared-${category}`] ? 'rotate-0' : 'rotate-90'}`}
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <svg className="w-3 h-3 mr-2 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                        <span className="text-lg font-semibold text-base-content/80">
                          {category}
                          <span className="ml-2 text-xs bg-base-300 px-1.5 py-0.5 rounded">
                            {categoryProjects.length}
                          </span>
                        </span>
                      </div>
                      {!collapsedSections[`shared-${category}`] && (
                        <div className="ml-5 space-y-1">
                          {categoryProjects.map((project) => (
                            <div
                              key={project.id}
                              onClick={() => handleProjectSelect(project)}
                              className={`flex items-center cursor-pointer p-3 rounded-lg border transition-all ${
                                selectedProject?.id === project.id 
                                  ? 'bg-primary/20 border-primary/30 shadow-sm' 
                                  : 'hover:bg-base-200 border-transparent hover:border-base-content/10'
                              }`}
                            >
                              <div 
                                className="w-3 h-3 rounded-full mr-3"
                                style={{ backgroundColor: project.color }}
                              ></div>
                              <span className="text-sm font-medium truncate">{project.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-base-100 flex flex-col">
          {/* Tab Navigation */}
          {selectedProject && (
            <div className="bg-base-200 shadow-lg border-b border-base-content/10">
              <div className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => navigate(tab.path)}
                    className={`px-6 py-4 font-medium border-b-2 transition-all ${
                      currentTab === tab.id
                        ? 'border-primary text-primary bg-base-100 shadow-sm'
                        : 'border-transparent hover:bg-base-300 hover:shadow-sm'
                    }`}
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
                  <p className="text-base-content/60 mb-6">Choose a project from the sidebar or create a new one</p>
                  <button
                    onClick={() => navigate('/create-project')}
                    className="btn btn-primary"
                  >
                    Create Project
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

export default Layout;