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
      setAnalyticsData(data);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (milliseconds: number): string => {
    if (!milliseconds) return '0m';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getKeyMetrics = () => {
    if (!analyticsData) return null;

    const fieldEdits = analyticsData.eventCounts?.find(e => e._id === 'field_edit')?.count || 0;
    const projectOpens = analyticsData.eventCounts?.find(e => e._id === 'project_open')?.count || 0;
    const totalTime = analyticsData.sessionStats?.totalDuration || 0;
    const sessions = analyticsData.sessionStats?.totalSessions || 0;

    return { fieldEdits, projectOpens, totalTime, sessions };
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
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📊 Usage Overview</h2>
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

      {/* Key Metrics - Clean & Simple */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-primary/10 rounded-xl border border-primary/20">
          <div className="stat-figure text-primary">
            <div className="text-3xl">⏱️</div>
          </div>
          <div className="stat-title text-primary">Total Time</div>
          <div className="stat-value text-primary text-2xl">
            {formatDuration(metrics.totalTime)}
          </div>
        </div>

        <div className="stat bg-secondary/10 rounded-xl border border-secondary/20">
          <div className="stat-figure text-secondary">
            <div className="text-3xl">✏️</div>
          </div>
          <div className="stat-title text-secondary">Edits Made</div>
          <div className="stat-value text-secondary text-2xl">
            {metrics.fieldEdits}
          </div>
        </div>

        <div className="stat bg-accent/10 rounded-xl border border-accent/20">
          <div className="stat-figure text-accent">
            <div className="text-3xl">📂</div>
          </div>
          <div className="stat-title text-accent">Projects Opened</div>
          <div className="stat-value text-accent text-2xl">
            {metrics.projectOpens}
          </div>
        </div>

        <div className="stat bg-info/10 rounded-xl border border-info/20">
          <div className="stat-figure text-info">
            <div className="text-3xl">🚀</div>
          </div>
          <div className="stat-title text-info">Sessions</div>
          <div className="stat-value text-info text-2xl">
            {metrics.sessions}
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      {!compact && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">📈 Quick Insights</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Average Session:</span>
                  <span className="font-semibold">
                    {formatDuration(analyticsData.sessionStats?.avgDuration || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Edits per Session:</span>
                  <span className="font-semibold">
                    {metrics.sessions > 0 ? Math.round(metrics.fieldEdits / metrics.sessions) : 0}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Projects Used:</span>
                  <span className="font-semibold">
                    {analyticsData.sessionStats?.uniqueProjects?.[0]?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Period:</span>
                  <span className="font-semibold">{selectedPeriod} days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export (Simplified) */}
      {!compact && (
        <div className="flex justify-end">
          <button 
            className="btn btn-outline btn-sm gap-2"
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-4-4m4 4l4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Export Data
          </button>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;