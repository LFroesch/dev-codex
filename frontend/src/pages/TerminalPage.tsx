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
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalOutputRef = useRef<HTMLDivElement>(null);
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

  const handleScrollToTop = () => {
    if (terminalOutputRef.current) {
      terminalOutputRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCommandClick = (command: string) => {
    setPendingCommand(command);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Terminal Output - Scrollable */}
      <div ref={terminalOutputRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 font-mono text-sm">
        {/* Welcome Message - Compact */}
        {showWelcome && (
          <div className="animate-fade-in">
            <div className="border-2 border-base-content/20 rounded-lg p-4 bg-base-100 shadow-md">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💻</div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-2">Welcome to the Terminal!</h2>
                  <p className="text-sm text-base-content/70 mb-3">
                    Execute commands to manage your projects. Type <code className="px-1.5 py-0.5 bg-base-200 rounded text-xs text-primary">/help</code> for available commands.
                    <br />
                    If you don't specify a project with @, it will use the currently selected project.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="p-2.5 bg-base-200 rounded-lg border-2 border-base-content/20">
                      <div className="text-xs font-semibold mb-1.5 text-primary">Quick Start</div>
                      <div className="space-y-0.5 text-xs text-base-content/70">
                        <div><code className="text-primary">/help</code> - Show help</div>
                        <div><code className="text-primary">/view note</code> - List notes</div>
                        <div><code className="text-primary">/view todos</code> - List todos</div>
                      </div>
                    </div>
                    <div className="p-2.5 bg-base-200 border-2 border-base-content/20 rounded-lg">
                      <div className="text-xs font-semibold mb-1.5 text-primary">Example Syntax:</div>
                      <div className="space-y-0.5 text-xs font-mono text-base-content/70">
                        <div><code className="text-primary">/add todo fix auth bug @projectx</code></div>
                        <div><code className="text-primary">/view notes @projecty</code></div>
                        <div><code className="text-primary">/swap @projectz</code></div>
                      </div>
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
            onCommandClick={handleCommandClick}
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
