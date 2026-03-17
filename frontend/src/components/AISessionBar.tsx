import React from 'react';

interface AISessionBarProps {
  isActive: boolean;
  projectName?: string;
  turnCount: number;
  tokensUsed: number;
  model?: string;
  lastTurnElapsed?: number;
  onEndChat: () => void;
  onNewChat: () => void;
}

const AISessionBar: React.FC<AISessionBarProps> = ({
  isActive,
  projectName,
  turnCount,
  tokensUsed,
  model,
  lastTurnElapsed,
  onEndChat,
  onNewChat,
}) => {
  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
    return `${tokens}`;
  };

  const formatElapsed = (ms: number): string => {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  // Idle state — always visible, subtle prompt
  if (!isActive) {
    return (
      <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-base-200/50 rounded-lg border border-base-300/30">
        <div className="flex items-center gap-2 text-base-content/50">
          <span className="w-2 h-2 rounded-full bg-success inline-block" />
          <span>Ready — type anything to start a conversation</span>
        </div>
        <button
          onClick={onNewChat}
          className="btn btn-xs btn-ghost text-primary border border-primary/20"
        >
          New Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-primary/10 rounded-lg border border-primary/20">
      <div className="flex items-center gap-2 flex-wrap text-base-content/70">
        <span className="font-semibold text-primary">AI</span>
        {projectName && (
          <>
            <span className="text-base-content/20">·</span>
            <span>{projectName}</span>
          </>
        )}
        <span className="text-base-content/20">·</span>
        <span>{turnCount} turn{turnCount !== 1 ? 's' : ''}</span>
        {tokensUsed > 0 && (
          <>
            <span className="text-base-content/20">·</span>
            <span>{formatTokens(tokensUsed)} tok</span>
          </>
        )}
        {model && (
          <>
            <span className="text-base-content/20 hidden sm:inline">·</span>
            <span className="hidden sm:inline">{model}</span>
          </>
        )}
        {lastTurnElapsed != null && lastTurnElapsed > 0 && (
          <>
            <span className="text-base-content/20 hidden sm:inline">·</span>
            <span className="hidden sm:inline">{formatElapsed(lastTurnElapsed)}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onNewChat}
          className="btn btn-xs btn-ghost text-primary border border-primary/20"
        >
          New Chat
        </button>
        <button
          onClick={onEndChat}
          className="btn btn-xs btn-ghost text-error/60 border border-error/10"
        >
          End
        </button>
      </div>
    </div>
  );
};

export default AISessionBar;
