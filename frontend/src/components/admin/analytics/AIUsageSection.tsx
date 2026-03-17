import React, { useState, useEffect } from 'react';
import { StatCard } from '../shared';

interface AIUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  planTier: string;
  aiUsage: {
    tokensUsedThisMonth: number;
    queryCount: number;
    lastQueryAt?: string;
  };
}

const AIUsageSection: React.FC = () => {
  const [users, setUsers] = useState<AIUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ tokens: 0, queries: 0, activeUsers: 0 });

  useEffect(() => {
    fetchAIUsers();
  }, []);

  const fetchAIUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users?limit=100', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();

      const aiUsers = data.users
        .filter((u: any) => u.aiUsage?.queryCount > 0)
        .map((u: any) => ({
          _id: u._id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          planTier: u.planTier,
          aiUsage: u.aiUsage,
        }))
        .sort((a: AIUser, b: AIUser) => b.aiUsage.tokensUsedThisMonth - a.aiUsage.tokensUsedThisMonth);

      setUsers(aiUsers);

      const tokens = aiUsers.reduce((sum: number, u: AIUser) => sum + u.aiUsage.tokensUsedThisMonth, 0);
      const queries = aiUsers.reduce((sum: number, u: AIUser) => sum + u.aiUsage.queryCount, 0);
      setTotals({ tokens, queries, activeUsers: aiUsers.length });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const formatTokens = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toLocaleString();
  };

  // Rough cost estimate: assumes ~$0.0004 per 1K tokens (gemini-2.5-flash blended rate)
  // This is approximate — actual cost depends on model and prompt/completion ratio
  const estimateCost = (tokens: number): string => {
    const cost = (tokens / 1000) * 0.0004;
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(2)}`;
  };

  const tierBadge = (tier: string) => {
    const cls: Record<string, string> = { free: 'badge-neutral', pro: 'badge-primary', premium: 'badge-accent' };
    return <span className={`badge badge-xs ${cls[tier] || 'badge-neutral'} uppercase`}>{tier}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total Tokens" value={formatTokens(totals.tokens)} subtitle="this month" />
        <StatCard title="Total Queries" value={totals.queries.toLocaleString()} subtitle="this month" />
        <StatCard title="Active AI Users" value={totals.activeUsers.toString()} subtitle="with 1+ queries" />
        <StatCard title="Est. Cost" value={estimateCost(totals.tokens)} subtitle="~$0.003/1K tokens" />
      </div>

      {/* Per-user table */}
      {users.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>User</th>
                <th>Plan</th>
                <th className="text-right">Tokens</th>
                <th className="text-right">Queries</th>
                <th className="text-right">Avg / Query</th>
                <th>Last Query</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="hover">
                  <td>
                    <div className="font-medium text-sm">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-base-content/50">{u.email}</div>
                  </td>
                  <td>{tierBadge(u.planTier)}</td>
                  <td className="text-right font-mono text-sm">{formatTokens(u.aiUsage.tokensUsedThisMonth)}</td>
                  <td className="text-right font-mono text-sm">{u.aiUsage.queryCount}</td>
                  <td className="text-right font-mono text-sm">
                    {u.aiUsage.queryCount > 0
                      ? formatTokens(Math.round(u.aiUsage.tokensUsedThisMonth / u.aiUsage.queryCount))
                      : '-'}
                  </td>
                  <td className="text-xs text-base-content/60">
                    {u.aiUsage.lastQueryAt
                      ? new Date(u.aiUsage.lastQueryAt).toLocaleDateString()
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-base-content/50 py-4 text-sm">No AI usage data yet.</div>
      )}
    </div>
  );
};

export default AIUsageSection;
