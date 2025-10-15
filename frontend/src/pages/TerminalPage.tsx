import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import TerminalInput from '../components/TerminalInput';
import CommandResponse from '../components/CommandResponse';
import { terminalAPI, CommandResponse as CommandResponseType } from '../api/terminal';
import { authAPI } from '../api';
import { hexToOklch, oklchToCssValue, generateFocusVariant, generateContrastingTextColor } from '../utils/colorUtils';

interface ContextType {
  user: { id: string; email: string; firstName: string; lastName: string } | null;
  currentProjectId?: string;
  onProjectSwitch?: (projectId: string) => Promise<void>;
}

interface TerminalEntry {
  id: string;
  command: string;
  response: CommandResponseType;
  timestamp: Date;
}

// Storage configuration
const TERMINAL_ENTRIES_KEY = 'terminal_entries';
const MAX_ENTRIES = 20;

// Helper functions for localStorage
const saveEntriesToStorage = (entries: TerminalEntry[]) => {
  try {
    // Cap at MAX_ENTRIES (keep most recent)
    const entriesToSave = entries.slice(-MAX_ENTRIES);

    // Convert dates to ISO strings and strip side-effect data for JSON serialization
    const serialized = entriesToSave.map(entry => {
      // Remove redirect data to prevent re-triggering navigation on load
      const cleanResponse = { ...entry.response };
      if (cleanResponse.data) {
        const { redirect, successRedirect, ...cleanData } = cleanResponse.data;
        cleanResponse.data = cleanData;
      }

      return {
        ...entry,
        response: cleanResponse,
        timestamp: entry.timestamp.toISOString()
      };
    });

    localStorage.setItem(TERMINAL_ENTRIES_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.warn('Failed to save terminal entries to localStorage:', error);
  }
};

const loadEntriesFromStorage = (): TerminalEntry[] => {
  try {
    const stored = localStorage.getItem(TERMINAL_ENTRIES_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    // Convert ISO strings back to Date objects
    return parsed.map((entry: any) => ({
      ...entry,
      timestamp: new Date(entry.timestamp)
    }));
  } catch (error) {
    console.warn('Failed to load terminal entries from localStorage:', error);
    return [];
  }
};

const TerminalPage: React.FC = () => {
  const { currentProjectId, onProjectSwitch } = useOutletContext<ContextType>();
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showCommands, setShowCommands] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalOutputRef = useRef<HTMLDivElement>(null);

  // Load entries from localStorage on mount
  useEffect(() => {
    const loadedEntries = loadEntriesFromStorage();
    if (loadedEntries.length > 0) {
      setEntries(loadedEntries);
      setShowWelcome(false);
    }
  }, []);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const handleCommandSubmit = async (command: string) => {
    setShowWelcome(false);
    setIsExecuting(true);

    try {
      const response = await terminalAPI.executeCommand(command, currentProjectId);

      const newEntry: TerminalEntry = {
        id: Date.now().toString(),
        command,
        response,
        timestamp: new Date()
      };

      setEntries(prev => {
        const updated = [...prev, newEntry];
        saveEntriesToStorage(updated);
        return updated;
      });

      // Handle project swap
      if (response.type === 'success' && response.data?.project && onProjectSwitch) {
        // Switch the selected project in Layout without navigating away
        setTimeout(async () => {
          await onProjectSwitch(response.data.project.id);
        }, 500);
      }
    } catch (error: any) {
      console.error('Terminal command error:', error);

      // Check if it's an authentication error
      if (error.response?.status === 401) {
        const errorEntry: TerminalEntry = {
          id: Date.now().toString(),
          command,
          response: {
            type: 'error',
            message: '🔒 Authentication required. Please refresh the page and log in again.',
            suggestions: []
          },
          timestamp: new Date()
        };
        setEntries(prev => {
          const updated = [...prev, errorEntry];
          saveEntriesToStorage(updated);
          return updated;
        });
      } else {
        const errorEntry: TerminalEntry = {
          id: Date.now().toString(),
          command,
          response: {
            type: 'error',
            message: error.response?.data?.message || `Failed to execute command: ${error.message}`,
            suggestions: ['/help']
          },
          timestamp: new Date()
        };
        setEntries(prev => {
          const updated = [...prev, errorEntry];
          saveEntriesToStorage(updated);
          return updated;
        });
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const handleProjectSelect = async (projectId: string) => {
    if (onProjectSwitch) {
      await onProjectSwitch(projectId);
    }
  };

  const handleClearTerminal = () => {
    setEntries([]);
    setShowWelcome(true);
    try {
      localStorage.removeItem(TERMINAL_ENTRIES_KEY);
    } catch (error) {
      console.warn('Failed to clear terminal entries from localStorage:', error);
    }
  };

  const handleScrollToTop = () => {
    if (terminalOutputRef.current) {
      terminalOutputRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCommandClick = (command: string) => {
    setPendingCommand(command);
  };

  const handleDirectThemeChange = async (themeName: string) => {
    try {
      // Execute the theme change command
      const response = await terminalAPI.executeCommand(`/set theme ${themeName}`, currentProjectId);

      // Apply the theme directly
      if (response.data?.theme) {
        const theme = response.data.theme;

        // Clear any existing custom theme CSS first
        const existingStyle = document.getElementById('custom-theme-style');
        if (existingStyle) {
          existingStyle.remove();
        }

        // Update theme in database
        await authAPI.updateTheme(theme);

        // Apply theme to document
        if (theme.startsWith('custom-')) {
          // It's a custom theme, need to load and apply it
          const themeId = theme.replace('custom-', '');
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
        } else {
          // Standard theme - just set the attribute
          document.documentElement.setAttribute('data-theme', theme);
        }

        // Update localStorage
        localStorage.setItem('theme', theme);
      }
    } catch (error) {
      console.error('Failed to change theme:', error);
    }
  };

  const applyCustomTheme = (theme: any) => {
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
  };

  return (
    <div className="flex flex-col h-full">
      {/* Terminal Output - Scrollable */}
      <div ref={terminalOutputRef} className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3 font-mono text-sm">
        {/* Welcome Message */}
        {showWelcome && (
          <div className="animate-fade-in">
            <div className="bg-base-100 p-4 rounded-lg border-thick">
              <div className="flex items-start gap-2">
                <span className="text-xl flex-shrink-0 bg-base-200 p-2 rounded-lg border-thick">💻</span>
                <div className="flex-1 min-w-0">
                  <div className="ml-1 text-lg font-semibold bg-base-200 p-2 rounded-lg border-thick break-words mb-3">
                    Welcome to the Terminal!
                  </div>

                  <p className="text-sm text-base-content/70 mb-3 ml-1">
                    Execute commands to manage your projects. Type <code className="px-1.5 py-0.5 bg-base-200 rounded text-xs text-primary">/help</code> for all available commands.
                  </p>

                  {/* Command Syntax Guide */}
                  <div className="mt-3 mb-3 p-3 bg-base-200/50 rounded-lg border-thick">
                    <div className="space-y-2 text-xs text-base-content/70">
                      <div>
                        <span className="font-semibold text-primary">/ </span>
                        <span>All commands start with a forward slash</span>
                        <div className="text-xs text-base-content/60 mt-1 ml-3">
                          Example: <code className="bg-base-200 px-1 rounded text-primary">/add todo</code>, <code className="bg-base-200 px-1 rounded text-primary">/view notes</code>
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-primary">@project </span>
                        <span>Reference projects using @ (supports spaces in names)</span>
                        <div className="text-xs text-base-content/60 mt-1 ml-3">
                          Example: <code className="bg-base-200 px-1 rounded text-primary">@MyProject</code>, <code className="bg-base-200 px-1 rounded text-primary">@My Cool Project</code>
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-primary">--flag </span>
                        <span>Use flags to add options to commands</span>
                        <div className="text-xs text-base-content/60 mt-1 ml-3">
                          Example: <code className="bg-base-200 px-1 rounded text-primary">--category=web</code>, <code className="bg-base-200 px-1 rounded text-primary">--role=editor</code>
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-primary">&& </span>
                        <span>Chain multiple commands together (executes sequentially)</span>
                        <div className="text-xs text-base-content/60 mt-1 ml-3">
                          Example: <code className="bg-base-200 px-1 rounded text-primary">/add todo task && /view todos</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-3 mb-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setPendingCommand('/wizard new')}
                        className="btn btn-xs btn-outline btn-primary border-2 hover:border-primary"
                      >
                        <span className='font-bold'>🧙 New Project</span>
                      </button>
                      <button
                        onClick={() => setPendingCommand('/info')}
                        className="btn btn-xs btn-outline btn-primary border-2 hover:border-primary"
                      >
                        <span className='font-bold'>ℹ️ Project Info</span>
                      </button>
                      <button
                        onClick={() => setPendingCommand('/today')}
                        className="btn btn-xs btn-outline btn-primary border-2 hover:border-primary"
                      >
                        <span className='font-bold'>📅 Today</span>
                      </button>
                      <button
                        onClick={() => setPendingCommand('/view todos')}
                        className="btn btn-xs btn-outline btn-primary border-2 hover:border-primary"
                      >
                        <span className='font-bold'>✅ Todos</span>
                      </button>
                      <button
                        onClick={() => setPendingCommand('/view notes')}
                        className="btn btn-xs btn-outline btn-primary border-2 hover:border-primary"
                      >
                        <span className='font-bold'>📝 Notes</span>
                      </button>
                      <button
                        onClick={() => setPendingCommand('/swap')}
                        className="btn btn-xs btn-outline btn-primary border-2 hover:border-primary"
                      >
                        <span className='font-bold'>🔄 Switch</span>
                      </button>
                      <button
                        onClick={() => setPendingCommand('/help')}
                        className="btn btn-xs btn-outline btn-primary border-2 hover:border-primary"
                      >
                        <span className='font-bold'>📚 Help</span>
                      </button>
                    </div>
                  </div>

                  {/* Common Commands - Collapsible */}
                  <div className="mt-3 border-thick rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowCommands(!showCommands)}
                      className="w-full text-left p-3 flex items-center justify-between bg-base-200 hover:bg-base-300/50 transition-colors"
                    >
                      <div className="text-sm font-semibold text-base-content">
                        Common Commands (10)
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform ${showCommands ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showCommands && (
                      <div className="px-3 pb-3 bg-base-100">
                        <div className="overflow-x-auto">
                          <table className="table table-xs table-zebra">
                            <thead>
                              <tr>
                                <th className="text-xs">Command</th>
                                <th className="text-xs">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover">
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => setPendingCommand('/wizard new')}
                                    className="text-xs text-primary font-mono bg-base-100 px-1.5 py-0.5 rounded hover:border-primary border-thick transition-colors cursor-pointer"
                                  >
                                    /wizard new
                                  </button>
                                </td>
                                <td className="text-xs text-base-content/70">Create a new project (interactive)</td>
                              </tr>
                              <tr className="hover">
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => setPendingCommand('/info')}
                                    className="text-xs text-primary font-mono bg-base-100 px-1.5 py-0.5 rounded hover:border-primary border-thick transition-colors cursor-pointer"
                                  >
                                    /info
                                  </button>
                                </td>
                                <td className="text-xs text-base-content/70">Quick project overview & stats</td>
                              </tr>
                              <tr className="hover">
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => setPendingCommand('/today')}
                                    className="text-xs text-primary font-mono bg-base-100 px-1.5 py-0.5 rounded hover:border-primary border-thick transition-colors cursor-pointer"
                                  >
                                    /today
                                  </button>
                                </td>
                                <td className="text-xs text-base-content/70">Show today's tasks & activity</td>
                              </tr>
                              <tr className="hover">
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => setPendingCommand('/week')}
                                    className="text-xs text-primary font-mono bg-base-100 px-1.5 py-0.5 rounded hover:border-primary border-thick transition-colors cursor-pointer"
                                  >
                                    /week
                                  </button>
                                </td>
                                <td className="text-xs text-base-content/70">Weekly summary & planning</td>
                              </tr>
                              <tr className="hover">
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => setPendingCommand('/standup')}
                                    className="text-xs text-primary font-mono bg-base-100 px-1.5 py-0.5 rounded hover:border-primary border-thick transition-colors cursor-pointer"
                                  >
                                    /standup
                                  </button>
                                </td>
                                <td className="text-xs text-base-content/70">Generate standup report</td>
                              </tr>
                              <tr className="hover">
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => setPendingCommand('/add todo ')}
                                    className="text-xs text-primary font-mono bg-base-100 px-1.5 py-0.5 rounded hover:border-primary border-thick transition-colors cursor-pointer"
                                  >
                                    /add todo [text]
                                  </button>
                                </td>
                                <td className="text-xs text-base-content/70">Create a new todo item</td>
                              </tr>
                              <tr className="hover">
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => setPendingCommand('/add note ')}
                                    className="text-xs text-primary font-mono bg-base-100 px-1.5 py-0.5 rounded hover:border-primary border-thick transition-colors cursor-pointer"
                                  >
                                    /add note [text]
                                  </button>
                                </td>
                                <td className="text-xs text-base-content/70">Create a new note</td>
                              </tr>
                              <tr className="hover">
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => setPendingCommand('/view stack')}
                                    className="text-xs text-primary font-mono bg-base-100 px-1.5 py-0.5 rounded hover:border-primary border-thick transition-colors cursor-pointer"
                                  >
                                    /view stack
                                  </button>
                                </td>
                                <td className="text-xs text-base-content/70">View tech stack & packages</td>
                              </tr>
                              <tr className="hover">
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => setPendingCommand('/search ')}
                                    className="text-xs text-primary font-mono bg-base-100 px-1.5 py-0.5 rounded hover:border-primary border-thick transition-colors cursor-pointer"
                                  >
                                    /search [query]
                                  </button>
                                </td>
                                <td className="text-xs text-base-content/70">Search across all content</td>
                              </tr>
                              <tr className="hover">
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => setPendingCommand('/swap @')}
                                    className="text-xs text-primary font-mono bg-base-100 px-1.5 py-0.5 rounded hover:border-primary border-thick transition-colors cursor-pointer"
                                  >
                                    /swap @[project]
                                  </button>
                                </td>
                                <td className="text-xs text-base-content/70">Switch to a different project</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-base-content/60 ml-1">
                    💡 Tip: Use <code className="bg-base-200 px-1 rounded">@projectname</code> to specify a project, or omit it to use the current project
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Command History */}
        {entries.map(entry => (
          <CommandResponse
            key={entry.id}
            response={entry.response}
            command={entry.command}
            timestamp={entry.timestamp}
            onProjectSelect={handleProjectSelect}
            currentProjectId={currentProjectId}
            onCommandClick={handleCommandClick}
            onDirectThemeChange={handleDirectThemeChange}
          />
        ))}

        {/* Loading indicator */}
        {isExecuting && (
          <div className="flex items-center gap-2 text-base-content/70 animate-pulse">
            <div className="loading loading-spinner loading-sm text-primary"></div>
            <span className="text-xs">Executing...</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Input Area - Compact */}
      <div className="flex-shrink-0 p-2 border-t-2 border-base-content/20 bg-base-200">
        <TerminalInput
          onSubmit={handleCommandSubmit}
          disabled={isExecuting}
          currentProjectId={currentProjectId}
          onScrollToTop={handleScrollToTop}
          onClear={handleClearTerminal}
          pendingCommand={pendingCommand}
          onCommandSet={() => setPendingCommand(null)}
        />
      </div>
    </div>
  );
};

export default TerminalPage;
