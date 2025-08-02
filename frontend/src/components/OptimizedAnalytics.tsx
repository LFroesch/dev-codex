import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Add CSS animations
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
`;

interface CombinedAnalyticsData {
  overview: {
    totalUsers: number;
    totalSessions: number;
    totalEvents: number;
    avgSessionTime: number;
    totalTimeSpent: number;
  };
  topUsers: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    planTier: string;
    totalTime: number;
    totalEvents: number;
    fieldEdits: number;
    lastActivity: string;
  }>;
  topProjects: Array<{
    projectId: string;
    projectName: string;
    totalEvents: number;
    uniqueUserCount: number;
    lastActivity: string;
  }>;
  recentActivity: Array<{
    type: string;
    count: number;
    period: string;
  }>;
}

interface OptimizedAnalyticsProps {
  onResetAnalytics?: () => void;
}

// Simple cache with 5-minute expiry
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const OptimizedAnalytics: React.FC<OptimizedAnalyticsProps> = ({ onResetAnalytics }) => {
  const [data, setData] = useState<CombinedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'projects'>('overview');
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Cache-aware fetch function
  const fetchAnalytics = useCallback(async (days: number, force = false) => {
    const cacheKey = `analytics_${days}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();

    // Use cache if valid and not forced
    if (!force && cached && (now - cached.timestamp) < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Single API call for all analytics data
      const response = await fetch(`/api/admin/analytics/combined?days=${days}&limit=10`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to load analytics');
      
      const analyticsData = await response.json();
      
      // Cache the data
      cache.set(cacheKey, { data: analyticsData, timestamp: now });
      setData(analyticsData);
      setLastFetch(now);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced effect for period changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnalytics(selectedPeriod);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [selectedPeriod, fetchAnalytics]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastFetch > 2 * 60 * 1000) { // 2 minutes
        fetchAnalytics(selectedPeriod, true);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [selectedPeriod, lastFetch, fetchAnalytics]);

  const formatTime = useCallback((milliseconds: number) => {
    if (!milliseconds) return '0m';
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Memoized tab content
  const tabContent = useMemo(() => {
    if (!data) return null;

    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="stat bg-primary/5 rounded-lg p-3 border border-primary/10">
              <div className="stat-title text-xs">Users</div>
              <div className="stat-value text-lg text-primary">{data.overview.totalUsers}</div>
            </div>
            <div className="stat bg-secondary/5 rounded-lg p-3 border border-secondary/10">
              <div className="stat-title text-xs">Sessions</div>
              <div className="stat-value text-lg text-secondary">{data.overview.totalSessions}</div>
            </div>
            <div className="stat bg-accent/5 rounded-lg p-3 border border-accent/10">
              <div className="stat-title text-xs">Events</div>
              <div className="stat-value text-lg text-accent">{data.overview.totalEvents}</div>
            </div>
            <div className="stat bg-info/5 rounded-lg p-3 border border-info/10">
              <div className="stat-title text-xs">Avg Session</div>
              <div className="stat-value text-lg text-info">{formatTime(data.overview.avgSessionTime)}</div>
            </div>
            <div className="stat bg-success/5 rounded-lg p-3 border border-success/10">
              <div className="stat-title text-xs">Total Time</div>
              <div className="stat-value text-lg text-success">{formatTime(data.overview.totalTimeSpent)}</div>
            </div>
          </div>
        );
      
      case 'users':
        return (
          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Time</th>
                  <th>Events</th>
                  <th>Edits</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((user, index) => (
                  <tr key={user.userId} className={index < 3 ? 'bg-base-200/50' : ''}>
                    <td>
                      <div>
                        <div className="font-medium text-sm">{user.firstName} {user.lastName}</div>
                        <div className="text-xs opacity-60">{user.email}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-xs ${
                        user.planTier === 'pro' ? 'badge-primary' : 
                        user.planTier === 'enterprise' ? 'badge-secondary' : 'badge-ghost'
                      }`}>
                        {user.planTier}
                      </span>
                    </td>
                    <td className="font-mono text-sm">{formatTime(user.totalTime)}</td>
                    <td className="font-semibold">{user.totalEvents}</td>
                    <td>{user.fieldEdits}</td>
                    <td className="text-xs">{formatDate(user.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      case 'projects':
        return (
          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Events</th>
                  <th>Users</th>
                  <th>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {data.topProjects.map((project, index) => (
                  <tr key={project.projectId} className={index < 3 ? 'bg-base-200/50' : ''}>
                    <td>
                      <div className="font-medium text-sm">{project.projectName || 'Unnamed Project'}</div>
                      <div className="text-xs opacity-60 font-mono">{project.projectId}</div>
                    </td>
                    <td className="font-semibold">{project.totalEvents}</td>
                    <td>
                      <span className="badge badge-outline badge-xs">
                        {project.uniqueUserCount} users
                      </span>
                    </td>
                    <td className="text-xs">{formatDate(project.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      default:
        return null;
    }
  }, [data, activeTab, formatTime, formatDate]);

  if (loading && !data) {
    return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-4">
          {/* Skeleton header */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="skeleton h-6 w-48"></div>
            </div>
            <div className="skeleton h-8 w-24"></div>
          </div>
          
          {/* Skeleton tabs */}
          <div className="flex gap-2 mb-4">
            <div className="skeleton h-8 w-20"></div>
            <div className="skeleton h-8 w-20"></div>
            <div className="skeleton h-8 w-20"></div>
          </div>
          
          {/* Skeleton content */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-16 w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="alert alert-error">
            <span>{error}</span>
            <button onClick={() => fetchAnalytics(selectedPeriod, true)} className="btn btn-sm">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-4">
          {/* Compact Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="card-title text-xl flex items-center gap-2">
              📊 Platform Analytics
              {loading && <span className="loading loading-spinner loading-sm"></span>}
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <select 
                className="select select-bordered select-sm"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
              
              <div className="flex gap-1">
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => fetchAnalytics(selectedPeriod, true)}
                >
                  🔄
                </button>
                {onResetAnalytics && (
                  <button 
                    className="btn btn-error btn-sm gap-1"
                    onClick={onResetAnalytics}
                  >
                    🗑️ Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Compact Tabs */}
          <div className="tabs tabs-boxed tabs-sm mb-4">
            <button 
              className={`tab tab-sm ${activeTab === 'overview' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📈 Overview
            </button>
            <button 
              className={`tab tab-sm ${activeTab === 'users' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 Top Users
            </button>
            <button 
              className={`tab tab-sm ${activeTab === 'projects' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              🚀 Top Projects
            </button>
          </div>

          {/* Content */}
          <div className="min-h-[200px] transition-all duration-200 ease-in-out">
            {loading && data && (
              <div className="absolute inset-0 bg-base-100/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                <span className="loading loading-spinner loading-md"></span>
              </div>
            )}
            <div className="animate-fade-in">
              {tabContent}
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-xs opacity-50 text-center mt-4">
            Last updated: {lastFetch ? new Date(lastFetch).toLocaleTimeString() : 'Never'} • Auto-refresh: 2min
          </div>
        </div>
      </div>
    </>
  );
};

export default OptimizedAnalytics;