import React, { useState, useRef, useEffect } from 'react';
import { terminalAPI, CommandMetadata, ProjectAutocomplete } from '../api/terminal';
import { getContrastTextColor } from '../utils/contrastTextColor';

interface TerminalInputProps {
  onSubmit: (command: string) => void;
  disabled?: boolean;
  currentProjectId?: string;
  onScrollToTop?: () => void;
  onClear?: () => void;
  pendingCommand?: string | null;
  onCommandSet?: () => void;
}

interface AutocompleteItem {
  value: string;
  label: string;
  description?: string;
  category?: string;
  type: 'command' | 'project';
  template?: string; // Full template with flags/params
  syntax?: string; // Original syntax
}

const TerminalInput: React.FC<TerminalInputProps> = ({
  onSubmit,
  disabled = false,
  currentProjectId,
  onScrollToTop,
  onClear,
  pendingCommand,
  onCommandSet
}) => {
  const [input, setInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Cache for commands and projects
  const [commands, setCommands] = useState<CommandMetadata[]>([]);
  const [projects, setProjects] = useState<ProjectAutocomplete[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Load commands and projects on mount
  useEffect(() => {
    loadCommands();
    loadProjects();
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

      // Position cursor at first = sign if template has flags, otherwise at end
      let cursorPos = pendingCommand.length;
      if (pendingCommand.includes('=')) {
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
      console.error('Failed to load commands:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await terminalAPI.getProjects();
      setProjects(response.projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  // Generate command template from syntax
  const generateTemplate = (syntax: string): string => {
    // Extract command base and convert flags to empty placeholders
    // Example: "/set deployment --url=[url] --platform=[platform]" → "/set deployment --url= --platform= --status="

    // Special handling for different command patterns
    if (syntax.includes('--')) {
      // Has flags - extract them and create template
      const parts = syntax.split('--');
      const baseCommand = parts[0].trim();

      // Extract flag names from patterns like --url=[url] or --role=[editor/viewer]
      const flags = parts.slice(1).map(part => {
        const flagMatch = part.match(/^(\w+)/);
        return flagMatch ? `--${flagMatch[1]}=` : '';
      }).filter(Boolean);

      return `${baseCommand} ${flags.join(' ')}`;
    }

    // No flags - return base command with space
    const baseMatch = syntax.match(/^(\/[^\[]+)/);
    return baseMatch ? `${baseMatch[1].trim()} ` : `${syntax} `;
  };

  // Handle autocomplete based on cursor position
  useEffect(() => {
    const textBeforeCursor = input.slice(0, cursorPosition);

    // Check for / command autocomplete
    if (textBeforeCursor.startsWith('/')) {
      const commandText = textBeforeCursor.slice(1);

      // Match and prioritize commands
      const matchingCommands = commands
        .filter(cmd => {
          const cmdValue = cmd.value.toLowerCase();
          const typedCmd = commandText.toLowerCase();

          // Match anything that contains the typed text
          return cmdValue.includes(typedCmd);
        })
        .sort((a, b) => {
          const aValue = a.value.toLowerCase();
          const bValue = b.value.toLowerCase();
          const typedCmd = commandText.toLowerCase();

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

          // Priority 3: Starts with typed text (e.g., "/settings" when typing "set")
          const aStarts = aValue.startsWith(`/${typedCmd}`);
          const bStarts = bValue.startsWith(`/${typedCmd}`);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;

          // Priority 4: Contains typed text (e.g., "/wizard setup" when typing "set")
          return 0;
        });

      if (matchingCommands.length > 0 && commandText.length > 0) {
        setAutocompleteItems(
          matchingCommands.map(cmd => ({
            value: cmd.value,
            label: cmd.label,
            description: cmd.description,
            category: cmd.category,
            type: 'command' as const,
            template: generateTemplate(cmd.label),
            syntax: cmd.label
          }))
        );
        setShowAutocomplete(true);
        setSelectedIndex(0);
        return;
      }
    }

    // Check for @ project autocomplete
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      // Only show autocomplete if @ is at the start or preceded by a space
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (charBeforeAt === ' ' || lastAtIndex === 0) {
        const afterAt = textBeforeCursor.slice(lastAtIndex + 1);

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
    setInput(e.target.value);
    setCursorPosition(e.target.selectionStart);
    setHistoryIndex(-1); // Reset history navigation
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle autocomplete navigation
    if (showAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < autocompleteItems.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        return;
      }

      if (e.key === 'Tab' || e.key === 'Enter') {
        if (autocompleteItems.length > 0) {
          e.preventDefault();
          selectAutocompleteItem(autocompleteItems[selectedIndex]);
          return;
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setShowAutocomplete(false);
        return;
      }
    }

    // Handle command submission
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }

    // Handle command history (when autocomplete is not shown)
    if (!showAutocomplete) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateHistory('up');
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateHistory('down');
        return;
      }
    }

    // Clear input with Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      setInput('');
      setHistoryIndex(-1);
    }
  };

  const selectAutocompleteItem = (item: AutocompleteItem) => {
    if (item.type === 'command') {
      // Use template if available, otherwise use value with space
      const newInput = item.template || `${item.value} `;
      setInput(newInput);

      // Position cursor at first = sign if template has flags, otherwise at end
      let cursorPos = newInput.length;
      if (item.template && newInput.includes('=')) {
        const firstEqualPos = newInput.indexOf('=');
        cursorPos = firstEqualPos + 1; // Position right after first =
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

    // Add to history
    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);

    // Submit command
    onSubmit(trimmed);

    // Clear input
    setInput('');
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
          className="absolute bottom-full mb-2 w-full bg-base-100 border-2 border-base-content/20 rounded-lg shadow-xl max-h-64 overflow-y-auto z-50"
        >
          <div className="p-2">
            <div className="text-xs font-semibold text-base-content/80 px-2 py-1 bg-base-200 rounded-t-lg sticky top-0">
              {autocompleteItems[0].type === 'command' ? '🔧 Commands' : '📁 Projects'}
              <span className="ml-2 opacity-70">({autocompleteItems.length})</span>
            </div>
            <div className="mt-1 space-y-1">
              {autocompleteItems.map((item, index) => (
                <button
                  key={index}
                  ref={index === selectedIndex ? selectedItemRef : null}
                  type="button"
                  onClick={() => selectAutocompleteItem(item)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors border-2 ${
                    index === selectedIndex
                      ? 'bg-primary/20 border-primary/40'
                      : 'border-transparent hover:bg-base-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-base-content/80 font-mono truncate">
                        {item.syntax || item.label}
                      </div>
                      {item.description && (
                        <div className="text-xs text-base-content/70 truncate mt-0.5">
                          {item.description}
                        </div>
                      )}
                      {item.template && (
                        <div className="text-xs text-primary/80 font-mono mt-1 truncate">
                          → {item.template}
                        </div>
                      )}
                    </div>
                    {item.category && (
                      <span className="text-xs px-2 py-0.5 bg-base-200 rounded-full text-base-content/80 border border-base-content/20 flex-shrink-0">
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
      <div className="space-y-2">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
            disabled={disabled}
            placeholder="Type / for commands or @ for projects..."
            className="textarea textarea-bordered w-full min-h-10 max-h-10 resize-none text-sm font-mono overflow-hidden placeholder:overflow-ellipsis placeholder:whitespace-nowrap bg-base-100"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className="btn flex flex-col gap-1 min-h-10 max-h-10 px-6 text-primary group hover:border-thick"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span 
            className="text-xs font-semibold"
            >Send</span>
          </button>
        </div>

        {/* Help text */}
        <div className="flex min-h-10 items-center justify-between text-xs text-base-content/70 bg-base-100 rounded-lg p-2 border-2 border-base-content/20 gap-2">
          <div className="flex items-center gap-2 flex-wrap">

            <div className="flex items-center gap-1 hidden sm:flex">
              <kbd className="kbd kbd-xs">@</kbd>
              <span className="hidden sm:inline">projects</span>
            </div>
            <span className="text-base-content/50 hidden sm:inline">•</span>
            <div className="flex items-center gap-1 hidden sm:flex">
              <kbd className="kbd kbd-xs">↑</kbd>
              <kbd className="kbd kbd-xs">↓</kbd>
              <span>history</span>
            </div>
            <span className="text-base-content/50 hidden sm:inline">•</span>
            <div className="flex items-center gap-1 hidden md:flex">
              <kbd className="kbd kbd-xs">Enter</kbd>
              <span>send</span>
            </div>
            <span className="text-base-content/50 hidden md:inline">•</span>
            <div className="flex items-center gap-1 hidden md:flex">
              <kbd className="kbd kbd-xs">Shift+Enter</kbd>
              <span>new line</span>
            </div>
            <span className="text-base-content/50 hidden md:inline">•</span>
            {/* runs /help in terminal on click */}
            <div className="flex items-center gap-1">
              <button
                className='border-thick rounded-xl px-2 bg-primary'
                onClick={() => {
                  setCommandHistory(prev => [...prev, '/help']);
                  onSubmit('/help');
                }}>
                <span className='font-mono'
                style={{ color: getContrastTextColor('primary') }}
                >
                  Help
                </span>
              </button>
            </div>
            <span className="text-base-content/50 hidden sm:inline">•</span>
            <button
              onClick={onScrollToTop}
              title="Scroll to top of terminal"
              className='border-thick rounded-xl px-2 bg-secondary'
            >
              <span className='font-mono'
                style={{ color: getContrastTextColor('secondary') }}
                >
                  <span className="hidden sm:inline">↑ Back To Top</span>
                  <span className="sm:hidden">↑ Top</span>
                </span>
            </button>
            <span className="text-base-content/50 hidden sm:inline">•</span>
            <button
              onClick={onClear}
              title="Clear terminal"
              className='border-thick rounded-xl px-2 bg-warning'
            >
              <span className='font-mono'
                style={{ color: getContrastTextColor('warning') }}
                >
                  <span className="hidden sm:inline">Clear</span>
                  <span className="sm:hidden">✕</span>
                </span>
            </button>
          </div>
          <div className="text-base-content/60 text-[10px] sm:text-xs flex-shrink-0">
            {input.length}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TerminalInput;
