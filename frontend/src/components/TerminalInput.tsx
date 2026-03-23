import React, { useState, useRef, useEffect } from 'react';
import { terminalAPI, CommandMetadata, ProjectAutocomplete } from '../api/terminal';
import AISessionBar from './AISessionBar';

interface TerminalInputProps {
  onSubmit: (command: string) => void;
  disabled?: boolean;
  currentProjectId?: string;
  onScrollToTop?: () => void;
  onScrollToBottom?: () => void;
  onClear?: () => void;
  onNewChat?: () => void;
  onEndChat?: () => void;
  pendingCommand?: string | null;
  onCommandSet?: () => void;
  isAISession?: boolean;
  aiTurnCount?: number;
  lastTurnElapsed?: number;
  sessionTokensUsed?: number;
  sessionModel?: string;
  projectName?: string;
}

interface AutocompleteItem {
  value: string;
  label: string;
  description?: string;
  category?: string;
  type: 'command' | 'project';
  template?: string; // Full template with flags/params
  syntax?: string; // Original syntax
  aliases?: string[]; // Available aliases for this command
}

// Storage key for command history
const COMMAND_HISTORY_KEY = 'terminal_command_history';

// Helper functions for command history localStorage
const saveCommandHistory = (history: string[]) => {
  try {
    localStorage.setItem(COMMAND_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
  }
};

const loadCommandHistory = (): string[] => {
  try {
    const stored = localStorage.getItem(COMMAND_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
};

const TerminalInput: React.FC<TerminalInputProps> = ({
  onSubmit,
  disabled = false,
  currentProjectId,
  onScrollToTop,
  onScrollToBottom,
  onClear,
  onNewChat,
  onEndChat,
  pendingCommand,
  onCommandSet,
  isAISession,
  aiTurnCount = 0,
  lastTurnElapsed,
  sessionTokensUsed = 0,
  sessionModel,
  projectName
}) => {
  const [input, setInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [textareaRows, setTextareaRows] = useState(1); // Start with 1 row

  // Cache for commands and projects
  const [commands, setCommands] = useState<CommandMetadata[]>([]);
  const [projects, setProjects] = useState<ProjectAutocomplete[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Load command history from localStorage on mount
  useEffect(() => {
    const loadedHistory = loadCommandHistory();
    if (loadedHistory.length > 0) {
      setCommandHistory(loadedHistory);
    }
  }, []);

  // Load commands and projects on mount
  useEffect(() => {
    loadCommands();
    loadProjects();
  }, []);

  // Listen for project refresh events (e.g., when a new project is created via terminal)
  useEffect(() => {
    const handleRefreshProjects = () => {
      loadProjects();
    };

    window.addEventListener('refreshProject', handleRefreshProjects);

    return () => {
      window.removeEventListener('refreshProject', handleRefreshProjects);
    };
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (showAutocomplete && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex, showAutocomplete]);

  // Refocus input when it becomes enabled again
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // Handle pending command from external source (e.g., help command buttons)
  useEffect(() => {
    if (pendingCommand) {
      setInput(pendingCommand);

      // Position cursor intelligently based on template type
      let cursorPos = pendingCommand.length;

      // Priority 1: Position inside first quote if present (for quoted arguments)
      if (pendingCommand.includes('"')) {
        const firstQuotePos = pendingCommand.indexOf('"');
        cursorPos = firstQuotePos + 1; // Position right after first quote (inside quotes)
      }
      // Priority 2: Position after first = sign if template has flags
      else if (pendingCommand.includes('=')) {
        const firstEqualPos = pendingCommand.indexOf('=');
        cursorPos = firstEqualPos + 1; // Position right after first =
      }

      setCursorPosition(cursorPos);

      // Focus input and position cursor
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(cursorPos, cursorPos);
        }
      }, 0);

      // Notify parent that command has been set
      onCommandSet?.();
    }
  }, [pendingCommand, onCommandSet]);

  const loadCommands = async () => {
    try {
      const response = await terminalAPI.getCommands();
      setCommands(response.commands);
    } catch (error) {
    }
  };

  const loadProjects = async () => {
    try {
      const response = await terminalAPI.getProjects();
      setProjects(response.projects);
    } catch (error) {
    }
  };

  // Generate command template with ALL flags (for Shift+Tab shortcut)
  const generateAllFlagsTemplate = (syntax: string): string => {
    const cleanedSyntax = syntax.replace(/@project\s*$/, '').trim();
    const withoutBrackets = cleanedSyntax.replace(/\[([^\]]*)\]/g, '');

    if (withoutBrackets.includes('--')) {
      const parts = withoutBrackets.split(/\s+--/);
      const baseCommand = parts[0].trim();

      const flags = parts.slice(1).map(part => {
        const flagMatch = part.match(/^(\w+)/);
        return flagMatch ? `--${flagMatch[1]}=` : '';
      }).filter(Boolean);

      return flags.length > 0 ? `${baseCommand} ${flags.join(' ')}` : `${baseCommand} `;
    }

    const baseMatch = withoutBrackets.match(/^(\/[^\[]+)/);
    const cleanBase = baseMatch ? baseMatch[1].trim() : withoutBrackets.trim();
    return `${cleanBase} `;
  };

  // Generate command template from syntax (base command only)
  const generateTemplate = (syntax: string): string => {
    // Remove @project from syntax if present
    const cleanedSyntax = syntax.replace(/@project\s*$/, '').trim();

    // SPECIAL: /context, /export, /summary should just complete to base + space to trigger entity autocomplete
    if (cleanedSyntax.startsWith('/context') || cleanedSyntax.startsWith('/summary') || cleanedSyntax.startsWith('/export')) {
      return cleanedSyntax.split(' ')[0] + ' ';
    }

    // Remove content inside [...] brackets (placeholder text)
    // Example: "/add subtask "[parent todo]" "[subtask text]"" → "/add subtask "" ""
    const withoutBrackets = cleanedSyntax.replace(/\[([^\]]*)\]/g, '');

    // Special handling for different command patterns
    if (withoutBrackets.includes('--')) {
      // Has flags - extract them and create template
      const parts = withoutBrackets.split(/\s+--/);
      const baseCommand = parts[0].trim();

      // ONLY return base command - user adds flags with -- autocomplete
      return `${baseCommand} `;
    }

    // No flags - return base command with space, removing anything in brackets
    const baseMatch = withoutBrackets.match(/^(\/[^\[]+)/);
    const cleanBase = baseMatch ? baseMatch[1].trim() : withoutBrackets.trim();
    return `${cleanBase} `;
  };

  // Handle autocomplete based on cursor position
  useEffect(() => {
    const textBeforeCursor = input.slice(0, cursorPosition);

    // Check if we're in a chained command (after &&)
    const lastAndAndIndex = textBeforeCursor.lastIndexOf('&& ');
    const workingText = lastAndAndIndex !== -1
      ? textBeforeCursor.slice(lastAndAndIndex + 3) // Get text after "&& "
      : textBeforeCursor;

    // CHECK FOR -- FLAG AUTOCOMPLETE FIRST (before command autocomplete)
    const lastDashDashIndex = workingText.lastIndexOf('--');
    if (lastDashDashIndex !== -1) {
      const charBeforeDash = lastDashDashIndex > 0 ? workingText[lastDashDashIndex - 1] : ' ';
      if (charBeforeDash === ' ' || lastDashDashIndex === 0) {
        const afterDashes = workingText.slice(lastDashDashIndex + 2);

        if (!afterDashes.includes(' ') && workingText.startsWith('/')) {
          // Extract command to get its flags
          const cmdMatch = workingText.match(/^\/\w+(?:\s+\w+)?/);
          if (cmdMatch) {
            const cmd = commands.find(c => c.value.toLowerCase().startsWith(cmdMatch[0].toLowerCase()));

            if (cmd) {
              // Parse flags from syntax
              const flagPattern = /--(\w+)(?:="([^"]+)")?/g;
              const allFlags: Array<{name: string; values?: string}> = [];
              let m;
              while ((m = flagPattern.exec(cmd.label)) !== null) {
                allFlags.push({
                  name: m[1],
                  values: m[2]?.includes('|') ? m[2] : undefined
                });
              }

              // Filter by partial match and exclude already used
              const usedFlags = new Set(Array.from(workingText.matchAll(/--(\w+)=/g)).map(x => x[1]));
              const matchingFlags = allFlags.filter(f =>
                f.name.toLowerCase().startsWith(afterDashes.toLowerCase()) &&
                !usedFlags.has(f.name)
              );

              if (matchingFlags.length > 0) {
                setAutocompleteItems(matchingFlags.map(f => ({
                  value: `--${f.name}=`,
                  label: f.name,
                  description: f.values || 'string',
                  type: 'command' as const
                })));
                setShowAutocomplete(true);
                setSelectedIndex(0);
                return;
              }
            }
          }
        }
      }
    }

    // SPECIAL: /context (and aliases like /export, /summary, /download, /summarize, /prompt, /readme) positional arg autocomplete
    const contextAliases = ['context', 'export', 'summary', 'download', 'summarize', 'prompt', 'readme'];
    const contextMatch = workingText.match(/^\/(\w+)(\s+(.*))?$/);
    if (contextMatch && contextAliases.includes(contextMatch[1].toLowerCase())) {
      const afterCmd = contextMatch[3] || '';
      const parts = afterCmd.split(' ');

      if (parts.length === 1) {
        const entities = [
          { value: 'full', description: 'Full project dump (all entities, no truncation)' },
          { value: 'todos', description: 'Just todos and subtasks' },
          { value: 'notes', description: 'Just notes' },
          { value: 'devlog', description: 'Just development log entries' },
          { value: 'features', description: 'Just features and relationships' },
          { value: 'stack', description: 'Just tech stack' },
          { value: 'team', description: 'Just team members' },
          { value: 'deployment', description: 'Just deployment settings' },
          { value: 'settings', description: 'Just project settings' },
          { value: 'projects', description: 'All projects and ideas (ignores current project)' }
        ];

        const matching = entities.filter(e =>
          e.value.toLowerCase().startsWith(parts[0].toLowerCase())
        );

        if (matching.length > 0) {
          setAutocompleteItems(matching.map(e => ({
            value: e.value,
            label: e.value,
            description: e.description,
            type: 'command' as const
          })));
          setShowAutocomplete(true);
          setSelectedIndex(0);
          return;
        }
      }
    }

    // Check for / command autocomplete
    if (workingText.startsWith('/')) {
      const commandText = workingText.slice(1);

      // Match and prioritize commands
      const matchingCommands = commands
        .filter(cmd => {
          const cmdValue = cmd.value.toLowerCase();
          const typedCmd = commandText.toLowerCase();

          // Match if command value contains the typed text
          if (cmdValue.includes(typedCmd)) {
            return true;
          }

          // Also match if any alias starts with the typed text
          if (cmd.aliases && cmd.aliases.length > 0) {
            return cmd.aliases.some(alias =>
              alias.toLowerCase().startsWith(typedCmd)
            );
          }

          return false;
        })
        .sort((a, b) => {
          const aValue = a.value.toLowerCase();
          const bValue = b.value.toLowerCase();
          const typedCmd = commandText.toLowerCase();

          // Check if aliases match
          const aAliasMatch = a.aliases?.some(alias => alias.toLowerCase().startsWith(typedCmd));
          const bAliasMatch = b.aliases?.some(alias => alias.toLowerCase().startsWith(typedCmd));

          // Priority 0: Alias exact match (e.g., "/create" when typing "create")
          const aAliasExact = a.aliases?.some(alias => alias.toLowerCase() === typedCmd);
          const bAliasExact = b.aliases?.some(alias => alias.toLowerCase() === typedCmd);
          if (aAliasExact && !bAliasExact) return -1;
          if (!aAliasExact && bAliasExact) return 1;

          // Priority 1: Exact start match with space (e.g., "/set deployment" when typing "set")
          const aStartsWithSpace = aValue.startsWith(`/${typedCmd} `);
          const bStartsWithSpace = bValue.startsWith(`/${typedCmd} `);
          if (aStartsWithSpace && !bStartsWithSpace) return -1;
          if (!aStartsWithSpace && bStartsWithSpace) return 1;

          // Priority 2: Exact match (e.g., "/set" when typing "set")
          const aExact = aValue === `/${typedCmd}`;
          const bExact = bValue === `/${typedCmd}`;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;

          // Priority 3: Alias match (e.g., "create todo" when typing "create")
          if (aAliasMatch && !bAliasMatch) return -1;
          if (!aAliasMatch && bAliasMatch) return 1;

          // Priority 4: Starts with typed text (e.g., "/settings" when typing "set")
          const aStarts = aValue.startsWith(`/${typedCmd}`);
          const bStarts = bValue.startsWith(`/${typedCmd}`);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;

          // Priority 5: Contains typed text (e.g., "/wizard setup" when typing "set")
          return 0;
        });

      if (matchingCommands.length > 0 && commandText.length > 0) {
        setAutocompleteItems(
          matchingCommands.map(cmd => {
            return {
              value: cmd.value,
              label: cmd.label,
              description: cmd.description,
              category: cmd.category,
              type: 'command' as const,
              template: generateTemplate(cmd.label),
              syntax: cmd.label,
              aliases: cmd.aliases || [] // Include aliases for display
            };
          })
        );
        setShowAutocomplete(true);
        setSelectedIndex(0);
        return;
      }
    }

    // Check for @ project autocomplete
    const lastAtIndex = workingText.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      // Only show autocomplete if @ is at the start or preceded by a space
      const charBeforeAt = lastAtIndex > 0 ? workingText[lastAtIndex - 1] : ' ';
      if (charBeforeAt === ' ' || lastAtIndex === 0) {
        const afterAt = workingText.slice(lastAtIndex + 1);

        // Only show autocomplete if no space after @ and we're still at the cursor position near it
        if (!afterAt.includes(' ') && afterAt.length >= 0) {
        const matchingProjects = projects.filter(proj =>
          proj.label.toLowerCase().includes(afterAt.toLowerCase())
        );

        if (matchingProjects.length > 0) {
          setAutocompleteItems(
            matchingProjects.map(proj => ({
              value: `@${proj.label}`,
              label: proj.label,
              description: proj.description,
              category: proj.category,
              type: 'project' as const
            }))
          );
          setShowAutocomplete(true);
          setSelectedIndex(0);
          return;
        }
        }
      }
    }

    // No autocomplete
    setShowAutocomplete(false);
    setAutocompleteItems([]);
  }, [input, cursorPosition, commands, projects]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInput(newValue);
    setCursorPosition(e.target.selectionStart);
    setHistoryIndex(-1); // Reset history navigation

    // Auto-resize: count newlines, min 1 row, max 5 rows
    const lineCount = newValue.split('\n').length;
    setTextareaRows(Math.min(Math.max(lineCount, 1), 5));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // PRIORITY 1: Command history (Ctrl+↑↓) - works everywhere
    if (e.key === 'ArrowUp' && e.ctrlKey) {
      e.preventDefault();
      navigateHistory('up');
      return;
    }
    if (e.key === 'ArrowDown' && e.ctrlKey) {
      e.preventDefault();
      navigateHistory('down');
      return;
    }

    // PRIORITY 2: Autocomplete navigation (only when autocomplete is shown)
    if (showAutocomplete) {
      // Tab: Accept current autocomplete selection
      if (e.key === 'Tab') {
        if (autocompleteItems.length > 0) {
          e.preventDefault();
          // Shift+Tab: Insert ALL flags at once (power user shortcut)
          if (e.shiftKey && autocompleteItems[0].value.startsWith('/')) {
            const item = autocompleteItems[selectedIndex];
            const allFlagsTemplate = generateAllFlagsTemplate(item.syntax || item.label);
            selectAutocompleteItem({ ...item, template: allFlagsTemplate });
          } else {
            selectAutocompleteItem(autocompleteItems[selectedIndex]);
          }
          return;
        }
      }

      // Escape: Close autocomplete
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowAutocomplete(false);
        return;
      }

      // Arrow Down: Navigate autocomplete list (prevent cursor movement)
      if (e.key === 'ArrowDown' && !e.ctrlKey) {
        e.preventDefault();
        setSelectedIndex(prev => (prev < autocompleteItems.length - 1 ? prev + 1 : 0));
        return;
      }

      // Arrow Up: Navigate autocomplete list (prevent cursor movement)
      if (e.key === 'ArrowUp' && !e.ctrlKey) {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : autocompleteItems.length - 1);
        return;
      }
    }

    // PRIORITY 3: Command submission (Enter without Shift, when no autocomplete)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }

    // PRIORITY 4: Clear input (Escape, when no autocomplete)
    if (e.key === 'Escape' && !showAutocomplete) {
      e.preventDefault();
      setInput('');
      setTextareaRows(1);
      setHistoryIndex(-1);
      return;
    }

    // PRIORITY 5: Normal textarea behavior (arrow keys move cursor, typing, etc.)
    // No preventDefault() - let browser handle it
  };

  const selectAutocompleteItem = (item: AutocompleteItem) => {
    // Handle flag insertion (value starts with --)
    if (item.value.startsWith('--')) {
      const textBeforeCursor = input.slice(0, cursorPosition);
      const lastDashDashIndex = textBeforeCursor.lastIndexOf('--');

      if (lastDashDashIndex !== -1) {
        const before = input.slice(0, lastDashDashIndex);
        const after = input.slice(cursorPosition);
        // Insert flag with quotes: --flag=""
        const flagWithQuotes = item.value + '""';
        const newInput = before + flagWithQuotes + after;
        // Position cursor between the quotes
        const newCursorPos = before.length + item.value.length + 1;

        setInput(newInput);
        setCursorPosition(newCursorPos);

        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);
      }

      setShowAutocomplete(false);
      return;
    }

    if (item.type === 'command') {
      // Check if we're in a chained command (after &&)
      const textBeforeCursor = input.slice(0, cursorPosition);
      const lastAndAndIndex = textBeforeCursor.lastIndexOf('&& ');

      // SPECIAL: Handle /context (and aliases) positional args - insert value only, not replace command
      const workingText = lastAndAndIndex !== -1
        ? textBeforeCursor.slice(lastAndAndIndex + 3)
        : textBeforeCursor;

      const ctxAliases = ['context', 'summary', 'summarize', 'prompt', 'readme'];
      const ctxMatch = workingText.match(/^\/(\w+)(\s+(.*))?$/);
      if (ctxMatch && ctxAliases.includes(ctxMatch[1].toLowerCase())) {
        const afterCmd = ctxMatch[3] || '';
        const parts = afterCmd.split(' ');

        if (parts.length === 1) {
          if (afterCmd === '') {
            // Just "/context" or "/context " - add value
            const replaceStart = cursorPosition;
            const before = input.slice(0, replaceStart);
            const after = input.slice(cursorPosition);

            const needsSpace = !before.endsWith(' ');
            const newInput = `${before}${needsSpace ? ' ' : ''}${item.value} ${after}`;
            const newCursorPos = before.length + (needsSpace ? 1 : 0) + item.value.length + 1;

            setInput(newInput);
            setCursorPosition(newCursorPos);

            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
              }
            }, 0);

            setShowAutocomplete(false);
            return;
          } else {
            // Replacing partial entity text
            const replaceStart = textBeforeCursor.lastIndexOf(parts[0]);
            const before = input.slice(0, replaceStart);
            const after = input.slice(cursorPosition);
            const newInput = `${before}${item.value} ${after}`;
            const newCursorPos = before.length + item.value.length + 1;

            setInput(newInput);
            setCursorPosition(newCursorPos);

            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
              }
            }, 0);

            setShowAutocomplete(false);
            return;
          }
        }
      }

      // Use template if available, otherwise use value with space
      const commandText = item.template || `${item.value} `;

      let newInput: string;
      let baseOffset: number;

      if (lastAndAndIndex !== -1) {
        // We're after a &&, preserve everything before it
        const beforeAndAnd = input.slice(0, lastAndAndIndex + 3);
        const afterCursor = input.slice(cursorPosition);
        newInput = `${beforeAndAnd}${commandText}${afterCursor}`;
        baseOffset = beforeAndAnd.length;
      } else {
        // Normal case, replace entire input
        newInput = commandText;
        baseOffset = 0;
      }

      setInput(newInput);

      // Position cursor intelligently based on template type
      let cursorPos = baseOffset + commandText.length;

      // Priority 1: Position inside first quote if present (for quoted arguments)
      if (commandText.includes('"')) {
        const firstQuotePos = commandText.indexOf('"');
        cursorPos = baseOffset + firstQuotePos + 1; // Position right after first quote (inside quotes)
      }
      // Priority 2: Position after first = sign if template has flags
      else if (commandText.includes('=')) {
        const firstEqualPos = commandText.indexOf('=');
        cursorPos = baseOffset + firstEqualPos + 1; // Position right after first =
      }

      setCursorPosition(cursorPos);

      // Focus and move cursor
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(cursorPos, cursorPos);
        }
      }, 0);
    } else {
      // Replace @project mention - find where @ started and replace to cursor
      const textBeforeCursor = input.slice(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      const beforeAt = input.slice(0, lastAtIndex);
      const afterCursor = input.slice(cursorPosition);

      const newInput = `${beforeAt}${item.value} ${afterCursor}`;
      const newCursorPos = beforeAt.length + item.value.length + 1;

      setInput(newInput);
      setCursorPosition(newCursorPos);

      // Focus and move cursor
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }

    setShowAutocomplete(false);
  };

  const navigateHistory = (direction: 'up' | 'down') => {
    if (commandHistory.length === 0) return;

    let newIndex = historyIndex;

    if (direction === 'up') {
      newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
    } else {
      newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
    }

    setHistoryIndex(newIndex);

    if (newIndex === -1) {
      setInput('');
    } else {
      setInput(commandHistory[commandHistory.length - 1 - newIndex]);
    }
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;

    // Add to history and save to localStorage
    setCommandHistory(prev => {
      const updated = [...prev, trimmed];
      saveCommandHistory(updated);
      return updated;
    });
    setHistoryIndex(-1);

    // Submit command
    onSubmit(trimmed);

    // Clear input and reset to 1 row
    setInput('');
    setTextareaRows(1);
    setShowAutocomplete(false);

    // Refocus input for next command
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      });
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    setCursorPosition(e.currentTarget.selectionStart);
  };

  return (
    <div className="relative w-full">
      {/* Autocomplete dropdown */}
      {showAutocomplete && autocompleteItems.length > 0 && (
        <div
          ref={autocompleteRef}
          className="absolute bottom-full mb-1 w-full bg-base-100 border-2 border-base-content/20 rounded-lg shadow-xl max-h-48 sm:max-h-80 overflow-y-auto z-50"
        >
          <div className="p-0.5">
            {/* Header - hide keybind hints on mobile */}
            <div className="text-xs font-semibold text-base-content/80 px-2.5 py-1.5 bg-base-200 rounded sticky top-0 border-thick flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span>{autocompleteItems[0].type === 'command' ? '🔧 Commands' : '📁 Projects'}</span>
                <span className="opacity-60">({autocompleteItems.length})</span>
              </div>
              {/* Desktop-only keybind hints */}
              <div className="hidden md:flex items-center gap-1.5 text-[10px] opacity-70">
                <span><kbd className="kbd kbd-xs">ESC</kbd> close</span>
                <span>•</span>
                <span><kbd className="kbd kbd-xs">↑↓</kbd> navigate</span>
                <span>•</span>
                <span><kbd className="kbd kbd-xs">TAB</kbd> select</span>
              </div>
            </div>

            {/* Autocomplete items */}
            <div className="mt-0.5">
              {autocompleteItems.map((item, index) => (
                <button
                  key={index}
                  ref={index === selectedIndex ? selectedItemRef : null}
                  type="button"
                  onClick={() => selectAutocompleteItem(item)}
                  className={`w-full text-left px-2.5 py-1.5 rounded transition-all border ${
                    index === selectedIndex
                      ? 'bg-primary/20 border-primary/40'
                      : 'border-transparent hover:bg-base-200/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Command syntax */}
                      <div className="font-medium text-sm text-base-content/90 font-mono">
                        {item.syntax || item.label}
                      </div>

                      {/* Aliases badges - show top 3 */}
                      {item.aliases && item.aliases.length > 0 && (
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-base-content/50 mr-0.5">Also:</span>
                          {item.aliases.slice(0, 3).map((alias, aliasIdx) => (
                            <span
                              key={aliasIdx}
                              className="text-[10px] px-1 py-px bg-accent/20 text-accent-content border border-accent/30 rounded font-mono"
                            >
                              /{alias}
                            </span>
                          ))}
                          {item.aliases.length > 3 && (
                            <span className="text-[10px] text-base-content/50">
                              +{item.aliases.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Description */}
                      {item.description && (
                        <div className="text-xs text-base-content/60 mt-0.5 line-clamp-1">
                          {item.description}
                        </div>
                      )}
                    </div>

                    {/* Category badge */}
                    {item.category && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-base-200 rounded text-base-content/70 border border-base-content/20 flex-shrink-0 self-start">
                        {item.category}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="space-y-1.5 sm:space-y-2">
        <div className="flex gap-1.5 sm:gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
            disabled={disabled}
            placeholder={isAISession ? "Continue the conversation..." : "Ask anything or type / for commands..."}
            rows={textareaRows}
            className="textarea textarea-bordered w-full resize-none text-sm font-mono placeholder:overflow-ellipsis placeholder:whitespace-nowrap bg-base-100"
            style={{ minHeight: '2.5rem', maxHeight: '10rem' }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className="btn flex flex-col gap-0.5 sm:gap-1 min-h-10 max-h-10 px-3 sm:px-6 text-primary group border-thick"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span
            className="text-[10px] sm:text-xs font-semibold"
            >Send</span>
          </button>
        </div>

        {/* AI Session Bar */}
        <AISessionBar
          isActive={!!isAISession}
          projectName={projectName}
          turnCount={aiTurnCount}
          tokensUsed={sessionTokensUsed}
          model={sessionModel}
          lastTurnElapsed={lastTurnElapsed}
          onEndChat={() => onEndChat?.()}
          onNewChat={() => onNewChat?.()}
        />

        {/* Shortcut bar */}
        <div className="flex min-h-8 sm:min-h-10 items-center justify-between text-xs text-base-content/70 bg-base-100 rounded-lg p-1.5 sm:p-2 border-2 border-base-content/20 gap-1 sm:gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Keyboard hints — hidden on mobile */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <kbd className="kbd kbd-xs">@</kbd>
                <span>projects</span>
              </div>
              <span className="text-base-content/30">·</span>
              <div className="flex items-center gap-1">
                <kbd className="kbd kbd-xs">Ctrl</kbd><span>+</span><kbd className="kbd kbd-xs">↑↓</kbd>
                <span>history</span>
              </div>
              <span className="text-base-content/30 hidden md:inline">·</span>
              <div className="hidden md:flex items-center gap-1">
                <kbd className="kbd kbd-xs">&&</kbd>
                <span>batch</span>
              </div>
            </div>

            {/* Action buttons — always visible */}
            <span className="text-base-content/30 hidden sm:inline">·</span>
            <button
              onClick={() => {
                setCommandHistory(prev => {
                  const updated = [...prev, '/help'];
                  saveCommandHistory(updated);
                  return updated;
                });
                onSubmit('/help');
              }}
              className="btn btn-xs btn-primary border-thick font-mono"
            >
              Help
            </button>
            <button
              onClick={onScrollToTop}
              title="Scroll to top"
              className="btn btn-xs btn-secondary border-thick font-mono"
            >
              <span className="hidden sm:inline">↑ Top</span>
              <span className="sm:hidden">↑</span>
            </button>
            <button
              onClick={onScrollToBottom}
              title="Scroll to bottom"
              className="btn btn-xs btn-warning border-thick font-mono"
            >
              <span className="hidden sm:inline">↓ Bot</span>
              <span className="sm:hidden">↓</span>
            </button>
            <button
              onClick={onClear}
              title="Clear terminal"
              className="btn btn-xs btn-error border-thick font-mono"
            >
              <span className="hidden sm:inline">Clear</span>
              <span className="sm:hidden">✕</span>
            </button>
            {/* Extra shortcuts — hidden on narrow screens */}
            <button
              onClick={() => onSubmit('/swap')}
              title="Switch project"
              className="hidden lg:inline-flex btn btn-xs btn-accent border-thick font-mono"
            >
              Swap
            </button>
            <button
              onClick={() => onSubmit('/view todos')}
              title="View todos"
              className="hidden lg:inline-flex btn btn-xs btn-info border-thick font-mono"
            >
              Todos
            </button>
            <button
              onClick={() => onSubmit('/usage')}
              title="AI usage stats"
              className="hidden xl:inline-flex btn btn-xs btn-neutral border-thick font-mono"
            >
              Usage
            </button>
            <button
              onClick={() => onSubmit('/context')}
              title="Export project context"
              className="hidden xl:inline-flex btn btn-xs btn-success border-thick font-mono"
            >
              Context
            </button>
          </div>
          <div className="text-base-content/50 text-xs font-mono flex-shrink-0">
            {input.length}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TerminalInput;
