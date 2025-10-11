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

const TerminalPage: React.FC = () => {
  const { currentProjectId, onProjectSwitch } = useOutletContext<ContextType>();
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalOutputRef = useRef<HTMLDivElement>(null);

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

      setEntries(prev => [...prev, newEntry]);

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
        setEntries(prev => [...prev, errorEntry]);
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
        setEntries(prev => [...prev, errorEntry]);
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

                  {/* Quick Actions */}
                  <div className="mt-3 mb-3">
                    <div className="text-xs font-semibold text-base-content/70 mb-2 ml-1">Quick Actions:</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setPendingCommand('/help')}
                        className="btn btn-xs btn-outline btn-primary border-2 hover:border-primary"
                      >
                        <span className='font-bold'>📚 Help</span>
                      </button>
                      <button
                        onClick={() => setPendingCommand('/view themes')}
                        className="btn btn-xs btn-outline btn-primary border-2 hover:border-primary"
                      >
                        <span className='font-bold'>🎨 Themes</span>
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
                        onClick={() => setPendingCommand('/view news')}
                        className="btn btn-xs btn-outline btn-primary border-2 hover:border-primary"
                      >
                        <span className='font-bold'>📰 News</span>
                      </button>
                    </div>
                  </div>

                  {/* Common Commands */}
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-base-content/70 mb-1 ml-1">Common Commands:</div>
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
                                onClick={() => setPendingCommand('/view notes')}
                                className="text-xs text-primary font-mono bg-base-100 px-1.5 py-0.5 rounded hover:border-primary border-thick transition-colors cursor-pointer"
                              >
                                /view notes
                              </button>
                            </td>
                            <td className="text-xs text-base-content/70">List all notes</td>
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
