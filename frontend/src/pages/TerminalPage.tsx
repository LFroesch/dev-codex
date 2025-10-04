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

const TerminalPage: React.FC = () => {
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
    <div className="flex flex-col h-full">
      {/* Header - Compact */}
      <div className="flex-shrink-0 flex items-center justify-between p-3 border-b-2 border-base-content/20 bg-base-200">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <h1 className="text-lg font-bold">Terminal</h1>
            <p className="text-xs text-base-content/70">Command-line interface</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClearTerminal}
          className="btn btn-sm btn-ghost gap-1"
          title="Clear terminal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Terminal Output - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 font-mono text-sm">
        {/* Welcome Message - Compact */}
        {showWelcome && (
          <div className="animate-fade-in">
            <div className="border-2 border-base-content/20 rounded-lg p-4 bg-base-100 shadow-md">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💻</div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-2">Welcome to Terminal!</h2>
                  <p className="text-sm text-base-content/70 mb-3">
                    Execute commands to manage your projects. Type <code className="px-1.5 py-0.5 bg-base-200 rounded text-xs text-primary">/help</code> for available commands.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="p-2.5 bg-base-200 rounded-lg border-2 border-base-content/20">
                      <div className="text-xs font-semibold mb-1.5 text-primary">Quick Start</div>
                      <div className="space-y-0.5 text-xs text-base-content/70">
                        <div><code className="text-primary">/add todo</code> - Create todo</div>
                        <div><code className="text-primary">/add note</code> - Create note</div>
                        <div><code className="text-primary">/view todos</code> - List todos</div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-base-200 rounded-lg border-2 border-base-content/20">
                      <div className="text-xs font-semibold mb-1.5 text-primary">Features</div>
                      <div className="space-y-0.5 text-xs text-base-content/70">
                        <div>✨ Commands with <kbd className="kbd kbd-xs">/</kbd></div>
                        <div>📁 Projects with <kbd className="kbd kbd-xs">@</kbd></div>
                        <div>⏮️ History with <kbd className="kbd kbd-xs">↑</kbd><kbd className="kbd kbd-xs">↓</kbd></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 bg-primary/20 border-2 border-primary/30 rounded-lg">
                    <div className="text-xs font-semibold mb-1.5 text-base-content/80">Examples:</div>
                    <div className="space-y-0.5 text-xs font-mono text-base-content/70">
                      <div>/add todo fix auth bug @myproject</div>
                      <div>/view notes @frontend</div>
                      <div>/swap backend</div>
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
            currentProjectId={currentProjectId}
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
      <div className="flex-shrink-0 p-3 border-t-2 border-base-content/20 bg-base-200">
        <TerminalInput
          onSubmit={handleCommandSubmit}
          disabled={isExecuting}
          currentProjectId={currentProjectId}
        />
      </div>
    </div>
  );
};

export default TerminalPage;
