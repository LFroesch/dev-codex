import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { authAPI, projectAPI, Project } from '../api/client';
import SessionTracker from './SessionTracker';
import NotificationBell from './NotificationBell';
import { useAnalytics } from '../hooks/useAnalytics';
import { unsavedChangesManager } from '../utils/unsavedChanges';

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
  const [activeProjectTab, setActiveProjectTab] = useState('active');
  
  // Unsaved changes modal state
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [unsavedChangesResolve, setUnsavedChangesResolve] = useState<((value: boolean) => void) | null>(null);
  
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
  const [currentTheme] = useState(() => {
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

  // Set up unsaved changes confirmation handler
  useEffect(() => {
    const confirmationHandler = (_message: string): Promise<boolean> => {
      return new Promise((resolve) => {
        setUnsavedChangesResolve(() => resolve);
        setShowUnsavedChangesModal(true);
      });
    };

    unsavedChangesManager.setConfirmationHandler(confirmationHandler);
  }, []);

  // Handle unsaved changes modal actions
  const handleUnsavedChangesLeave = () => {
    setShowUnsavedChangesModal(false);
    if (unsavedChangesResolve) {
      unsavedChangesResolve(true);
      setUnsavedChangesResolve(null);
    }
  };

  const handleUnsavedChangesStay = () => {
    setShowUnsavedChangesModal(false);
    if (unsavedChangesResolve) {
      unsavedChangesResolve(false);
      setUnsavedChangesResolve(null);
    }
  };

  // Helper function to handle navigation with unsaved changes check
  const handleNavigateWithCheck = async (path: string) => {
    const canNavigate = await unsavedChangesManager.checkNavigationAllowed();
    if (canNavigate) {
      navigate(path);
    }
  };

  // Helper function to select and persist project
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    localStorage.setItem('selectedProjectId', project.id);
    setSearchTerm(''); // Clear search when selecting a project
    // Scroll to top when selecting a project
    window.scrollTo(0, 0);
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
      // Check if this is a public page that doesn't require authentication
      const isPublicPage = location.pathname.startsWith('/project/') || location.pathname.startsWith('/user/');
      
      if (isPublicPage) {
        // For public pages, just set loading to false without auth
        setLoading(false);
        return;
      }
      
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
  }, [navigate, location.pathname]);

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
    { id: 'roadmap', label: 'Stack', path: '/roadmap' },
    { id: 'docs', label: 'Docs', path: '/docs' },
    { id: 'deployment', label: 'Deployment', path: '/deployment' },
    { id: 'public', label: 'Public', path: '/public' },
    { id: 'settings', label:'Settings', path: '/settings' }
  ];

  const currentTab = location.pathname.slice(1) || 'notes';

  // Filter projects and group by category
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const currentProjects = filteredProjects.filter(p => !p.isArchived && !p.isShared);
  const archivedProjects = filteredProjects.filter(p => p.isArchived && !p.isShared);  
  const sharedProjects = filteredProjects.filter(p => p.isShared);
  
  const groupedCurrentProjects = groupProjectsByCategory(currentProjects);
  const groupedArchivedProjects = groupProjectsByCategory(archivedProjects);
  const groupedSharedProjects = groupProjectsByCategory(sharedProjects);

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      {/* Header */}
      <header className="bg-base-100 border-b border-base-content/10 shadow-sm sticky top-0 z-40">
        <div className="px-6 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 bg-base-200/50 backdrop-blur-sm border border-base-content/10 rounded-xl px-4 py-2 h-12 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/notes?view=projects')}>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-primary-content" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Dev Codex</h1>
              
              {/* Search bar - always show */}
              <div className="relative ml-4 flex items-center gap-2">
                {/* Current project indicator */}
                {selectedProject && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100/80 rounded-lg border border-base-content/10 shadow-sm">
                    <div 
                      className="w-2 h-2 rounded-full shadow-sm"
                      style={{ backgroundColor: selectedProject.color }}
                    ></div>
                    <span className="text-sm font-medium">{selectedProject.name}</span>
                    {selectedProject.isShared && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        selectedProject.isOwner ? 'bg-primary text-primary-content' :
                        selectedProject.userRole === 'editor' ? 'bg-secondary text-secondary-content' :
                        'bg-base-300 text-base-content'
                      }`}>
                        {selectedProject.isOwner ? 'owner' : selectedProject.userRole || 'member'}
                      </span>
                    )}
                  </div>
                )}
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      // Auto-navigate to My Projects when user starts typing
                      if (e.target.value.trim() && searchParams.get('view') !== 'projects') {
                        navigate('/notes?view=projects');
                      }
                    }}
                    className="input input-sm input-bordered pl-9 pr-8 w-48 bg-base-100/80 backdrop-blur-sm"
                  />
                  {/* Clear button */}
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50 hover:text-base-content/80 transition-colors"
                      title="Clear search"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => navigate('/create-project')}
                  className="btn btn-primary btn-sm btn-circle shadow-sm"
                  title="New Project"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="absolute left-1/2 transform -translate-x-1/2 flex gap-2">
              <button 
                className={`btn ${searchParams.get('view') === 'projects' ? 'btn-primary' : 'btn-ghost'} gap-2 font-bold`}
                onClick={() => handleNavigateWithCheck('/notes?view=projects')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                My Projects
              </button>
              <button 
                className={`btn ${(location.pathname === '/notes' || location.pathname === '/roadmap' || location.pathname === '/docs' || location.pathname === '/deployment' || location.pathname === '/public' || location.pathname === '/settings') && searchParams.get('view') !== 'projects' ? 'btn-primary' : 'btn-ghost'} gap-2 font-bold`}
                onClick={() => handleNavigateWithCheck('/notes')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Project Details
              </button>
              <button 
                className={`btn ${location.pathname === '/ideas' ? 'btn-primary' : 'btn-ghost'} gap-2 font-bold`}
                onClick={() => handleNavigateWithCheck('/ideas')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Ideas
              </button>
              <button 
                className={`btn ${location.pathname === '/discover' || location.pathname.startsWith('/discover/') ? 'btn-primary' : 'btn-ghost'} gap-2 font-bold`}
                onClick={() => handleNavigateWithCheck('/discover')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Discover
              </button>
            </div>
            
            {user ? (
              <div className="flex items-center gap-3 bg-base-200/50 backdrop-blur-sm border border-base-content/10 rounded-xl px-4 py-2 h-12 shadow-sm">
                <SessionTracker />
                <NotificationBell />
                
                <span className="text-sm font-medium text-base-content/80">Hi, {user?.firstName}!</span>
                
                <div className="dropdown dropdown-end">
                  <button 
                    className="btn btn-circle btn-sm bg-base-100/80 hover:bg-base-300 border border-base-content/10 shadow-sm"
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
            ) : (
              <div className="flex items-center gap-3 bg-base-200/50 backdrop-blur-sm border border-base-content/10 rounded-xl px-4 py-2 h-12 shadow-sm">
                <button 
                  onClick={() => navigate('/login')}
                  className="btn btn-primary btn-sm"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 w-4/5 mx-auto bg-base-100 flex flex-col mb-4 ">
        {/* Render content based on current route */}
        {searchParams.get('view') === 'projects' ? (
          /* My Projects Tab - Modern Style */
          <>
            {/* Tab Navigation */}
            <div className="flex justify-center px-4 py-6">
              <div className="tabs tabs-boxed tabs-lg border border-base-content/10 ">
                <button
                  onClick={() => setActiveProjectTab('active')}
                  className={`tab tab-lg font-bold text-base ${activeProjectTab === 'active' ? 'tab-active' : ''}`}
                >
                  Active ({currentProjects.length})
                </button>
                {archivedProjects.length > 0 && (
                  <button
                    onClick={() => setActiveProjectTab('archived')}
                    className={`tab tab-lg font-bold text-base ${activeProjectTab === 'archived' ? 'tab-active' : ''}`}
                  >
                    Archived ({archivedProjects.length})
                  </button>
                )}
                {sharedProjects.length > 0 && (
                  <button
                    onClick={() => setActiveProjectTab('shared')}
                    className={`tab tab-lg font-bold text-base ${activeProjectTab === 'shared' ? 'tab-active' : ''}`}
                  >
                    Shared ({sharedProjects.length})
                  </button>
                )}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto border border-base-content/10 bg-gradient-to-br from-base-50 to-base-100/50 rounded-2xl shadow-2xl backdrop-blur-sm">
              <div className="p-6">
                <div className="space-y-4">
                {activeProjectTab === 'active' && (
                  <div className="space-y-4">
                    {Object.keys(groupedCurrentProjects).length === 0 ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="text-center bg-base-100 rounded-xl p-12 border border-base-content/10 shadow-lg">
                          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">No active projects</h3>
                          <p className="text-base-content/60 mb-6">Create your first project to get started</p>
                          <button onClick={() => navigate('/create-project')} className="btn btn-primary btn-lg gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Create Project
                          </button>
                        </div>
                      </div>
                    ) : (
                      Object.entries(groupedCurrentProjects).map(([category, categoryProjects]) => (
                        <div key={category} className="border border-base-content/10 rounded-xl bg-base-100">
                          <div className="tabs tabs-boxed tabs-lg">
                            <div 
                              className="tab tab-lg cursor-pointer hover:tab-active transition-all flex items-center gap-3 w-full font-bold text-base"
                              onClick={() => toggleSection(`active-${category}`)}
                            >
                              <svg 
                                className={`w-5 h-5 transition-transform ${collapsedSections[`active-${category}`] ? '' : 'rotate-90'}`}
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                              </svg>
                              <span className="text-xl font-semibold text-base-content flex-1">{category}</span>
                              <span className="bg-primary/10 text-base-content px-3 py-1 rounded-full text-sm font-medium">{categoryProjects.length}</span>
                            </div>
                          </div>
                          {!collapsedSections[`active-${category}`] && (
                            <div className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {categoryProjects.map((project) => (
                                  <button
                                    key={project.id}
                                    onClick={() => {
                                      handleProjectSelect(project);
                                      navigate('/notes');
                                    }}
                                    className={`btn btn-lg w-full justify-start gap-3 h-auto py-6 min-h-[4rem] ${
                                      selectedProject?.id === project.id 
                                        ? 'btn-primary border-2 border-primary ring-2 ring-primary/20 shadow-lg' 
                                        : 'btn-ghost bg-base-100 hover:bg-base-200'
                                    }`}
                                  >
                                    <div 
                                      className="w-4 h-4 rounded-md shadow-sm flex-shrink-0"
                                      style={{ backgroundColor: project.color }}
                                    ></div>
                                    <span className="flex-1 text-left truncate leading-relaxed">{project.name}</span>
                                    {selectedProject?.id === project.id && (
                                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
                
                {activeProjectTab === 'archived' && (
                  <div className="space-y-4">
                    {Object.entries(groupedArchivedProjects).map(([category, categoryProjects]) => (
                      <div key={category} className="border border-base-content/10 rounded-xl bg-base-100">
                        <div className="tabs tabs-boxed tabs-lg">
                          <div 
                            className="tab tab-lg cursor-pointer hover:tab-active transition-all flex items-center gap-3 w-full font-bold text-base"
                            onClick={() => toggleSection(`archived-${category}`)}
                          >
                            <svg 
                              className={`w-5 h-5 transition-transform ${collapsedSections[`archived-${category}`] ? '' : 'rotate-90'}`}
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                            </svg>
                            <span className="text-xl font-semibold text-base-content flex-1">{category}</span>
                            <span className="bg-primary/10 text-base-content px-3 py-1 rounded-full text-sm font-medium">{categoryProjects.length}</span>
                          </div>
                        </div>
                        {!collapsedSections[`archived-${category}`] && (
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {categoryProjects.map((project) => (
                                <button
                                  key={project.id}
                                  onClick={() => {
                                    handleProjectSelect(project);
                                    navigate('/notes');
                                  }}
                                  className={`btn btn-lg w-full justify-start gap-3 h-auto py-6 min-h-[4rem] ${
                                    selectedProject?.id === project.id 
                                      ? 'btn-primary border-2 border-primary ring-2 ring-primary/20 shadow-lg' 
                                      : 'btn-ghost bg-base-100 hover:bg-base-200'
                                  }`}
                                >
                                  <div 
                                    className="w-4 h-4 rounded-md shadow-sm flex-shrink-0"
                                    style={{ backgroundColor: project.color }}
                                  ></div>
                                  <span className="flex-1 text-left truncate leading-relaxed">{project.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {activeProjectTab === 'shared' && (
                  <div className="space-y-4">
                    {Object.entries(groupedSharedProjects).map(([category, categoryProjects]) => (
                      <div key={category} className="space-y-3 border border-base-content/10 rounded-xl bg-base-100">
                        <div className="tabs tabs-boxed tabs-lg">
                          <div 
                            className="tab tab-lg cursor-pointer hover:tab-active transition-all flex items-center gap-3 w-full font-bold text-base"
                            onClick={() => toggleSection(`shared-${category}`)}
                          >
                            <svg 
                              className={`w-5 h-5 transition-transform ${collapsedSections[`shared-${category}`] ? '' : 'rotate-90'}`}
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                            </svg>
                            <span className="text-xl font-semibold text-base-content flex-1">{category}</span>
                            <span className="bg-primary/10 text-base-content px-3 py-1 rounded-full text-sm font-medium">{categoryProjects.length}</span>
                          </div>
                        </div>
                        {!collapsedSections[`shared-${category}`] && (
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {categoryProjects.map((project) => (
                                <button
                                  key={project.id}
                                  onClick={() => {
                                    handleProjectSelect(project);
                                    navigate('/notes');
                                  }}
                                  className={`btn btn-lg w-full justify-start gap-3 h-auto py-5 ${
                                    selectedProject?.id === project.id 
                                      ? 'btn-primary border-2 border-primary ring-2 ring-primary/20 shadow-lg' 
                                      : 'btn-ghost bg-base-100 hover:bg-base-200'
                                  }`}
                                >
                                  <div 
                                    className="w-4 h-4 rounded-md shadow-sm flex-shrink-0"
                                    style={{ backgroundColor: project.color }}
                                  ></div>
                                  <span className="flex-1 text-left truncate">{project.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </div>
          </>
        ) : location.pathname === '/discover' || location.pathname.startsWith('/discover/') ? (
          /* Discover Tab - With sub-tabs */
          <>
            {/* Tab Navigation for Discover */}
            <div className="flex justify-center px-4 py-6">
              <div className="tabs tabs-boxed tabs-lg border border-base-content/10">
                <button
                  onClick={() => handleNavigateWithCheck('/discover')}
                  className={`tab tab-lg font-bold text-base ${location.pathname === '/discover' ? 'tab-active' : ''}`}
                >
                  Discover
                </button>
                <button
                  onClick={() => handleNavigateWithCheck('/discover')}
                  className={`tab tab-lg font-bold text-base ${(location.pathname.startsWith('/discover/project/') || location.pathname.startsWith('/discover/user/')) ? 'tab-active' : ''}`}
                  disabled={!(location.pathname.startsWith('/discover/project/') || location.pathname.startsWith('/discover/user/'))}
                >
                  Details
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto border border-base-content/10 bg-gradient-to-br from-base-50 to-base-100/50 rounded-2xl shadow-2xl backdrop-blur-sm">
              <div className="p-1">
                <Outlet />
              </div>
            </div>
          </>
        ) : location.pathname.startsWith('/project/') || location.pathname.startsWith('/user/') ? (
          /* Public Pages - Same styling as discover */
          <div className="flex-1 overflow-auto border border-base-content/10 bg-gradient-to-br from-base-50 to-base-100/50 m-4 rounded-2xl shadow-2xl backdrop-blur-sm">
            <div className="p-1">
              <Outlet />
            </div>
          </div>
        ) : location.pathname === '/ideas' ? (
          /* Ideas Tab - Standalone user notes */
          <>
            {/* Tab-style header for Ideas */}
            <div className="flex justify-center px-4 py-6">
              <div className="tabs tabs-boxed tabs-lg border border-base-content/10">
                <div className="tab tab-lg tab-active font-bold text-base">
                  Ideas
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto border border-base-content/10 bg-gradient-to-br from-base-50 to-base-100/50 rounded-2xl shadow-2xl backdrop-blur-sm">
              <div className="p-1">
                <Outlet />
              </div>
            </div>
          </>
        ) : location.pathname === '/billing' || location.pathname === '/account-settings' ? (
          /* Billing and Account Settings - No sub-menu */
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
                <div className="tabs tabs-boxed tabs-lg border border-base-content/10">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleNavigateWithCheck(tab.path)}
                      className={`tab tab-lg font-bold text-base ${currentTab === tab.id ? 'tab-active' : ''}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Page Content */}
            <div className="flex-1 overflow-auto border border-base-content/10 bg-gradient-to-br from-base-50 to-base-100/50 rounded-2xl shadow-2xl backdrop-blur-sm">
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

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedChangesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-warning/10 rounded-full">
              <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-center mb-4">Unsaved Changes</h3>
            
            <p className="text-center text-base-content/70 mb-6">
              You have unsaved changes. Are you sure you want to leave this page?
            </p>

            <div className="flex gap-3">
              <button 
                className="btn btn-ghost flex-1"
                onClick={handleUnsavedChangesStay}
              >
                Stay Here
              </button>
              <button 
                className="btn btn-warning flex-1"
                onClick={handleUnsavedChangesLeave}
              >
                Leave Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;