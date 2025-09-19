import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { authAPI, projectAPI, analyticsAPI, ideasAPI } from '../api';
import type { Project } from '../api/types';
import SessionTracker from './SessionTracker';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import ConfirmationModal from './ConfirmationModal';
import { useAnalytics } from '../hooks/useAnalytics';
import { unsavedChangesManager } from '../utils/unsavedChanges';
import { hexToOklch, oklchToCssValue, generateFocusVariant, generateContrastingTextColor } from '../utils/colorUtils';
import ToastContainer from './Toast';
import IdeasPage from '../pages/IdeasPage';
import { toast } from '../services/toast';
import { handleAPIError } from '../services/errorService';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeProjectTab, setActiveProjectTab] = useState('active');
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'tickets' | 'analytics' | 'news'>('users');
  const [projectTimeData, setProjectTimeData] = useState<{ [projectId: string]: number }>({});
  const [, setIdeasCount] = useState(0);
  const [isHandlingTimeout, setIsHandlingTimeout] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArchivedCategory, setSelectedArchivedCategory] = useState<string | null>(null);
  const [selectedSharedCategory, setSelectedSharedCategory] = useState<string | null>(null);
  const [analyticsReady, setAnalyticsReady] = useState(false);
  
  // Unsaved changes modal state
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [unsavedChangesResolve, setUnsavedChangesResolve] = useState<((value: boolean) => void) | null>(null);

  // Helper function to apply custom theme
  const applyUserCustomTheme = async (themeName: string) => {
    try {
      // Load custom themes from database or localStorage
      let customThemes: any[] = [];
      try {
        const response = await authAPI.getCustomThemes();
        customThemes = response.customThemes || [];
      } catch (error) {
        // Fallback to localStorage
        const saved = localStorage.getItem('customThemes');
        if (saved) {
          customThemes = JSON.parse(saved);
        }
      }

      const themeId = themeName.replace('custom-', '');
      const customTheme = customThemes.find((t: any) => t.id === themeId);

      if (customTheme) {
        // Remove existing custom theme styles
        const existingStyle = document.getElementById('custom-theme-style');
        if (existingStyle) {
          existingStyle.remove();
        }

        // Convert colors to OKLCH and create CSS
        const style = document.createElement('style');
        style.id = 'custom-theme-style';

        const primaryOklch = hexToOklch(customTheme.colors.primary);
        const secondaryOklch = hexToOklch(customTheme.colors.secondary);
        const accentOklch = hexToOklch(customTheme.colors.accent);
        const neutralOklch = hexToOklch(customTheme.colors.neutral);
        const base100Oklch = hexToOklch(customTheme.colors['base-100']);
        const base200Oklch = hexToOklch(customTheme.colors['base-200']);
        const base300Oklch = hexToOklch(customTheme.colors['base-300']);
        const infoOklch = hexToOklch(customTheme.colors.info);
        const successOklch = hexToOklch(customTheme.colors.success);
        const warningOklch = hexToOklch(customTheme.colors.warning);
        const errorOklch = hexToOklch(customTheme.colors.error);

        const css = `
          [data-theme="${themeName}"] {
            color-scheme: light;
            --p: ${oklchToCssValue(primaryOklch)};
            --pf: ${oklchToCssValue(generateFocusVariant(primaryOklch))};
            --pc: ${generateContrastingTextColor(primaryOklch)};
            --s: ${oklchToCssValue(secondaryOklch)};
            --sf: ${oklchToCssValue(generateFocusVariant(secondaryOklch))};
            --sc: ${generateContrastingTextColor(secondaryOklch)};
            --a: ${oklchToCssValue(accentOklch)};
            --af: ${oklchToCssValue(generateFocusVariant(accentOklch))};
            --ac: ${generateContrastingTextColor(accentOklch)};
            --n: ${oklchToCssValue(neutralOklch)};
            --nf: ${oklchToCssValue(generateFocusVariant(neutralOklch))};
            --nc: ${generateContrastingTextColor(neutralOklch)};
            --b1: ${oklchToCssValue(base100Oklch)};
            --b2: ${oklchToCssValue(base200Oklch)};
            --b3: ${oklchToCssValue(base300Oklch)};
            --bc: ${generateContrastingTextColor(base100Oklch)};
            --in: ${oklchToCssValue(infoOklch)};
            --inc: ${generateContrastingTextColor(infoOklch)};
            --su: ${oklchToCssValue(successOklch)};
            --suc: ${generateContrastingTextColor(successOklch)};
            --wa: ${oklchToCssValue(warningOklch)};
            --wac: ${generateContrastingTextColor(warningOklch)};
            --er: ${oklchToCssValue(errorOklch)};
            --erc: ${generateContrastingTextColor(errorOklch)};
          }
        `;

        style.textContent = css;
        document.head.appendChild(style);
        document.documentElement.setAttribute('data-theme', themeName);
      } else {
        // Custom theme not found, fall back to retro
        document.documentElement.setAttribute('data-theme', 'retro');
        setCurrentTheme('retro');
      }
    } catch (error) {
      console.error('Error applying custom theme:', error);
      // Fall back to retro theme on error
      document.documentElement.setAttribute('data-theme', 'retro');
      setCurrentTheme('retro');
    }
  };
  
  // Initialize analytics
  const analytics = useAnalytics({
    projectId: selectedProject?.id,
    projectName: selectedProject?.name
  });
  
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'retro';
  });
  const [collapsedSections] = useState<{
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
    } else {
      return
    }
  };

  // Helper function to select project
  const handleProjectSelect = async (project: Project) => {
    // Prevent project selection until analytics session is ready
    if (!analyticsReady) {
      toast.warning('Please wait for session to initialize before selecting a project...');
      return;
    }
    
    setSelectedProject(project);
    setSearchTerm(''); // Clear search when selecting a project
    
    // Save selected project to localStorage for refresh persistence
    localStorage.setItem('selectedProjectId', project.id);
    // Track when user was last active for browser close detection
    localStorage.setItem('lastActiveTime', Date.now().toString());

    // Update analytics service current project (this handles backend time recording)
    try {
      await analytics.setCurrentProject(project.id);
    } catch (error) {
      
      // Fallback to direct API call if analytics service fails
      const sessionInfo = analytics.getSessionInfo();
      if (sessionInfo?.sessionId) {
        analyticsAPI.switchProject(sessionInfo.sessionId, project.id).catch(() => {
        });
      }
    }
    
    // Update project time data immediately after switching
    setTimeout(() => {
      loadProjectTimeData();
    }, 1000); // Small delay to allow backend time tracking to update
    
    // Scroll to top when selecting a project
    window.scrollTo(0, 0);
  };

  // Toggle section collapse
  // const toggleSection = (section: string) => {
  //   setCollapsedSections(prev => ({
  //     ...prev,
  //     [section]: !prev[section]
  //   }));
  // };

  // Group projects by category
  const groupProjectsByCategory = (projects: Project[]) => {
    const grouped: { [category: string]: Project[] } = {};
    
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

  const loadProjectTimeData = async () => {
    try {
      const response = await analyticsAPI.getProjectsTime(30) as any;
      if (response && response.projects && Array.isArray(response.projects)) {
        const timeMap: { [projectId: string]: number } = {};
        response.projects.forEach((project: any) => {
          timeMap[project._id] = project.totalTime || 0;
        });
        setProjectTimeData(timeMap);
      } else if (response && Array.isArray(response)) {
        // Handle case where response is directly an array
        const timeMap: { [projectId: string]: number } = {};
        response.forEach((project: any) => {
          timeMap[project._id] = project.totalTime || 0;
        });
        setProjectTimeData(timeMap);
      }
    } catch (err) {
      console.error('Failed to load project time data:', err);
    }
  };

  const loadIdeasCount = async () => {
    try {
      const response = await ideasAPI.getAll();
      setIdeasCount(response.ideas.length);
    } catch (err) {
      console.error('Failed to load ideas count:', err);
    }
  };

  const formatProjectTime = (projectId: string): string => {
    const timeMs = projectTimeData[projectId] || 0;
    const totalMinutes = Math.floor(timeMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '0m';
    }
  };

  const loadProjects = async () => {
    try {
      const projectsResponse = await projectAPI.getAll();
      setProjects(projectsResponse.projects);
      
      // If there's a currently selected project, update it with fresh data
      if (selectedProject) {
        const updatedSelectedProject = projectsResponse.projects.find(p => p.id === selectedProject.id);
        if (updatedSelectedProject) {
          setSelectedProject(updatedSelectedProject);
        }
      }
      
      // Load project time data
      await loadProjectTimeData();
      
      // Load ideas count
      await loadIdeasCount();
      
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
        
        // Load project time data
        await loadProjectTimeData();
        
        // Load ideas count
        await loadIdeasCount();
        
        // Update theme from user preference (always sync on login)
        if (userResponse.user?.theme) {
          const userTheme = userResponse.user.theme;
          setCurrentTheme(userTheme);
          localStorage.setItem('theme', userTheme);
          
          // Check if it's a custom theme and apply it properly
          if (userTheme.startsWith('custom-')) {
            await applyUserCustomTheme(userTheme);
          } else {
            // Standard theme
            document.documentElement.setAttribute('data-theme', userTheme);
          }
        }
        
        // Set current user for analytics
        analytics.setCurrentUser(userResponse.user?.id || null);
        
        // Initialize analytics session and wait for it to be ready
        try {
          await analytics.startSession();
          setAnalyticsReady(true);
        } catch (error) {
          console.error('Failed to initialize analytics session:', error);
          setAnalyticsReady(true); // Set to true anyway to avoid blocking UI
        }
        
        // Check if browser was previously closed vs page refresh
        const handleBrowserClosedPreviously = () => {
          const savedProjectId = localStorage.getItem('selectedProjectId');
          const lastActiveTime = localStorage.getItem('lastActiveTime');
          
          if (savedProjectId && lastActiveTime) {
            const timeSinceLastActive = Date.now() - parseInt(lastActiveTime);
            const fifteenMinutes = 15 * 60 * 1000; // 15 minutes
            
            if (timeSinceLastActive > fifteenMinutes) {
              // User was away for more than 15 minutes (session would have timed out)
              localStorage.removeItem('selectedProjectId');
              localStorage.removeItem('lastActiveTime');
              setSelectedProject(null);
              toast.info('Welcome back! Your previous session expired. Please select a project to continue.');
              return true; // Handled as browser close
            }
          }
          return false; // Not a browser close scenario
        };
        
        // Check if browser was closed previously, otherwise restore project selection
        const wasBrowserClosed = handleBrowserClosedPreviously();
        
        if (!wasBrowserClosed) {
          // Not a browser close scenario - restore project from localStorage if it exists
          const savedProjectId = localStorage.getItem('selectedProjectId');
          if (savedProjectId) {
            const savedProject = projectsResponse.projects.find(p => p.id === savedProjectId);
            if (savedProject) {
              setSelectedProject(savedProject);
              await analytics.setCurrentProject(savedProject.id);
            } else {
              // Project no longer exists, clear the saved data
              localStorage.removeItem('selectedProjectId');
              localStorage.removeItem('lastActiveTime');
            }
          }
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

    const handleRefreshProject = () => {
      if (user) {
        loadProjects();
      }
    };

    const handleProjectSync = (event: CustomEvent) => {
      const { newProjectId } = event.detail;
      console.log('[Layout] Cross-tab project sync received:', newProjectId);
      
      if (projects.length > 0 && newProjectId) {
        const project = projects.find(p => p.id === newProjectId);
        if (project) {
          console.log('[Layout] Updating UI to synced project:', project.name);
          setSelectedProject(project);
          
          // Show subtle feedback
          toast.success(`Switched to ${project.name}`);
          
          // Update project time data
          setTimeout(() => {
            loadProjectTimeData();
          }, 500);
        }
      }
    };

    const handleSessionTimeout = async () => {
      // Prevent multiple timeout handlers from running
      if (isHandlingTimeout) {
        return;
      }
      setIsHandlingTimeout(true);
      
      try {
        setSelectedProject(null);
        // Clear selected project from localStorage on timeout
        localStorage.removeItem('selectedProjectId');
        localStorage.removeItem('lastActiveTime');
        
        // Refresh projects data to show updated time tracking
        await loadProjects();
        await loadProjectTimeData();
        
        // Navigate to projects view
        navigate('/notes?view=projects');
        
        // Show unique feedback to user
        toast.info('Session timed out due to inactivity. Time has been saved. Please select a project to continue.');
      } finally {
        setIsHandlingTimeout(false);
      }
    };

    window.addEventListener('selectProject', handleSelectProject as EventListener);
    window.addEventListener('refreshProject', handleRefreshProject as EventListener);
    window.addEventListener('projectSync', handleProjectSync as EventListener);
    window.addEventListener('sessionTimeout', handleSessionTimeout as EventListener);
    
    return () => {
      window.removeEventListener('selectProject', handleSelectProject as EventListener);
      window.removeEventListener('refreshProject', handleRefreshProject as EventListener);
      window.removeEventListener('projectSync', handleProjectSync as EventListener);
      window.removeEventListener('sessionTimeout', handleSessionTimeout as EventListener);
    };
  }, [projects, user]);

  // Auto-update project time data every 30 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      loadProjectTimeData();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  // Update project time data when user becomes active
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User became active, refresh project time data
        loadProjectTimeData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      // Clear user session before logout
      analytics.clearUserSession();
      // Clear selected project from localStorage
      localStorage.removeItem('selectedProjectId');
      localStorage.removeItem('lastActiveTime');
      await authAPI.logout();
      toast.success('Successfully logged out. See you next time!');
      navigate('/login');
    } catch (err) {
      // Clear session even if logout fails
      analytics.clearUserSession();
      localStorage.removeItem('selectedProjectId');
      localStorage.removeItem('lastActiveTime');
      toast.info('Logged out successfully.');
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
      toast.success('Project updated successfully!');
      return response;
    } catch (error: any) {
      handleAPIError(error, {
        component: 'Layout',
        action: 'update_project',
        projectId
      });
      throw error;
    }
  };

  const handleProjectArchive = async (projectId: string, isArchived: boolean) => {
    try {
      await projectAPI.archive(projectId, isArchived);
      await loadProjects();
      toast.success(isArchived ? 'Project archived successfully!' : 'Project restored successfully!');
    } catch (error: any) {
      handleAPIError(error, {
        component: 'Layout',
        action: isArchived ? 'archive_project' : 'restore_project',
        projectId
      });
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
      toast.success('Project deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete project. Please try again.');
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
    { id: 'notes', label: 'Notes/To Dos', path: '/notes' },
    { id: 'stack', label: 'Stack', path: '/stack' },
    { id: 'docs', label: 'Docs', path: '/docs' },
    { id: 'deployment', label: 'Deployment', path: '/deployment' },
    { id: 'public', label: 'Public', path: '/public' },
    { id: 'sharing', label: 'Sharing', path: '/sharing' },
    { id: 'settings', label: 'Settings', path: '/settings' }
  ];

  const currentTab = location.pathname.slice(1) || 'notes';

  // Filter projects and group by category
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.tags && p.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
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
      <header className="bg-base-100 border-b-2 border-base-content/20 shadow-sm sticky top-0 z-40 w-full">
        {/* Mobile and Tablet Layout */}
        <div className="block desktop:hidden px-3 py-4">
          <div className="flex flex-col gap-3">
            {/* Top row: Logo + Search (tablet), Project indicator (tablet), Session Tracker, and User Menu */}
            <div className="flex items-center justify-between min-w-0 gap-3">
              <div className="flex items-center gap-3 bg-base-200 backdrop-blur-none border-2 border-base-content/20 rounded-xl px-3 py-2 h-12 shadow-sm hover:shadow-md transition-all cursor-pointer min-w-0" onClick={() => navigate('/notes?view=projects')}>
                <div className="tablet:w-8 tablet:h-8 w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <svg className="tablet:w-4 tablet:h-4 w-3.5 h-3.5 text-primary-content" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </div>
                <h1 className="tablet:text-xl text-base font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text whitespace-nowrap">Dev Codex</h1>
                
                {/* Search bar on tablet - hidden on mobile */}
                {user && selectedProject && (
                  <div className="hidden tablet:flex relative ml-4 flex-center-gap-2">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/70 z-50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          if (e.target.value.trim() && searchParams.get('view') !== 'projects') {
                            navigate('/notes?view=projects');
                          }
                        }}
                        className="input input-sm pl-10 pr-10 w-48 h-9 bg-base-100/80 backdrop-blur-none shadow-sm border border-base-content/20 rounded-lg focus:border-primary text-base-content/40"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-3 w-4 h-4 text-base-content/70 hover:text-base-content/80 transition-colors"
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
                        navigate('/create-project');
                      }}
                      className="btn btn-primary btn-sm btn-circle h-9 w-9 shadow-sm relative z-50"
                      title="New Project"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Project indicator and user section - styled background for all sizes */}
              {user ? (
                <div className="flex items-center gap-0 bg-base-200 backdrop-blur-none border-2 border-base-content/20 rounded-xl px-1 py-2 h-12 shadow-sm relative z-30 flex-shrink-0">
                  {selectedProject && (
                    <div 
                      className="hidden tablet:flex items-center gap-2 px-3 py-1.5 bg-base-100/80 rounded-lg border border-base-content/10 shadow-sm mr-2 cursor-pointer hover:bg-base-200/70 transition-all duration-200 h-8"
                      onClick={() => handleNavigateWithCheck('/notes')}
                      title={`Current project: ${selectedProject.name}`}
                    >
                      <div 
                        className="w-2 h-2 rounded-full shadow-sm"
                        style={{ backgroundColor: selectedProject.color }}
                      ></div>
                      <span className="text-sm font-medium truncate">{selectedProject.name}</span>
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
                  
                  <span className="hidden tablet:block text-sm font-medium text-base-content/80 ml-2">Hi, {user?.firstName}!</span>

                  <NotificationBell />
                  <UserMenu user={user} onLogout={handleLogout} />
                </div>
              ) : (
                <div className="flex items-center bg-base-200 backdrop-blur-none border border-base-content/10 rounded-xl px-2 py-2 h-12 shadow-sm flex-shrink-0">
                  <button 
                    onClick={() => navigate('/login')}
                    className="btn btn-primary btn-sm"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
            
            {/* Current Project and Search/Create Row - Mobile only */}
            {user && selectedProject && (
              <div className="flex tablet:hidden items-center gap-3">
                <div 
                  className="flex items-center gap-2 px-3 py-2 bg-base-200 backdrop-blur-none rounded-lg border-2 border-base-content/20 shadow-sm hover:bg-base-200/70 transition-all duration-200 cursor-pointer min-w-0 flex-shrink-0 h-10"
                  onClick={() => handleNavigateWithCheck('/notes')}
                  title={`Current project: ${selectedProject.name}`}
                >
                  <div 
                    className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0"
                    style={{ backgroundColor: selectedProject.color }}
                  ></div>
                  <span className="text-sm font-medium truncate">{selectedProject.name}</span>
                </div>
                
                {/* Search bar and create button */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/70 z-50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchTerm}
                      onChange={(e) => {
                        const newSearchTerm = e.target.value;
                        setSearchTerm(newSearchTerm);
                        
                        if (newSearchTerm.trim()) {
                          // const filteredCount = projects.filter(p => 
                          //   p.name.toLowerCase().includes(newSearchTerm.toLowerCase()) ||
                          //   (p.category && p.category.toLowerCase().includes(newSearchTerm.toLowerCase())) ||
                          //   (p.tags && p.tags.some((tag: string) => tag.toLowerCase().includes(newSearchTerm.toLowerCase())))
                          // ).length;
                                                    
                          if (searchParams.get('view') !== 'projects') {
                            navigate('/notes?view=projects');
                          }
                        } else if (searchTerm.trim()) {
                          // Track search clear
                        }
                      }}
                      className="input input-sm pl-10 pr-10 w-full h-10 bg-base-100/80 backdrop-blur-none border-2 border-base-content/20 rounded-lg focus:border-primary text-base-content/40"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-3 w-4 h-4 text-base-content/70 hover:text-base-content/80 transition-colors"
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
                      navigate('/create-project');
                    }}
                    className="btn btn-primary btn-sm btn-circle h-10 w-10 shadow-sm relative z-50"
                    title="New Project"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            
            {/* Navigation buttons */}
            {location.pathname !== '/support' && (
            <div className="flex justify-center px-2">
              <div className="tabs tabs-boxed border-2 border-base-content/20 shadow-sm">
                <button 
                  className={`tab tab-sm ${searchParams.get('view') === 'projects' ? 'tab-active' : ''} gap-2 font-bold whitespace-nowrap min-h-10 px-4`}
                  onClick={() => handleNavigateWithCheck('/notes?view=projects')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span>Projects</span>
                </button>
                <button 
                  className={`tab tab-sm ${(location.pathname === '/notes' || location.pathname === '/stack' || location.pathname === '/docs' || location.pathname === '/deployment' || location.pathname === '/public' || location.pathname === '/sharing' || location.pathname === '/settings') && searchParams.get('view') !== 'projects' ? 'tab-active' : ''} gap-2 font-bold whitespace-nowrap min-h-10 px-4`}
                  onClick={() => handleNavigateWithCheck('/notes')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Details</span>
                </button>
                <button 
                  className={`tab tab-sm ${location.pathname === '/discover' || location.pathname.startsWith('/discover/') ? 'tab-active' : ''} gap-2 font-bold whitespace-nowrap min-h-10 px-4`}
                  onClick={() => {
                    handleNavigateWithCheck('/discover');
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Discover</span>
                </button>
              </div>
            </div>
            )}

            {/* Project Views Submenu - Mobile */}
            {searchParams.get('view') === 'projects' && (
            <div className="flex justify-center px-2 py-1">
              <div className="tabs tabs-boxed border-2 border-base-content/20 shadow-sm">
                <button
                  onClick={() => {
                    setActiveProjectTab('active');
                  }}
                  className={`tab tab-sm min-h-10 font-bold text-sm ${activeProjectTab === 'active' ? 'tab-active' : ''}`}
                >
                  <span>Active <span className="text-xs opacity-60">({currentProjects.length})</span></span>
                </button>
                {archivedProjects.length > 0 && (
                  <button
                    onClick={() => setActiveProjectTab('archived')}
                    className={`tab tab-sm min-h-10 font-bold text-sm ${activeProjectTab === 'archived' ? 'tab-active' : ''}`}
                  >
                    <span>Archived <span className="text-xs opacity-60">({archivedProjects.length})</span></span>
                  </button>
                )}
                {sharedProjects.length > 0 && (
                  <button
                    onClick={() => setActiveProjectTab('shared')}
                    className={`tab tab-sm min-h-10 font-bold text-sm ${activeProjectTab === 'shared' ? 'tab-active' : ''}`}
                  >
                    <span>Shared <span className="text-xs opacity-60">({sharedProjects.length})</span></span>
                  </button>
                )}
                <button
                  onClick={() => setActiveProjectTab('ideas')}
                  className={`tab tab-sm min-h-10 font-bold text-sm ${activeProjectTab === 'ideas' ? 'tab-active' : ''}`}
                >
                  <span>Ideas</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate('/create-project');
                  }}
                  className="tab tab-sm min-h-10 font-bold text-sm hover:bg-primary/80 relative z-20"
                  title="Create New Project"
                  style={{ pointerEvents: 'auto' }}
                >
                  <span>New</span>
                </button>
              </div>
            </div>
            )}

            {/* Project Details Submenu - Mobile */}
            {selectedProject && (location.pathname === '/notes' || location.pathname === '/stack' || location.pathname === '/docs' || location.pathname === '/deployment' || location.pathname === '/public' || location.pathname === '/sharing' || location.pathname === '/settings') && searchParams.get('view') !== 'projects' && (
            <div className="flex justify-center px-2 py-1">
              <div className="tabs tabs-boxed border-2 border-base-content/20 shadow-sm overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleNavigateWithCheck(tab.path)}
                    className={`tab tab-sm min-h-10 font-bold text-sm whitespace-nowrap ${currentTab === tab.id ? 'tab-active' : ''}`}
                  >
                    <span>
                      {tab.id === 'notes' ? 'Notes' : 
                       tab.id === 'stack' ? 'Stack' : 
                       tab.id === 'docs' ? 'Docs' : 
                       tab.id === 'deployment' ? 'Deploy' : 
                       tab.id === 'public' ? 'Public' : 
                       tab.id === 'sharing' ? 'Sharing' :
                       tab.id === 'settings' ? 'Settings' : tab.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Discover Submenu - Mobile */}
            {(location.pathname === '/discover' || location.pathname.startsWith('/discover/')) && (
            <div className="flex justify-center px-2 py-1">
              <div className="tabs tabs-boxed border-2 border-base-content/20 shadow-sm">
                <button
                  onClick={() => handleNavigateWithCheck('/discover')}
                  className={`tab tab-sm min-h-10 font-bold text-sm ${location.pathname === '/discover' ? 'tab-active' : ''}`}
                >
                  Discover
                </button>
                <button
                  onClick={() => handleNavigateWithCheck('/discover')}
                  className={`tab tab-sm min-h-10 font-bold text-sm ${(location.pathname.startsWith('/discover/project/') || location.pathname.startsWith('/discover/user/')) ? 'tab-active' : ''}`}
                  disabled={!(location.pathname.startsWith('/discover/project/') || location.pathname.startsWith('/discover/user/'))}
                >
                  Details
                </button>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden desktop:block px-6 py-2">
          <div className="relative flex-between-center">
            <div className="flex items-center gap-3 bg-base-200 backdrop-blur-none border-2 border-base-content/20 rounded-xl px-4 py-2 h-12 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/notes?view=projects')}>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <svg className="icon-md text-primary-content" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text">Dev Codex</h1>
              
              {/* Search bar */}
              <div className="relative ml-4 flex-center-gap-2">
                
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 transform -translate-y-1/2 icon-sm text-base-content/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (e.target.value.trim() && searchParams.get('view') !== 'projects') {
                        navigate('/notes?view=projects');
                      }
                    }}
                    className="input-field input-sm pl-9 pr-8 w-48 h-8 bg-base-100/80 backdrop-blur-none shadow-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-3 icon-sm text-base-content/70 hover:text-base-content/80 transition-colors"
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
                    navigate('/create-project');
                  }}
                  className="btn btn-primary btn-sm btn-circle shadow-sm relative z-50"
                  title="New Project"
                  style={{ pointerEvents: 'auto' }}
                >
                  <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="tabs tabs-boxed border-2 border-base-content/20 shadow-sm">
              <button 
                className={`tab tab-sm min-h-10 font-bold text-sm ${searchParams.get('view') === 'projects' ? 'tab-active' : ''} gap-2`}
                onClick={() => handleNavigateWithCheck('/notes?view=projects')}
              >
                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                My Projects
              </button>
              <button 
                className={`tab tab-sm min-h-10 font-bold text-sm ${(location.pathname === '/notes' || location.pathname === '/stack' || location.pathname === '/docs' || location.pathname === '/deployment' || location.pathname === '/public' || location.pathname === '/sharing' || location.pathname === '/settings') && searchParams.get('view') !== 'projects' ? 'tab-active' : ''} gap-2`}
                onClick={() => handleNavigateWithCheck('/notes')}
              >
                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Project Details
              </button>
              <button 
                className={`tab tab-sm min-h-10 font-bold text-sm ${location.pathname === '/discover' || location.pathname.startsWith('/discover/') ? 'tab-active' : ''} gap-2`}
                onClick={() => handleNavigateWithCheck('/discover')}
              >
                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Discover
              </button>
              </div>
            </div>
            
            {user ? (
              <div className="flex items-center gap-0 bg-base-200 backdrop-blur-none border-2 border-base-content/20 rounded-xl px-2 py-2 h-12 shadow-sm relative z-30">
                {selectedProject && (
                  <div 
                    className="flex-center-gap-2 px-3 py-1.5 bg-base-100/80 rounded-lg border-subtle shadow-sm mr-2 cursor-pointer hover:bg-base-200/70 transition-all duration-200 h-8"
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
              <div className="flex items-center gap-3 bg-base-200 backdrop-blur-none border-subtle rounded-xl px-4 py-2 h-12 shadow-sm">
                <button 
                  onClick={() => navigate('/login')}
                  className="btn-primary-sm"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
          
          {/* Second Navigation Bar - Desktop */}
          {user && location.pathname !== '/support' && (
          <div className="p-4 pb-2">
            {/* Project Views Submenu - Desktop */}
            {searchParams.get('view') === 'projects' && (
            <div className="flex justify-center">
              <div className="tabs tabs-boxed border-2 border-base-content/20 shadow-sm">
                <button
                  onClick={() => {
                    setActiveProjectTab('active');
                  }}
                  className={`tab tab-sm min-h-10 font-bold text-sm ${activeProjectTab === 'active' ? 'tab-active' : ''}`}
                >
                  <span>Active <span className="text-xs opacity-60">({currentProjects.length})</span></span>
                </button>
                {archivedProjects.length > 0 && (
                  <button
                    onClick={() => setActiveProjectTab('archived')}
                    className={`tab tab-sm min-h-10 font-bold text-sm ${activeProjectTab === 'archived' ? 'tab-active' : ''}`}
                  >
                    <span>Archived <span className="text-xs opacity-60">({archivedProjects.length})</span></span>
                  </button>
                )}
                {sharedProjects.length > 0 && (
                  <button
                    onClick={() => setActiveProjectTab('shared')}
                    className={`tab tab-sm min-h-10 font-bold text-sm ${activeProjectTab === 'shared' ? 'tab-active' : ''}`}
                  >
                    <span>Shared <span className="text-xs opacity-60">({sharedProjects.length})</span></span>
                  </button>
                )}
                <button
                  onClick={() => setActiveProjectTab('ideas')}
                  className={`tab tab-sm min-h-10 font-bold text-sm ${activeProjectTab === 'ideas' ? 'tab-active' : ''}`}
                >
                  <span>Ideas</span>
                </button>
                {/* <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate('/create-project');
                  }}
                  className="tab tab-sm min-h-10 font-bold text-sm relative z-50"
                  title="Create New Project"
                  style={{ pointerEvents: 'auto' }}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Create New</span>
                </button> */}
              </div>
            </div>
            )}

            {/* Project Details Submenu - Desktop */}
            {selectedProject && (location.pathname === '/notes' || location.pathname === '/stack' || location.pathname === '/docs' || location.pathname === '/deployment' || location.pathname === '/public' || location.pathname === '/sharing' || location.pathname === '/settings') && searchParams.get('view') !== 'projects' && (
            <div className="flex justify-center">
              <div className="tabs tabs-boxed border-2 border-base-content/20 shadow-sm overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleNavigateWithCheck(tab.path)}
                    className={`tab tab-sm min-h-10 font-bold text-sm whitespace-nowrap ${currentTab === tab.id ? 'tab-active' : ''}`}
                  >
                    <span>
                      {tab.id === 'notes' ? 'Notes' : 
                       tab.id === 'stack' ? 'Stack' : 
                       tab.id === 'docs' ? 'Docs' : 
                       tab.id === 'deployment' ? 'Deploy' : 
                       tab.id === 'public' ? 'Public' : 
                       tab.id === 'sharing' ? 'Sharing' :
                       tab.id === 'settings' ? 'Settings' : tab.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Discover Submenu - Desktop */}
            {(location.pathname === '/discover' || location.pathname.startsWith('/discover/')) && (
            <div className="flex justify-center">
              <div className="tabs tabs-boxed border-2 border-base-content/20 shadow-sm">
                <button
                  onClick={() => handleNavigateWithCheck('/discover')}
                  className={`tab tab-sm min-h-10 font-bold text-sm ${location.pathname === '/discover' ? 'tab-active' : ''}`}
                >
                  Discover
                </button>
                <button
                  onClick={() => handleNavigateWithCheck('/discover')}
                  className={`tab tab-sm min-h-10 font-bold text-sm ${(location.pathname.startsWith('/discover/project/') || location.pathname.startsWith('/discover/user/')) ? 'tab-active' : ''}`}
                  disabled={!(location.pathname.startsWith('/discover/project/') || location.pathname.startsWith('/discover/user/'))}
                >
                  Details
                </button>
              </div>
            </div>
            )}
          </div>
          )}
        </div>
      </header>

      <div className="flex-1 w-full max-w-7xl mx-auto p-2 sm:p-4 bg-base-100 flex flex-col mb-4 min-h-0">
        {/* Render content based on current route */}
        {searchParams.get('view') === 'projects' ? (
          /* My Projects Tab - Modern Style */
          <>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto border-2 border-base-content/20 bg-gradient-to-br from-base-50 to-base-100/50 rounded-2xl shadow-2xl backdrop-blur-none container-height-fix">
              <div className="p-4 sm:p-4">
                <div className="space-y-4">
                {(activeProjectTab === 'active' || activeProjectTab === 'archived' || activeProjectTab === 'shared') && (
                  <div className="space-y-4">
                    {!analyticsReady ? (
                      <div className="flex items-center justify-center min-h-[50vh] py-16">
                        <div className="text-center bg-base-100 rounded-xl p-12 border-subtle shadow-lg max-w-md mx-auto">
                          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                            <div className="loading loading-spinner loading-lg text-primary"></div>
                          </div>
                          <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Initializing session...</h3>
                          <p className="text-base-content/60">Please wait while we set up your workspace</p>
                        </div>
                      </div>
                    ) : Object.keys(
                      activeProjectTab === 'active' ? groupedCurrentProjects :
                      activeProjectTab === 'archived' ? groupedArchivedProjects :
                      groupedSharedProjects
                    ).length === 0 ? (
                      <div className="flex items-center justify-center min-h-[50vh] py-16">
                        <div className="text-center bg-base-100 rounded-xl p-12 border-subtle shadow-lg max-w-md mx-auto">
                          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            {activeProjectTab === 'active' ? 'No active projects' :
                             activeProjectTab === 'archived' ? 'No archived projects' :
                             'No shared projects'}
                          </h3>
                          <p className="text-base-content/60 mb-6">
                            {activeProjectTab === 'active' ? 'Create your first project to get started' :
                             activeProjectTab === 'archived' ? 'Your archived projects will appear here' :
                             'Projects shared with you will appear here'}
                          </p>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate('/create-project');
                            }} 
                            className="btn btn-primary btn-lg gap-2 relative z-50"
                            style={{ pointerEvents: 'auto' }}
                          >
                            <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Create Project
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Category Selector */}
                        <div className="flex justify-center">
                          <div className="tabs tabs-boxed border-2 border-base-content/20 shadow-sm opacity-90">
                            <button
                              onClick={() => setSelectedCategory(null)}
                              className={`tab tab-sm min-h-10 font-bold text-sm ${
                                selectedCategory === null ? 'tab-active' : ''
                              }`}
                            >
                              <span>All <span className="text-xs opacity-70">({Object.values(
                                activeProjectTab === 'active' ? groupedCurrentProjects :
                                activeProjectTab === 'archived' ? groupedArchivedProjects :
                                groupedSharedProjects
                              ).flat().length})</span></span>
                            </button>
                            {Object.entries(
                              activeProjectTab === 'active' ? groupedCurrentProjects :
                              activeProjectTab === 'archived' ? groupedArchivedProjects :
                              groupedSharedProjects
                            ).map(([category, categoryProjects]) => (
                              <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`tab tab-sm min-h-10 font-bold text-sm ${
                                  selectedCategory === category ? 'tab-active' : ''
                                }`}
                              >
                                <span>{category} <span className="text-xs opacity-70">({categoryProjects.length})</span></span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Projects Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {(selectedCategory 
                            ? (activeProjectTab === 'active' ? groupedCurrentProjects :
                               activeProjectTab === 'archived' ? groupedArchivedProjects :
                               groupedSharedProjects)[selectedCategory] || []
                            : Object.values(
                                activeProjectTab === 'active' ? groupedCurrentProjects :
                                activeProjectTab === 'archived' ? groupedArchivedProjects :
                                groupedSharedProjects
                              ).flat()
                          ).map((project) => (
                            <button
                              key={project.id}
                              onClick={() => {
                                handleProjectSelect(project);
                                navigate('/notes');
                              }}
                              disabled={!analyticsReady}
                              className={`shadow-md p-4 rounded-lg border-2 transition-all duration-200 text-left group hover:shadow-lg h-[200px] flex flex-col ${
                                !analyticsReady 
                                  ? 'border-base-300/30 bg-base-100/50 opacity-60 cursor-not-allowed' 
                                  : selectedProject?.id === project.id 
                                    ? 'border-base-300 bg-base-100 hover:border-primary/30' 
                                    : 'border-base-content/20 hover:border-base-300/50'
                              }`}
                            >
                              {/* Header with color indicator and name */}
                              <div className="flex items-center gap-3 mb-3">
                                <div 
                                  className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                                  style={{ backgroundColor: project.color }}
                                ></div>
                                <h3 className={`font-semibold text-base truncate px-2 py-1 rounded-md ${
                                  selectedProject?.id === project.id ? 'group-hover:text-secondary bg-primary text-primary-content' : 'group-hover:text-primary bg-base-300 text-base-content'
                                }`}>
                                  {project.name}
                                </h3>
                              </div>
                              
                              {/* Description - Fixed height */}
                              <div className="mb-3 h-[2.5rem] flex-shrink-0">
                                {project.description && (
                                  <p className="text-sm text-base-content/70 line-clamp-2">
                                    {project.description}
                                  </p>
                                )}
                              </div>
                              
                              {/* Tags - Fixed height */}
                              <div className="mb-3 h-[1.5rem] flex-shrink-0">
                                {project.tags && project.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {project.tags.slice(0, 3).map((tag, tagIndex) => (
                                      <span
                                        key={tagIndex}
                                        className={`inline-flex items-center border-2 px-2 py-1 rounded-md text-xs font-medium ${
                                          selectedProject?.id === project.id 
                                            ? 'bg-primary/15 text-primary border-primary/20' 
                                            : 'bg-base-200 text-base-content/80 border-base-300/50'
                                        }`}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                    {project.tags.length > 3 && (
                                      <span className="text-xs text-base-content/70 font-medium flex items-center">
                                        +{project.tags.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Footer - Always at bottom */}
                              <div className="flex items-center justify-between text-xs pt-2 border-t border-base-content/20 mt-auto">
                                <div className="flex items-center gap-1 px-2 py-1 rounded-md font-medium bg-secondary text-secondary-content">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>{formatProjectTime(project.id)}</span>
                                </div>
                                <span className="text-base-content/70 font-mono">
                                  {new Date(project.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {activeProjectTab === 'ideas' && (
                  <div className="space-y-4">
                    {/* Embed IdeasPage content here */}
                    <IdeasPage onIdeasCountChange={setIdeasCount} />
                  </div>
                )}
                </div>
              </div>
            </div>
          </>
        ) : location.pathname === '/discover' || location.pathname.startsWith('/discover/') ? (
          /* Discover Tab - With sub-tabs */
          <>
            
            <div className="flex-1 overflow-auto border-2 border-base-content/20 bg-gradient-to-br from-base-50 to-base-100/50 rounded-2xl shadow-2xl backdrop-blur-none container-height-fix">
              <div className="p-2 sm:p-4 lg:p-4">
                <Outlet />
              </div>
            </div>
          </>
        ) : location.pathname.startsWith('/project/') || location.pathname.startsWith('/user/') ? (
          /* Public Pages - Same styling as discover */
          <div className="flex-1 overflow-auto border-2 border-base-content/20 bg-gradient-to-br from-base-50 to-base-100/50 mx-4 my-4 rounded-2xl shadow-2xl backdrop-blur-none container-height-fix">
            <div className="p-1">
              <Outlet />
            </div>
          </div>
        ) : location.pathname === '/admin' ? (
          /* Admin Dashboard - With submenu tabs */
          <>
            {/* Admin Dashboard Tab Navigation */}
            <div className="flex justify-center px-2 sm:px-4 py-4 sm:py-6">
              <div className="tabs tabs-boxed tabs-lg border-2 border-base-content/20 shadow-sm bg-base-200 w-full max-w-4xl overflow-x-auto">
                <button 
                  className={`tab tab-sm sm:tab-lg min-h-14 sm:min-h-16 font-bold text-xs sm:text-base px-3 sm:px-4 whitespace-nowrap ${activeAdminTab === 'users' ? 'tab-active' : ''}`}
                  onClick={() => setActiveAdminTab('users')}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <span className="hidden sm:inline">Users</span>
                  <span className="sm:hidden">Users</span>
                </button>
                <button 
                  className={`tab tab-sm sm:tab-lg min-h-14 sm:min-h-16 font-bold text-xs sm:text-base px-3 sm:px-4 whitespace-nowrap ${activeAdminTab === 'tickets' ? 'tab-active' : ''}`}
                  onClick={() => setActiveAdminTab('tickets')}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">Support Tickets</span>
                  <span className="sm:hidden">Tickets</span>
                </button>
                <button 
                  className={`tab tab-sm sm:tab-lg min-h-14 sm:min-h-16 font-bold text-xs sm:text-base px-3 sm:px-4 whitespace-nowrap ${activeAdminTab === 'analytics' ? 'tab-active' : ''}`}
                  onClick={() => setActiveAdminTab('analytics')}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="hidden sm:inline">Platform Analytics</span>
                  <span className="sm:hidden">Analytics</span>
                </button>
                <button 
                  className={`tab tab-sm sm:tab-lg min-h-14 sm:min-h-16 font-bold text-xs sm:text-base px-3 sm:px-4 whitespace-nowrap ${activeAdminTab === 'news' ? 'tab-active' : ''}`}
                  onClick={() => setActiveAdminTab('news')}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                  </svg>
                  <span className="hidden sm:inline">News & Updates</span>
                  <span className="sm:hidden">News</span>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto border-2 border-base-content/20 bg-gradient-to-br from-base-50 to-base-100/50 rounded-2xl shadow-2xl backdrop-blur-none container-height-fix">
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
          <div className="flex-1 overflow-auto border-2 border-base-content/20 bg-gradient-to-br from-base-50 to-base-100/50 mx-4 my-4 rounded-2xl shadow-2xl backdrop-blur-none container-height-fix">
            <div className="p-1">
              <Outlet />
            </div>
          </div>
        ) : (
          /* Project Details Tab - Show project content with tabs */
          <>
            {/* Page Content */}
            <div className={`flex-1 overflow-auto border-2 border-base-content/20 bg-gradient-to-br from-base-50 to-base-100/50 rounded-2xl shadow-2xl backdrop-blur-none container-height-fix ${location.pathname === '/support' ? 'mt-4' : ''}`}>
              {selectedProject ? (
                <div className="p-2 sm:p-4 lg:p-4">
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
                  <div className="text-center bg-base-100 rounded-xl p-12 border-thick shadow-lg max-w-md mx-auto">
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
                      <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <ToastContainer />

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