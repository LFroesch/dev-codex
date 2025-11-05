import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface AnalyticsData {
  summary: {
    totalEvents: number;
    totalUsers: number;
    totalProjects: number;
    avgSessionDuration: number;
  };
  topUsers: Array<{
    _id: string;
    email?: string;
    totalEvents: number;
    totalSessionTime: number;
    lastActivity: string;
  }>;
  topProjects: Array<{
    _id: string;
    name: string;
    totalActivity: number;
    uniqueUserCount: number;
    lastActivity: string;
  }>;
  timeline: Array<{
    user_id: string;
    user_email?: string;
    event_type: string;
    timestamp: string;
  }>;
}

interface OptimizedAnalyticsProps {
  onResetAnalytics?: () => void;
}

const OptimizedAnalytics: React.FC<OptimizedAnalyticsProps> = ({ onResetAnalytics }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(7);
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  const formatTime = useCallback((seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
    return `${remainingSeconds}s`;
  }, []);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  }, []);

  const styles = `
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animate-fade-in {
      animation: fade-in 0.3s ease-in-out;
    }
  `;

  const fetchAnalytics = useCallback(async (days: number, forceRefresh = false) => {
    if (loading) return;
    
    const now = Date.now();
    if (!forceRefresh && lastFetch && (now - lastFetch) < 30000) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const combinedResponse = await fetch('/api/admin/analytics/combined?days=' + days, {
        credentials: 'include'
      }).then(res => res.json());

      const transformedBasicData = {
        summary: {
          totalEvents: combinedResponse.overview?.totalEvents || 0,
          totalUsers: combinedResponse.overview?.totalUsers || 0,
          totalProjects: combinedResponse.topProjects?.length || 0,
          avgSessionDuration: (combinedResponse.overview?.avgSessionTime || 0) / 1000 // Convert ms to seconds
        },
        topUsers: combinedResponse.topUsers?.map((user: any) => ({
          ...user,
          totalTime: (user.totalTime || 0) / 1000 // Convert ms to seconds
        })) || [],
        topProjects: combinedResponse.topProjects?.map((project: any) => ({
          _id: project.projectId,
          name: project.projectName,
          totalActivity: Math.round((project.totalTime || 0) / 1000), // Convert ms to seconds for total time across all users
          uniqueUserCount: project.uniqueUserCount,
          lastActivity: project.lastActivity
        })) || [],
        timeline: combinedResponse.recentActivity || []
      };

      setData(transformedBasicData);
      setLastFetch(now);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [loading, lastFetch]);

  useEffect(() => {
    fetchAnalytics(selectedPeriod, true);
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAnalytics(selectedPeriod, false);
      }
    }, 300000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const tabContent = useMemo(() => {
    if (!data) {
      return <div className="text-center py-8 text-base-content/60">No analytics data available</div>;
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-base-100/80 backdrop-blur-sm border border-subtle rounded-lg p-3 sm:p-4 hover:shadow-lg hover:border-primary/20 cursor-pointer group">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="text-xl sm:text-2xl group-hover:scale-110">📊</div>
                  <div className="text-xl sm:text-2xl font-bold text-primary">
                    {data?.summary?.totalEvents?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-base-content/60">Total Events</div>
                </div>
              </div>

              <div className="bg-base-100/80 backdrop-blur-sm border border-subtle rounded-lg p-3 sm:p-4 hover:shadow-lg hover:border-success/20 cursor-pointer group">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="text-xl sm:text-2xl group-hover:scale-110">👥</div>
                  <div className="text-xl sm:text-2xl font-bold text-success">
                    {data?.summary?.totalUsers?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-base-content/60">Active Users</div>
                </div>
              </div>

              <div className="bg-base-100/80 backdrop-blur-sm border border-subtle rounded-lg p-3 sm:p-4 hover:shadow-lg hover:border-info/20 cursor-pointer group">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="text-xl sm:text-2xl group-hover:scale-110">🚀</div>
                  <div className="text-xl sm:text-2xl font-bold text-info">
                    {data?.summary?.totalProjects?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-base-content/60">Projects</div>
                </div>
              </div>

              <div className="bg-base-100/80 backdrop-blur-sm border border-subtle rounded-lg p-3 sm:p-4 hover:shadow-lg hover:border-accent/20 cursor-pointer group">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="text-xl sm:text-2xl group-hover:scale-110">⏱️</div>
                  <div className="text-xl sm:text-2xl font-bold text-accent">
                    {data?.summary?.avgSessionDuration ? formatTime(data.summary.avgSessionDuration) : '0s'}
                  </div>
                  <div className="text-xs text-base-content/60">Avg Session</div>
                </div>
              </div>
            </div>

            <div className="bg-base-100/80 backdrop-blur-sm border border-subtle rounded-xl p-4 sm:p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-base-content">Recent Activity Timeline</h3>
                </div>
                <button
                  className="btn btn-outline btn-xs sm:btn-sm bg-base-100/80 backdrop-blur-sm border-subtle shadow-sm hover:shadow-md"
                  onClick={() => fetchAnalytics(selectedPeriod, true)}
                  disabled={loading}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(data?.timeline?.length ?? 0) > 0 ? (
                  data?.timeline?.slice(0, 10).map((event: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-base-200/30 backdrop-blur-sm border border-subtle rounded-lg hover:bg-base-200/50">
                      <div className="text-xl sm:text-2xl flex-shrink-0">{
                        event.event_type === 'feature_usage' ? '🚀' :
                        event.event_type === 'navigation' ? '🧭' :
                        event.event_type === 'page_view' ? '👁️' :
                        event.event_type === 'project_open' ? '📂' :
                        event.event_type === 'session_start' ? '▶️' :
                        event.event_type === 'session_end' ? '⏹️' :
                        '📊'
                      }</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-base-content truncate">
                          {event.user_name || event.user_email || `User ${event.user_id?.slice(-6)}`}
                        </div>
                        <div className="text-xs text-base-content/60 truncate">
                          {event.event_type.replace('_', ' ')} • {formatDate(event.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-base-content/60">No recent activity</div>
                )}
              </div>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="bg-base-100/80 backdrop-blur-sm border border-subtle rounded-xl p-4 sm:p-6 shadow-lg">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-success/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-base-content">Most Active Users (Last {selectedPeriod} days)</h3>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <table className="table table-sm w-full">
                  <thead>
                    <tr className="border-subtle">
                      <th className="bg-base-200/30 text-base-content/70 text-xs sm:text-sm">User</th>
                      <th className="bg-base-200/30 text-base-content/70 text-xs sm:text-sm hidden sm:table-cell">Plan</th>
                      <th className="bg-base-200/30 text-base-content/70 text-xs sm:text-sm">Time Spent</th>
                      <th className="bg-base-200/30 text-base-content/70 text-xs sm:text-sm">Events</th>
                      <th className="bg-base-200/30 text-base-content/70 text-xs sm:text-sm hidden md:table-cell">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.topUsers?.length ?? 0) > 0 ? (
                      data?.topUsers?.map((user: any, index: number) => (
                        <tr key={index} className={`border-subtle hover:bg-base-200/20 ${index < 3 ? 'bg-success/5' : ''}`}>
                          <td>
                            <div className="flex items-center gap-2">
                              {index < 3 && <span className="text-base sm:text-lg">🏆</span>}
                              <div className="min-w-0">
                                <div className="font-medium text-xs sm:text-sm text-base-content truncate">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-xs text-base-content/60 truncate">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell">
                            <span className={`badge badge-xs ${
                              user.planTier === 'pro' ? 'badge-primary' :
                              user.planTier === 'premium' ? 'badge-secondary' : 'badge-ghost'
                            }`}>
                              {user.planTier}
                            </span>
                          </td>
                          <td className="font-mono text-xs sm:text-sm">{formatTime(user.totalTime)}</td>
                          <td>
                            <span className="badge badge-primary badge-xs sm:badge-sm">{user.totalEvents}</span>
                          </td>
                          <td className="text-xs text-base-content/60 hidden md:table-cell">{formatDate(user.lastActivity)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center text-base-content/60 py-8">No user activity data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'projects':
        return (
          <div className="bg-base-100/80 backdrop-blur-sm border border-subtle rounded-xl p-4 sm:p-6 shadow-lg">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-info/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-info" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-base-content">Most Active Projects (Last {selectedPeriod} days)</h3>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <table className="table table-sm w-full">
                  <thead>
                    <tr className="border-subtle">
                      <th className="bg-base-200/30 text-base-content/70 text-xs sm:text-sm">Project</th>
                      <th className="bg-base-200/30 text-base-content/70 text-xs sm:text-sm">Total Time</th>
                      <th className="bg-base-200/30 text-base-content/70 text-xs sm:text-sm">Unique Users</th>
                      <th className="bg-base-200/30 text-base-content/70 text-xs sm:text-sm hidden md:table-cell">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.topProjects?.length ?? 0) > 0 ? (
                      data?.topProjects?.map((project: any, index: number) => (
                        <tr key={index} className={`border-subtle hover:bg-base-200/20 ${index < 3 ? 'bg-success/5' : ''}`}>
                          <td>
                            <div className="flex items-center gap-2">
                              {index < 3 && <span className="text-base sm:text-lg">🏆</span>}
                              <span className="font-medium text-xs sm:text-sm text-base-content truncate">{project.name || project._id}</span>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-primary badge-xs sm:badge-sm">{formatTime(project.totalActivity)}</span>
                          </td>
                          <td>
                            <span className="badge badge-outline badge-xs text-base-content/70">
                              {project.uniqueUserCount} users
                            </span>
                          </td>
                          <td className="text-xs text-base-content/60 hidden md:table-cell">{formatDate(project.lastActivity)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center text-base-content/60 py-8">No project activity data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  }, [data, activeTab, formatTime, formatDate, selectedPeriod]);

  if (loading && !data) {
    return (
      <div className="bg-base-100 border-subtle rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="skeleton h-6 w-48"></div>
          <div className="skeleton h-8 w-24"></div>
        </div>
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <div className="skeleton h-8 w-20"></div>
          <div className="skeleton h-8 w-20"></div>
          <div className="skeleton h-8 w-20"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-20 sm:h-24 w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-base-100 border-subtle rounded-xl shadow-lg p-4 sm:p-6">
        <div className="text-center py-8">
          <div className="text-error text-3xl sm:text-4xl mb-4">⚠️</div>
          <div className="text-error text-base sm:text-lg font-semibold mb-2">Analytics Error</div>
          <div className="text-base-content/60 text-xs sm:text-sm mb-4 px-4">{error}</div>
          <button
            className="btn btn-primary btn-xs sm:btn-sm"
            onClick={() => fetchAnalytics(selectedPeriod, true)}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className=" rounded-xl shadow-lg">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-content" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-base-content">Platform Analytics</h2>
                <p className="text-xs sm:text-sm text-base-content/60">Comprehensive insights and metrics</p>
              </div>
              {loading && <span className="loading loading-spinner loading-sm text-primary"></span>}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <select
                className="select select-bordered select-xs sm:select-sm bg-base-100/80 backdrop-blur-sm shadow-sm border-subtle w-full sm:w-auto"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>

              <div className="flex gap-2">
                <button
                  className="btn btn-outline btn-xs sm:btn-sm bg-base-100/80 backdrop-blur-sm border-subtle shadow-sm hover:shadow-md flex-1 sm:flex-none"
                  onClick={() => fetchAnalytics(selectedPeriod, true)}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                {onResetAnalytics && (
                  <button
                    className="btn btn-error btn-xs sm:btn-sm shadow-sm hover:shadow-md flex-1 sm:flex-none"
                    onClick={onResetAnalytics}
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="hidden sm:inline">Reset Data</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4 overflow-x-auto -mx-4 sm:mx-0">
            <div className="flex justify-center px-4 sm:px-2">
              <div className="tabs-container p-1 bg-base-200/50 backdrop-blur-sm border-subtle flex max-w-4xl min-w-min">
                <button
                  className={`tab-button-admin px-3 sm:px-6 py-2 ${activeTab === 'overview' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  <span className="mr-1 hidden xs:inline">📈</span>
                  <span className="hidden sm:inline">Overview</span>
                  <span className="sm:hidden">Overview</span>
                </button>
                <button
                  className={`tab-button-admin px-3 sm:px-6 py-2 ${activeTab === 'users' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('users')}
                >
                  <span className="mr-1 hidden xs:inline">👥</span>
                  <span className="hidden sm:inline">Top Users</span>
                  <span className="sm:hidden">Users</span>
                </button>
                <button
                  className={`tab-button-admin px-3 sm:px-6 py-2 ${activeTab === 'projects' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('projects')}
                >
                  <span className="mr-1 hidden xs:inline">🚀</span>
                  <span className="hidden sm:inline">Top Projects</span>
                  <span className="sm:hidden">Projects</span>
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-[300px] relative">
            {loading && data && (
              <div className="absolute inset-0 bg-base-100/50 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            )}
            <div className="animate-fade-in">
              {tabContent}
            </div>
          </div>

          <div className="text-xs text-base-content/50 text-center mt-6 pt-4 border-t border-subtle px-2">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2">
              <span>Last updated: {lastFetch ? new Date(lastFetch).toLocaleTimeString() : 'Never'}</span>
              <span className="hidden sm:inline">•</span>
              <span>Auto-refresh every 30 seconds</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OptimizedAnalytics;
