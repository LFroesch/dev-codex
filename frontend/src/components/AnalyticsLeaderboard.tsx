import React, { useState, useEffect } from 'react';

interface LeaderboardUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  planTier: string;
  totalTime?: number;
  sessionCount?: number;
  avgSessionTime?: number;
  totalEvents?: number;
  fieldEdits?: number;
  projectOpens?: number;
  pageViews?: number;
  actions?: number;
  lastActivity?: string;
  lastEvent?: string;
}

interface LeaderboardProject {
  projectId: string;
  projectName: string;
  totalEvents: number;
  uniqueUserCount: number;
  lastActivity: string;
}

interface LeaderboardData {
  timeLeaderboard: LeaderboardUser[];
  activityLeaderboard: LeaderboardUser[];
  projectLeaderboard: LeaderboardProject[];
  period: string;
  generatedAt: string;
}

interface AnalyticsLeaderboardProps {
  compact?: boolean;
  onResetAnalytics?: () => void;
}

const AnalyticsLeaderboard: React.FC<AnalyticsLeaderboardProps> = ({ compact = false, onResetAnalytics }) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState<'time' | 'activity' | 'projects'>('time');

  useEffect(() => {
    loadLeaderboard();
  }, [selectedPeriod]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/analytics/leaderboard?days=${selectedPeriod}&limit=20`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to load leaderboard');
      const data = await response.json();
      setLeaderboardData(data);
    } catch (err) {
      setError('Failed to load leaderboard data');
      console.error('Leaderboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlanBadgeColor = (planTier: string) => {
    switch (planTier) {
      case 'enterprise': return 'badge-primary';
      case 'pro': return 'badge-secondary';
      default: return 'badge-ghost';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🏆';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="card-title text-2xl">📊 Analytics Leaderboard</h2>
          
          {!compact && (
            <div className="flex flex-col sm:flex-row gap-2">
              <select 
                className="select select-bordered select-sm"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
              <button 
                className="btn btn-outline btn-sm"
                onClick={loadLeaderboard}
              >
                Refresh
              </button>
              {onResetAnalytics && (
                <button 
                  className="btn btn-error btn-sm gap-2"
                  onClick={onResetAnalytics}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.001 8.001 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset All Data
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-6">
          <button 
            className={`tab ${activeTab === 'time' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('time')}
          >
            ⏱️ Most Time
          </button>
          <button 
            className={`tab ${activeTab === 'activity' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            🔥 Most Active
          </button>
          <button 
            className={`tab ${activeTab === 'projects' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            🚀 Top Projects
          </button>
        </div>

        {/* Time Leaderboard */}
        {activeTab === 'time' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              ⏱️ Most Time Spent {leaderboardData?.period}
            </h3>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Plan</th>
                    <th>Total Time</th>
                    <th>Sessions</th>
                    <th>Avg Session</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData?.timeLeaderboard.map((user, index) => (
                    <tr key={user.userId} className={index < 3 ? 'bg-base-200' : ''}>
                      <td className="font-bold text-lg">
                        {getRankIcon(index + 1)}
                      </td>
                      <td>
                        <div>
                          <div className="font-semibold">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-base-content/70">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getPlanBadgeColor(user.planTier)} badge-sm`}>
                          {user.planTier}
                        </span>
                      </td>
                      <td className="font-mono font-semibold">
                        {formatTime(user.totalTime || 0)}
                      </td>
                      <td>{user.sessionCount}</td>
                      <td className="font-mono">
                        {formatTime(user.avgSessionTime || 0)}
                      </td>
                      <td className="text-sm">
                        {user.lastActivity ? formatDate(user.lastActivity) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Activity Leaderboard */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              🔥 Most Active Users {leaderboardData?.period}
            </h3>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Plan</th>
                    <th>Total Events</th>
                    <th>Projects</th>
                    <th>Page Views</th>
                    <th>Last Event</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData?.activityLeaderboard.map((user, index) => (
                    <tr key={user.userId} className={index < 3 ? 'bg-base-200' : ''}>
                      <td className="font-bold text-lg">
                        {getRankIcon(index + 1)}
                      </td>
                      <td>
                        <div>
                          <div className="font-semibold">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-base-content/70">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getPlanBadgeColor(user.planTier)} badge-sm`}>
                          {user.planTier}
                        </span>
                      </td>
                      <td className="font-bold text-primary">
                        {user.totalEvents}
                      </td>
                      <td>{user.projectOpens}</td>
                      <td>{user.pageViews}</td>
                      <td className="text-sm">
                        {user.lastEvent ? formatDate(user.lastEvent) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Project Leaderboard */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              🚀 Most Active Projects {leaderboardData?.period}
            </h3>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Project</th>
                    <th>Total Events</th>
                    <th>Unique Users</th>
                    <th>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData?.projectLeaderboard.map((project, index) => (
                    <tr key={project.projectId} className={index < 3 ? 'bg-base-200' : ''}>
                      <td className="font-bold text-lg">
                        {getRankIcon(index + 1)}
                      </td>
                      <td>
                        <div className="font-semibold">
                          {project.projectName || 'Unnamed Project'}
                        </div>
                        <div className="text-sm text-base-content/70 font-mono">
                          {project.projectId}
                        </div>
                      </td>
                      <td className="font-bold text-primary">
                        {project.totalEvents}
                      </td>
                      <td>
                        <span className="badge badge-outline">
                          {project.uniqueUserCount} users
                        </span>
                      </td>
                      <td className="text-sm">
                        {formatDate(project.lastActivity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {!compact && leaderboardData && (
          <div className="divider"></div>
        )}
        
        {!compact && leaderboardData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">Total Users</div>
              <div className="stat-value text-primary">
                {Math.max(
                  leaderboardData.timeLeaderboard.length,
                  leaderboardData.activityLeaderboard.length
                )}
              </div>
              <div className="stat-desc">with activity in {leaderboardData.period}</div>
            </div>
            
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">Active Projects</div>
              <div className="stat-value text-secondary">
                {leaderboardData.projectLeaderboard.length}
              </div>
              <div className="stat-desc">projects with recent activity</div>
            </div>
            
            <div className="stat bg-base-200 rounded-lg">
              <div className="stat-title">Updated</div>
              <div className="stat-value text-sm">
                {leaderboardData.generatedAt ? formatDate(leaderboardData.generatedAt) : 'Never'}
              </div>
              <div className="stat-desc">last refresh time</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsLeaderboard;
