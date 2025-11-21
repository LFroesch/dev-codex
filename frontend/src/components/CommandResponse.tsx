import React, { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandResponse as CommandResponseType } from '../api/terminal';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { authAPI, terminalAPI } from '../api';
import { hexToOklch, oklchToCssValue, generateFocusVariant, generateContrastingTextColor } from '../utils/colorUtils';
import { toast } from '../services/toast';
import { generateTemplate } from '../utils/commandHelpers';
import { csrfFetch } from '../utils/csrf';

// Lazy load renderers for better performance
const TodosRenderer = lazy(() => import('./responses').then(m => ({ default: m.TodosRenderer })));
const NotesRenderer = lazy(() => import('./responses').then(m => ({ default: m.NotesRenderer })));
const StackRenderer = lazy(() => import('./responses').then(m => ({ default: m.StackRenderer })));
const DevLogRenderer = lazy(() => import('./responses').then(m => ({ default: m.DevLogRenderer })));
const ComponentRenderer = lazy(() => import('./responses').then(m => ({ default: m.ComponentRenderer })));
const SubtasksRenderer = lazy(() => import('./responses').then(m => ({ default: m.SubtasksRenderer })));
const BatchCommandsRenderer = lazy(() => import('./responses').then(m => ({ default: m.BatchCommandsRenderer })));
const NotificationsRenderer = lazy(() => import('./responses').then(m => ({ default: m.NotificationsRenderer })));
const StaleItemsRenderer = lazy(() => import('./responses').then(m => ({ default: m.StaleItemsRenderer })));
const ActivityLogRenderer = lazy(() => import('./responses').then(m => ({ default: m.ActivityLogRenderer })));
const HelpRenderer = lazy(() => import('./responses').then(m => ({ default: m.HelpRenderer })));
const ThemesRenderer = lazy(() => import('./responses').then(m => ({ default: m.ThemesRenderer })));
const NewsRenderer = lazy(() => import('./responses').then(m => ({ default: m.NewsRenderer })));
const ProjectsRenderer = lazy(() => import('./responses').then(m => ({ default: m.ProjectsRenderer })));

// Lazy load wizards
const EditWizard = lazy(() => import('./EditWizard'));
const SelectorWizard = lazy(() => import('./SelectorWizard'));
const ConfirmationWizard = lazy(() => import('./ConfirmationWizard'));

// Loading fallback for lazy-loaded components
const LoadingFallback: React.FC = () => (
  <div className="mt-3 p-4 bg-base-200/50 rounded-lg border-thick animate-pulse">
    <div className="h-4 bg-base-300 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-base-300 rounded w-1/2"></div>
  </div>
);

interface CommandResponseProps {
  entryId: string;
  response: CommandResponseType;
  command: string;
  timestamp: Date;
  onProjectSelect?: (projectId: string) => void;
  currentProjectId?: string;
  onCommandClick?: (command: string) => void;
  onDirectThemeChange?: (themeName: string) => Promise<void>;
  onWizardComplete?: (entryId: string, wizardData: Record<string, any>) => void;
  onSelectorTransition?: (entryId: string, itemType: string, itemId: string) => Promise<void>;
  fromStorage?: boolean;
}

