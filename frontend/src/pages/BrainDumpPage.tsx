import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import TerminalInput from '../components/TerminalInput';
import CommandResponse from '../components/CommandResponse';
import { terminalAPI, CommandResponse as CommandResponseType } from '../api/terminal';

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

const BrainDumpPage: React.FC = () => {
  const { currentProjectId, onProjectSwitch } = useOutletContext<ContextType>();
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const handleCommandSubmit = async (command: string) => {
    setShowWelcome(false);
    setIsExecuting(true);

    console.log('Executing command:', command, 'with project:', currentProjectId);

    try {
      const response = await terminalAPI.executeCommand(command, currentProjectId);
      console.log('Command response:', response);

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

  return (
    <div className="flex flex-col h-full bg-base-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-base-content/10 bg-base-200/30">
        <div className="flex items-center gap-3">
          <div className="text-2xl">💻</div>
          <div>
            <h1 className="text-2xl font-bold">Terminal</h1>
            <p className="text-sm text-base-content/60">
              Command-line interface for project management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearTerminal}
            className="btn btn-sm btn-ghost gap-2"
            title="Clear terminal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
        {/* Welcome Message */}
        {showWelcome && (
          <div className="space-y-4 animate-fade-in">
            <div className="border-2 border-primary/20 rounded-lg p-6 bg-base-200/30">
              <div className="flex items-start gap-4">
                <div className="text-4xl">👋</div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">Welcome to Terminal Mode!</h2>
                  <p className="text-base-content/70 mb-4">
                    Execute commands to manage your projects faster. Type <code className="px-2 py-0.5 bg-base-content/10 rounded">/help</code> to see available commands.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-base-100 rounded-lg border border-base-content/10">
                      <div className="text-sm font-semibold mb-2 text-primary">Quick Start</div>
                      <div className="space-y-1 text-xs">
                        <div><code className="text-primary">/add todo</code> - Create a todo</div>
                        <div><code className="text-primary">/add note</code> - Create a note</div>
                        <div><code className="text-primary">/view todos</code> - List all todos</div>
                      </div>
                    </div>

                    <div className="p-3 bg-base-100 rounded-lg border border-base-content/10">
                      <div className="text-sm font-semibold mb-2 text-primary">Features</div>
                      <div className="space-y-1 text-xs">
                        <div>✨ Command autocomplete with <kbd className="kbd kbd-xs">/</kbd></div>
                        <div>📁 Project autocomplete with <kbd className="kbd kbd-xs">@</kbd></div>
                        <div>⏮️ Command history with <kbd className="kbd kbd-xs">↑</kbd><kbd className="kbd kbd-xs">↓</kbd></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="text-sm font-semibold mb-2">Example Commands:</div>
                    <div className="space-y-1 text-xs font-mono">
                      <div className="opacity-80">/add todo fix authentication bug @myproject</div>
                      <div className="opacity-80">/view notes @frontend</div>
                      <div className="opacity-80">/swap-project backend</div>
                      <div className="opacity-80">/export @myproject</div>
                    </div>
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
          />
        ))}

        {/* Loading indicator */}
        {isExecuting && (
          <div className="flex items-center gap-2 text-base-content/60 animate-pulse">
            <div className="loading loading-spinner loading-sm"></div>
            <span className="text-sm">Executing command...</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t-2 border-base-content/10 bg-base-200/30">
        <TerminalInput
          onSubmit={handleCommandSubmit}
          disabled={isExecuting}
          currentProjectId={currentProjectId}
        />
      </div>
    </div>
  );
};

export default BrainDumpPage;
