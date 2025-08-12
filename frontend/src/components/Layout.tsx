import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { authAPI, projectAPI } from '../api';
import type { BaseProject } from '../../../shared/types';
import SessionTracker from './SessionTracker';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import ConfirmationModal from './ConfirmationModal';
import { useAnalytics } from '../hooks/useAnalytics';
import { unsavedChangesManager } from '../utils/unsavedChanges';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<BaseProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<BaseProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeProjectTab, setActiveProjectTab] = useState('active');
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'tickets' | 'analytics'>('users');
  
  // Unsaved changes modal state
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [unsavedChangesResolve, setUnsavedChangesResolve] = useState<((value: boolean) => void) | null>(null);
  
  // Initialize analytics
  const analytics = useAnalytics({
    trackPageViews: true,
    projectId: selectedProject?.id,
    projectName: selectedProject?.name
  });
  
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'retro';
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
    const currentPath = location.pathname + location.search;
    const canNavigate = await unsavedChangesManager.checkNavigationAllowed();
    if (canNavigate) {
      // Track navigation
      analytics.trackNavigation(currentPath, path, {
        navigationMethod: 'internal_link',
        hasUnsavedChanges: false
      });
      navigate(path);
    } else {
      // Track blocked navigation due to unsaved changes
      analytics.trackFeatureUsage('unsaved_changes_protection', 'Layout', {
        fromPath: currentPath,
        toPath: path,
        blocked: true
      });
    }
  };

  // Helper function to select and persist project
  const handleProjectSelect = (project: BaseProject) => {
    const previousProject = selectedProject;
    setSelectedProject(project);
    localStorage.setItem('selectedProjectId', project.id);
    setSearchTerm(''); // Clear search when selecting a project
    
    // Track project selection
    analytics.trackFeatureUsage('project_selection', 'Layout', {
      projectId: project.id,
      projectName: project.name,
      previousProjectId: previousProject?.id,
      selectionMethod: 'direct_click',
      projectCategory: project.category
    });
    
    // Scroll to top when selecting a project
    window.scrollTo(0, 0);
  };

  // Toggle section collapse
  const toggleSection = (section: string) => {
    const wasCollapsed = collapsedSections[section];
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
    
    // Track section collapse/expand
    analytics.trackUIInteraction(
      'click',
      `section-${section}`,
      section,
      'Layout',
      {
        action: wasCollapsed ? 'expand' : 'collapse',
        sectionName: section
      }
    );
  };

  // Group projects by category
  const groupProjectsByCategory = (projects: BaseProject[]) => {
    const grouped: { [category: string]: BaseProject[] } = {};
    
    projects.forEach(project => {
      const category = project.category || 'General';
      // Capitalize first letter of each word
      const normalizedCategory = category.split(' ').map((word: string) => 
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
        
        // Update theme from user preference (always sync on login)
        if (userResponse.user?.theme) {
          const userTheme = userResponse.user.theme;
          setCurrentTheme(userTheme);
          localStorage.setItem('theme', userTheme);
          document.documentElement.setAttribute('data-theme', userTheme);
        }
        
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
        
        // Navigate to My Projects view as default and ensure Active tab is selected
        if (location.pathname === '/' || location.pathname === '/notes') {
          setActiveProjectTab('active'); // Ensure Active tab is selected
          navigate('/notes?view=projects');
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

  // Listen for custom project selection events from notifications
  useEffect(() => {
    const handleSelectProject = (event: CustomEvent) => {
      const { projectId } = event.detail;
      if (projects.length > 0) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          setSelectedProject(project);
        }
      }
    };

    window.addEventListener('selectProject', handleSelectProject as EventListener);
    
    return () => {
      window.removeEventListener('selectProject', handleSelectProject as EventListener);
    };
  }, [projects]);

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
      await projectAPI.deleteProject(projectId);
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
    { id: 'settings', label: 'Settings', path: '/settings' }
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
        {/* Mobile and Tablet Layout */}
        <div className="block lg:hidden px-4 py-2">
          <div className="flex flex-col gap-2">
            {/* Top row: Logo and User Menu */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/notes?view=projects')}>
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-primary-content" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Dev Codex</h1>
              </div>
              
              {user ? (
                <div className="flex items-center gap-2">
                  <SessionTracker 
                    projectId={selectedProject?.id}
                    currentUserId={user?.id}
                  />
                  <NotificationBell />
                  <UserMenu user={user} onLogout={handleLogout} />
                </div>
              ) : (
                <button 
                  onClick={() => navigate('/login')}
                  className="btn btn-primary btn-sm"
                >
                  Sign In
                </button>
              )}
            </div>
            
            {/* Second row: Search and Navigation */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search bar and project info */}
              <div className="flex items-center gap-2 flex-1">
                {selectedProject && (
                  <div 
                    className="flex items-center gap-1 px-2 py-1 bg-base-100/80 rounded-lg border border-base-content/10 shadow-sm cursor-pointer hover:bg-base-200/70 transition-all duration-200"
                    onClick={() => handleNavigateWithCheck('/notes')}
                  >
                    <div 
                      className="w-2 h-2 rounded-full shadow-sm"
                      style={{ backgroundColor: selectedProject.color }}
                    ></div>
                    <span className="text-xs font-medium truncate max-w-20">{selectedProject.name}</span>
                  </div>
                )}
                <div className="relative flex-1">
                  <svg className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => {
                      const newSearchTerm = e.target.value;
                      setSearchTerm(newSearchTerm);
                      
                      // Track search
                      if (newSearchTerm.trim()) {
                        const filteredCount = projects.filter(p => 
                          p.name.toLowerCase().includes(newSearchTerm.toLowerCase()) ||
                          (p.category && p.category.toLowerCase().includes(newSearchTerm.toLowerCase()))
                        ).length;
                        
                        analytics.trackSearch(newSearchTerm, filteredCount, 'MobileSearch');
                        
                        if (searchParams.get('view') !== 'projects') {
                          navigate('/notes?view=projects');
                        }
                      } else if (searchTerm.trim()) {
                        // Track search clear
                        analytics.trackFeatureUsage('search_clear', 'MobileSearch');
                      }
                    }}
                    className="input input-sm input-bordered pl-9 pr-8 w-full bg-base-100/80 backdrop-blur-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50 hover:text-base-content/80 transition-colors"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    analytics.trackButtonClick('Create Project', 'MobileHeader', {
                      location: 'mobile_header',
                      hasSelectedProject: !!selectedProject
                    });
                    navigate('/create-project');
                  }}
                  className="btn btn-primary btn-sm btn-circle shadow-sm relative z-50"
                  title="New Project"
                  style={{ pointerEvents: 'auto' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                </div>
              </div>
            </div>
            
            {/* Third row: Navigation buttons */}
            {location.pathname !== '/support' && (
            <div className="flex my-2 gap-1 overflow-x-auto scrollbar-hide self-center">
              <button 
                className={`btn btn-sm ${searchParams.get('view') === 'projects' ? 'btn-primary' : 'btn-ghost'} gap-1 font-bold whitespace-nowrap`}
                onClick={() => handleNavigateWithCheck('/notes?view=projects')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="hidden sm:inline">My Projects</span>
                <span className="sm:hidden">Projects</span>
              </button>
              <button 
                className={`btn btn-sm ${(location.pathname === '/notes' || location.pathname === '/roadmap' || location.pathname === '/docs' || location.pathname === '/deployment' || location.pathname === '/public' || location.pathname === '/settings') && searchParams.get('view') !== 'projects' ? 'btn-primary' : 'btn-ghost'} gap-1 font-bold whitespace-nowrap`}
                onClick={() => handleNavigateWithCheck('/notes')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Project Details</span>
                <span className="sm:hidden">Details</span>
              </button>
              <button 
                className={`btn btn-sm ${location.pathname === '/ideas' ? 'btn-primary' : 'btn-ghost'} gap-1 font-bold whitespace-nowrap`}
                onClick={() => handleNavigateWithCheck('/ideas')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Ideas
              </button>
              <button 
                className={`btn btn-sm ${location.pathname === '/discover' || location.pathname.startsWith('/discover/') ? 'btn-primary' : 'btn-ghost'} gap-1 font-bold whitespace-nowrap`}
                onClick={() => {
                  analytics.trackFeatureUsage('discover_button_click', 'Layout');
                  handleNavigateWithCheck('/discover');
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Discover
              </button>
            </div>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block px-6 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 bg-base-200/50 backdrop-blur-sm border border-base-content/10 rounded-xl px-4 py-2 h-12 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/notes?view=projects')}>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-primary-content" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Dev Codex</h1>
              
              {/* Search bar */}
              <div className="relative ml-4 flex items-center gap-2">
                
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
                      if (e.target.value.trim() && searchParams.get('view') !== 'projects') {
                        navigate('/notes?view=projects');
                      }
                    }}
                    className="input input-sm input-bordered pl-9 pr-8 w-48 bg-base-100/80 backdrop-blur-sm shadow-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50 hover:text-base-content/80 transition-colors"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Create project button clicked (desktop)');
                    navigate('/create-project');
                  }}
                  className="btn btn-primary btn-sm btn-circle shadow-sm relative z-50"
                  title="New Project"
                  style={{ pointerEvents: 'auto' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex gap-1">
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
              <div className="flex items-center gap-0 bg-base-200/50 backdrop-blur-sm border border-base-content/10 rounded-xl px-2 py-2 h-12 shadow-sm">
                {selectedProject && (
                  <div 
                    className="flex items-center gap-2 px-3 py-1.5 bg-base-100/80 rounded-lg border border-base-content/10 shadow-sm mr-2 cursor-pointer hover:bg-base-200/70 transition-all duration-200 h-8"
                    onClick={() => handleNavigateWithCheck('/notes')}
                  >
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
                <SessionTracker 
                  projectId={selectedProject?.id}
                  currentUserId={user?.id}
                />
                
                <span className="text-sm font-medium text-base-content/80 ml-2">Hi, {user?.firstName}!</span>

                <NotificationBell />
                <UserMenu user={user} onLogout={handleLogout} />
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

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 bg-base-100 flex flex-col mb-4">
        {/* Render content based on current route */}
        {searchParams.get('view') === 'projects' ? (
          /* My Projects Tab - Modern Style */
          <>
            {/* Tab Navigation */}
            <div className="flex justify-center px-4 py-6">
              <div className="tabs tabs-boxed tabs-lg border border-base-content/10 shadow-sm">
                <button
                  onClick={() => {
                    analytics.trackTabSwitch(activeProjectTab, 'active', 'ProjectTabs');
                    setActiveProjectTab('active');
                  }}
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
                      <div className="flex items-center justify-center min-h-[50vh] py-16">
                        <div className="text-center bg-base-100 rounded-xl p-12 border border-base-content/10 shadow-lg max-w-md mx-auto">
                          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">No active projects</h3>
                          <p className="text-base-content/60 mb-6">Create your first project to get started</p>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Create project button clicked (no projects)');
                              navigate('/create-project');
                            }} 
                            className="btn btn-primary btn-lg gap-2 relative z-50"
                            style={{ pointerEvents: 'auto' }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Create Project
                          </button>
                        </div>
                      </div>
                    ) : (
                      Object.entries(groupedCurrentProjects).map(([category, categoryProjects]) => (
                        <div key={category} className="border border-base-content/10 rounded-xl bg-base-100 shadow-sm">
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
                                    className={`btn btn-lg w-full justify-start gap-3 h-auto py-4 min-h-[6rem] ${
                                      selectedProject?.id === project.id 
                                        ? 'btn-primary border-2 border-primary ring-4 ring-primary/20 shadow-lg' 
                                        : 'btn-ghost bg-base-100 hover:bg-base-200 border border-base-content/10 shadow-md'
                                    }`}
                                  >
                                    <div 
                                      className="w-5 h-5 rounded-md shadow-sm flex-shrink-0"
                                      style={{ backgroundColor: project.color }}
                                    ></div>
                                    <div className="flex-1 text-left">
                                      <div className="font-semibold leading-tight truncate">{project.name}</div>
                                      {project.description && (
                                        <div className="text-xs mt-1 line-clamp-2">{project.description}</div>
                                      )}
                                      <div className="flex items-center gap-3 mt-2 text-xs">
                                        <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
                                      </div>
                                    </div>
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
                      <div key={category} className="border border-base-content/10 rounded-xl bg-base-100 shadow-sm">
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
                                  className={`btn btn-lg w-full justify-start gap-3 h-auto py-4 min-h-[6rem] ${
                                    selectedProject?.id === project.id 
                                      ? 'btn-primary border-2 border-primary ring-4 ring-primary/20 shadow-lg' 
                                      : 'btn-ghost bg-base-100 hover:bg-base-200 border border-base-content/10 shadow-md'
                                  }`}
                                >
                                  <div 
                                    className="w-5 h-5 rounded-md shadow-sm flex-shrink-0"
                                    style={{ backgroundColor: project.color }}
                                  ></div>
                                  <div className="flex-1 text-left">
                                    <div className="font-semibold leading-tight truncate">{project.name}</div>
                                    {project.description && (
                                      <div className="text-xs mt-1 line-clamp-2">{project.description}</div>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs">
                                      <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                                      <span>•</span>
                                      <span>Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>
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
                    ))}
                  </div>
                )}
                
                {activeProjectTab === 'shared' && (
                  <div className="space-y-4">
                    {Object.entries(groupedSharedProjects).map(([category, categoryProjects]) => (
                      <div key={category} className="space-y-3 border border-base-content/10 rounded-xl bg-base-100 shadow-sm">
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
                                  className={`btn btn-lg w-full justify-start gap-3 h-auto py-4 min-h-[6rem] ${
                                    selectedProject?.id === project.id 
                                      ? 'btn-primary border-2 border-primary ring-4 ring-primary/20 shadow-lg' 
                                      : 'btn-ghost bg-base-100 hover:bg-base-200 border border-base-content/10 shadow-md'
                                  }`}
                                >
                                  <div 
                                    className="w-5 h-5 rounded-md shadow-sm flex-shrink-0"
                                    style={{ backgroundColor: project.color }}
                                  ></div>
                                  <div className="flex-1 text-left">
                                    <div className="font-semibold leading-tight truncate">{project.name}</div>
                                    {project.description && (
                                      <div className="text-xs mt-1 line-clamp-2">{project.description}</div>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs">
                                      <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                                      <span>•</span>
                                      <span>Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>
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
              <div className="tabs tabs-boxed tabs-lg border border-base-content/10 shadow-sm">
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
          <div className="flex-1 overflow-auto border border-base-content/10 bg-gradient-to-br from-base-50 to-base-100/50 mx-4 my-4 rounded-2xl shadow-2xl backdrop-blur-sm">
            <div className="p-1">
              <Outlet />
            </div>
          </div>
        ) : location.pathname === '/ideas' ? (
          /* Ideas Tab - Standalone user notes */
          <>
            {/* Tab-style header for Ideas */}
            <div className="flex justify-center px-4 py-6">
              <div className="tabs tabs-boxed tabs-lg border border-base-content/10 shadow-sm">
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
        ) : location.pathname === '/admin' ? (
          /* Admin Dashboard - With submenu tabs */
          <>
            {/* Admin Dashboard Tab Navigation */}
            <div className="flex justify-center px-4 py-6">
              <div className="tabs tabs-boxed tabs-lg border border-base-content/10 shadow-sm bg-base-200">
                <button 
                  className={`tab tab-lg font-bold text-base ${activeAdminTab === 'users' ? 'tab-active' : ''}`}
                  onClick={() => setActiveAdminTab('users')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Users
                </button>
                <button 
                  className={`tab tab-lg font-bold text-base ${activeAdminTab === 'tickets' ? 'tab-active' : ''}`}
                  onClick={() => setActiveAdminTab('tickets')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Support Tickets
                </button>
                <button 
                  className={`tab tab-lg font-bold text-base ${activeAdminTab === 'analytics' ? 'tab-active' : ''}`}
                  onClick={() => setActiveAdminTab('analytics')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Platform Analytics
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto border border-base-content/10 bg-gradient-to-br from-base-50 to-base-100/50 rounded-2xl shadow-2xl backdrop-blur-sm">
              <div className="p-1">
                <Outlet context={{ 
                  selectedProject, 
                  user,
                  onProjectUpdate: handleProjectUpdate,
                  onProjectArchive: handleProjectArchive,
                  onProjectDelete: handleProjectDelete,
                  onProjectRefresh: loadProjects,
                  activeAdminTab
                }} />
              </div>
            </div>
          </>
        ) : location.pathname === '/billing' || location.pathname === '/account-settings' ? (
          /* Billing and Account Settings - No sub-menu */
          <div className="flex-1 overflow-auto border border-base-content/10 bg-gradient-to-br from-base-50 to-base-100/50 mx-4 my-4 rounded-2xl shadow-2xl backdrop-blur-sm">
            <div className="p-1">
              <Outlet />
            </div>
          </div>
        ) : (
          /* Project Details Tab - Show project content with tabs */
          <>
            {/* Tab Navigation */}
            {selectedProject && location.pathname !== '/support' && (
              <div className="flex justify-center px-4 py-6">
                <div className="tabs tabs-boxed tabs-lg border border-base-content/10 shadow-sm">
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
            <div className={`flex-1 overflow-auto border border-base-content/10 bg-gradient-to-br from-base-50 to-base-100/50 rounded-2xl shadow-2xl backdrop-blur-sm ${location.pathname === '/support' ? 'mt-4' : ''}`}>
              {selectedProject ? (
                <div className="p-1">
                  <Outlet context={{ 
                    selectedProject, 
                    user,
                    onProjectUpdate: handleProjectUpdate,
                    onProjectArchive: handleProjectArchive,
                    onProjectDelete: handleProjectDelete,
                    onProjectRefresh: loadProjects
                  }} />
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-[50vh] h-full">
                  <div className="text-center bg-base-100 rounded-xl p-12 border border-base-content/10 shadow-lg max-w-md mx-auto">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Select a project to get started</h2>
                    <p className="text-base-content/60 mb-6">Go to My Projects to choose a project</p>
                    <button
                      onClick={() => navigate('/notes?view=projects')}
                      className="btn btn-primary btn-lg gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      View My Projects
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmationModal
        isOpen={showUnsavedChangesModal}
        onConfirm={handleUnsavedChangesLeave}
        onCancel={handleUnsavedChangesStay}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave this page?"
        confirmText="Leave Page"
        cancelText="Stay Here"
        variant="warning"
      />
    </div>
  );
};

export default Layout;