import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { authAPI, projectAPI, Project } from '../api/client';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
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
    current: boolean;
    archived: boolean;
    shared: boolean;
  }>(() => {
    const saved = localStorage.getItem('collapsedSections');
    return saved ? JSON.parse(saved) : { current: false, archived: false, shared: false };
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
  const toggleSection = (section: 'current' | 'archived' | 'shared') => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const loadProjects = async () => {
    try {
      const projectsResponse = await projectAPI.getAll();
      console.log('Projects loaded:', projectsResponse.projects);
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
      console.log('Updating project:', projectId, updatedData);
      
      if (!projectId || projectId === 'undefined') {
        throw new Error('Invalid project ID');
      }

      const response = await projectAPI.update(projectId, updatedData);
      console.log('Update response:', response);
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
    { id: 'settings', label: 'Settings /Info', path: '/settings' }
  ];

  const currentTab = location.pathname.slice(1) || 'notes';

  // Filter and separate projects by archive status and sort alphabetically
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const currentProjects = filteredProjects.filter(p => !p.isArchived).sort((a, b) => a.name.localeCompare(b.name));
  const archivedProjects = filteredProjects.filter(p => p.isArchived).sort((a, b) => a.name.localeCompare(b.name));
  const sharedProjects = filteredProjects.filter(p => p.isShared).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-base-300 flex flex-col">
      {/* Header */}
      <div className="bg-base-100 shadow-lg border-b border-base-content/10 p-4">
        <div className="flex justify-between items-center">
          {/* Left section - Title and Project Controls */}
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold">Project Manager</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/create-project')}
                className="btn btn-primary btn-sm shadow-sm"
              >
                Create Project
              </button>
            </div>
          </div>
          
          {/* Development-only links */}
          {import.meta.env.DEV && (
            <div className="flex items-center w-1/3 gap-3">
              <a 
                href="https://excalidraw.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm shadow-sm border-base-content/20"
              >
                Excalidraw
              </a>
              <a 
                href="http://localhost:5006" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm shadow-sm border-base-content/20"
              >
                FreshNotes
              </a>
              <a 
                href="http://localhost:5004/posts" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm shadow-sm border-base-content/20"
              >
                Gator
              </a>
            </div>
          )}

          {/* Right section - User info and settings */}
          <div className="flex items-center gap-4">
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
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 bg-base-100 shadow-lg border-r border-base-content/10 p-6">
          {/* Search Projects */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-bordered input-sm w-full shadow-sm"
            />
          </div>
          
          {/* Current Projects */}
          <div className="mb-6">
            <div 
              className="flex items-center justify-between cursor-pointer mb-4 p-2 rounded-lg hover:bg-base-200 transition-colors"
              onClick={() => toggleSection('current')}
            >
              <h3 className="font-bold text-lg text-info flex items-center">
                Current
                <span className="ml-2 text-sm bg-primary/20 text-primary px-2 py-1 rounded-full shadow-sm">
                  {currentProjects.length}
                </span>
              </h3>
              <svg 
                className={`w-5 h-5 transition-transform ${collapsedSections.current ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {!collapsedSections.current && (
              <div className="space-y-1">
                {currentProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-base-content/60 mb-4">No projects yet</p>
                    <button
                      onClick={() => navigate('/create-project')}
                      className="btn btn-primary btn-sm shadow-sm"
                    >
                      Create Project
                    </button>
                  </div>
                ) : (
                  currentProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => {
                        console.log('Selecting project:', project);
                        handleProjectSelect(project);
                      }}
                      className={`flex items-center cursor-pointer p-3 rounded-lg border transition-all ${
                        selectedProject?.id === project.id 
                          ? 'bg-primary/20 border-primary/30 shadow-sm' 
                          : 'hover:bg-base-200 border-transparent hover:border-base-content/10 hover:shadow-sm'
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded-full mr-3 shadow-sm"
                        style={{ backgroundColor: project.color }}
                      ></div>
                      <div className="flex-1">
                        <span className="font-medium">{project.name}</span>
                        {project.category && project.category !== 'general' && (
                          <div className="text-sm text-base-content/60">{project.category}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Archived Projects */}
          <div className="mb-6">
            <div 
              className="flex items-center justify-between cursor-pointer mb-4 p-2 rounded-lg hover:bg-base-200 transition-colors"
              onClick={() => toggleSection('archived')}
            >
              <h3 className="font-bold text-lg text-error flex items-center">
                Archived
                <span className="ml-2 text-sm bg-primary/20 text-primary px-2 py-1 rounded-full shadow-sm">
                  {archivedProjects.length}
                </span>
              </h3>
              <svg 
                className={`w-5 h-5 transition-transform ${collapsedSections.archived ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {!collapsedSections.archived && (
              <div className="space-y-1">
                {archivedProjects.length === 0 ? (
                  <div className="text-base-content/60 italic p-3">
                    No archived projects
                  </div>
                ) : (
                  archivedProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => {
                        console.log('Selecting archived project:', project);
                        handleProjectSelect(project);
                      }}
                      className={`flex items-center cursor-pointer p-3 rounded-lg border transition-all ${
                        selectedProject?.id === project.id 
                          ? 'bg-primary/20 border-primary/30 shadow-sm' 
                          : 'hover:bg-base-200 border-transparent hover:border-base-content/10 hover:shadow-sm'
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded-full mr-3 shadow-sm"
                        style={{ backgroundColor: project.color }}
                      ></div>
                      <div className="flex-1">
                        <span className="font-medium">{project.name}</span>
                        {project.category && project.category !== 'general' && (
                          <div className="text-sm text-base-content/60">{project.category}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Shared Projects */}
          <div className="mb-6">
            <div 
              className="flex items-center justify-between cursor-pointer mb-4 p-2 rounded-lg hover:bg-base-200 transition-colors"
              onClick={() => toggleSection('shared')}
            >
              <h3 className="font-bold text-lg text-warning flex items-center">
                Shared
                <span className="ml-2 text-sm bg-primary/20 text-primary px-2 py-1 rounded-full shadow-sm">
                  {sharedProjects.length}
                </span>
              </h3>
              <svg 
                className={`w-5 h-5 transition-transform ${collapsedSections.shared ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {!collapsedSections.shared && (
              <div className="space-y-1">
                {sharedProjects.length === 0 ? (
                  <div className="text-base-content/60 italic p-3">
                    No shared projects
                  </div>
                ) : (
                  sharedProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => {
                        console.log('Selecting shared project:', project);
                        handleProjectSelect(project);
                      }}
                      className={`flex items-center cursor-pointer p-3 rounded-lg border transition-all ${
                        selectedProject?.id === project.id 
                          ? 'bg-primary/20 border-primary/30 shadow-sm' 
                          : 'hover:bg-base-200 border-transparent hover:border-base-content/10 hover:shadow-sm'
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded-full mr-3 shadow-sm"
                        style={{ backgroundColor: project.color }}
                      ></div>
                      <div className="flex-1">
                        <span className="font-medium">{project.name}</span>
                        {project.category && project.category !== 'general' && (
                          <div className="text-sm text-base-content/60">{project.category}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
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
          <div className="flex-1 overflow-auto border-2 border-base-content/10 bg-base-50 m-4 rounded-lg shadow-lg">
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