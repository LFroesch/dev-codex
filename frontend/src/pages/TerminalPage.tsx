import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import TerminalInput from '../components/TerminalInput';
import CommandResponse from '../components/CommandResponse';
import WelcomeScreen from '../components/WelcomeScreen';
import { terminalAPI, CommandResponse as CommandResponseType, AIAction, AIResponseData } from '../api/terminal';
import { authAPI } from '../api';
import { hexToOklch, oklchToCssValue, generateFocusVariant, generateContrastingTextColor } from '../utils/colorUtils';


interface ContextType {
  user: { id: string; email: string; firstName: string; lastName: string } | null;
  currentProjectId?: string;
  currentProjectName?: string;
  onProjectSwitch?: (projectId: string) => Promise<void>;
}

interface TerminalEntry {
  id: string;
  command: string;
  response: CommandResponseType;
  timestamp: Date;
  fromStorage?: boolean;
}

// Storage configuration
const TERMINAL_ENTRIES_KEY = 'terminal_entries';
const AI_SESSION_KEY = 'ai_session_id';
const MAX_ENTRIES = 50; // Make editable to change max stored entries


// Helper functions for localStorage
// Wizard entries should be stored in preview mode rather than wizard mode to avoid re-triggering the wizard on load
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
    // Ignore localStorage errors
  }
};

const loadEntriesFromStorage = (): TerminalEntry[] => {
  try {
    const stored = localStorage.getItem(TERMINAL_ENTRIES_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    // Convert ISO strings back to Date objects and mark as loaded from storage
    return parsed.map((entry: any) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
      fromStorage: true
    }));
  } catch (error) {
    return [];
  }
};

// Session persistence helpers
const saveSessionId = (id: string | null) => {
  try {
    if (id) {
      sessionStorage.setItem(AI_SESSION_KEY, id);
    } else {
      sessionStorage.removeItem(AI_SESSION_KEY);
    }
  } catch { /* ignore */ }
};

const loadSessionId = (): string | null => {
  try {
    return sessionStorage.getItem(AI_SESSION_KEY);
  } catch {
    return null;
  }
};

