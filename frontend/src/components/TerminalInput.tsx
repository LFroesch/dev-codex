import React, { useState, useRef, useEffect } from 'react';
import { terminalAPI, CommandMetadata, ProjectAutocomplete } from '../api/terminal';

interface TerminalInputProps {
  onSubmit: (command: string) => void;
  disabled?: boolean;
  currentProjectId?: string;
}

interface AutocompleteItem {
  value: string;
  label: string;
  description?: string;
  category?: string;
  type: 'command' | 'project';
}

const TerminalInput: React.FC<TerminalInputProps> = ({
  onSubmit,
  disabled = false,
  currentProjectId
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

  // Load commands and projects on mount
  useEffect(() => {
    loadCommands();
    loadProjects();
  }, []);

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

  // Handle autocomplete based on cursor position
  useEffect(() => {
    const textBeforeCursor = input.slice(0, cursorPosition);

    // Check for / command autocomplete
    if (textBeforeCursor.startsWith('/')) {
      const commandText = textBeforeCursor.slice(1);
      const spaceIndex = commandText.indexOf(' ');

      // Only autocomplete the command part (before first space)
      if (spaceIndex === -1) {
        const matchingCommands = commands.filter(cmd =>
          cmd.value.toLowerCase().includes(commandText.toLowerCase())
        );

        if (matchingCommands.length > 0 && commandText.length > 0) {
          setAutocompleteItems(
            matchingCommands.map(cmd => ({
              value: cmd.value,
              label: cmd.label,
              description: cmd.description,
              category: cmd.category,
              type: 'command' as const
            }))
          );
          setShowAutocomplete(true);
          setSelectedIndex(0);
          return;
        }
      }
    }

    // Check for @ project autocomplete
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
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
      // Replace entire input with selected command, add space for user to continue
      const newInput = `${item.value} `;
      setInput(newInput);
      setCursorPosition(newInput.length);

      // Focus and move cursor to end
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newInput.length, newInput.length);
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
            <div className="text-xs font-semibold text-base-content/60 px-2 py-1 bg-base-200 rounded-t-lg sticky top-0">
              {autocompleteItems[0].type === 'command' ? '🔧 Commands' : '📁 Projects'}
              <span className="ml-2 opacity-60">({autocompleteItems.length})</span>
            </div>
            <div className="mt-1 space-y-1">
              {autocompleteItems.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectAutocompleteItem(item)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors border-2 ${
                    index === selectedIndex
                      ? 'bg-primary/20 border-primary/40'
                      : 'border-transparent hover:bg-base-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-base-content/60 truncate">
                          {item.description}
                        </div>
                      )}
                    </div>
                    {item.category && (
                      <span className="text-xs px-2 py-0.5 bg-base-200 rounded-full text-base-content/70">
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
            placeholder="Type a command (e.g., /add todo fix bug @myproject) or press / for commands..."
            className="textarea textarea-bordered flex-1 min-h-[80px] max-h-[200px] resize-none text-sm font-mono"
            rows={3}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className="btn btn-primary flex flex-col gap-1 h-auto px-6"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="text-xs font-semibold">Send</span>
          </button>
        </div>

        {/* Help text */}
        <div className="flex items-center justify-between text-xs text-base-content/60 bg-base-200/50 rounded-lg p-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <kbd className="kbd kbd-xs">/</kbd>
              <span>commands</span>
            </div>
            <span className="text-base-content/40">•</span>
            <div className="flex items-center gap-1">
              <kbd className="kbd kbd-xs">@</kbd>
              <span>projects</span>
            </div>
            <span className="text-base-content/40">•</span>
            <div className="flex items-center gap-1">
              <kbd className="kbd kbd-xs">↑</kbd>
              <kbd className="kbd kbd-xs">↓</kbd>
              <span>history</span>
            </div>
            <span className="text-base-content/40">•</span>
            <div className="flex items-center gap-1">
              <kbd className="kbd kbd-xs">Enter</kbd>
              <span>send</span>
            </div>
            <span className="text-base-content/40">•</span>
            <div className="flex items-center gap-1">
              <kbd className="kbd kbd-xs">Shift+Enter</kbd>
              <span>new line</span>
            </div>
          </div>
          <div className="text-base-content/40">
            {input.length} chars
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalInput;
