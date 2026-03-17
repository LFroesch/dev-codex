import React, { useState, useEffect } from 'react';
import { terminalAPI } from '../api/terminal';

interface WelcomeScreenProps {
  firstName?: string;
  projectName?: string;
  onSubmit: (command: string) => void;
}

const quickActions = [
  { command: 'what can I do in this project?', label: 'Ask AI' },
  { command: '/view todos', label: 'View Todos' },
  { command: '/swap', label: 'Switch Project' },
  { command: '/context', label: 'Project Context' },
  { command: '/help', label: 'Command Reference' },
];

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ firstName, projectName, onSubmit }) => {
  const [usagePercent, setUsagePercent] = useState<number | null>(null);
  const [isSelfHosted, setIsSelfHosted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await terminalAPI.executeCommand('/usage');
        const usage = res.data?.usageData;
        if (!cancelled && usage) {
          setIsSelfHosted(!!usage.isSelfHosted);
          setUsagePercent(usage.isSelfHosted ? null : (usage.usagePercent ?? null));
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getProgressColor = () => {
    if (usagePercent === null) return 'progress-primary';
    if (usagePercent >= 90) return 'progress-error';
    if (usagePercent >= 70) return 'progress-warning';
    return 'progress-primary';
  };

  return (
    <div className="flex items-center justify-center h-full animate-fade-in">
      <div className="max-w-lg w-full space-y-6 p-6">

        {/* Greeting */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-base-content">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome to Dev Codex'}
          </h2>
          <p className="text-sm text-base-content/60">
            Type anything below — the AI will respond and suggest actions you can confirm or skip
          </p>
        </div>

        {/* Current project badge */}
        {projectName && (
          <div className="flex justify-center">
            <span className="badge badge-primary badge-outline gap-1.5 font-mono px-3 py-2">
              <span className="opacity-60">project:</span> {projectName}
            </span>
          </div>
        )}

        {/* How it works */}
        <div className="bg-base-200/30 rounded-lg border border-base-300/20 px-4 py-3 space-y-1.5 text-sm text-base-content/70">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base-content/40">1.</span>
            <span>Type naturally — <span className="text-base-content/90">"add a todo for the login bug"</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-base-content/40">2.</span>
            <span>AI responds with proposed actions (checkboxes)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-base-content/40">3.</span>
            <span>Confirm the ones you want, cancel the rest</span>
          </div>
        </div>

        {/* Usage card — compact inline */}
        <div
          className="flex items-center gap-3 bg-base-200/50 rounded-lg border-thick px-4 py-2.5 cursor-pointer hover:bg-base-200 transition-colors"
          onClick={() => onSubmit('/usage')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSubmit('/usage'); }}
        >
          <span className="text-xs font-semibold text-base-content/70 flex-shrink-0">AI</span>
          {loading ? (
            <div className="flex-1 h-2 bg-base-300/30 rounded-full animate-pulse" />
          ) : isSelfHosted ? (
            <>
              <div className="flex-1 h-2 bg-base-300/30 rounded-full overflow-hidden">
                <div className="h-full bg-primary/40 rounded-full" style={{ width: '15%' }} />
              </div>
              <span className="text-xs font-mono text-primary flex-shrink-0">∞ unlimited</span>
            </>
          ) : usagePercent !== null ? (
            <>
              <progress
                className={`progress ${getProgressColor()} flex-1 h-2`}
                value={usagePercent}
                max={100}
              />
              <span className="text-xs font-mono text-base-content/60 flex-shrink-0">{usagePercent}%</span>
            </>
          ) : (
            <span className="text-xs text-base-content/40">unavailable</span>
          )}
        </div>

        {/* Quick action chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {quickActions.map(({ command, label }) => (
            <button
              key={command}
              onClick={() => onSubmit(command)}
              className="btn btn-sm btn-ghost border-thick font-mono"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Divider hint */}
        <div className="text-center">
          <span className="text-xs text-base-content/30 font-mono">~ start typing below ~</span>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
