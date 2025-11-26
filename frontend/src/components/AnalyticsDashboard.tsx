import React, { useState, useEffect, useCallback } from 'react';
import { analyticsAPI } from '../api';

interface AnalyticsData {
  eventCounts: Array<{
    _id: string;
    count: number;
    lastEvent: string;
  }>;
  sessionStats: {
    totalSessions: number;
    totalDuration: number;
    avgDuration: number;
    uniqueProjects: string[][];
  };
  projectBreakdown?: Array<{
    projectId: string;
    projectName: string;
    totalTime: number;
    sessions: number;
    lastUsed: string;
  }>;
  period: string;
}

interface AnalyticsDashboardProps {
  userId?: string;
  compact?: boolean;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  userId,
  compact = false
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = userId
        ? await analyticsAPI.getAdminAnalytics(userId, selectedPeriod)
        : await analyticsAPI.getUserAnalytics(selectedPeriod);
      setAnalyticsData(data as AnalyticsData);
    } catch (err) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [userId, selectedPeriod]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const formatTime = (milliseconds: number): { value: number; unit: string; full: string } => {
    if (!milliseconds || isNaN(milliseconds) || milliseconds < 0) {
      return { value: 0, unit: 'min', full: '0 minutes' };
    }

    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return {
        value: hours,
        unit: hours === 1 ? 'hour' : 'hours',
        full: minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
      };
    }
    return {
      value: minutes,
      unit: minutes === 1 ? 'minute' : 'minutes',
      full: `${minutes}m`
    };
  };

  const getKeyMetrics = () => {
    if (!analyticsData) return null;

    const projectOpens = analyticsData.eventCounts?.find(e => e._id === 'project_open')?.count || 0;
    const totalTime = analyticsData.sessionStats?.totalDuration || 0;
    const sessions = analyticsData.sessionStats?.totalSessions || 0;

    let uniqueProjects = 0;
    if (analyticsData.projectBreakdown && analyticsData.projectBreakdown.length > 0) {
      uniqueProjects = analyticsData.projectBreakdown.length;
    } else if (analyticsData.sessionStats?.uniqueProjects) {
      uniqueProjects = Array.isArray(analyticsData.sessionStats.uniqueProjects)
        ? analyticsData.sessionStats.uniqueProjects.length
        : 0;
    }

    return { projectOpens, totalTime, sessions, uniqueProjects };
  };

  const getProjectPercentage = (projectTime: number, totalTime: number): number => {
    if (!totalTime || totalTime === 0) return 0;
    return Math.round((projectTime / totalTime) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-sm text-base-content/60">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error shadow-lg">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div>
          <h3 className="font-bold">Error loading analytics</h3>
          <div className="text-sm">{error}</div>
        </div>
        <button onClick={loadAnalytics} className="btn btn-sm btn-ghost">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Retry
        </button>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center p-12 bg-base-200/50 rounded-lg border-2 border-base-content/10">
        <div className="mb-6">
          <svg className="w-24 h-24 mx-auto text-base-content/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">No analytics data yet</h3>
        <p className="text-base-content/60 max-w-md mx-auto">
          Start using the app and your usage analytics will appear here. Track your time, sessions, and productivity patterns.
        </p>
      </div>
    );
  }

  const metrics = getKeyMetrics();
  if (!metrics) return null;

  const totalTimeFormatted = formatTime(metrics.totalTime);
  const avgTimeFormatted = formatTime(analyticsData.sessionStats?.avgDuration || 0);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
            <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Usage Analytics
          </h2>
          <p className="text-sm text-base-content/60 max-w-2xl">
            Track your productivity and app usage patterns over time. All data is private and only visible to you.
          </p>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <select
            className="select select-bordered select-sm font-medium"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
            <option value={99999}>All time</option>
          </select>

          <button
            className="btn btn-sm btn-outline gap-2"
            onClick={() => {
              const dataStr = JSON.stringify(analyticsData, null, 2);
              const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
              const periodLabel = selectedPeriod >= 99999 ? 'alltime' : `${selectedPeriod}days`;
              const exportFileDefaultName = `analytics-${periodLabel}-${new Date().toISOString().split('T')[0]}.json`;
              const linkElement = document.createElement('a');
              linkElement.setAttribute('href', dataUri);
              linkElement.setAttribute('download', exportFileDefaultName);
              linkElement.click();
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Time */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-5 border-2 border-primary/20 hover:border-primary/40 transition-all shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-sm font-medium text-base-content/70 mb-1">Total Time</div>
          <div className="text-3xl font-bold text-primary mb-1">
            {totalTimeFormatted.value}
            <span className="text-lg ml-1 text-primary/70">{totalTimeFormatted.unit}</span>
          </div>
          <div className="text-xs text-base-content/50">{totalTimeFormatted.full} tracked</div>
        </div>

        {/* Active Projects */}
        <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl p-5 border-2 border-accent/20 hover:border-accent/40 transition-all shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-accent/20 rounded-lg">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
          </div>
          <div className="text-sm font-medium text-base-content/70 mb-1">Active Projects</div>
          <div className="text-3xl font-bold text-accent mb-1">
            {metrics.uniqueProjects}
          </div>
          <div className="text-xs text-base-content/50">
            {metrics.uniqueProjects === 1 ? 'project' : 'projects'} worked on
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-gradient-to-br from-info/10 to-info/5 rounded-xl p-5 border-2 border-info/20 hover:border-info/40 transition-all shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-info/20 rounded-lg">
              <svg className="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="text-sm font-medium text-base-content/70 mb-1">Total Sessions</div>
          <div className="text-3xl font-bold text-info mb-1">
            {metrics.sessions}
          </div>
          <div className="text-xs text-base-content/50">work sessions started</div>
        </div>

        {/* Average Session */}
        <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-xl p-5 border-2 border-secondary/20 hover:border-secondary/40 transition-all shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-secondary/20 rounded-lg">
              <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="text-sm font-medium text-base-content/70 mb-1">Avg Session</div>
          <div className="text-3xl font-bold text-secondary mb-1">
            {avgTimeFormatted.value}
            <span className="text-lg ml-1 text-secondary/70">{avgTimeFormatted.unit}</span>
          </div>
          <div className="text-xs text-base-content/50">per session</div>
        </div>
      </div>

      {/* Project Time Breakdown */}
      {!compact && analyticsData.projectBreakdown && analyticsData.projectBreakdown.length > 0 && (
        <div className="bg-base-100 rounded-xl border-2 border-base-content/10 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-base-content/10">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Project Breakdown
            </h3>
            <p className="text-sm text-base-content/60 mt-1">
              Time spent on each project during this period
            </p>
          </div>

          <div className="p-5">
            <div className="space-y-4">
              {analyticsData.projectBreakdown
                .sort((a, b) => b.totalTime - a.totalTime)
                .map((project, index) => {
                  const percentage = getProjectPercentage(project.totalTime, metrics.totalTime);
                  const timeData = formatTime(project.totalTime);

                  return (
                    <div key={project.projectId} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate group-hover:text-primary transition-colors">
                              {project.projectName}
                            </div>
                            <div className="text-xs text-base-content/60">
                              {project.sessions} {project.sessions === 1 ? 'session' : 'sessions'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <div className="font-mono font-bold text-lg">
                            {timeData.value}
                            <span className="text-sm text-base-content/60 ml-1">{timeData.unit}</span>
                          </div>
                          <div className="text-xs text-base-content/50">
                            {percentage}% of total
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-base-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary to-primary/70 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* No Projects Message */}
      {!compact && (!analyticsData.projectBreakdown || analyticsData.projectBreakdown.length === 0) && (
        <div className="bg-base-200/50 rounded-xl border-2 border-dashed border-base-content/10 p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-base-content/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h4 className="font-semibold text-base-content/70 mb-1">No project activity</h4>
          <p className="text-sm text-base-content/50">
            Start working on projects to see detailed time breakdowns here
          </p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