const CommandResponse: React.FC<CommandResponseProps> = ({
  entryId,
  response,
  command,
  timestamp,
  onProjectSelect,
  currentProjectId,
  onCommandClick,
  onDirectThemeChange,
  onWizardComplete,
  onSelectorTransition,
  fromStorage
}) => {
  const navigate = useNavigate();

  // Render readonly wizard summary for entries loaded from storage
  const renderArchivedWizard = () => {
    const wizardType = response.data.wizardType;
    const isCompleted = response.data.wizardCompleted;

    // Get a friendly name for the wizard type
    const getWizardTypeName = () => {
      if (wizardType === 'new_project') return 'New Project';
      if (wizardType?.includes('add_')) return wizardType.replace('add_', 'Add ').replace(/_/g, ' ');
      if (wizardType?.includes('edit_')) return wizardType.replace('edit_', 'Edit ').replace(/_/g, ' ');
      if (wizardType?.includes('delete_')) return wizardType.replace('delete_', 'Delete ').replace(/_/g, ' ');
      if (wizardType?.includes('_selector')) return wizardType.replace('_selector', ' Selector').replace(/_/g, ' ');
      return wizardType?.replace(/_/g, ' ') || 'Wizard';
    };

    // Get navigation path based on wizard type
    const getNavigationPath = () => {
      if (wizardType?.includes('todo')) return '/todos';
      if (wizardType?.includes('note')) return '/notes';
      if (wizardType?.includes('devlog')) return '/devlog';
      if (wizardType?.includes('component')) return '/components';
      if (wizardType === 'new_project') return '/projects';
      return '/';
    };

    return (
      <div className="mt-3 p-4 bg-base-200/50 rounded-lg border-thick">
        <div className="flex items-start gap-3">
          <div className="text-2xl flex-shrink-0">📜</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-base-content capitalize">
                {getWizardTypeName()}
              </h3>
              {isCompleted && (
                <span className="badge badge-success border-thick p-2 badge-sm">Completed</span>
              )}
              {!isCompleted && (
                <span className="badge badge-warning border-thick p-2 badge-sm">Incomplete</span>
              )}
            </div>

            <div className="text-xs text-base-content/70 mb-3 mt-3">
              <span className="font-mono bg-base-300 border-thick px-2 py-1 rounded">
                {command}
              </span>
            </div>

            {/* Show any data that was entered */}
            {response.data.wizardData && Object.keys(response.data.wizardData).length > 0 && (
              <div className="mb-3 p-2 bg-base-100 rounded border-thick">
                <div className="text-xs font-semibold text-base-content/60 mb-1">Data entered:</div>
                <div className="space-y-1">
                  {Object.entries(response.data.wizardData).map(([key, value]: [string, any]) => {
                    if (!value || (Array.isArray(value) && value.length === 0)) return null;
                    const displayValue = typeof value === 'object'
                      ? JSON.stringify(value).slice(0, 100)
                      : String(value).slice(0, 100);
                    return (
                      <div key={key} className="text-xs">
                        <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                        <span className="text-base-content/70">{displayValue}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onCommandClick?.(command)}
                className="btn btn-xs border-thick btn-primary font-semibold"
              >
                🔄 Run Again
              </button>
              <button
                type="button"
                onClick={() => navigate(getNavigationPath())}
                className="btn btn-xs border-thick btn-outline font-semibold"
              >
                🔗 Go to Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Apply custom theme by updating tailwind config dynamically
  const applyCustomTheme = React.useCallback((theme: any) => {
    // Remove existing custom theme styles
    const existingStyle = document.getElementById('custom-theme-style');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add custom theme to DaisyUI themes dynamically
    const style = document.createElement('style');
    style.id = 'custom-theme-style';

    // Convert user colors to OKLCH format
    const primaryOklch = hexToOklch(theme.colors.primary);
    const secondaryOklch = hexToOklch(theme.colors.secondary);
    const accentOklch = hexToOklch(theme.colors.accent);
    const neutralOklch = hexToOklch(theme.colors.neutral);
    const base100Oklch = hexToOklch(theme.colors['base-100']);
    const base200Oklch = hexToOklch(theme.colors['base-200']);
    const base300Oklch = hexToOklch(theme.colors['base-300']);
    const infoOklch = hexToOklch(theme.colors.info);
    const successOklch = hexToOklch(theme.colors.success);
    const warningOklch = hexToOklch(theme.colors.warning);
    const errorOklch = hexToOklch(theme.colors.error);

    const css = `
      [data-theme="custom-${theme.id}"] {
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

    // Set the theme attribute
    document.documentElement.setAttribute('data-theme', `custom-${theme.id}`);
  }, []);

  // Clear custom theme styles and apply standard theme
  const clearCustomTheme = React.useCallback((standardTheme: string) => {
    // Always remove any existing custom theme CSS
    const existingStyle = document.getElementById('custom-theme-style');
    if (existingStyle) {
      existingStyle.remove();
    }
    // Set the theme attribute to the standard theme
    document.documentElement.setAttribute('data-theme', standardTheme);
  }, []);

  // Handle page redirects from goto command
  React.useEffect(() => {
    if (response.data?.redirect) {
      const redirectPath = response.data.redirect;
      // If the response has a project ID and it's different from current, switch first
      if (response.metadata?.projectId && response.metadata.projectId !== currentProjectId && onProjectSelect) {
        onProjectSelect(response.metadata.projectId);
      }
      // Then navigate
      navigate(redirectPath);
    }
  }, [response.data?.redirect, response.metadata?.projectId, currentProjectId, onProjectSelect, navigate]);

  // Handle theme changes
  React.useEffect(() => {
    const handleThemeChange = async () => {
      if (response.data?.theme) {
        const themeName = response.data.theme;

        // Clear any existing custom theme CSS first
        clearCustomTheme(themeName);

        // Update theme in database
        try {
          await authAPI.updateTheme(themeName);
        } catch (error) {
          console.error('Failed to save theme to database:', error);
        }

        // Apply the theme
        if (themeName.startsWith('custom-')) {
          // It's a custom theme, need to load and apply it
          const themeId = themeName.replace('custom-', '');
          try {
            // Try to get custom themes from API
            const { customThemes } = await authAPI.getCustomThemes();
            const customTheme = customThemes.find((t: any) => t.id === themeId);
            if (customTheme) {
              applyCustomTheme(customTheme);
            } else {
              // Fallback to localStorage
              const saved = localStorage.getItem('customThemes');
              if (saved) {
                const localCustomThemes = JSON.parse(saved);
                const localCustomTheme = localCustomThemes.find((t: any) => t.id === themeId);
                if (localCustomTheme) {
                  applyCustomTheme(localCustomTheme);
                }
              }
            }
          } catch (error) {
            console.error('Failed to load custom theme:', error);
            // Fallback to localStorage
            const saved = localStorage.getItem('customThemes');
            if (saved) {
              const localCustomThemes = JSON.parse(saved);
              const localCustomTheme = localCustomThemes.find((t: any) => t.id === themeId);
              if (localCustomTheme) {
                applyCustomTheme(localCustomTheme);
              }
            }
          }
        }

        // Keep localStorage as fallback
        localStorage.setItem('theme', themeName);
      }
    };

    handleThemeChange();
  }, [response.data?.theme, clearCustomTheme, applyCustomTheme]);

  const handleNavigateToProject = async (path: string) => {
    // If the response has a project ID and it's different from current, switch first
    if (response.metadata?.projectId && response.metadata.projectId !== currentProjectId && onProjectSelect) {
      await onProjectSelect(response.metadata.projectId);
    }
    // Then navigate
    navigate(path);
  };

  const getIcon = () => {
    // Special icon for lock errors
    if (response.type === 'error' && response.data?.isLocked) {
      return '🔒';
    }

    switch (response.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'data':
        return '📊';
      case 'prompt':
        return '❓';
      default:
        return '•';
    }
  };

  const renderData = () => {
    if (!response.data) return null;

    // Special handling for demo mode
    if (response.data.demo && response.data.action === 'signup_required') {
      return (
        <div className="mt-3 space-y-3">
          <div className="p-4 bg-info/10 border-2 border-info/50 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-info flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-info mb-1">{response.data.title || 'Demo Mode - Account Required'}</h4>
                <p className="text-sm text-base-content/80 mb-2">
                  {response.data.description || response.data.message || "You're in demo mode with read-only access. Sign up to create, edit, and manage your own projects!"}
                </p>
                <div className="text-xs text-base-content/60">
                  Create a free account to unlock full functionality including creating projects, adding tasks, and saving your work.
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/register')}
            className="btn btn-primary btn-sm gap-2"
            style={{ color: getContrastTextColor('primary') }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            {response.data.ctaText || 'Create Free Account'}
          </button>
        </div>
      );
    }

    // Special handling for lock errors
    if (response.type === 'error' && response.data.isLocked) {
      return (
        <div className="mt-3 space-y-3">
          <div className="p-4 bg-warning/10 border-2 border-warning/50 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-warning flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-warning mb-1">Project Locked - Read Only Mode</h4>
                <p className="text-sm text-base-content/80 mb-2">
                  {response.message || 'This project is locked and cannot be modified.'}
                </p>
                {response.data.message && response.data.message !== response.message && (
                  <p className="text-xs text-base-content/70 mb-2">
                    {response.data.message}
                  </p>
                )}
                <div className="text-xs text-base-content/60">
                  You can still view and download project data, but editing is disabled until you upgrade your plan.
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/billing')}
            className="btn btn-warning btn-sm gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Upgrade Plan to Unlock
          </button>
        </div>
      );
    }

    // Render todos list
    if (response.data.todos && Array.isArray(response.data.todos)) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <TodosRenderer todos={response.data.todos} projectId={response.metadata?.projectId} onNavigate={handleNavigateToProject} onCommandClick={onCommandClick} />
        </Suspense>
      );
    }

    // Render subtasks list
    if (response.data.subtasks && Array.isArray(response.data.subtasks)) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <SubtasksRenderer
            subtasks={response.data.subtasks}
            parentTodo={response.data.parentTodo}
          />
        </Suspense>
      );
    }

    // Render batch command results
    if (response.data.batch && response.data.results && Array.isArray(response.data.results)) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <BatchCommandsRenderer
            results={response.data.results}
            executed={response.data.executed || 0}
            total={response.data.total || 0}
            onProjectSelect={onProjectSelect}
          />
        </Suspense>
      );
    }

    // Render notes list
    if (response.data.notes && Array.isArray(response.data.notes)) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <NotesRenderer notes={response.data.notes} projectId={response.metadata?.projectId} onNavigate={handleNavigateToProject} onCommandClick={onCommandClick} />
        </Suspense>
      );
    }

    // Render dev log entries
    if (response.data.entries && Array.isArray(response.data.entries)) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <DevLogRenderer entries={response.data.entries} projectId={response.metadata?.projectId} onNavigate={handleNavigateToProject} onCommandClick={onCommandClick} />
        </Suspense>
      );
    }

    // Render components (features)
    if (response.data.structure || (response.data.components && Array.isArray(response.data.components))) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ComponentRenderer structure={response.data.structure} components={response.data.components} projectId={response.metadata?.projectId} onNavigate={handleNavigateToProject} onCommandClick={onCommandClick} />
        </Suspense>
      );
    }

    // Render stack data
    if (response.data.stack) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <StackRenderer stack={response.data.stack} projectId={response.metadata?.projectId} onNavigate={handleNavigateToProject} />
        </Suspense>
      );
    }

    // Render notifications
    if (response.data.notifications && Array.isArray(response.data.notifications)) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <NotificationsRenderer notifications={response.data.notifications} />
        </Suspense>
      );
    }

    // Render activity log entries
    if (response.data.activityEntries) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ActivityLogRenderer
            activityEntries={response.data.activityEntries}
            hasMore={response.data.hasMore || false}
            remainingCount={response.data.remainingCount || 0}
          />
        </Suspense>
      );
    }

    // Render stale items
    if (response.data.staleNotes || response.data.staleTodos) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <StaleItemsRenderer
            staleNotes={response.data.staleNotes || []}
            staleTodos={response.data.staleTodos || []}
            notesByProject={response.data.notesByProject}
            todosByProject={response.data.todosByProject}
            totalCount={response.data.totalCount || 0}
          />
        </Suspense>
      );
    }

    // Render deployment data (but not if it's part of /info response)
    if (response.data.deployment && !response.data.basicInfo) {
      const dep = response.data.deployment;
      return (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Live URL</div>
              <div className="text-sm text-base-content/80 break-all">{dep.liveUrl}</div>
            </div>
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Platform</div>
              <div className="text-sm text-base-content/80">{dep.platform}</div>
            </div>
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Status</div>
              <div className="text-sm text-base-content/80 capitalize">{dep.status}</div>
            </div>
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Branch</div>
              <div className="text-sm text-base-content/80 break-all">{dep.branch}</div>
            </div>
          </div>
          {response.metadata?.projectId && (
            <button
              onClick={() => handleNavigateToProject('/deployment')}
              className="btn-primary-sm gap-2 border-thick"
              style={{ color: getContrastTextColor('primary') }}
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              View Deployment
            </button>
          )}
        </div>
      );
    }

    // Render public settings
    if (response.data.publicSettings) {
      const pub = response.data.publicSettings;
      return (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Visibility</div>
              <div className="text-sm text-base-content/80">{pub.isPublic ? '🌐 Public' : '🔒 Private'}</div>
            </div>
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Slug</div>
              <div className="text-sm text-base-content/80 break-all">{pub.slug}</div>
            </div>
          </div>
          {pub.url && pub.url !== 'Not available (project is private)' && (
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Public URL</div>
              <a href={pub.url} target="_blank" rel="noopener noreferrer" className="text-sm text-base-content/70 hover:underline break-all block">
                {pub.url}
              </a>
            </div>
          )}
          {response.metadata?.projectId && (
            <button
              onClick={() => handleNavigateToProject('/public')}
              className="btn-primary-sm gap-2 border-thick"
              style={{ color: getContrastTextColor('primary') }}
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Manage Public Settings
            </button>
          )}
        </div>
      );
    }

    // Render team members
    if (response.data.members && Array.isArray(response.data.members)) {
      return (
        <div className="mt-3 space-y-2">
          <div className="space-y-1">
            {response.data.members.map((member: any, index: number) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-base-content/80 break-words">{member.name}</div>
                  <div className="text-xs text-base-content/60 break-all">{member.email}</div>
                </div>
                <span className={`badge badge-sm ${member.isOwner ? 'badge-primary' : 'badge-secondary'}`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
          {response.metadata?.projectId && (
            <button
              onClick={() => handleNavigateToProject('/sharing')}
              className="btn-primary-sm gap-2 border-thick"
              style={{ color: getContrastTextColor('primary') }}
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Manage Team
            </button>
          )}
        </div>
      );
    }

    // Render settings
    if (response.data.settings) {
      const settings = response.data.settings;
      return (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Name</div>
              <div className="text-sm text-base-content/80 break-words">{settings.name}</div>
            </div>
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Category</div>
              <div className="text-sm text-base-content/80 capitalize">{settings.category}</div>
            </div>
          </div>
          <div className="p-2 bg-base-200 rounded-lg border-thick">
            <div className="text-xs text-base-content/60">Description</div>
            <div className="text-sm text-base-content/80 break-words">{settings.description}</div>
          </div>
          {settings.tags && settings.tags.length > 0 && (
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60 mb-1">Tags</div>
              <div className="flex flex-wrap gap-1">
                {settings.tags.map((tag: string, index: number) => (
                  <span key={index} className="badge badge-sm badge-primary">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {response.metadata?.projectId && (
            <button
              onClick={() => handleNavigateToProject('/settings')}
              className="btn-primary-sm gap-2 border-thick"
              style={{ color: getContrastTextColor('primary') }}
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              View Settings
            </button>
          )}
        </div>
      );
    }

    // Render news
    if (response.data.news && Array.isArray(response.data.news)) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <NewsRenderer news={response.data.news} />
        </Suspense>
      );
    }

    // Render summary
    if (response.data.summary) {
      const downloadSummary = () => {
        const blob = new Blob([response.data.summary], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.fileName || `${response.data.projectName}-summary.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      return (
        <div className="mt-3 space-y-2">
          <div className="p-3 bg-base-200 rounded-lg border-thick max-h-96 overflow-y-auto">
            <pre className="text-xs text-base-content/80 whitespace-pre-wrap break-words font-mono">
              {response.data.summary}
            </pre>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadSummary}
              className="btn-primary-sm gap-2 border-thick"
              style={{ color: getContrastTextColor('primary') }}
            >
              📥 Download {response.data.format || 'summary'}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(response.data.summary);
              }}
              className="btn-primary-sm gap-2 border-thick"
              style={{ color: getContrastTextColor('primary') }}
            >
              📋 Copy to Clipboard
            </button>
            {response.metadata?.projectId && (
              <button
                onClick={() => handleNavigateToProject('/notes')}
                className="btn-primary-sm gap-2 border-thick"
                style={{ color: getContrastTextColor('primary') }}
              >
                📁 Open Project
              </button>
            )}
          </div>
          {response.data.textMetrics && (
            <div className="text-xs text-base-content/70 bg-base-300/50 px-3 py-2 rounded border border-base-content/10">
              📊 <span className="font-semibold">{response.data.textMetrics.characterCount.toLocaleString()}</span> characters • ~<span className="font-semibold">{response.data.textMetrics.estimatedTokens.toLocaleString()}</span> tokens
            </div>
          )}
          <div className="text-xs text-base-content/60">
            💡 Use <code className="bg-base-300 px-1 rounded">/summary [format]</code> to change format (markdown, json, prompt, text)
          </div>
        </div>
      );
    }

    // Render search results
    if (response.data.results && Array.isArray(response.data.results)) {
      const results = response.data.results;
      const groupedResults = results.reduce((acc: any, result: any) => {
        const type = result.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(result);
        return acc;
      }, {});

      return (
        <div className="mt-3 space-y-3">
          {Object.entries(groupedResults).map(([type, items]: [string, any]) => (
            <div key={type} className="space-y-1">
              <div className="text-xs font-semibold text-base-content/70 capitalize">
                {type}s ({items.length})
              </div>
              <div className="space-y-1">
                {items.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-base-content/80 break-words">
                          {item.text || item.title}
                        </div>
                        {item.preview && (
                          <div className="text-xs text-base-content/60 mt-1 break-words">
                            {item.preview}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-base-content/60">
                            📁 {item.projectName}
                          </span>
                          {item.priority && (
                            <span className={`badge badge-xs ${
                              item.priority === 'high' ? 'badge-error' :
                              item.priority === 'medium' ? 'badge-warning' :
                              'badge-info'
                            }`}>
                              {item.priority}
                            </span>
                          )}
                          {item.status && (
                            <span className="badge badge-xs badge-ghost">
                              {item.status}
                            </span>
                          )}
                          {item.docType && (
                            <span className="badge badge-xs badge-secondary">
                              {item.docType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Render themes
    if (response.data.themes && Array.isArray(response.data.themes)) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ThemesRenderer
            themes={response.data.themes}
            customThemes={response.data.customThemes || []}
            onDirectThemeChange={onDirectThemeChange}
          />
        </Suspense>
      );
    }

    // Render wizard for interactive project creation
    if (response.data.wizardType === 'new_project' && response.data.steps) {
      // If loaded from storage, show archived/readonly summary instead
      if (fromStorage) {
        return renderArchivedWizard();
      }
      const [currentStep, setCurrentStep] = React.useState(0);
      const [wizardData, setWizardData] = React.useState<Record<string, any>>(response.data.wizardData || {});
      const [tags, setTags] = React.useState<string[]>(response.data.wizardData?.tags || []);
      const [tagInput, setTagInput] = React.useState('');
      const [isSubmitting, setIsSubmitting] = React.useState(false);
      const [isCompleted, setIsCompleted] = React.useState(response.data.wizardCompleted || false);

      const steps = response.data.steps;
      const step = steps[currentStep];

      const handleNext = () => {
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
          // Scroll to bottom on step changed
        }
      };

      const handleBack = () => {
        if (currentStep > 0) {
          setCurrentStep(currentStep - 1);
        }
      };

      // Handle Escape key to go back
      React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
          if (e.key === 'Escape' && !isCompleted && !isSubmitting && currentStep > 0) {
            handleBack();
          }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
      }, [currentStep, isCompleted, isSubmitting]);

      const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
          const submitData = { ...wizardData, tags };
          await csrfFetch(response.data.submitEndpoint, {
            method: response.data.submitMethod || 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(submitData),
          });

          toast.success(response.data.successMessage || 'Project created successfully!');
          setIsCompleted(true);
          // Update the entry in parent to persist completion state
          if (onWizardComplete) {
            onWizardComplete(entryId, { ...wizardData, tags });
          }
          if (response.data.successRedirect) {
            setTimeout(() => navigate(response.data.successRedirect), 1500);
          }
        } catch (error) {
          toast.error('Failed to create project');
        } finally {
          setIsSubmitting(false);
        }
      };

      const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
          setTags([...tags, tagInput.trim()]);
          setTagInput('');
        }
      };

      const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
      };

      const isStepValid = () => {
        if (step.required) {
          const value = step.id === 'tags' ? tags.length > 0 : wizardData[step.id];
          return value !== undefined && value !== '' && value !== null;
        }
        return true;
      };

      // If completed, show success screen
      if (isCompleted) {
        return (
          <div className="mt-3 space-y-4">
            <div className="p-6 bg-success/10 rounded-lg border-2 border-success/30 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-xl font-bold mb-2">Project Created Successfully!</h3>
              <p className="text-sm text-base-content/70 mb-4">
                Your new project has been created.
              </p>

              {/* Show created data preview */}
              <div className="p-4 bg-base-200 rounded-lg border-thick text-left mb-4">
                <div className="text-xs font-semibold text-base-content/60 mb-2">Created:</div>
                <div className="space-y-1">
                  {Object.entries(wizardData).filter(([key]) => key !== 'tags').map(([key, value]) => {
                    const formatValue = (val: any): string => {
                      if (val === null || val === undefined) return 'N/A';
                      if (typeof val === 'object') {
                        if (Array.isArray(val)) return `[${val.length} items]`;
                        return JSON.stringify(val, null, 2);
                      }
                      const str = String(val);
                      return str.slice(0, 50) + (str.length > 50 ? '...' : '');
                    };
                    return (
                      <div key={key} className="text-sm">
                        <span className="font-semibold capitalize">{key}:</span>{' '}
                        <span className="text-base-content/80">{formatValue(value)}</span>
                      </div>
                    );
                  })}
                  {tags.length > 0 && (
                    <div className="text-sm">
                      <span className="font-semibold">Tags:</span>{' '}
                      <span className="text-base-content/80">{tags.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate(response.data.successRedirect || '/projects')}
                className="btn btn-primary w-full border-thick"
                style={{ color: getContrastTextColor('primary') }}
              >
                View Project
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="mt-3 space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-base-content/60">
              Step {currentStep + 1} of {steps.length}
            </div>
            <div className="flex gap-1">
              {steps.map((_: any, idx: number) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx === currentStep ? 'bg-primary' :
                    idx < currentStep ? 'bg-success' :
                    'bg-base-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Step content */}
          <div className="p-4 bg-base-200 rounded-lg border-thick">
            <div className="text-sm font-semibold text-base-content mb-2">{step.label}</div>
            {step.description && (
              <div className="text-xs text-base-content/60 mb-3">{step.description}</div>
            )}

            {step.type === 'text' && (
              <input
                type="text"
                value={wizardData[step.id] || step.defaultValue || ''}
                onChange={(e) => setWizardData({ ...wizardData, [step.id]: e.target.value })}
                placeholder={step.placeholder}
                className="input input-bordered w-full"
              />
            )}

            {step.type === 'textarea' && (
              <textarea
                value={wizardData[step.id] || step.defaultValue || ''}
                onChange={(e) => setWizardData({ ...wizardData, [step.id]: e.target.value })}
                placeholder={step.placeholder}
                rows={4}
                className="textarea textarea-bordered w-full resize-none"
              />
            )}

            {step.type === 'select' && (
              <select
                value={wizardData[step.id] || step.defaultValue || ''}
                onChange={(e) => setWizardData({ ...wizardData, [step.id]: e.target.value })}
                className="select select-bordered w-full"
              >
                {step.options?.map((option: any) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            )}

            {step.type === 'color' && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={wizardData[step.id] || step.defaultValue || '#3B82F6'}
                  onChange={(e) => setWizardData({ ...wizardData, [step.id]: e.target.value })}
                  className="w-12 h-12 border border-base-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={wizardData[step.id] || step.defaultValue || '#3B82F6'}
                  onChange={(e) => setWizardData({ ...wizardData, [step.id]: e.target.value })}
                  className="input input-bordered flex-1 font-mono"
                  placeholder={step.defaultValue}
                />
              </div>
            )}

            {step.type === 'tags' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder={step.placeholder}
                    className="input input-bordered flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="btn btn-primary btn-square border-thick"
                    style={{ color: getContrastTextColor('primary') }}
                  >
                    +
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        className="badge badge-info gap-2"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-info-content hover:text-error text-lg font-bold leading-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step.type === 'relationships' && (
              <div className="space-y-3">
                {/* Current relationships */}
                {(wizardData[step.id] || step.value || []).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-base-content/70">Current Relationships</div>
                    {(wizardData[step.id] || step.value || []).map((rel: any, index: number) => {
                      const targetComp = (step as any).availableComponents?.find((c: any) => c.id === rel.targetId);
                      return (
                        <div key={rel.id || index} className="bg-base-300 p-2 rounded flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{targetComp?.title || 'Unknown'}</div>
                            <div className="flex items-center gap-2 text-xs text-base-content/60">
                              <span className="badge badge-xs">{rel.relationType}</span>
                              {rel.description && <span className="truncate">{rel.description}</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (wizardData[step.id] || step.value || []).filter((_: any, i: number) => i !== index);
                              setWizardData({ ...wizardData, [step.id]: updated });
                            }}
                            className="btn btn-ghost btn-xs border-thick text-error"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add new relationship */}
                <div className="border-t border-base-content/10 pt-3">
                  <div className="text-xs font-semibold text-base-content/70 mb-2">Add Relationship</div>
                  <div className="space-y-2">
                    <select
                      className="select select-bordered select-sm w-full"
                      value={wizardData[`${step.id}_temp`]?.targetId || ""}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const targetId = e.target.value;
                        const targetComp = (step as any).availableComponents?.find((c: any) => c.id === targetId);

                        // Initialize temp relationship data
                        const tempData = {
                          targetId,
                          targetTitle: targetComp?.title || '',
                          relationType: 'uses',
                          description: ''
                        };
                        setWizardData({ ...wizardData, [`${step.id}_temp`]: tempData });
                      }}
                    >
                      <option value="">Select component...</option>
                      {(step as any).availableComponents?.map((comp: any) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.category} • {comp.title}
                        </option>
                      ))}
                    </select>

                    {wizardData[`${step.id}_temp`] && (
                      <>
                        <select
                          className="select select-bordered select-sm w-full"
                          value={wizardData[`${step.id}_temp`].relationType}
                          onChange={(e) => {
                            setWizardData({
                              ...wizardData,
                              [`${step.id}_temp`]: { ...wizardData[`${step.id}_temp`], relationType: e.target.value }
                            });
                          }}
                        >
                          <option value="uses">Uses</option>
                          <option value="implements">Implements</option>
                          <option value="extends">Extends</option>
                          <option value="depends_on">Depends On</option>
                          <option value="calls">Calls</option>
                          <option value="contains">Contains</option>
                          <option value="mentions">Mentions</option>
                          <option value="similar">Similar</option>
                        </select>

                        <input
                          type="text"
                          placeholder="Description (optional)"
                          className="input input-bordered input-sm w-full"
                          value={wizardData[`${step.id}_temp`].description || ''}
                          onChange={(e) => {
                            setWizardData({
                              ...wizardData,
                              [`${step.id}_temp`]: { ...wizardData[`${step.id}_temp`], description: e.target.value }
                            });
                          }}
                        />

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const temp = wizardData[`${step.id}_temp`];
                              const newRel = {
                                id: `temp-${Date.now()}`,
                                targetId: temp.targetId,
                                relationType: temp.relationType,
                                description: temp.description
                              };
                              const updated = [...(wizardData[step.id] || step.value || []), newRel];
                              const newData: any = { ...wizardData, [step.id]: updated };
                              delete newData[`${step.id}_temp`];
                              setWizardData(newData);
                            }}
                            className="btn btn-primary btn-sm border-thick flex-1"
                            style={{ color: getContrastTextColor('primary') }}
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newData: any = { ...wizardData };
                              delete newData[`${step.id}_temp`];
                              setWizardData(newData);
                            }}
                            className="btn btn-ghost btn-sm border-thick"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="btn btn-outline border-thick"
            >
              Back
            </button>
            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!isStepValid()}
                className="btn btn-primary border-thick"
                style={{ color: getContrastTextColor('primary') }}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isStepValid() || isSubmitting}
                className="btn btn-primary border-thick"
                style={{ color: getContrastTextColor('primary') }}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </button>
            )}
          </div>
        </div>
      );
    }

    // Render wizard for adding/editing todos, notes, devlog, components, stack items, subtasks, and relationships
    if (['add_todo', 'add_note', 'add_devlog', 'add_component', 'add_stack', 'add_subtask', 'add_relationship', 'edit_relationship_type'].includes(response.data.wizardType) && response.data.steps) {
      // If loaded from storage, show archived/readonly summary instead
      if (fromStorage) {
        return renderArchivedWizard();
      }
      const [currentStep, setCurrentStep] = React.useState(0);
      const [wizardData, setWizardData] = React.useState<Record<string, any>>(response.data.wizardData || {});
      const [responseData, setResponseData] = React.useState<Record<string, any> | null>(null);
      const [isSubmitting, setIsSubmitting] = React.useState(false);
      const [isCompleted, setIsCompleted] = React.useState(response.data.wizardCompleted || false);

      const steps = response.data.steps;
      const step = steps[currentStep];
      const projectId = currentProjectId || response.metadata?.projectId;

      const handleNext = () => {
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        }
      };

      const handleBack = () => {
        if (currentStep > 0) {
          setCurrentStep(currentStep - 1);
        }
      };

      // Handle Escape key to go back
      React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
          if (e.key === 'Escape' && !isCompleted && !isSubmitting && currentStep > 0) {
            handleBack();
          }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
      }, [currentStep, isCompleted, isSubmitting]);

      const escapeForCommand = (value: string): string => {
        return String(value)
          .replace(/\\/g, '\\\\')  // Escape backslashes first
          .replace(/\n/g, '\\n')    // Escape newlines
          .replace(/\r/g, '\\r')    // Escape carriage returns
          .replace(/"/g, '\\"');    // Then escape quotes
      };

      const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
          const { wizardType } = response.data;

          let command: string;

          // Special handling for edit_relationship_type
          if (wizardType === 'edit_relationship_type') {
            const componentTitle = response.data.componentTitle;
            const targetTitle = response.data.targetTitle;
            const relationType = wizardData.relationType || steps[0]?.value;
            const description = wizardData.description || '';

            command = `/edit relationship "${escapeForCommand(componentTitle)}" "${escapeForCommand(targetTitle)}" ${relationType}`;
            if (description) {
              command += ` --description="${escapeForCommand(description)}"`;
            }
          } else {
            // Build command string with flags for add commands
            const commandMap: Record<string, string> = {
              'add_todo': 'add todo',
              'add_note': 'add note',
              'add_devlog': 'add devlog',
              'add_component': 'add component',
              'add_stack': 'add stack',
              'add_subtask': 'add subtask',
              'add_relationship': 'add relationship'
            };

            const baseCommand = commandMap[wizardType];

            // Collect all data including defaults from steps
            const allData: Record<string, any> = { ...wizardData };
            steps.forEach((s: any) => {
              if (s.value && !allData[s.id]) {
                allData[s.id] = s.value;
              }
            });

            const flags = Object.entries(allData)
              .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
              .map(([key, value]) => `--${key}="${escapeForCommand(String(value))}"`)
              .join(' ');

            command = `/${baseCommand} ${flags}`;
          }

          // Execute the command
          const result = await terminalAPI.executeCommand(command, projectId);

          if (result.type === 'error') {
            toast.error(result.message || 'Failed to execute command');
            setIsSubmitting(false);
          } else {
            toast.success(result.message || 'Command executed successfully!');
            setResponseData(result.data || {});
            setIsCompleted(true);
            // Update the entry in parent to persist completion state
            if (onWizardComplete) {
              onWizardComplete(entryId, wizardData);
            }
          }
        } catch (error) {
          console.error('Failed to execute command:', error);
          toast.error(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsSubmitting(false);
        }
      };

      const isStepValid = () => {
        if (step.required) {
          const value = wizardData[step.id] || step.value;
          return value !== undefined && value !== '' && value !== null;
        }
        return true;
      };

      const getNavigationPath = () => {
        const { wizardType } = response.data;
        switch (wizardType) {
          case 'add_todo':
          case 'add_subtask':
            return '/notes?section=todos';
          case 'add_note':
            return '/notes';
          case 'add_devlog':
            return '/notes?section=devlog';
          case 'add_component':
          case 'add_relationship':
          case 'edit_relationship_type':
            return '/features';
          case 'add_stack':
            return '/stack';
          default:
            return '/';
        }
      };

      const getItemTypeName = () => {
        const { wizardType } = response.data;
        switch (wizardType) {
          case 'add_todo':
            return 'Todo';
          case 'add_subtask':
            return 'Subtask';
          case 'add_note':
            return 'Note';
          case 'add_devlog':
            return 'Dev Log Entry';
          case 'add_component':
            return 'Component';
          case 'add_relationship':
            return 'Relationship';
          case 'edit_relationship_type':
            return 'Relationship';
          case 'add_stack':
            return 'Stack Item';
          default:
            return 'Item';
        }
      };

      // If completed, show success screen
      if (isCompleted) {
        return (
          <div className="mt-3 space-y-4">
            <div className="p-6 bg-success/10 rounded-lg border-2 border-success/30 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-xl font-bold mb-2">{response.data.wizardType === 'edit_relationship_type' ? 'Updated Successfully!' : 'Created Successfully!'}</h3>
              <p className="text-sm text-base-content/70 mb-4">
                Your {getItemTypeName().toLowerCase()} has been {response.data.wizardType === 'edit_relationship_type' ? 'updated' : 'created'}.
              </p>

              {/* Show created data preview */}
              {responseData && Object.keys(responseData).length > 0 && (
                <div className="p-4 bg-base-200 rounded-lg border-thick text-left mb-4">
                  <div className="text-xs font-semibold text-base-content/60 mb-2">Created:</div>
                  <div className="space-y-1">
                    {Object.entries(responseData).map(([key, value]) => {
                      const formatValue = (val: any): string => {
                        if (val === null || val === undefined) return 'N/A';
                        if (typeof val === 'object') {
                          if (Array.isArray(val)) return `[${val.length} items]`;
                          return JSON.stringify(val, null, 2);
                        }
                        const str = String(val);
                        return str.slice(0, 50) + (str.length > 50 ? '...' : '');
                      };
                      return (
                        <div key={key} className="text-sm">
                          <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                          <span className="text-base-content/80">{formatValue(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate(getNavigationPath())}
                className="btn btn-primary w-full border-thick"
                style={{ color: getContrastTextColor('primary') }}
              >
                {response.data.wizardType === 'edit_relationship_type' ? 'View Components' : `View ${getItemTypeName()}s Page`}
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="mt-3 space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-base-content/60">
              Step {currentStep + 1} of {steps.length}
            </div>
            <div className="flex gap-1">
              {steps.map((_step: any, idx: number) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx === currentStep ? 'bg-primary' :
                    idx < currentStep ? 'bg-success' :
                    'bg-base-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Step content */}
          <div className="p-4 bg-base-200 rounded-lg border-thick">
            <div className="text-sm font-semibold text-base-content mb-2">{step.label}</div>

            {step.type === 'text' && (
              <input
                type="text"
                value={wizardData[step.id] || step.value || ''}
                onChange={(e) => setWizardData({ ...wizardData, [step.id]: e.target.value })}
                placeholder={step.placeholder}
                className="input input-bordered w-full"
              />
            )}

            {step.type === 'textarea' && (
              <textarea
                value={wizardData[step.id] || step.value || ''}
                onChange={(e) => setWizardData({ ...wizardData, [step.id]: e.target.value })}
                placeholder={step.placeholder}
                rows={6}
                className="textarea textarea-bordered w-full resize-none font-mono text-sm"
              />
            )}

            {step.type === 'select' && (
              <select
                value={wizardData[step.id] || step.value || ''}
                onChange={(e) => setWizardData({ ...wizardData, [step.id]: e.target.value })}
                className="select select-bordered w-full"
              >
                {step.placeholder && <option value="">{step.placeholder}</option>}
                {step.options?.map((option: string | { value: string; label: string }) => {
                  // Handle both string options and object options with value/label
                  if (typeof option === 'string') {
                    return <option key={option} value={option}>{option}</option>;
                  } else {
                    return <option key={option.value} value={option.value}>{option.label}</option>;
                  }
                })}
              </select>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="btn btn-outline border-thick"
            >
              Back
            </button>
            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!isStepValid()}
                className="btn btn-primary border-thick"
                style={{ color: getContrastTextColor('primary') }}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isStepValid() || isSubmitting}
                className="btn btn-primary border-thick"
                style={{ color: getContrastTextColor('primary') }}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating...
                  </>
                ) : (
                  `Create ${getItemTypeName()}`
                )}
              </button>
            )}
          </div>
        </div>
      );
    }

    // Render confirmation wizard for delete operations
    if (['delete_relationship_confirm', 'delete_todo_confirm', 'delete_note_confirm', 'delete_devlog_confirm', 'delete_component_confirm', 'delete_subtask_confirm'].includes(response.data.wizardType) && response.data.confirmationData) {
      // If loaded from storage, show archived/readonly summary instead
      if (fromStorage) {
        return renderArchivedWizard();
      }
      const projectId = currentProjectId || response.metadata?.projectId;

      return (
        <Suspense fallback={<LoadingFallback />}>
          <ConfirmationWizard
            message={response.message}
            confirmationData={response.data.confirmationData}
            projectId={projectId}
            onCommandClick={onCommandClick}
          />
        </Suspense>
      );
    }

    // Render wizard for editing todos, notes, devlog, components, and subtasks
    if (['edit_todo', 'edit_note', 'edit_devlog', 'edit_component', 'edit_subtask'].includes(response.data.wizardType) && response.data.steps) {
      // If loaded from storage, show archived/readonly summary instead
      if (fromStorage) {
        return renderArchivedWizard();
      }
      // Use projectId from response metadata as fallback if currentProjectId is not set
      const projectId = currentProjectId || response.metadata?.projectId;

      return (
        <Suspense fallback={<LoadingFallback />}>
          <EditWizard
            wizardData={response.data}
            currentProjectId={projectId}
            entryId={entryId}
            onWizardComplete={onWizardComplete}
          />
        </Suspense>
      );
    }

    // Render wizard for delete/edit selectors (delete_component_selector, edit_note_selector, etc.)
    if (response.data.wizardType?.includes('_selector') && response.data.steps) {
      // If loaded from storage, show archived/readonly summary instead
      if (fromStorage) {
        return renderArchivedWizard();
      }
      const projectId = currentProjectId || response.metadata?.projectId;
      const step = response.data.steps[0]; // Selectors are single-step

      return (
        <Suspense fallback={<LoadingFallback />}>
          <SelectorWizard
            wizardType={response.data.wizardType}
            step={step}
            projectId={projectId}
            entryId={entryId}
            onSelectorTransition={onSelectorTransition}
            onCommandClick={onCommandClick}
          />
        </Suspense>
      );
    }

    // Render project selection as a grid
    if (response.data.projects && Array.isArray(response.data.projects)) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ProjectsRenderer projects={response.data.projects} onProjectSelect={onProjectSelect} />
        </Suspense>
      );
    }

    // Render help data
    if (response.data.grouped) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <HelpRenderer
            grouped={response.data.grouped}
            onCommandClick={onCommandClick}
            generateTemplate={generateTemplate}
          />
        </Suspense>
      );
    }

    // Render specific help
    if (response.data.syntax && response.data.examples) {
      return (
        <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
          <div>
            <div className="text-xs font-semibold text-base-content/70 mb-1">Syntax:</div>
            <code className="text-xs sm:text-sm text-base-content/80 bg-base-200 px-2 py-1 rounded border-thick block break-all">
              {response.data.syntax}
            </code>
          </div>
          <div>
            <div className="text-xs font-semibold text-base-content/70 mb-1">Description:</div>
            <div className="text-xs sm:text-sm text-base-content/80">{response.data.description}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-base-content/70 mb-1">Examples:</div>
            <div className="space-y-1">
              {response.data.examples.map((example: string, index: number) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => onCommandClick?.(generateTemplate(example))}
                  className="block w-full text-left text-xs bg-base-200 px-2 py-1 rounded border-thick text-base-content/80 hover:bg-base-300/50 cursor-pointer transition-colors break-all"
                  title="Click to use this example"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Render export data
    if (response.data.exportUrl) {
      return (
        <div className="mt-3">
          <a
            href={response.data.exportUrl}
            download={`${response.data.projectName}.json`}
            className="btn-primary-sm border-thick"
            style={{ color: getContrastTextColor('primary') }}
          >
            📥 Download {response.data.projectName}
          </a>
        </div>
      );
    }

    // Render project switch data
    if (response.data.project) {
      const project = response.data.project;
      return (
        <div className="mt-3 space-y-2">
          <div className="p-3 bg-base-200 rounded-lg flex items-center gap-3 border-thick">
            {project.color && (
              <div
                className="w-4 h-4 rounded-full border-thick"
                style={{ backgroundColor: project.color }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-base-content/80 break-words">{project.name}</div>
              <div className="text-xs text-base-content/70 break-words">{project.description}</div>
            </div>
          </div>
          <button
            onClick={() => handleNavigateToProject('/notes')}
            className="btn-primary-sm gap-2 border-thick"
            style={{ color: getContrastTextColor('primary') }}
          >
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Open Project
          </button>
        </div>
      );
    }

    // Render /info command data
    if (response.data.basicInfo && response.data.stats) {
      const info = response.data;
      return (
        <div className="mt-3 space-y-2">
          {/* Basic Info Card - Compact */}
          <div className="p-3 bg-base-200 rounded-lg border-thick">
            <div className="flex items-center gap-2">
              {info.basicInfo.color && (
                <div
                  className="w-3 h-3 rounded-full border-thick flex-shrink-0"
                  style={{ backgroundColor: info.basicInfo.color }}
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-base-content break-words">{info.basicInfo.name}</h3>
                {info.basicInfo.description && (
                  <p className="text-xs text-base-content/60 break-words line-clamp-1">{info.basicInfo.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Content Stats - Clickable Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => handleNavigateToProject('/notes?section=todos')}
              className="p-2 bg-base-200 rounded-lg border-thick text-center hover:bg-base-300 transition-colors"
            >
              <div className="text-lg font-bold text-base-content">{info.stats.todos?.total - info.stats.todos?.completed || 0}</div>
              <div className="text-xs text-base-content/60">Todos</div>
            </button>
            <button
              onClick={() => handleNavigateToProject('/notes')}
              className="p-2 bg-base-200 rounded-lg border-thick text-center hover:bg-base-300 transition-colors"
            >
              <div className="text-lg font-bold text-base-content">{info.stats.notes?.total || 0}</div>
              <div className="text-xs text-base-content/60">Notes</div>
            </button>
            <button
              onClick={() => handleNavigateToProject('/notes?section=devlog')}
              className="p-2 bg-base-200 rounded-lg border-thick text-center hover:bg-base-300 transition-colors"
            >
              <div className="text-lg font-bold text-base-content">{info.stats.devLog?.total || 0}</div>
              <div className="text-xs text-base-content/60">Dev Logs</div>
            </button>
            <button
              onClick={() => handleNavigateToProject('/docs')}
              className="p-2 bg-base-200 rounded-lg border-thick text-center hover:bg-base-300 transition-colors"
            >
              <div className="text-lg font-bold text-base-content">{info.stats.docs?.total || 0}</div>
              <div className="text-xs text-base-content/60">Docs</div>
            </button>
          </div>

          {/* Quick Links Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Tech Stack Card */}
            <button
              onClick={() => handleNavigateToProject('/stack')}
              className="p-2 bg-base-200 rounded-lg border-thick hover:bg-base-300 transition-colors text-left"
            >
              <div className="text-xs font-semibold text-base-content mb-1">🛠️ Tech Stack</div>
              <div className="text-xs text-base-content/60">
                {info.stats.techStack ? (
                  <>
                    {info.stats.techStack.technologies || 0} tech • {info.stats.techStack.packages || 0} packages
                  </>
                ) : (
                  'Not configured'
                )}
              </div>
            </button>

            {/* Deployment Card */}
            <button
              onClick={() => handleNavigateToProject('/deployment')}
              className="p-2 bg-base-200 rounded-lg border-thick hover:bg-base-300 transition-colors text-left"
            >
              <div className="text-xs font-semibold text-base-content mb-1">🚀 Deployment</div>
              <div className="text-xs text-base-content/60">
                {info.deployment?.hasDeployment ? (
                  <>
                    {info.deployment.url && (
                      <span className="block truncate text-base-content/60">{info.deployment.url}</span>
                    )}
                  </>
                ) : (
                  'Not deployed'
                )}
              </div>
            </button>

            {/* Public Page Card */}
            <button
              onClick={() => handleNavigateToProject('/public')}
              className="p-2 bg-base-200 rounded-lg border-thick hover:bg-base-300 transition-colors text-left"
            >
              <div className="text-xs font-semibold text-base-content mb-1">🌐 Public Page</div>
              <div className="text-xs text-base-content/60">
                {info.team?.isPublic ? 'Public' : 'Private'}
              </div>
            </button>

            {/* Team/Sharing Card */}
            <button
              onClick={() => handleNavigateToProject('/sharing')}
              className="p-2 bg-base-200 rounded-lg border-thick hover:bg-base-300 transition-colors text-left"
            >
              <div className="text-xs font-semibold text-base-content mb-1">👥 Team</div>
              <div className="text-xs text-base-content/60">
                {info.team?.members ? `${info.team.members} member${info.team.members !== 1 ? 's' : ''}` : 'Just you'}
              </div>
            </button>
          </div>

          {/* Timeline - Compact */}
          {info.timeline && (
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="flex justify-between text-xs">
                <div className="text-base-content/60">
                  Created <span className="text-base-content/80">{info.timeline.daysSinceCreated}d ago</span>
                </div>
                <div className="text-base-content/60">
                  Updated <span className="text-base-content/80">{info.timeline.daysSinceUpdated}d ago</span>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Render /today command data
    if (response.data.overdue !== undefined || response.data.dueToday !== undefined) {
      const today = response.data;
      return (
        <div className="mt-3 space-y-3">
          {/* Stats Summary */}
          {today.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 bg-base-200 rounded-lg border-thick text-center">
                <div className="text-xl font-bold text-base-content">{today.stats.totalOverdue}</div>
                <div className="text-xs text-base-content/60">Overdue</div>
              </div>
              <div className="p-2 bg-base-200 rounded-lg border-thick text-center">
                <div className="text-xl font-bold text-base-content">{today.stats.totalDueToday}</div>
                <div className="text-xs text-base-content/60">Due Today</div>
              </div>
              <div className="p-2 bg-base-200 rounded-lg border-thick text-center">
                <div className="text-xl font-bold text-base-content">{today.stats.totalActivity || 0}</div>
                <div className="text-xs text-base-content/60">Activities</div>
              </div>
              <div className="p-2 bg-base-200 rounded-lg border-thick text-center">
                <div className="text-xl font-bold text-base-content">{(today.stats.totalOverdue || 0) + (today.stats.totalDueToday || 0)}</div>
                <div className="text-xs text-base-content/60">Total</div>
              </div>
            </div>
          )}

          {/* Overdue Tasks */}
          {today.overdue && today.overdue.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-base-content">🚨 Overdue ({today.overdue.length})</div>
              <div className="space-y-1">
                {today.overdue.map((todo: any, idx: number) => (
                  <div key={idx} className="p-2 bg-base-200 rounded-lg border-thick">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-base-content/80 break-words">{todo.title}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {todo.priority && (
                            <span className={`badge badge-xs ${
                              todo.priority === 'high' ? 'badge-error' :
                              todo.priority === 'medium' ? 'badge-warning' :
                              'badge-info'
                            }`}>
                              {todo.priority}
                            </span>
                          )}
                          {todo.dueDate && (
                            <span className="text-xs text-base-content/60">
                              📅 {new Date(todo.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due Today */}
          {today.dueToday && today.dueToday.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-base-content">⏰ Due Today ({today.dueToday.length})</div>
              <div className="space-y-1">
                {today.dueToday.map((todo: any, idx: number) => (
                  <div key={idx} className="p-2 bg-base-200 rounded-lg border-thick">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-base-content/80 break-words">{todo.title}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {todo.priority && (
                            <span className={`badge badge-xs ${
                              todo.priority === 'high' ? 'badge-error' :
                              todo.priority === 'medium' ? 'badge-warning' :
                              'badge-info'
                            }`}>
                              {todo.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {today.activity && today.activity.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-base-content">📝 Recent Activity</div>
              <div className="space-y-1">
                {today.activity.slice(0, 3).map((item: any, idx: number) => (
                  <div key={idx} className="p-2 bg-base-200 rounded-lg border-thick">
                    <div className="text-xs text-base-content/70 break-words">{item.title || item.summary || item.entry}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No tasks message */}
          {(!today.overdue || today.overdue.length === 0) && (!today.dueToday || today.dueToday.length === 0) && (
            <div className="p-4 bg-base-200 rounded-lg border-thick text-center">
              <div className="text-2xl mb-2">🎉</div>
              <div className="text-sm font-semibold text-base-content">All caught up!</div>
              <div className="text-xs text-base-content/60 mt-1">No tasks due today</div>
            </div>
          )}
        </div>
      );
    }

    // Render /week command data
    if (response.data.upcomingTodos !== undefined) {
      const week = response.data;
      return (
        <div className="mt-3 space-y-3">
          {/* Stats Summary */}
          {week.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 bg-base-200 rounded-lg border-thick text-center">
                <div className="text-xl font-bold text-base-content">{week.stats.totalUpcoming}</div>
                <div className="text-xs text-base-content/60">Upcoming</div>
              </div>
              <div className="p-2 bg-base-200 rounded-lg border-thick text-center">
                <div className="text-xl font-bold text-base-content">{week.stats.totalCompleted}</div>
                <div className="text-xs text-base-content/60">Completed</div>
              </div>
              <div className="p-2 bg-base-200 rounded-lg border-thick text-center">
                <div className="text-xl font-bold text-base-content">{week.stats.totalActivity || 0}</div>
                <div className="text-xs text-base-content/60">Activities</div>
              </div>
              <div className="p-2 bg-base-200 rounded-lg border-thick text-center">
                <div className="text-xl font-bold text-base-content">{(week.stats.totalUpcoming || 0) + (week.stats.totalCompleted || 0)}</div>
                <div className="text-xs text-base-content/60">Total</div>
              </div>
            </div>
          )}

          {/* Upcoming Tasks by Day */}
          {week.upcomingTodos && Object.keys(week.upcomingTodos).length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-base-content">📅 Upcoming This Week</div>
              {Object.entries(week.upcomingTodos).map(([day, todos]: [string, any]) => (
                <div key={day} className="space-y-1">
                  <div className="text-xs font-semibold text-base-content/70 capitalize">{day}</div>
                  <div className="space-y-1 ml-2">
                    {todos.map((todo: any, idx: number) => (
                      <div key={idx} className="p-2 bg-base-200 rounded-lg border-thick">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-base-content/80 break-words">{todo.title}</div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {todo.priority && (
                                <span className={`badge badge-xs ${
                                  todo.priority === 'high' ? 'badge-error' :
                                  todo.priority === 'medium' ? 'badge-warning' :
                                  'badge-info'
                                }`}>
                                  {todo.priority}
                                </span>
                              )}
                              {todo.dueDate && (
                                <span className="text-xs text-base-content/60">
                                  📅 {new Date(todo.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed This Week */}
          {week.completedThisWeek && week.completedThisWeek.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-base-content">✅ Completed This Week ({week.completedThisWeek.length})</div>
              <div className="space-y-1">
                {week.completedThisWeek.slice(0, 5).map((todo: any, idx: number) => (
                  <div key={idx} className="p-2 bg-base-200 rounded-lg border-thick">
                    <div className="text-sm text-base-content/70 line-through break-words">{todo.title}</div>
                  </div>
                ))}
                {week.completedThisWeek.length > 5 && (
                  <div className="text-xs text-base-content/60 text-center">
                    + {week.completedThisWeek.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No upcoming tasks */}
          {(!week.upcomingTodos || Object.keys(week.upcomingTodos).length === 0) && (
            <div className="p-4 bg-base-200 rounded-lg border-thick text-center">
              <div className="text-sm text-base-content/60">No upcoming tasks this week</div>
            </div>
          )}
        </div>
      );
    }

    // Render /standup command data
    if (response.data.yesterday && response.data.today) {
      const standup = response.data;
      return (
        <div className="mt-3 space-y-3">
          {/* Stats Summary */}
          {standup.stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              <div className="p-2 bg-base-200 rounded-lg border-thick text-center">
                <div className="text-xl font-bold text-base-content">{standup.stats.completedYesterday}</div>
                <div className="text-xs text-base-content/60">Yesterday</div>
              </div>
              <div className="p-2 bg-base-200 rounded-lg border-thick text-center">
                <div className="text-xl font-bold text-base-content">{standup.stats.tasksToday}</div>
                <div className="text-xs text-base-content/60">Today</div>
              </div>
              <div className="p-2 bg-base-200 rounded-lg border-thick text-center">
                <div className="text-xl font-bold text-base-content">{standup.stats.stuckOn}</div>
                <div className="text-xs text-base-content/60">Stuck on</div>
              </div>
            </div>
          )}

          {/* Yesterday Section */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-base-content">✅ What I did yesterday</div>
            {standup.yesterday.completed && standup.yesterday.completed.length > 0 ? (
              <div className="space-y-1">
                {standup.yesterday.completed.map((todo: any, idx: number) => (
                  <div key={idx} className="p-2 bg-base-200 rounded-lg border-thick">
                    <div className="text-sm text-base-content/70 break-words">{todo.title}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2 bg-base-200 rounded-lg border-thick text-xs text-base-content/60">
                No tasks completed yesterday
              </div>
            )}
            {standup.yesterday.activity && standup.yesterday.activity.length > 0 && (
              <div className="space-y-1 mt-2">
                <div className="text-xs text-base-content/60">Activity:</div>
                {standup.yesterday.activity.slice(0, 2).map((item: any, idx: number) => (
                  <div key={idx} className="p-2 bg-base-200 rounded-lg border-thick">
                    <div className="text-xs text-base-content/70 break-words">{item.summary || item.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today Section */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-base-content">🎯 What I'm working on today</div>
            {standup.today.tasks && standup.today.tasks.length > 0 ? (
              <div className="space-y-1">
                {standup.today.tasks.map((todo: any, idx: number) => (
                  <div key={idx} className="p-2 bg-base-200 rounded-lg border-thick">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-base-content/80 break-words">{todo.title}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {todo.priority && (
                            <span className={`badge badge-xs ${
                              todo.priority === 'high' ? 'badge-error' :
                              todo.priority === 'medium' ? 'badge-warning' :
                              'badge-info'
                            }`}>
                              {todo.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2 bg-base-200 rounded-lg border-thick text-xs text-base-content/60">
                No tasks due today
              </div>
            )}
          </div>

          {/* Stuck On Section */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-base-content">🤔 What I'm stuck on</div>
            {standup.stuckOn && standup.stuckOn.length > 0 ? (
              <div className="space-y-1">
                {standup.stuckOn.map((todo: any, idx: number) => (
                  <div key={idx} className="p-2 bg-base-200 rounded-lg border-thick">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-base-content/80 break-words">{todo.title}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {todo.priority && (
                            <span className="badge badge-xs badge-error">{todo.priority}</span>
                          )}
                          {todo.dueDate && (
                            <span className="text-xs text-base-content/60">
                              📅 {new Date(todo.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2 bg-base-200 rounded-lg border-thick text-xs text-base-content/60 text-center">
                Nothing stuck! 🎉
              </div>
            )}
          </div>
        </div>
      );
    }

    // Render relationships list
    if (response.data.component && response.data.relationships && Array.isArray(response.data.relationships)) {
      const { component, relationships } = response.data;
      return (
        <div className="mt-3 space-y-2">
          <div className="text-xs text-base-content/60 mb-2">
            Showing relationships for: <span className="font-semibold">{component.title}</span> ({component.category})
          </div>
          {relationships.length > 0 ? (
            <div className="space-y-1">
              {relationships.map((rel: any, index: number) => (
                <button
                  key={rel.id || index}
                  onClick={() => onCommandClick?.(`/edit relationship "${component.title}" "${rel.target?.title || 'Unknown'}"`)}
                  className="w-full text-left p-2 bg-base-200 rounded-lg border-thick hover:bg-primary/10 hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base-content/50 flex-shrink-0">→</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-base-content/80 break-words">
                        <span className="font-semibold">{rel.target?.title || 'Unknown'}</span>
                        {rel.target?.category && (
                          <span className="text-base-content/60 ml-2">({rel.target.category})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="badge badge-xs badge-ghost">{rel.relationType}</span>
                        {rel.description && (
                          <span className="text-xs text-base-content/60">{rel.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-2 bg-base-200 rounded-lg border-thick text-xs text-base-content/60 text-center">
              No relationships found
            </div>
          )}
          <button
            onClick={() => navigate('/features')}
            className="btn-primary-sm gap-2 border-thick"
            style={{ color: getContrastTextColor('primary') }}
          >
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            Go to Features
          </button>
        </div>
      );
    }

    // Generic data rendering - show nicely formatted data like EditWizard
    // Check if it's success response with simple object data (not arrays)
    // Don't show data for PROMPT responses (like confirmation prompts) - just show the message
    if (response.type === 'success' && response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
      const entries = Object.entries(response.data).filter(([key]) => !key.includes('_temp'));
      if (entries.length > 0) {
        const formatValue = (value: any): string => {
          if (value === null || value === undefined) return 'N/A';
          if (typeof value === 'object') {
            if (Array.isArray(value)) {
              return value.length > 0 ? `[${value.length} items]` : '[]';
            }
            return JSON.stringify(value, null, 2);
          }
          const stringValue = String(value);
          return stringValue.slice(0, 100) + (stringValue.length > 100 ? '...' : '');
        };

        return (
          <div className="mt-3 p-4 bg-base-200 rounded-lg border-thick text-left">
            <div className="text-xs font-semibold text-base-content/60 mb-2">Details:</div>
            <div className="space-y-1">
              {entries.map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                  <span className="text-base-content/80 whitespace-pre-wrap break-words">{formatValue(value)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }
    }

    // Don't render data for PROMPT responses (confirmation prompts, etc.) - message is sufficient
    if (response.type === 'prompt') {
      return null;
    }

    // Fallback: raw JSON for complex data
    return (
      <div className="mt-3 p-3 bg-base-200 rounded-lg border-thick overflow-x-auto">
        <pre className="text-xs text-base-content/80 whitespace-pre-wrap break-words">
          {JSON.stringify(response.data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Command echo */}
      <div className="inline-flex items-start gap-2 mb-2 border-thick p-2 rounded-lg bg-base-200 ">
        <div className="text-xs text-base-content/80 font-mono font-semibold flex-shrink-0">
          {timestamp.toLocaleTimeString()}
        </div>
        <div className="text-xs text-base-content/80 font-mono font-semibold flex-shrink-0">$</div>
        <code className="text-xs font-mono font-semibold text-base-content/80 flex-1 break-all">{command}</code>
      </div>

      {/* Response */}
      <div className="bg-base-100 p-4 rounded-lg border-thick">
        <div className="w-full">
          <div className="flex items-start gap-2">
            <span className="mr-2 text-xl flex-shrink-0 bg-base-200 p-2 rounded-lg border-thick">{getIcon()}</span>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold bg-base-200 p-2 rounded-lg border-thick break-words">{response.message}</div>

              {/* Render data */}
              {renderData()}

              {/* Success actions - add CTA for successful operations */}
              {response.type === 'success' && response.metadata?.projectId && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {/* Show specific button based on command type */}
                  {command.toLowerCase().includes('add todo') || command.toLowerCase().includes('edit todo') ||
                   command.toLowerCase().includes('delete todo') || command.toLowerCase().includes('complete') ||
                   command.toLowerCase().includes('priority') || command.toLowerCase().includes('assign') ||
                   command.toLowerCase().includes('due') || (command.toLowerCase().includes('todo') && !command.toLowerCase().includes('view')) ? (
                    <button 
                      onClick={() => handleNavigateToProject('/notes?section=todos')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      View Todos
                    </button>
                  ) : command.toLowerCase().includes('subtask') ? (
                    <button
                      onClick={() => handleNavigateToProject('/notes?section=todos')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      View Todos
                    </button>
                  ) : command.toLowerCase().includes('add note') || command.toLowerCase().includes('edit note') ||
                     command.toLowerCase().includes('delete note') || command.toLowerCase().includes('note') ? (
                    <button
                      onClick={() => handleNavigateToProject('/notes?section=notes')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View Notes
                    </button>
                  ) : command.toLowerCase().includes('add devlog') || command.toLowerCase().includes('edit devlog') ||
                     command.toLowerCase().includes('delete devlog') || command.toLowerCase().includes('devlog') || command.toLowerCase().includes('push') ? (
                    <button
                      onClick={() => handleNavigateToProject('/notes?section=devlog')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      View Dev Log
                    </button>
                  ) : command.toLowerCase().includes('add doc') || command.toLowerCase().includes('edit doc') ||
                     command.toLowerCase().includes('delete doc') || (command.toLowerCase().includes('doc') && !command.toLowerCase().includes('view')) ? (
                    <button
                      onClick={() => handleNavigateToProject('/features')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View Docs
                    </button>
                  ) : command.toLowerCase().includes('add tech') || command.toLowerCase().includes('add package') ||
                     command.toLowerCase().includes('tech') || command.toLowerCase().includes('pkg') ||
                     command.toLowerCase().includes('remove tech') || command.toLowerCase().includes('remove package') ? (
                    <button
                      onClick={() => handleNavigateToProject('/stack')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      View Stack
                    </button>
                  ) : command.toLowerCase().includes('delete component') || command.toLowerCase().includes('add component') || command.toLowerCase().includes('edit component') ? (
                    <button
                      onClick={() => handleNavigateToProject('/features')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      View Features
                    </button>
                  ) : command.toLowerCase().includes('set deployment') ? (
                    <button
                      onClick={() => handleNavigateToProject('/deployment')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      View Deployment
                    </button>
                  ) : command.toLowerCase().includes('set name') || command.toLowerCase().includes('set description') || command.toLowerCase().includes('set tags') ? (
                    <button
                      onClick={() => handleNavigateToProject('/settings')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      View Settings
                    </button>
                  ) : command.toLowerCase().includes('set public') ? (
                    <button
                      onClick={() => handleNavigateToProject('/public')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      View Public
                    </button>
                  ) : command.toLowerCase().includes('add stack') || command.toLowerCase().includes('remove stack') || command.toLowerCase().includes('edit stack') ? (
                    <button
                      onClick={() => handleNavigateToProject('/stack')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      View Stack
                    </button>
                  ) : command.toLowerCase().includes('add relationship') || command.toLowerCase().includes('edit relationship') || command.toLowerCase().includes('delete relationship') ? (
                    <button
                      onClick={() => handleNavigateToProject('/features')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      View Components
                    </button>
                  ) : (
                    <button
                      onClick={() => handleNavigateToProject('/notes')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Project
                    </button>
                  )}
                </div>
              )}

              {/* Data type actions - buttons for data views */}
              {response.type === 'data' && response.metadata?.action === 'view_news' && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  <button
                    onClick={() => navigate('/news')}
                    className="btn-primary-sm gap-2 border-thick"
                    style={{ color: getContrastTextColor('primary') }}
                  >
                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    Go to News
                  </button>
                </div>
              )}

              {/* Suggestions */}
              {response.suggestions && response.suggestions.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs font-semibold text-base-content/70">
                    Suggestions:
                  </div>
                  {response.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onCommandClick?.(generateTemplate(suggestion))}
                      className="block w-full text-left text-xs bg-base-200 px-2 py-1 rounded hover:bg-base-300/50 cursor-pointer transition-colors border-thick text-base-content/80"
                      title="Click to use this suggestion"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Metadata */}
              {response.metadata && (
                <div className="mt-2">
                  {response.metadata.projectName && (
                    <span className="inline-block text-xs bg-base-200 px-3 py-1.5 rounded-lg border-thick text-base-content/80">
                      <span className="font-semibold">Project:</span> {response.metadata.projectName}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandResponse;
