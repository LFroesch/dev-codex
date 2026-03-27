import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { authAPI, projectAPI, newsAPI } from '../api';
import type { Project } from '../api/types';
import SessionTracker from './SessionTracker';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import ConfirmationModal from './ConfirmationModal';
import { useAnalytics } from '../hooks/useAnalytics';
import { useThemeManager } from '../hooks/useThemeManager';
import { useProjectManagement } from '../hooks/useProjectManagement';
import { useProjectSelection } from '../hooks/useProjectSelection';
import { useLayoutEvents } from '../hooks/useLayoutEvents';
import { unsavedChangesManager } from '../utils/unsavedChanges';
import { accountSwitchingManager } from '../utils/accountSwitching';
import { getContrastTextColor } from '../utils/contrastTextColor';
import ToastContainer from './Toast';
import { toast } from '../services/toast';
import BackgroundGrid from './BackgroundGrid';
import MainNav from './navigation/MainNav';
import SecondaryNav from './navigation/SecondaryNav';
import ProjectsPage from '../pages/ProjectsPage';
import { TutorialProvider, useTutorialContext } from '../contexts/TutorialContext';
import { TutorialOverlay } from './tutorial/TutorialOverlay';
import { WelcomeModal } from './tutorial/WelcomeModal';


// Auto-start tutorial handler
const TutorialAutoStarter: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { startTutorial } = useTutorialContext();

  useEffect(() => {
    if (searchParams.get('startTutorial') === 'true') {
      // Remove the query param
      searchParams.delete('startTutorial');
      setSearchParams(searchParams);

      // Start tutorial after a brief delay
      setTimeout(() => {
        startTutorial();
      }, 500);
    }
  }, [searchParams, setSearchParams, startTutorial]);

  return null;
};

