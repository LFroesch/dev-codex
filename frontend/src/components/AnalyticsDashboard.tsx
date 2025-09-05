import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    loadAnalytics();
  }, [userId, selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = userId 
        ? await analyticsAPI.getAdminAnalytics(userId, selectedPeriod)
        : await analyticsAPI.getUserAnalytics(selectedPeriod);
      setAnalyticsData(data as AnalyticsData);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (milliseconds: number): string => {
    if (!milliseconds || isNaN(milliseconds) || milliseconds < 0) return '0m';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getKeyMetrics = () => {
    if (!analyticsData) return null;

    const projectOpens = analyticsData.eventCounts?.find(e => e._id === 'project_open')?.count || 0;
    const totalTime = analyticsData.sessionStats?.totalDuration || 0;
    const sessions = analyticsData.sessionStats?.totalSessions || 0;
    
    // Calculate unique projects count
    let uniqueProjects = 0;
    if (analyticsData.projectBreakdown && analyticsData.projectBreakdown.length > 0) {
      // Use projectBreakdown if available (more reliable)
      uniqueProjects = analyticsData.projectBreakdown.length;
    } else if (analyticsData.sessionStats?.uniqueProjects) {
      // Fallback to uniqueProjects from sessionStats
      uniqueProjects = Array.isArray(analyticsData.sessionStats.uniqueProjects) 
        ? analyticsData.sessionStats.uniqueProjects.length 
        : 0;
    }

    return { projectOpens, totalTime, sessions, uniqueProjects };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <span>{error}</span>
        <button onClick={loadAnalytics} className="btn btn-sm">
          Retry
        </button>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold mb-2">No Data Yet</h3>
        <p className="text-base-content/60">Start using the app to see your analytics!</p>
      </div>
    );
  }

  const metrics = getKeyMetrics();
  if (!metrics) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">📊 Usage Analytics</h2>
        </div>
          <p className="translate-y-[3px] text-base-content/60">
            Track your productivity and app usage patterns. All data is private and only visible to you.
          </p>
              <button 
                className="btn btn-xs btn-outline"
                onClick={() => {
                  const dataStr = JSON.stringify(analyticsData, null, 2);
                  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                  const exportFileDefaultName = `analytics-${selectedPeriod}days-${new Date().toISOString().split('T')[0]}.json`;
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', exportFileDefaultName);
                  linkElement.click();
                }}
              >
                Export
              </button>
        <select
          className="select select-bordered select-sm"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(Number(e.target.value))}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Compact Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat bg-primary/5 rounded-lg border border-primary/70 p-3">
          <div className="stat-title text-xs text-primary">Total Time</div>
          <div className="stat-value text-primary text-lg">
            {formatDuration(metrics.totalTime)}
          </div>
        </div>

        <div className="stat bg-accent/5 rounded-lg border border-accent/70 p-3">
          <div className="stat-title text-xs text-accent">Unique Projects</div>
          <div className="stat-value text-accent text-lg">
            {metrics.uniqueProjects}
          </div>
        </div>

        <div className="stat bg-info/5 rounded-lg border border-info/70 p-3">
          <div className="stat-title text-xs text-info">Sessions</div>
          <div className="stat-value text-info text-lg">
            {metrics.sessions}
          </div>
        </div>

        <div className="stat bg-secondary/5 rounded-lg border border-secondary/70 p-3">
          <div className="stat-title text-xs text-secondary">Avg Session</div>
          <div className="stat-value text-secondary text-lg">
            {formatDuration(analyticsData.sessionStats?.avgDuration || 0)}
          </div>
        </div>
      </div>

      {/* Project Time Breakdown */}
      {!compact && analyticsData.projectBreakdown && analyticsData.projectBreakdown.length > 0 && (
        <div className="border rounded-lg border-base-content/20">
          <div className="card-body p-4">
            <h3 className="font-semibold mb-3">⏱️ Project Time</h3>
            
            <div className="space-y-2">
              {analyticsData.projectBreakdown
                .sort((a, b) => b.totalTime - a.totalTime)
                .map((project) => (
                <div key={project.projectId} className="flex justify-between items-center p-2 bg-base-200 rounded border border-base-content/20">
                  <div>
                    <div className="font-medium text-sm">
                      {project.projectName}
                    </div>
                    <div className="text-xs text-base-content/60">
                      {project.sessions} sessions
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold">
                      {formatDuration(project.totalTime)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;