const TerminalPage: React.FC = () => {
  const { user, currentProjectId, currentProjectName, onProjectSwitch } = useOutletContext<ContextType>();
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [failedCommand, setFailedCommand] = useState<string | null>(null);
  const [aiSessionId, setAiSessionId] = useState<string | null>(loadSessionId);
  const [isAISession, setIsAISession] = useState(!!loadSessionId());
  const [streamingEntryId, setStreamingEntryId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [aiTurnCount, setAiTurnCount] = useState(0);
  const [lastTurnElapsed, setLastTurnElapsed] = useState<number | undefined>(undefined);
  const [sessionTokensUsed, setSessionTokensUsed] = useState(0);
  const [sessionModel, setSessionModel] = useState<string | undefined>(undefined);
  const [pendingNaturalInput, setPendingNaturalInput] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalOutputRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Persist session ID whenever it changes
  useEffect(() => {
    saveSessionId(aiSessionId);
  }, [aiSessionId]);

  // Load entries from localStorage on mount
  useEffect(() => {
    const loadedEntries = loadEntriesFromStorage();
    if (loadedEntries.length > 0) {
      setEntries(loadedEntries);
    }
  }, []);

  // Detect user scroll - if user scrolls up, disable auto-scroll
  useEffect(() => {
    const container = terminalOutputRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // If user is more than 100px from bottom, they've scrolled up
      const userHasScrolledUp = distanceFromBottom > 100;
      setIsUserScrolled(userHasScrolledUp);
      setShowScrollButton(userHasScrolledUp);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Smart auto-scroll: only scroll if user hasn't manually scrolled up
  useEffect(() => {
    if (!isUserScrolled && terminalEndRef.current) {
      // Use instant scroll for immediate feedback, smooth scroll feels laggy
      terminalEndRef.current.scrollIntoView({ behavior: 'instant', block: 'end' });
    }
  }, [entries, streamingText, isUserScrolled]);

  // ── Shared AI streaming helper ──────────────────────────────────────────

  const startAIStream = useCallback((
    command: string,
    projectId: string | undefined,
    mode?: string
  ) => {
    setIsExecuting(true);
    setStreamingText('');

    const entryId = crypto.randomUUID();
    const placeholderEntry: TerminalEntry = {
      id: entryId,
      command,
      response: {
        type: 'ai',
        message: '',
        data: {
          aiResponse: { message: '', actions: [], sessionId: aiSessionId || '', streaming: true },
        },
      },
      timestamp: new Date(),
    };

    setStreamingEntryId(entryId);
    setEntries(prev => [...prev, placeholderEntry]);

    const controller = terminalAPI.streamAIQuery(
      command,
      projectId,
      aiSessionId || undefined,
      // onChunk — accumulate streaming text for live display
      (text: string) => {
        setStreamingText(prev => prev + text);
      },
      // onDone
      (aiResponse: AIResponseData) => {
        setStreamingEntryId(null);
        setStreamingText('');

        // Only activate AI session if we got a real session back (not a tier gate/error)
        if (aiResponse.sessionId) {
          setAiSessionId(aiResponse.sessionId);
          setIsAISession(true);
        }

        // Track session stats
        setAiTurnCount(prev => prev + 1);
        if (aiResponse.elapsed) {
          setLastTurnElapsed(aiResponse.elapsed);
        }
        if (aiResponse.tokensUsed?.total) {
          setSessionTokensUsed(prev => prev + aiResponse.tokensUsed!.total);
        }
        if (aiResponse.model && !sessionModel) {
          setSessionModel(aiResponse.model);
        }

        // Replace placeholder with final response
        setEntries(prev => {
          const updated = prev.map(e =>
            e.id === entryId
              ? {
                  ...e,
                  response: {
                    type: 'ai' as const,
                    message: aiResponse.message,
                    data: { aiResponse },
                  },
                }
              : e
          );
          saveEntriesToStorage(updated);
          return updated;
        });

        setIsExecuting(false);
        abortControllerRef.current = null;
      },
      // onError
      (error: string) => {
        setStreamingEntryId(null);
        setStreamingText('');

        setEntries(prev => {
          const updated = prev.map(e =>
            e.id === entryId
              ? {
                  ...e,
                  response: {
                    type: 'error' as const,
                    message: `AI streaming failed: ${error}`,
                  },
                }
              : e
          );
          saveEntriesToStorage(updated);
          return updated;
        });

        setIsExecuting(false);
        abortControllerRef.current = null;
      },
      mode
    );
    abortControllerRef.current = controller;
  }, [aiSessionId, sessionModel]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleCommandSubmit = async (command: string) => {
    // Guard: don't start a new request while one is in flight
    if (isExecuting) return;

    const isSlash = command.trim().startsWith('/');
    const aiEnabled = !isSlash; // non-slash commands go to AI

    // Intercept: non-slash input with no project selected and no active AI session
    if (aiEnabled && !currentProjectId && !aiSessionId) {
      setPendingNaturalInput(command);

      // Add synthetic "pick a project" entry
      const pickEntry: TerminalEntry = {
        id: crypto.randomUUID(),
        command,
        response: {
          type: 'prompt' as const,
          message: 'Are we working on a new project, or an existing one?',
          data: { projectPicker: true },
        },
        timestamp: new Date(),
      };
      setEntries(prev => {
        const updated = [...prev, pickEntry];
        saveEntriesToStorage(updated);
        return updated;
      });
      return;
    }

    // For AI queries, use streaming
    if (aiEnabled) {
      startAIStream(command, currentProjectId);
      return;
    }

    // Slash commands — use existing non-streaming path
    setIsExecuting(true);

    try {
      const response = await terminalAPI.executeCommand(command, currentProjectId);

      // Handle /reset chat
      if (response.data?.resetChat) {
        resetAISessionState();
      }

      const newEntry: TerminalEntry = {
        id: crypto.randomUUID(),
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
        setTimeout(async () => {
          await onProjectSwitch(response.data.project.id);
        }, 500);
      }

      if (response.type === 'success' && response.data?.project) {
        window.dispatchEvent(new CustomEvent('refreshProject'));
      }
    } catch (error: any) {
      let errorMessage = 'Failed to execute command';
      let suggestions = ['/help'];
      let isNoProjectError = false;

      if (error.response?.status === 401) {
        errorMessage = '🔒 Authentication required. Please refresh the page and log in again.';
        suggestions = [];
      } else if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || error.response.data?.retryAfter || 'a moment';
        errorMessage = `⏱️ Rate limit exceeded. Please wait ${retryAfter} seconds.`;
        suggestions = [];
      } else if (!error.response && error.code === 'ECONNABORTED') {
        errorMessage = '⏱️ Request timed out. Try again in a moment.';
        suggestions = [];
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;

        if (errorMessage.toLowerCase().includes('project') &&
            (errorMessage.toLowerCase().includes('select') ||
             errorMessage.toLowerCase().includes('required') ||
             errorMessage.toLowerCase().includes('context'))) {
          isNoProjectError = true;
          setFailedCommand(command);
          setTimeout(() => handleCommandSubmit('/swap'), 500);
        }
      } else {
        errorMessage = `Failed to execute command: ${error.message}`;
      }

      const errorEntry: TerminalEntry = {
        id: crypto.randomUUID(),
        command,
        response: {
          type: 'error',
          message: errorMessage,
          suggestions: isNoProjectError ? [] : suggestions
        },
        timestamp: new Date()
      };

      setEntries(prev => {
        const updated = [...prev, errorEntry];
        saveEntriesToStorage(updated);
        return updated;
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleProjectSelect = async (projectId: string) => {
    if (onProjectSwitch) {
      await onProjectSwitch(projectId);

      // If there was a pending natural input (from project picker flow), fire it now
      if (pendingNaturalInput) {
        const msg = pendingNaturalInput;
        setPendingNaturalInput(null);
        setTimeout(() => handleCommandSubmit(msg), 300);
        return;
      }

      // If there was a failed command due to no project, retry it now
      if (failedCommand) {
        const commandToRetry = failedCommand;
        setFailedCommand(null);
        setTimeout(() => handleCommandSubmit(commandToRetry), 300);
      }
    }
  };

  const resetAISessionState = () => {
    setAiSessionId(null);
    setIsAISession(false);
    setAiTurnCount(0);
    setLastTurnElapsed(undefined);
    setSessionTokensUsed(0);
    setSessionModel(undefined);
  };

  const handleClearTerminal = () => {
    setEntries([]);
    resetAISessionState();
    setPendingNaturalInput(null);
    try {
      localStorage.removeItem(TERMINAL_ENTRIES_KEY);
    } catch (error) {
      // Ignore localStorage errors
    }
  };

  const handleNewChat = () => {
    resetAISessionState();
    // Add a visual separator in the terminal
    const separator: TerminalEntry = {
      id: crypto.randomUUID(),
      command: '',
      response: { type: 'info', message: '— New conversation started —' },
      timestamp: new Date(),
    };
    setEntries(prev => {
      const updated = [...prev, separator];
      saveEntriesToStorage(updated);
      return updated;
    });
  };

  const handleEndChat = () => {
    // End chat clears session + tells backend via /reset
    resetAISessionState();
    terminalAPI.executeCommand('/reset', currentProjectId).catch(() => {});
    const separator: TerminalEntry = {
      id: crypto.randomUUID(),
      command: '',
      response: { type: 'info', message: '— Conversation ended —' },
      timestamp: new Date(),
    };
    setEntries(prev => {
      const updated = [...prev, separator];
      saveEntriesToStorage(updated);
      return updated;
    });
  };

  const handleScrollToTop = () => {
    if (terminalOutputRef.current) {
      terminalOutputRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScrollToBottom = () => {
    setIsUserScrolled(false); // Re-enable auto-scroll
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const handleCommandClick = (command: string) => {
    setPendingCommand(command);
  };

  // Project picker handlers for no-project AI flow
  const handleProjectPickForAI = async (projectId: string) => {
    if (onProjectSwitch) {
      await onProjectSwitch(projectId);
    }
    // Fire the stored natural input to AI with the selected project context
    if (pendingNaturalInput) {
      const msg = pendingNaturalInput;
      setPendingNaturalInput(null);
      // Small delay for project switch to settle
      setTimeout(() => handleCommandSubmit(msg), 300);
    }
  };

  const handleNewProjectAI = () => {
    if (pendingNaturalInput) {
      const msg = pendingNaturalInput;
      setPendingNaturalInput(null);
      startAIStream(msg, undefined, 'NEW_PROJECT');
    }
  };

  const handleAIConfirm = async (actions: AIAction[]) => {
    try {
      const response = await terminalAPI.confirmAIActions(actions, currentProjectId);
      const confirmEntry: TerminalEntry = {
        id: crypto.randomUUID(),
        command: `AI: Confirmed ${actions.length} action${actions.length !== 1 ? 's' : ''}`,
        response,
        timestamp: new Date()
      };
      setEntries(prev => {
        const updated = [...prev, confirmEntry];
        saveEntriesToStorage(updated);
        return updated;
      });

      // Refresh project data if actions modified it
      if (response.data?.refreshProject) {
        window.dispatchEvent(new CustomEvent('refreshProject'));
      }
    } catch (error: any) {
      const errorEntry: TerminalEntry = {
        id: crypto.randomUUID(),
        command: 'AI: Confirm actions',
        response: {
          type: 'error',
          message: error.response?.data?.message || 'Failed to execute AI actions',
        },
        timestamp: new Date()
      };
      setEntries(prev => {
        const updated = [...prev, errorEntry];
        saveEntriesToStorage(updated);
        return updated;
      });
    }
  };

  const handleAICancel = () => {
    // Cancel is handled visually inside AIResponseRenderer (dismissed state)
  };

  const handleAIRetry = (command: string) => {
    startAIStream(command, currentProjectId);
  };

  const handleStopAI = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (streamingEntryId) {
      setEntries(prev => {
        const updated = prev.map(e =>
          e.id === streamingEntryId
            ? {
                ...e,
                response: {
                  type: 'info' as const,
                  message: 'AI request stopped.',
                },
              }
            : e
        );
        saveEntriesToStorage(updated);
        return updated;
      });
      setStreamingEntryId(null);
      setStreamingText('');
      setIsExecuting(false);
    }
  };

  const handleWizardComplete = (entryId: string, wizardData: Record<string, any>) => {
    setEntries(prev => {
      const updated = prev.map(entry => {
        if (entry.id === entryId) {
          return {
            ...entry,
            response: {
              ...entry.response,
              data: {
                ...entry.response.data,
                wizardCompleted: true,
                wizardData
              }
            }
          };
        }
        return entry;
      });
      saveEntriesToStorage(updated);
      return updated;
    });
  };

  const handleSelectorTransition = async (entryId: string, itemType: string, itemId: string) => {
    // Fetch the edit wizard data for the selected item
    try {
      const response = await terminalAPI.executeCommand(`/edit ${itemType} ${itemId}`, currentProjectId);

      setEntries(prev => {
        const updated = prev.map(entry => {
          if (entry.id === entryId) {
            return {
              ...entry,
              command: `/edit ${itemType} ${itemId}`,
              response
            };
          }
          return entry;
        });
        saveEntriesToStorage(updated);
        return updated;
      });
    } catch (error) {
      // Ignore errors for selector transitions
    }
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
      // Ignore errors for theme changes

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
    <div className="flex flex-col h-full relative">
      {/* Terminal Output - Scrollable */}
      <div ref={terminalOutputRef} className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3 font-mono text-sm">
        {/* Welcome screen when no entries */}
        {entries.length === 0 && !isExecuting && (
          <WelcomeScreen
            firstName={user?.firstName}
            projectName={currentProjectName}
            onSubmit={handleCommandSubmit}
          />
        )}

        {/* Command History */}
        {entries.map(entry => {
          // Render inline project picker for no-project AI flow
          if (entry.response.data?.projectPicker) {
            return (
              <div key={entry.id} className="animate-fade-in">
                {/* Show the user's original message */}
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xs text-base-content/50 font-mono">{'>'}</span>
                  <span className="text-sm text-base-content/80">{entry.command}</span>
                </div>
                {/* Prompt */}
                <div className="bg-base-100 p-4 rounded-lg border-thick">
                  <p className="text-sm font-medium mb-3">{entry.response.message}</p>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => handleCommandSubmit('/swap')}
                      className="btn btn-sm btn-primary border-2"
                    >
                      Existing Project
                    </button>
                    <button
                      onClick={handleNewProjectAI}
                      className="btn btn-sm btn-outline border-2"
                    >
                      New Project
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <CommandResponse
              key={entry.id}
              entryId={entry.id}
              response={entry.response}
              command={entry.command}
              timestamp={entry.timestamp}
              onProjectSelect={handleProjectSelect}
              currentProjectId={currentProjectId}
              onCommandClick={handleCommandClick}
              onCommandExecute={handleCommandSubmit}
              onDirectThemeChange={handleDirectThemeChange}
              onWizardComplete={handleWizardComplete}
              onSelectorTransition={handleSelectorTransition}
              onAIConfirm={handleAIConfirm}
              onAICancel={handleAICancel}
              onAIRetry={handleAIRetry}
              fromStorage={entry.fromStorage}
              isStreaming={entry.id === streamingEntryId}
              streamingText={entry.id === streamingEntryId ? streamingText : undefined}
              userName={user?.firstName}
              onStopAI={entry.id === streamingEntryId ? handleStopAI : undefined}
            />
          );
        })}

        {/* Loading indicator — only for non-streaming slash commands */}
        {isExecuting && !streamingEntryId && (
          <div className="flex items-center gap-2 text-base-content/70 animate-pulse">
            <div className="loading loading-spinner loading-sm text-primary"></div>
            <span className="text-xs">Executing...</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Floating "New Output" button - appears when user has scrolled up */}
      {showScrollButton && (
        <button
          onClick={handleScrollToBottom}
          className="fixed bottom-24 right-6 btn btn-sm bg-primary text-primary-content border-2 border-primary-content/20 shadow-lg z-50 animate-bounce"
          title="Scroll to latest output"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <span className="hidden sm:inline">New Output</span>
        </button>
      )}

      {/* Input Area - Compact */}
      <div className="flex-shrink-0 p-2 border-t-2 border-base-content/20 bg-base-200">
        <TerminalInput
          onSubmit={handleCommandSubmit}
          disabled={isExecuting}
          currentProjectId={currentProjectId}
          onScrollToTop={handleScrollToTop}
          onScrollToBottom={handleScrollToBottom}
          onClear={handleClearTerminal}
          onNewChat={handleNewChat}
          onEndChat={handleEndChat}
          pendingCommand={pendingCommand}
          onCommandSet={() => setPendingCommand(null)}
          isAISession={isAISession}
          aiTurnCount={aiTurnCount}
          lastTurnElapsed={lastTurnElapsed}
          sessionTokensUsed={sessionTokensUsed}
          sessionModel={sessionModel}
          projectName={currentProjectName}
        />
      </div>
    </div>
  );
};

export default TerminalPage;