// Floating button to resume tutorial
const ResumeTutorialButton: React.FC = () => {
  const { isActive, currentStep, totalSteps, goToStep } = useTutorialContext();

  // Don't show if tutorial overlay is already visible
  if (isActive) {
    return null;
  }

  // Don't show if no tutorial in progress
  if (!currentStep || currentStep === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-20 z-50">
      <button
        onClick={() => goToStep(currentStep)}
        className="btn btn-warning btn-md shadow-2xl hover:shadow-xl transition-all gap-2 border-thick border-warning"
      >
        <svg
          className="w-5 h-5 animate-pulse"
          style={{ animationDuration: '2s' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        Resume Tutorial ({currentStep}/{totalSteps})
      </button>
    </div>
  );
};

// Initialize tab state from URL on first mount (supports bookmarked/shared URLs)
function initTab<T extends string>(path: string, valid: readonly T[], fallback: T): () => T {
  return () => {
    if (window.location.pathname !== path) return fallback;
    const t = new URLSearchParams(window.location.search).get('tab');
    return t && (valid as readonly string[]).includes(t) ? t as T : fallback;
  };
}

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAdminTab, _setActiveAdminTab] = useState(initTab('/admin', ['users', 'tickets', 'analytics', 'news', 'activity'] as const, 'users'));
  const [isHandlingTimeout, setIsHandlingTimeout] = useState(false);
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const [importantAnnouncements, setImportantAnnouncements] = useState<any[]>([]);
  const [showImportantPopup, setShowImportantPopup] = useState(false);

  // Page-level tab states (synced to URL for back/forward navigation)
  const [activeStackTab, _setActiveStackTab] = useState(initTab('/stack', ['current', 'add', 'custom'] as const, 'add'));
  const [activeDeploymentTab, _setActiveDeploymentTab] = useState(initTab('/deployment', ['overview', 'deployment', 'env', 'notes'] as const, 'overview'));
  const [activeFeaturesTab, _setActiveFeaturesTab] = useState(initTab('/features', ['graph', 'structure', 'all', 'create'] as const, 'graph'));
  const [activeNewsTab, _setActiveNewsTab] = useState(initTab('/news', ['all', 'news', 'update', 'dev_log', 'announcement', 'important'] as const, 'all'));
  const [activeNotesTab, _setActiveNotesTab] = useState(initTab('/notes', ['notes', 'todos', 'devlog'] as const, 'notes'));
  const [activePublicTab, _setActivePublicTab] = useState(initTab('/public', ['overview', 'url', 'visibility'] as const, 'overview'));
  const [activeSharingTab, _setActiveSharingTab] = useState(initTab('/sharing', ['overview', 'team', 'activity'] as const, 'overview'));
  const [activeSettingsTab, _setActiveSettingsTab] = useState(initTab('/settings', ['info', 'export', 'danger'] as const, 'info'));

  // Push tab changes to browser history (enables back/forward for tab switches)
  const pushTabToUrl = useCallback((tab: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    navigate({ search: params.toString() }, { replace: false });
  }, [navigate]);

  // Wrapped tab setters — update state + push URL history entry
  const setActiveAdminTab = useCallback((tab: 'users' | 'tickets' | 'analytics' | 'news' | 'activity') => { _setActiveAdminTab(tab); pushTabToUrl(tab); }, [pushTabToUrl]);
  const setActiveStackTab = useCallback((tab: 'current' | 'add' | 'custom') => { _setActiveStackTab(tab); pushTabToUrl(tab); }, [pushTabToUrl]);
  const setActiveDeploymentTab = useCallback((tab: 'overview' | 'deployment' | 'env' | 'notes') => { _setActiveDeploymentTab(tab); pushTabToUrl(tab); }, [pushTabToUrl]);
  const setActiveFeaturesTab = useCallback((tab: 'graph' | 'structure' | 'all' | 'create') => { _setActiveFeaturesTab(tab); pushTabToUrl(tab); }, [pushTabToUrl]);
  const setActiveNewsTab = useCallback((tab: 'all' | 'news' | 'update' | 'dev_log' | 'announcement' | 'important') => { _setActiveNewsTab(tab); pushTabToUrl(tab); }, [pushTabToUrl]);
  const setActiveNotesTab = useCallback((tab: 'notes' | 'todos' | 'devlog') => { _setActiveNotesTab(tab); pushTabToUrl(tab); }, [pushTabToUrl]);
  const setActivePublicTab = useCallback((tab: 'overview' | 'url' | 'visibility') => { _setActivePublicTab(tab); pushTabToUrl(tab); }, [pushTabToUrl]);
  const setActiveSharingTab = useCallback((tab: 'overview' | 'team' | 'activity') => { _setActiveSharingTab(tab); pushTabToUrl(tab); }, [pushTabToUrl]);
  const setActiveSettingsTab = useCallback((tab: 'info' | 'export' | 'danger') => { _setActiveSettingsTab(tab); pushTabToUrl(tab); }, [pushTabToUrl]);

  // Restore tab state on back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      const tab = new URLSearchParams(window.location.search).get('tab');
      const path = window.location.pathname;
      const handlers: Record<string, [React.Dispatch<React.SetStateAction<any>>, string]> = {
        '/admin': [_setActiveAdminTab, 'users'],
        '/stack': [_setActiveStackTab, 'add'],
        '/deployment': [_setActiveDeploymentTab, 'overview'],
        '/features': [_setActiveFeaturesTab, 'graph'],
        '/news': [_setActiveNewsTab, 'all'],
        '/notes': [_setActiveNotesTab, 'notes'],
        '/public': [_setActivePublicTab, 'overview'],
        '/sharing': [_setActiveSharingTab, 'overview'],
        '/settings': [_setActiveSettingsTab, 'info'],
      };
      const handler = handlers[path];
      if (handler) handler[0](tab || handler[1]);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  // Handle section query parameter for /notes page (from notification links)
  useEffect(() => {
    if (location.pathname === '/notes') {
      const section = searchParams.get('section');
      if (section === 'todos' || section === 'devlog') {
        _setActiveNotesTab(section);
      }
    }
  }, [location.pathname, searchParams]);

  // Fetch important announcements
  useEffect(() => {
    const fetchImportantAnnouncements = async () => {
      try {
        const response = await newsAPI.getImportant();
        setImportantAnnouncements(response.posts);
      } catch {
        // Silently fail - announcements are optional
      }
    };

    fetchImportantAnnouncements();
    // Refresh every 5 minutes
    const interval = setInterval(fetchImportantAnnouncements, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Unsaved changes modal state
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [unsavedChangesResolve, setUnsavedChangesResolve] = useState<((value: boolean) => void) | null>(null);

  // Theme management
  const { setCurrentTheme, applyUserCustomTheme } = useThemeManager();

  // Project management
  const {
    projects,
    setProjects,
    ideasCount,
    setIdeasCount,
    loadProjectTimeData,
    loadIdeasCount,
    formatProjectTime,
    loadProjects,
    handleProjectUpdate: projectUpdate,
    handleProjectArchive: projectArchive,
    handleProjectDelete: projectDelete
  } = useProjectManagement();

  // Initialize analytics
  const analytics = useAnalytics({
    projectId: selectedProject?.id,
    projectName: selectedProject?.name
  });

  // Project selection
  const { handleProjectSelect: projectSelect } = useProjectSelection({
    analyticsReady,
    analytics,
    setSearchTerm,
    loadProjectTimeData
  });

  const [collapsedSections] = useState<{
    [key: string]: boolean;
  }>(() => {
    const saved = localStorage.getItem('collapsedSections');
    return saved ? JSON.parse(saved) : {};
  });

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

  // Wrapper for project selection that passes setSelectedProject
  const handleProjectSelect = (project: Project) => {
    return projectSelect(project, setSelectedProject);
  };

  // Toggle section collapse
  // const toggleSection = (section: string) => {
  //   setCollapsedSections(prev => ({
  //     ...prev,
  //     [section]: !prev[section]
  //   }));
  // };

  // Wrapper functions that pass selectedProject state to hook functions
  const handleProjectUpdate = (projectId: string, updatedData: any) => {
    return projectUpdate(projectId, updatedData, selectedProject, setSelectedProject);
  };

  const handleProjectArchive = (projectId: string, isArchived: boolean) => {
    return projectArchive(projectId, isArchived, selectedProject, setSelectedProject);
  };

  const handleProjectDelete = (projectId: string) => {
    return projectDelete(projectId, selectedProject, setSelectedProject);
  };

  const loadProjectsWrapper = () => {
    return loadProjects(selectedProject, setSelectedProject);
  };

  // Keybind for ctrl + J to go to terminal page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        handleNavigateWithCheck('/terminal');
      }
      // if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      //   e.preventDefault();
      //   handleNavigateWithCheck('/projects');
      // }
      // if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      //   e.preventDefault();
      //   handleNavigateWithCheck('/notes');
      // }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      // Check if this is a public page that doesn't require authentication
      const isPublicPage = location.pathname.startsWith('/project/') || location.pathname.startsWith('/user/');
      
      if (isPublicPage) {
        // For public pages, just set loading to false without auth
        setLoading(false);
        return;
      }
      
      // Auth-critical: if these fail, user isn't logged in
      let userResponse, projectsResponse;
      try {
        [userResponse, projectsResponse] = await Promise.all([
          authAPI.getMe(),
          projectAPI.getAll()
        ]);
      } catch (err) {
        navigate('/login');
        setLoading(false);
        return;
      }

      // Handle account switching - clear account-specific data if different user
      if (userResponse.user?.email) {
        accountSwitchingManager.handleAccountSwitch(userResponse.user.email);
      }

      setUser(userResponse.user);
      setProjects(projectsResponse.projects);

      // Non-critical loads — don't kick user to login if these fail
      try { await loadProjectTimeData(); } catch (_) {}
      try { await loadIdeasCount(); } catch (_) {}

      // Update theme from user preference (always sync on login)
      if (userResponse.user?.theme) {
        const userTheme = userResponse.user.theme;
        setCurrentTheme(userTheme);
        localStorage.setItem('theme', userTheme);

        try {
          // Check if it's a custom theme and apply it properly
          if (userTheme.startsWith('custom-')) {
            await applyUserCustomTheme(userTheme);
          } else {
            // Standard theme
            document.documentElement.setAttribute('data-theme', userTheme);
          }
        } catch (_) {}
      }

      // Set current user for analytics
      analytics.setCurrentUser(userResponse.user?.id || null);

      // Initialize analytics session and wait for it to be ready
      try {
        await analytics.startSession();
        setAnalyticsReady(true);
      } catch (error) {
        setAnalyticsReady(true); // Set to true anyway to avoid blocking UI
      }

      // Restore project selection from localStorage if it exists
      const savedProjectId = localStorage.getItem('selectedProjectId');
      if (savedProjectId) {
        const savedProject = projectsResponse.projects.find(p => p.id === savedProjectId);
        if (savedProject) {
          setSelectedProject(savedProject);
          try { await analytics.setCurrentProject(savedProject.id); } catch (_) {}
        } else {
          // Project no longer exists, clear the saved data
          localStorage.removeItem('selectedProjectId');
        }
      }

      setLoading(false);
    };

    loadData();
  }, [navigate]);

  // Layout event listeners (project selection, sync, timeouts, etc.)
  useLayoutEvents({
    projects,
    user,
    setSelectedProject,
    loadProjectsWrapper,
    loadProjectTimeData,
    analytics,
    isHandlingTimeout,
    setIsHandlingTimeout,
    navigate
  });

  const handleLogout = async () => {
    try {
      // Clear user session before logout
      analytics.clearUserSession();
      // Clear all account-specific data
      accountSwitchingManager.clearAll();
      await authAPI.logout();
      toast.success('Successfully logged out. See you next time!');
      navigate('/login');
    } catch (err) {
      // Clear session even if logout fails
      analytics.clearUserSession();
      accountSwitchingManager.clearAll();
      toast.info('Logged out successfully.');
      navigate('/login');
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <TutorialProvider>
      <div className={`flex flex-col min-h-screen ${location.pathname === '/terminal' || location.pathname === '/features' ? 'h-dvh overflow-hidden' : ''}`}>
        <BackgroundGrid />

      {/* Demo Mode Banner - Hidden on features page to avoid layout issues */}
      {user?.isDemo && location.pathname !== '/features' && (
        <div className="bg-warning text-warning-content px-4 py-2 text-center font-medium shadow-md sticky top-0 z-50">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Demo mode (Pro tier) — your changes reset on next visit. Sign up to keep your data!</span>
            <button
              onClick={async () => {
                try {
                  const { tutorialAPI } = await import('../api/tutorial');
                  await tutorialAPI.resetTutorial();
                  sessionStorage.removeItem('tutorialWelcomeShown');
                  await new Promise(resolve => setTimeout(resolve, 100));
                  window.location.href = '/projects?startTutorial=true';
                } catch {
                  // Error will be shown by tutorialAPI
                }
              }}
              className="btn btn-sm btn-info ml-2"
            >
              Start Tutorial
            </button>
            <button
              onClick={() => navigate('/register')}
              className="btn btn-sm btn-primary ml-2"
              style={{ color: getContrastTextColor('primary') }}
            >
              Sign Up Free
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-base-100 border-b-2 border-base-content/20 shadow-sm sticky top-0 z-40 w-full">


        {/* Mobile and Tablet Layout */}
        <div className="block desktop:hidden px-1 pt-2 pb-2">
          <div className="flex flex-col gap-2">

            {/* Top row: Logo + Search (tablet), Project indicator (tablet), Session Tracker, and User Menu */}
            <div className="flex items-center justify-between min-w-0 gap-0.5">

              {/* Dev Codex logo */}
              {location.pathname !== '/terminal' && (
                <div className="flex items-center gap-2 sm:gap-3 bg-base-200 backdrop-blur-none border-2 border-base-content/20 rounded-xl px-2 sm:px-4 py-2 h-12 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/projects')}>
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="icon-md text-primary-content" fill={getContrastTextColor()} viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                  </div>
                  <h1 className="text-xl font-bold bg-primary bg-clip-text whitespace-nowrap">Dev Codex</h1>

                  {/* Search bar on tablet - hidden on mobile and terminal */}
                  {user && (
                    <div className="hidden tablet:flex relative ml-4 flex-center-gap-2">
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
                            if (e.target.value.trim() && location.pathname !== '/projects') {
                              navigate('/projects');
                            }
                          }}
                          className="input-field input-sm pl-9 pr-8 w-48 h-10 bg-base-100/80 backdrop-blur-none shadow-sm"
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
                      className="btn btn-primary btn-sm btn-circle h-10 w-10 shadow-sm relative"
                      title="New Project"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <svg className="icon-sm" fill="none" stroke={getContrastTextColor()} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation tabs - Terminal page only */}
              {location.pathname === '/terminal' && (
                <div className="tabs-container p-1">
                  <button
                    className={`tab tab-sm flex-shrink-0 min-h-10 gap-1 sm:gap-2 font-bold whitespace-nowrap px-2 sm:px-4`}
                    onClick={() => handleNavigateWithCheck('/projects')}
                    title='Projects'
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </button>
                  <button
                    className={`tab tab-sm flex-shrink-0 min-h-10 gap-1 sm:gap-2 font-bold whitespace-nowrap px-2 sm:px-4`}
                    onClick={() => handleNavigateWithCheck('/notes')}
                    title='Details'
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  <button
                    className={`tab tab-sm flex-shrink-0 min-h-10 gap-1 sm:gap-2 font-bold whitespace-nowrap px-2 sm:px-4`}
                    onClick={() => handleNavigateWithCheck('/discover')}
                    title='Discover'
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                  <button
                    className={`tab tab-sm flex-shrink-0 min-h-10 gap-1 sm:gap-2 font-bold whitespace-nowrap px-2 sm:px-4 tab-active`}
                    style={{color: getContrastTextColor()}}
                    title='Terminal'
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Project indicator and user section - styled background for all sizes */}
              {user ? (
                <div className="flex items-center gap-0 bg-base-200 backdrop-blur-none border-2 border-base-content/20 rounded-xl px-1 py-2 h-12 shadow-sm relative z-30 flex-shrink-0">
                  {selectedProject && (
                    <div
                      className="hidden tablet:flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-base-content/20 shadow-sm mr-2 cursor-pointer hover:opacity-90 transition-all duration-200 h-8"
                      style={{
                        backgroundColor: selectedProject.color,
                        color: getContrastTextColor(selectedProject.color)
                      }}
                      onClick={() => handleNavigateWithCheck('/notes')}
                      title={selectedProject.isLocked ? (selectedProject.lockedReason || 'This project is locked and cannot be edited') : `Current project: ${selectedProject.name}`}
                    >
                      <span className="text-sm font-medium truncate capitalize">
                        {selectedProject.name}
                      </span>
                      {selectedProject.isLocked && (
                        <svg
                          className="w-4 h-4 text-warning flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      )}
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

                  {location.pathname !== '/terminal' && (
                    <span className="hidden tablet:block text-sm font-medium text-base-content/80 ml-2">Hi, {user?.firstName}!</span>
                  )}

                  <NotificationBell />
                  <UserMenu user={user} onLogout={handleLogout} />
                </div>
              ) : (
                <div className="flex items-center bg-base-200 backdrop-blur-none border-2 border-base-content/20 rounded-xl px-2 py-2 h-12 shadow-sm flex-shrink-0">
                  <button 
                    onClick={() => navigate('/login')}
                    className="btn btn-primary btn-sm"
                    style={{ color: getContrastTextColor('primary') }}
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>

            {/* Current Project and Search/Create Row - Mobile only */}
            {user && location.pathname !== '/terminal' && (
              <div className="flex justify-center max-w-sm tablet:hidden items-center gap-3 mx-auto border-thick rounded-lg px-2 py-1 bg-base-200 shadow-sm w-full">
                {selectedProject && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-base-content/20 shadow-sm hover:opacity-90 transition-all duration-200 cursor-pointer min-w-0 flex-shrink-0 h-8"
                    style={{
                      backgroundColor: selectedProject.color,
                      color: getContrastTextColor(selectedProject.color)
                    }}
                    onClick={() => handleNavigateWithCheck('/notes')}
                    title={selectedProject.isLocked ? (selectedProject.lockedReason || 'This project is locked and cannot be edited') : `Current project: ${selectedProject.name}`}
                  >
                    <span className="text-sm font-medium truncate capitalize">{selectedProject.name}</span>
                    {selectedProject.isLocked && (
                      <svg
                        className="w-4 h-4 text-warning flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                )}
                
                {/* Search bar and create button */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/70 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                                    
                          if (location.pathname !== '/projects') {
                            navigate('/projects');
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
                    className="btn btn-primary btn-sm btn-circle h-10 w-10 shadow-sm relative"
                    title="New Project"
                    style={{ pointerEvents: 'auto', color: getContrastTextColor('primary') }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke={getContrastTextColor()} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            {location.pathname !== '/support' && location.pathname !== '/terminal' && (
              <MainNav
                currentPath={location.pathname}
                onNavigate={handleNavigateWithCheck}
                getContrastColor={getContrastTextColor}
                variant="mobile"
              />
            )}

            <SecondaryNav
              currentPath={location.pathname}
              selectedProject={selectedProject}
              onNavigate={handleNavigateWithCheck}
              getContrastColor={getContrastTextColor}
              variant="mobile"
            />

            {/* Page-Level Tabs - Mobile */}
            {location.pathname !== '/terminal' && (
              <>
                {/* Stack Page Tabs */}
                {selectedProject && location.pathname === '/stack' && (
                  <div className="flex justify-center">
                    <div className="tabs-container p-1">
                      <button
                        className={`tab-button gap-2 ${activeStackTab === 'add' ? 'tab-active' : ''}`}
                        style={activeStackTab === 'add' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveStackTab('add')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Browse
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeStackTab === 'custom' ? 'tab-active' : ''}`}
                        style={activeStackTab === 'custom' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveStackTab('custom')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Custom
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeStackTab === 'current' ? 'tab-active' : ''}`}
                        style={activeStackTab === 'current' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveStackTab('current')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                        Current Stack
                      </button>
                    </div>
                  </div>
                )}

                {/* Deployment Page Tabs */}
                {location.pathname === '/deployment' && (
                  <div className="flex justify-center">
                    <div className="tabs-container p-1">
                      <button
                        className={`tab-button gap-2 ${activeDeploymentTab === 'overview' ? 'tab-active' : ''}`}
                        style={activeDeploymentTab === 'overview' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveDeploymentTab('overview')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Overview
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeDeploymentTab === 'deployment' ? 'tab-active' : ''}`}
                        style={activeDeploymentTab === 'deployment' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveDeploymentTab('deployment')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Deployment
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeDeploymentTab === 'env' ? 'tab-active' : ''}`}
                        style={activeDeploymentTab === 'env' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveDeploymentTab('env')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Environment
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeDeploymentTab === 'notes' ? 'tab-active' : ''}`}
                        style={activeDeploymentTab === 'notes' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveDeploymentTab('notes')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Notes
                      </button>
                    </div>
                  </div>
                )}

                {/* Features Page Tabs */}
                {location.pathname === '/features' && (
                  <div className="flex justify-center">
                    <div className="tabs-container p-1">
                      <button
                        className={`tab-button gap-2 ${activeFeaturesTab === 'graph' ? 'tab-active' : ''}`}
                        style={activeFeaturesTab === 'graph' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveFeaturesTab('graph')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Graph
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeFeaturesTab === 'structure' ? 'tab-active' : ''}`}
                        style={activeFeaturesTab === 'structure' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveFeaturesTab('structure')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        Structure
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeFeaturesTab === 'all' ? 'tab-active' : ''}`}
                        style={activeFeaturesTab === 'all' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveFeaturesTab('all')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        All
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeFeaturesTab === 'create' ? 'tab-active' : ''}`}
                        style={activeFeaturesTab === 'create' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveFeaturesTab('create')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create
                      </button>
                    </div>
                  </div>
                )}

                {/* Notes Page Tabs */}
                {location.pathname === '/notes' && (
                  <div className="flex justify-center">
                    <div className="tabs-container p-1">
                      <button
                        className={`tab-button gap-2 ${activeNotesTab === 'notes' ? 'tab-active' : ''}`}
                        style={activeNotesTab === 'notes' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveNotesTab('notes')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Notes
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeNotesTab === 'todos' ? 'tab-active' : ''}`}
                        style={activeNotesTab === 'todos' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveNotesTab('todos')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Todos
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeNotesTab === 'devlog' ? 'tab-active' : ''}`}
                        style={activeNotesTab === 'devlog' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveNotesTab('devlog')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Dev Log
                      </button>
                    </div>
                  </div>
                )}

                {/* Public Page Tabs */}
                {location.pathname === '/public' && (
                  <div className="flex justify-center">
                    <div className="tabs-container p-1">
                      <button
                        className={`tab-button gap-2 ${activePublicTab === 'overview' ? 'tab-active' : ''}`}
                        style={activePublicTab === 'overview' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActivePublicTab('overview')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Overview
                      </button>
                      {selectedProject?.isPublic && (
                        <>
                          <button
                            className={`tab-button gap-2 ${activePublicTab === 'url' ? 'tab-active' : ''}`}
                            style={activePublicTab === 'url' ? {color: getContrastTextColor()} : {}}
                            onClick={() => setActivePublicTab('url')}
                          >
                            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            URL
                          </button>
                          <button
                            className={`tab-button gap-2 ${activePublicTab === 'visibility' ? 'tab-active' : ''}`}
                            style={activePublicTab === 'visibility' ? {color: getContrastTextColor()} : {}}
                            onClick={() => setActivePublicTab('visibility')}
                          >
                            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Privacy
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Sharing Page Tabs */}
                {location.pathname === '/sharing' && (
                  <div className="flex justify-center">
                    <div className="tabs-container p-1">
                      <button
                        className={`tab-button gap-2 ${activeSharingTab === 'overview' ? 'tab-active' : ''}`}
                        style={activeSharingTab === 'overview' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveSharingTab('overview')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Overview
                      </button>
                      {selectedProject?.isShared && (
                        <button
                          className={`tab-button gap-2 ${activeSharingTab === 'team' ? 'tab-active' : ''}`}
                          style={activeSharingTab === 'team' ? {color: getContrastTextColor()} : {}}
                          onClick={() => setActiveSharingTab('team')}
                        >
                          <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          Team
                        </button>
                      )}
                      {!selectedProject?.isShared && (
                        <button
                          className={`tab-button gap-2 ${activeSharingTab === 'activity' ? 'tab-active' : ''}`}
                          style={activeSharingTab === 'activity' ? {color: getContrastTextColor()} : {}}
                          onClick={() => setActiveSharingTab('activity')}
                        >
                          <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Activity
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Settings Page Tabs */}
                {location.pathname === '/settings' && (
                  <div className="flex justify-center">
                    <div className="tabs-container p-1">
                      <button
                        className={`tab-button gap-2 ${activeSettingsTab === 'info' ? 'tab-active' : ''}`}
                        style={activeSettingsTab === 'info' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveSettingsTab('info')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Info
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeSettingsTab === 'export' ? 'tab-active' : ''}`}
                        style={activeSettingsTab === 'export' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveSettingsTab('export')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeSettingsTab === 'danger' ? 'tab-active' : ''}`}
                        style={activeSettingsTab === 'danger' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveSettingsTab('danger')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Danger
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* News Page Tabs - for /news page */}
            {location.pathname === '/news' && (
              <div className="flex justify-center">
                <div className="tabs-container p-1">
                  <button
                    className={`tab-button gap-2 ${activeNewsTab === 'all' ? 'tab-active' : ''}`}
                    style={activeNewsTab === 'all' ? {color: getContrastTextColor()} : {}}
                    onClick={() => setActiveNewsTab('all')}
                  >
                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    All
                  </button>
                  <button
                    className={`tab-button gap-2 ${activeNewsTab === 'news' ? 'tab-active' : ''}`}
                    style={activeNewsTab === 'news' ? {color: getContrastTextColor()} : {}}
                    onClick={() => setActiveNewsTab('news')}
                  >
                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    News
                  </button>
                  <button
                    className={`tab-button gap-2 ${activeNewsTab === 'update' ? 'tab-active' : ''}`}
                    style={activeNewsTab === 'update' ? {color: getContrastTextColor()} : {}}
                    onClick={() => setActiveNewsTab('update')}
                  >
                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Updates
                  </button>
                  <button
                    className={`tab-button gap-2 ${activeNewsTab === 'dev_log' ? 'tab-active' : ''}`}
                    style={activeNewsTab === 'dev_log' ? {color: getContrastTextColor()} : {}}
                    onClick={() => setActiveNewsTab('dev_log')}
                  >
                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Dev Log
                  </button>
                  <button
                    className={`tab-button gap-2 ${activeNewsTab === 'announcement' ? 'tab-active' : ''}`}
                    style={activeNewsTab === 'announcement' ? {color: getContrastTextColor()} : {}}
                    onClick={() => setActiveNewsTab('announcement')}
                  >
                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    Announcements
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden desktop:block px-2 py-2">
          <div className="flex flex-col gap-2">
          <div className="relative flex-between-center">

            { /* Logo and Search/Create Row */}
            <div className="flex items-center gap-3 bg-base-200 backdrop-blur-none border-2 border-base-content/20 rounded-xl px-4 py-2 h-12 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/projects')}>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <svg className="icon-md text-primary-content" fill={getContrastTextColor()} viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-primary bg-clip-text">Dev Codex</h1>
              
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
                      if (e.target.value.trim() && location.pathname !== '/projects') {
                        navigate('/projects');
                      }
                    }}
                    className="input-field input-sm pl-9 pr-8 w-48 h-10 bg-base-100/80 backdrop-blur-none shadow-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-2.5 w-4 h-4 text-base-content/70 hover:text-base-content/80 transition-colors"
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
                  className="btn btn-primary btn-sm btn-circle h-10 w-10 shadow-sm relative"
                  title="New Project"
                  style={{ pointerEvents: 'auto' }}
                >
                  <svg className="icon-sm" fill="none" stroke={getContrastTextColor()} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            </div>

            <MainNav
              currentPath={location.pathname}
              onNavigate={handleNavigateWithCheck}
              getContrastColor={getContrastTextColor}
            />
            
            {user ? (
              <div className="flex items-center gap-0 bg-base-200 backdrop-blur-none border-2 border-base-content/20 rounded-xl px-2 py-2 h-12 shadow-sm relative z-30">
                {selectedProject && (
                  <div
                    className="flex-center-gap-2 px-3 py-1.5 rounded-lg border-2 border-base-content/20 shadow-sm mr-2 cursor-pointer hover:opacity-90 transition-all duration-200 h-8"
                    style={{
                      backgroundColor: selectedProject.color,
                      color: getContrastTextColor(selectedProject.color)
                    }}
                    onClick={() => handleNavigateWithCheck('/notes')}
                    title={selectedProject.isLocked ? (selectedProject.lockedReason || 'This project is locked and cannot be edited') : selectedProject.name}
                  >
                    <span className="text-sm font-medium capitalize">{selectedProject.name}</span>
                    {selectedProject.isLocked && (
                      <svg
                        className="w-4 h-4 text-warning flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    )}
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

                {/* Important Announcements Notification */}
                {importantAnnouncements.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowImportantPopup(!showImportantPopup)}
                      className="btn btn-ghost btn-circle btn-sm relative hover:bg-warning/20"
                      title="Important Announcement"
                    >
                      <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* Popup */}
                    {showImportantPopup && (
                      <>
                        {/* Backdrop to close popup when clicking outside */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowImportantPopup(false)}
                        />
                        <div className="absolute right-0 top-12 w-80 bg-base-100 border-2 border-warning shadow-xl rounded-lg z-50 overflow-hidden">
                          <div className="bg-warning/20 p-3 border-b-2 border-warning flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span className="font-semibold text-sm">Important Announcement</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowImportantPopup(false);
                              }}
                              className="btn btn-ghost btn-xs btn-circle"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="p-4 space-y-3">
                            <div>
                              <div className="font-medium text-sm mb-1">{importantAnnouncements[0].title}</div>
                              {importantAnnouncements[0].summary && (
                                <div className="text-xs text-base-content/70">{importantAnnouncements[0].summary}</div>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                navigate('/news');
                                setActiveNewsTab('important');
                                setShowImportantPopup(false);
                              }}
                              className="btn btn-warning btn-sm w-full"
                            >
                              View Full Announcement
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <UserMenu user={user} onLogout={handleLogout} />
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-base-200 backdrop-blur-none border-2 border-base-content/20 rounded-xl px-4 py-2 h-12 shadow-sm">
                <button 
                  onClick={() => navigate('/login')}
                  className="btn-primary-sm"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>

          <SecondaryNav
            currentPath={location.pathname}
            selectedProject={selectedProject}
            onNavigate={handleNavigateWithCheck}
            getContrastColor={getContrastTextColor}
          />

          {/* Page-Level Tabs - Desktop */}
          <>
              {/* Project Details Tabs */}
              {selectedProject && (
                <>
                  {/* Stack Page Tabs */}
                  {location.pathname === '/stack' && (
                  <div className="flex justify-center">
                    <div className="tabs-container p-1">
                      <button
                        className={`tab-button gap-2 ${activeStackTab === 'add' ? 'tab-active' : ''}`}
                        style={activeStackTab === 'add' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveStackTab('add')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Browse
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeStackTab === 'custom' ? 'tab-active' : ''}`}
                        style={activeStackTab === 'custom' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveStackTab('custom')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Custom
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeStackTab === 'current' ? 'tab-active' : ''}`}
                        style={activeStackTab === 'current' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveStackTab('current')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                        Current Stack
                      </button>
                    </div>
                  </div>
                )}

                {/* Deployment Page Tabs */}
                {location.pathname === '/deployment' && (
                  <div className="flex justify-center">
                    <div className="tabs-container p-1">
                      <button
                        className={`tab-button gap-2 ${activeDeploymentTab === 'overview' ? 'tab-active' : ''}`}
                        style={activeDeploymentTab === 'overview' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveDeploymentTab('overview')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Overview
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeDeploymentTab === 'deployment' ? 'tab-active' : ''}`}
                        style={activeDeploymentTab === 'deployment' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveDeploymentTab('deployment')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Deployment
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeDeploymentTab === 'env' ? 'tab-active' : ''}`}
                        style={activeDeploymentTab === 'env' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveDeploymentTab('env')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Environment
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeDeploymentTab === 'notes' ? 'tab-active' : ''}`}
                        style={activeDeploymentTab === 'notes' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveDeploymentTab('notes')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Notes
                      </button>
                    </div>
                  </div>
                )}

                {/* Features Page Tabs */}
                {location.pathname === '/features' && (
                  <div className="flex justify-center">
                    <div className="tabs-container p-1">
                      <button
                        className={`tab-button gap-2 ${activeFeaturesTab === 'graph' ? 'tab-active' : ''}`}
                        style={activeFeaturesTab === 'graph' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveFeaturesTab('graph')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Graph
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeFeaturesTab === 'structure' ? 'tab-active' : ''}`}
                        style={activeFeaturesTab === 'structure' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveFeaturesTab('structure')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        Structure
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeFeaturesTab === 'all' ? 'tab-active' : ''}`}
                        style={activeFeaturesTab === 'all' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveFeaturesTab('all')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        All
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeFeaturesTab === 'create' ? 'tab-active' : ''}`}
                        style={activeFeaturesTab === 'create' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveFeaturesTab('create')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create
                      </button>
                    </div>
                  </div>
                )}

                {/* Notes Page Tabs */}
                {location.pathname === '/notes' && (
                  <div className="flex justify-center">
                    <div className="tabs-container p-1">
                      <button
                        className={`tab-button gap-2 ${activeNotesTab === 'notes' ? 'tab-active' : ''}`}
                        style={activeNotesTab === 'notes' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveNotesTab('notes')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Notes
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeNotesTab === 'todos' ? 'tab-active' : ''}`}
                        style={activeNotesTab === 'todos' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveNotesTab('todos')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Todos
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeNotesTab === 'devlog' ? 'tab-active' : ''}`}
                        style={activeNotesTab === 'devlog' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveNotesTab('devlog')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Dev Log
                      </button>
                    </div>
                  </div>
                )}

                {/* Public Page Tabs */}
                {location.pathname === '/public' && (
                  <div className="flex justify-center">
                    <div className="tabs-container p-1">
                      <button
                        className={`tab-button gap-2 ${activePublicTab === 'overview' ? 'tab-active' : ''}`}
                        style={activePublicTab === 'overview' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActivePublicTab('overview')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Overview
                      </button>
                      {selectedProject.isPublic && (
                        <>
                          <button
                            className={`tab-button gap-2 ${activePublicTab === 'url' ? 'tab-active' : ''}`}
                            style={activePublicTab === 'url' ? {color: getContrastTextColor()} : {}}
                            onClick={() => setActivePublicTab('url')}
                          >
                            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            URL
                          </button>
                          <button
                            className={`tab-button gap-2 ${activePublicTab === 'visibility' ? 'tab-active' : ''}`}
                            style={activePublicTab === 'visibility' ? {color: getContrastTextColor()} : {}}
                            onClick={() => setActivePublicTab('visibility')}
                          >
                            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Privacy
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Sharing Page Tabs */}
                {location.pathname === '/sharing' && (
                  <div className="flex justify-center">
                    <div className="tabs-container p-1">
                      <button
                        className={`tab-button gap-2 ${activeSharingTab === 'overview' ? 'tab-active' : ''}`}
                        style={activeSharingTab === 'overview' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveSharingTab('overview')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Overview
                      </button>
                      {selectedProject.isShared && (
                        <button
                          className={`tab-button gap-2 ${activeSharingTab === 'team' ? 'tab-active' : ''}`}
                          style={activeSharingTab === 'team' ? {color: getContrastTextColor()} : {}}
                          onClick={() => setActiveSharingTab('team')}
                        >
                          <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          Team
                        </button>
                      )}
                      {!selectedProject.isShared && (
                        <button
                          className={`tab-button gap-2 ${activeSharingTab === 'activity' ? 'tab-active' : ''}`}
                          style={activeSharingTab === 'activity' ? {color: getContrastTextColor()} : {}}
                          onClick={() => setActiveSharingTab('activity')}
                        >
                          <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Activity
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Settings Page Tabs */}
                {location.pathname === '/settings' && (
                  <div className="flex justify-center">
                    <div className="tabs-container p-1">
                      <button
                        className={`tab-button gap-2 ${activeSettingsTab === 'info' ? 'tab-active' : ''}`}
                        style={activeSettingsTab === 'info' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveSettingsTab('info')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Project Info
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeSettingsTab === 'export' ? 'tab-active' : ''}`}
                        style={activeSettingsTab === 'export' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveSettingsTab('export')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export
                      </button>
                      <button
                        className={`tab-button gap-2 ${activeSettingsTab === 'danger' ? 'tab-active' : ''}`}
                        style={activeSettingsTab === 'danger' ? {color: getContrastTextColor()} : {}}
                        onClick={() => setActiveSettingsTab('danger')}
                      >
                        <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Danger
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            </>

            {/* News Page Tabs - for /news page (Desktop) */}
            {location.pathname === '/news' && (
              <div className="flex justify-center">
                <div className="tabs-container p-1">
                  <button
                    className={`tab-button gap-2 ${activeNewsTab === 'all' ? 'tab-active' : ''}`}
                    style={activeNewsTab === 'all' ? {color: getContrastTextColor()} : {}}
                    onClick={() => setActiveNewsTab('all')}
                  >
                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    All
                  </button>
                  <button
                    className={`tab-button gap-2 ${activeNewsTab === 'news' ? 'tab-active' : ''}`}
                    style={activeNewsTab === 'news' ? {color: getContrastTextColor()} : {}}
                    onClick={() => setActiveNewsTab('news')}
                  >
                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    News
                  </button>
                  <button
                    className={`tab-button gap-2 ${activeNewsTab === 'update' ? 'tab-active' : ''}`}
                    style={activeNewsTab === 'update' ? {color: getContrastTextColor()} : {}}
                    onClick={() => setActiveNewsTab('update')}
                  >
                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Updates
                  </button>
                  <button
                    className={`tab-button gap-2 ${activeNewsTab === 'dev_log' ? 'tab-active' : ''}`}
                    style={activeNewsTab === 'dev_log' ? {color: getContrastTextColor()} : {}}
                    onClick={() => setActiveNewsTab('dev_log')}
                  >
                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Dev Log
                  </button>
                  <button
                    className={`tab-button gap-2 ${activeNewsTab === 'announcement' ? 'tab-active' : ''}`}
                    style={activeNewsTab === 'announcement' ? {color: getContrastTextColor()} : {}}
                    onClick={() => setActiveNewsTab('announcement')}
                  >
                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    Announcements
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 w-full max-w-7xl mx-auto p-2 flex flex-col min-h-[100px] relative z-10">
        {/* Render content based on current route */}
        {location.pathname === '/projects' ? (
          <div className="flex-1 overflow-auto border-2 border-base-content/20 bg-base-100 rounded-lg shadow-2xl backdrop-blur-none container-height-fix">
            <div className="p-3 sm:p-4">
              <ProjectsPage
                projects={projects}
                selectedProject={selectedProject}
                analyticsReady={analyticsReady}
                onProjectSelect={handleProjectSelect}
                formatProjectTime={formatProjectTime}
                ideasCount={ideasCount}
                onIdeasCountChange={setIdeasCount}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </div>
          </div>
        ) : location.pathname === '/discover' || location.pathname.startsWith('/discover/') ? (
          /* Discover Tab - With sub-tabs */
          <>
            
            <div className="flex-1 overflow-auto border-2 border-base-content/20 bg-base-100 rounded-lg shadow-2xl backdrop-blur-none container-height-fix">
              <div className="p-2">
                <Outlet />
              </div>
            </div>
          </>
        ) : location.pathname.startsWith('/project/') || location.pathname.startsWith('/user/') ? (
          /* Public Pages - Same styling as discover */
          <div className="flex-1 overflow-auto border-2 border-base-content/20 bg-base-100 mx-4 rounded-lg shadow-2xl backdrop-blur-none container-height-fix">
            <div className="p-2">
              <Outlet />
            </div>
          </div>
        ) : location.pathname === '/admin' ? (
          /* Admin Dashboard - With submenu tabs */
          <>
            {/* Admin Dashboard Tab Navigation */}
            <div className="flex justify-center mb-2">
              <div className="tabs-container p-1 tabs bg-base-200 max-w-4xl">
                <button 
                  className={`tab tab-sm font-bold text-xs sm:text-base px-3 sm:px-4 whitespace-nowrap ${activeAdminTab === 'users' ? 'tab-active' : ''}`}
                  style={activeAdminTab === 'users' ? {color: getContrastTextColor()} : {}}
                  onClick={() => setActiveAdminTab('users')}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden sm:inline">Users</span>
                  <span className="sm:hidden">Users</span>
                </button>
                <button 
                  className={`tab tab-sm font-bold text-xs sm:text-base px-3 sm:px-4 whitespace-nowrap ${activeAdminTab === 'tickets' ? 'tab-active' : ''}`}
                  style={activeAdminTab === 'tickets' ? {color: getContrastTextColor()} : {}}
                  onClick={() => setActiveAdminTab('tickets')}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">Support Tickets</span>
                  <span className="sm:hidden">Tickets</span>
                </button>
                <button 
                  className={`tab tab-sm font-bold text-xs sm:text-base px-3 sm:px-4 whitespace-nowrap ${activeAdminTab === 'analytics' ? 'tab-active' : ''}`}
                  style={activeAdminTab === 'analytics' ? {color: getContrastTextColor()} : {}}
                  onClick={() => setActiveAdminTab('analytics')}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="hidden sm:inline">Platform Analytics</span>
                  <span className="sm:hidden">Analytics</span>
                </button>
                <button
                  className={`tab tab-sm font-bold text-xs sm:text-base px-3 sm:px-4 whitespace-nowrap ${activeAdminTab === 'news' ? 'tab-active' : ''}`}
                  style={activeAdminTab === 'news' ? {color: getContrastTextColor()} : {}}
                  onClick={() => setActiveAdminTab('news')}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                  </svg>
                  <span className="hidden sm:inline">News & Updates</span>
                  <span className="sm:hidden">News</span>
                </button>
                <button
                  className={`tab tab-sm font-bold text-xs sm:text-base px-3 sm:px-4 whitespace-nowrap ${activeAdminTab === 'activity' ? 'tab-active' : ''}`}
                  style={activeAdminTab === 'activity' ? {color: getContrastTextColor()} : {}}
                  onClick={() => setActiveAdminTab('activity')}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">Activity Log</span>
                  <span className="sm:hidden">Activity</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto border-2 border-base-content/20 bg-base-100 rounded-lg shadow-2xl backdrop-blur-none container-height-fix">
              <div className="p-1">
                <Outlet context={{
                  selectedProject,
                  user,
                  onProjectUpdate: handleProjectUpdate,
                  onProjectArchive: handleProjectArchive,
                  onProjectDelete: handleProjectDelete,
                  onProjectRefresh: loadProjectsWrapper,
                  activeAdminTab
                }} />
              </div>
            </div>
          </>
        ) : location.pathname === '/terminal' ? (
          /* Terminal - Command Interface */
          <div className="flex-1 min-h-0 overflow-hidden border-2 border-base-content/20 bg-base-100 rounded-lg shadow-2xl backdrop-blur-none pb-[env(safe-area-inset-bottom)]">
            <div className="h-full">
              <Outlet context={{
                user,
                currentProjectId: selectedProject?.id,
                currentProjectName: selectedProject?.name,
                selectedProject,
                onProjectSwitch: async (projectId: string) => {
                  const project = projects.find(p => p.id === projectId);
                  if (project) {
                    setSelectedProject(project);
                    localStorage.setItem('selectedProjectId', project.id);
                  }
                }
              }} />
            </div>
          </div>
        ) : location.pathname === '/billing' || location.pathname === '/account-settings' || location.pathname === '/support' || location.pathname === '/help' || location.pathname === '/news' || location.pathname === '/notifications' ? (
          /* Billing, Account Settings, Support, Help, News, and Notifications - No sub-menu */
          <div className="flex-1 border-2 border-base-content/20 bg-base-100 mx-4 rounded-lg shadow-2xl backdrop-blur-none">
            <div className="p-2">
              <Outlet context={{
                activeNewsTab,
                setActiveNewsTab
              }} />
            </div>
          </div>
        ) : (
          /* Project Details Tab - Show project content with tabs */
          <>
            {/* Page Content */}
            <div className={`flex-1 ${location.pathname === '/features' ? 'overflow-auto lg:overflow-hidden' : 'overflow-auto'} border-2 border-base-content/20 bg-base-100 rounded-lg shadow-2xl backdrop-blur-none container-height-fix ${location.pathname === '/support' ? 'mt-4' : ''}`}>
              {selectedProject ? (
                <div className="p-2">
                  <Outlet context={{
                    selectedProject,
                    user,
                    onProjectUpdate: handleProjectUpdate,
                    onProjectArchive: handleProjectArchive,
                    onProjectDelete: handleProjectDelete,
                    onProjectRefresh: loadProjectsWrapper,
                    // Page-level tab states
                    activeStackTab,
                    setActiveStackTab,
                    activeDeploymentTab,
                    setActiveDeploymentTab,
                    activeFeaturesTab,
                    setActiveFeaturesTab,
                    activeNewsTab,
                    setActiveNewsTab,
                    activeNotesTab,
                    setActiveNotesTab,
                    activePublicTab,
                    setActivePublicTab,
                    activeSharingTab,
                    setActiveSharingTab,
                    activeSettingsTab,
                    setActiveSettingsTab
                  }} />
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-[50vh] h-full p-4">
                  <div className="text-center bg-base-100 rounded-xl p-12 border-thick shadow-lg max-w-md mx-auto">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-semibold mb-4">Select a project to get started</h2>
                    <p className="text-base-content/60 mb-6">Go to My Projects to choose a project</p>
                    <button
                      onClick={() => navigate('/projects')}
                      className="btn btn-primary btn-lg gap-2 border-thick"
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

      <TutorialOverlay />
      <WelcomeModal user={user} />
      <TutorialAutoStarter />

      {/* Floating Tutorial Resume Button - shows when tutorial is in progress but not active */}
      <ResumeTutorialButton />

      {/* Site Footer */}
      <footer className="flex items-center justify-center gap-3 py-1.5 text-xs text-base-content/40">
        <span>Built by Lucas Froesch</span>
        <span>·</span>
        <a href="https://froesch.dev" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors underline">froesch.dev</a>
        <span>·</span>
        <a href="https://github.com/LFroesch" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors underline">GitHub</a>
      </footer>
    </div>
    </TutorialProvider>
  );
};

export default Layout;