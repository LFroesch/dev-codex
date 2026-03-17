import React from 'react';

interface UsageRendererProps {
  planTier: string;
  tokensUsed: number;
  tokensLimit: number | 'unlimited';
  queryCount: number;
  queriesPerMin: number;
  inputCharsLimit: number;
  lastQuery: string;
  lastReset: string;
  isSelfHosted: boolean;
  usagePercent: number;
}

const UsageRenderer: React.FC<UsageRendererProps> = ({
  planTier,
  tokensUsed,
  tokensLimit,
  queryCount,
  queriesPerMin,
  inputCharsLimit,
  lastQuery,
  lastReset,
  isSelfHosted,
  usagePercent,
}) => {
  const tierColors: Record<string, string> = {
    free: 'badge-neutral',
    pro: 'badge-primary',
    premium: 'badge-accent',
  };

  const tierBadgeClass = tierColors[planTier] || 'badge-neutral';

  const getProgressColor = () => {
    if (isSelfHosted || tokensLimit === 'unlimited') return 'progress-primary';
    if (usagePercent >= 90) return 'progress-error';
    if (usagePercent >= 70) return 'progress-warning';
    return 'progress-primary';
  };

  const getProgressBg = () => {
    if (isSelfHosted || tokensLimit === 'unlimited') return 'bg-primary/5';
    if (usagePercent >= 90) return 'bg-error/5';
    if (usagePercent >= 70) return 'bg-warning/5';
    return 'bg-primary/5';
  };

  const formatTokens = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toLocaleString();
  };

  const avgTokensPerQuery = queryCount > 0 ? Math.round(tokensUsed / queryCount) : 0;

  // Free tier — upgrade prompt
  if (planTier === 'free' && !isSelfHosted) {
    return (
      <div className="mt-3 p-4 bg-base-200/50 rounded-lg border-thick text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className={`badge ${tierBadgeClass} badge-sm font-semibold`}>FREE</span>
          <span className="text-sm font-semibold text-base-content/80">AI Usage</span>
        </div>
        <p className="text-sm text-base-content/70">AI features require a Pro or Premium plan.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-base-200/60 rounded-lg border-thick border-l-4 border-l-primary">
        <div className="flex items-center gap-2">
          <span className={`badge ${tierBadgeClass} badge-sm font-semibold uppercase`}>{planTier}</span>
          <span className="text-base font-bold text-base-content">AI Usage</span>
        </div>
        {isSelfHosted && (
          <span className="badge badge-ghost badge-sm">Self-hosted</span>
        )}
      </div>

      {/* Token usage bar */}
      <div className={`p-4 rounded-lg border-thick ${getProgressBg()}`}>
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm font-semibold text-base-content/80">Monthly Tokens</span>
          <span className="text-sm font-mono text-base-content/70">
            {formatTokens(tokensUsed)}{' '}
            <span className="text-base-content/40">/ {tokensLimit === 'unlimited' ? '∞' : formatTokens(tokensLimit as number)}</span>
          </span>
        </div>
        {tokensLimit !== 'unlimited' ? (
          <progress
            className={`progress ${getProgressColor()} w-full h-3`}
            value={usagePercent}
            max={100}
          />
        ) : (
          <div className="w-full h-3 bg-base-300/30 rounded-full overflow-hidden">
            <div className="h-full bg-primary/40 rounded-full" style={{ width: '15%' }} />
          </div>
        )}
        {tokensLimit !== 'unlimited' && (
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-base-content/50">{usagePercent}% used</span>
            <span className="text-xs text-base-content/50">
              {formatTokens(Math.max(0, (tokensLimit as number) - tokensUsed))} remaining
            </span>
          </div>
        )}
      </div>

      {/* Warning banner */}
      {!isSelfHosted && tokensLimit !== 'unlimited' && usagePercent >= 80 && (
        <div className={`text-xs px-3 py-2 rounded-lg border ${
          usagePercent >= 90
            ? 'bg-error/10 border-error/30 text-error'
            : 'bg-warning/10 border-warning/30 text-warning'
        }`}>
          {usagePercent >= 90
            ? `${usagePercent}% of monthly tokens used. Usage blocked at 100%.`
            : `${usagePercent}% of monthly tokens used.`
          }
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="stat p-3 bg-base-200/50 rounded-lg border-thick">
          <div className="stat-title text-[10px]">Queries</div>
          <div className="stat-value text-lg">{queryCount.toLocaleString()}</div>
          <div className="stat-desc text-[10px]">this month</div>
        </div>
        <div className="stat p-3 bg-base-200/50 rounded-lg border-thick">
          <div className="stat-title text-[10px]">Avg / Query</div>
          <div className="stat-value text-lg">{formatTokens(avgTokensPerQuery)}</div>
          <div className="stat-desc text-[10px]">tokens</div>
        </div>
        <div className="stat p-3 bg-base-200/50 rounded-lg border-thick">
          <div className="stat-title text-[10px]">Rate Limit</div>
          <div className="stat-value text-lg">{isSelfHosted ? '∞' : queriesPerMin}</div>
          <div className="stat-desc text-[10px]">{isSelfHosted ? 'unlimited' : 'per minute'}</div>
        </div>
      </div>

      {/* Details row */}
      <div className="flex items-center justify-between text-xs text-base-content/50 px-1">
        <span>Max input: {isSelfHosted ? '∞' : `${inputCharsLimit.toLocaleString()} chars`}</span>
        <span>Last query: {lastQuery || 'never'}</span>
        <span>Resets: 1st of month</span>
      </div>
    </div>
  );
};

export default UsageRenderer;
