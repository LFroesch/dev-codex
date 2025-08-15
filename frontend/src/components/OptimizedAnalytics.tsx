import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { analyticsAPI } from '../api/analytics';

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
    totalTime: number;
    totalEvents?: number;
    uniqueUserCount: number;
    sessions: number;
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

// Simple cache with shorter expiry for real-time updates
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

const OptimizedAnalytics: React.FC<OptimizedAnalyticsProps> = ({ onResetAnalytics }) => {
  const [data, setData] = useState<CombinedAnalyticsData | null>(null);
  const [comprehensiveData, setComprehensiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'projects' | 'features'>('overview');
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [projectUserData, setProjectUserData] = useState<{[projectId: string]: any}>({});
  const [loadingProjectData, setLoadingProjectData] = useState<string | null>(null);

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

      // Fetch both regular analytics and comprehensive data
      const [analyticsResponse, comprehensiveResponse] = await Promise.all([
        fetch(`/api/admin/analytics/combined?days=${days}&limit=10`, {
          credentials: 'include'
        }),
        analyticsAPI.getComprehensive(days).catch(() => ({ featureUsage: [], navigation: [], searches: [], errors: [], summary: {} }))
      ]);

      if (!analyticsResponse.ok) throw new Error('Failed to load analytics');
      
      const analyticsData = await analyticsResponse.json();
      
      // Cache the data
      cache.set(cacheKey, { data: analyticsData, timestamp: now });
      setData(analyticsData);
      setComprehensiveData(comprehensiveResponse);
      setLastFetch(now);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user breakdown for a specific project
  const fetchProjectUserData = useCallback(async (projectId: string) => {
    try {
      setLoadingProjectData(projectId);
      console.log('Fetching team time for project:', projectId);
      const response = await analyticsAPI.getProjectTeamTime(projectId, selectedPeriod);
      console.log('Team time response:', response);
      setProjectUserData(prev => {
        const newData = {
          ...prev,
          [projectId]: response.teamTimeData || []
        };
        console.log('Updated projectUserData:', newData);
        return newData;
      });
    } catch (error) {
      console.error('Failed to fetch project user data:', error);
    } finally {
      setLoadingProjectData(null);
    }
  }, [selectedPeriod]);

  // Handle project expand/collapse
  const toggleProject = useCallback(async (projectId: string, uniqueUserCount: number) => {
    console.log('Toggle project clicked:', projectId, uniqueUserCount);
    console.log('Current expandedProject:', expandedProject);
    console.log('Current projectUserData:', projectUserData);
    
    if (uniqueUserCount < 2) return; // Don't expand single-user projects
    
    if (expandedProject === projectId) {
      console.log('Collapsing project');
      setExpandedProject(null);
    } else {
      console.log('Expanding project');
      setExpandedProject(projectId);
      if (!projectUserData[projectId]) {
        console.log('Fetching user data for project:', projectId);
        await fetchProjectUserData(projectId);
      }
    }
  }, [expandedProject, projectUserData, fetchProjectUserData]);

  // Debounced effect for period changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnalytics(selectedPeriod);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [selectedPeriod, fetchAnalytics]);

  // Force refresh when switching to features tab
  useEffect(() => {
    if (activeTab === 'features') {
      fetchAnalytics(selectedPeriod, true);
    }
  }, [activeTab, selectedPeriod, fetchAnalytics]);

  // Auto-refresh every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastFetch > 30 * 1000) { // 30 seconds
        fetchAnalytics(selectedPeriod, true);
      }
    }, 10000); // Check every 10 seconds

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
                  <th>Time Spent</th>
                  <th>Sessions</th>
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
                    <td>
                      <div className="font-mono font-semibold text-primary">
                        {formatTime(project.totalTime)}
                      </div>
                      <div className="text-xs opacity-60">
                        Avg: {formatTime(project.totalTime / (project.sessions || 1))}
                      </div>
                    </td>
                    <td className="font-semibold">{project.sessions}</td>
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

      case 'features':
        return (
          <div className="space-y-6">
            
            {/* Quick Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="stat bg-primary/10 rounded-lg p-4">
                <div className="stat-title text-xs">Feature Usage</div>
                <div className="stat-value text-lg">{comprehensiveData?.summary?.totalFeatureUsage || 0}</div>
                <div className="stat-desc">Total interactions</div>
              </div>
              <div className="stat bg-secondary/10 rounded-lg p-4">
                <div className="stat-title text-xs">Navigation Events</div>
                <div className="stat-value text-lg">{comprehensiveData?.summary?.totalNavigationEvents || 0}</div>
                <div className="stat-desc">User flows tracked</div>
              </div>
              <div className="stat bg-accent/10 rounded-lg p-4">
                <div className="stat-title text-xs">Search Queries</div>
                <div className="stat-value text-lg">{comprehensiveData?.summary?.totalSearches || 0}</div>
                <div className="stat-desc">Search interactions</div>
              </div>
              <div className="stat bg-warning/10 rounded-lg p-4">
                <div className="stat-title text-xs">Errors Tracked</div>
                <div className="stat-value text-lg">{comprehensiveData?.summary?.totalErrors || 0}</div>
                <div className="stat-desc">Issues logged</div>
              </div>
              <div className="stat bg-info/10 rounded-lg p-4">
                <div className="stat-title text-xs">Performance</div>
                <div className="stat-value text-lg">{comprehensiveData?.summary?.totalPerformanceEvents || 0}</div>
                <div className="stat-desc">Metrics tracked</div>
              </div>
              <div className="stat bg-success/10 rounded-lg p-4">
                <div className="stat-title text-xs">UI Interactions</div>
                <div className="stat-value text-lg">{comprehensiveData?.summary?.totalUIInteractions || 0}</div>
                <div className="stat-desc">User actions</div>
              </div>
            </div>

            {/* Tracking Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Feature Usage Tracking */}
              <div className="card bg-base-100 shadow-sm border-l-4 border-l-primary">
                <div className="card-body">
                  <h3 className="card-title text-sm">🎯 Feature Usage</h3>
                  <div className="space-y-2 text-xs">
                    {comprehensiveData?.featureUsage?.length > 0 ? (
                      comprehensiveData.featureUsage.slice(0, 5).map((item: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span>{item.feature_name || 'Unknown Feature'}</span>
                          <span className="badge badge-primary badge-xs">{item.usage_count}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs opacity-70">
                        No feature usage data recorded in the selected time period.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Tracking */}
              <div className="card bg-base-100 shadow-sm border-l-4 border-l-secondary">
                <div className="card-body">
                  <h3 className="card-title text-sm">🧭 Navigation Flow</h3>
                  <div className="space-y-2 text-xs">
                    {comprehensiveData?.navigation?.length > 0 ? (
                      <>
                        <div>Top Paths:</div>
                        {comprehensiveData.navigation.slice(0, 3).map((item: any, index: number) => (
                          <div key={index} className="bg-base-200 p-2 rounded font-mono">
                            {item.from_page || 'Unknown'} → {item.to_page || 'Unknown'} ({item.count})
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-xs opacity-70">
                        No navigation data recorded in the selected time period.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Performance Tracking */}
              <div className="card bg-base-100 shadow-sm border-l-4 border-l-accent">
                <div className="card-body">
                  <h3 className="card-title text-sm">⚡ Performance</h3>
                  <div className="space-y-2 text-xs">
                    {comprehensiveData?.performance?.length > 0 ? (
                      comprehensiveData.performance.slice(0, 3).map((item: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span>{item.action_type || 'Unknown Action'}</span>
                          <span className={`badge badge-xs ${item.avg_duration > 2000 ? 'badge-error' : item.avg_duration > 1000 ? 'badge-warning' : 'badge-success'}`}>
                            {item.avg_duration}ms
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs opacity-70">
                        No performance data recorded in the selected time period.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Tracking */}
              <div className="card bg-base-100 shadow-sm border-l-4 border-l-error">
                <div className="card-body">
                  <h3 className="card-title text-sm">🚨 Error Monitoring</h3>
                  <div className="space-y-2 text-xs">
                    {comprehensiveData?.errors?.length > 0 ? (
                      comprehensiveData.errors.slice(0, 3).map((item: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span>{item.error_type || 'Unknown Error'}</span>
                          <span className={`badge badge-xs ${item.error_count > 10 ? 'badge-error' : 'badge-warning'}`}>
                            {item.error_count}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs opacity-70">
                        No errors recorded in the selected time period.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* UI Interaction Tracking */}
              <div className="card bg-base-100 shadow-sm border-l-4 border-l-info">
                <div className="card-body">
                  <h3 className="card-title text-sm">👆 UI Interactions</h3>
                  <div className="space-y-2 text-xs">
                    {comprehensiveData?.uiInteractions?.length > 0 ? (
                      comprehensiveData.uiInteractions.slice(0, 3).map((item: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span>{item.interaction_type || 'Unknown Interaction'}</span>
                          <span className="badge badge-info badge-xs">{item.interaction_count}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs opacity-70">
                        No UI interactions recorded in the selected time period.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Search Analytics */}
              <div className="card bg-base-100 shadow-sm border-l-4 border-l-warning">
                <div className="card-body">
                  <h3 className="card-title text-sm">🔍 Search Analytics</h3>
                  <div className="space-y-2 text-xs">
                    {comprehensiveData?.searches?.length > 0 ? (
                      <>
                        <div>Top Searches:</div>
                        <div className="space-y-1">
                          {comprehensiveData.searches.slice(0, 3).map((item: any, index: number) => (
                            <div key={index} className="flex justify-between">
                              <span>"{item.search_term || 'Empty Query'}"</span>
                              <span className="badge badge-warning badge-xs">{item.search_count}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs opacity-70">
                          {comprehensiveData.searches.filter((item: any) => item.avg_results === 0).length} searches with 0 results
                        </div>
                      </>
                    ) : (
                      <div className="text-xs opacity-70">
                        No search data recorded in the selected time period.
                      </div>
                    )}
                </div>
              </div>
            </div>     
          </div>
        </div>
        );
      
      default:
        return null;
    }
  }, [data, comprehensiveData, activeTab, formatTime, formatDate]);

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
      <div className="card bg-base-100 border border-base-content/10 shadow-lg">
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
          <div className="flex justify-center mb-4">
            <div className="tabs tabs-boxed tabs-lg bg-base-200 shadow-lg border border-base-content/10">
              <button 
                className={`tab tab-lg font-bold text-base ${activeTab === 'overview' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                📈 Overview
              </button>
              <button 
                className={`tab tab-lg font-bold text-base ${activeTab === 'users' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                👥 Top Users
              </button>
              <button 
                className={`tab tab-lg font-bold text-base ${activeTab === 'projects' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('projects')}
              >
                🚀 Top Projects
              </button>
              <button 
                className={`tab tab-lg font-bold text-base ${activeTab === 'features' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('features')}
              >
                📊 All Tracking
              </button>
            </div>
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
            Last updated: {lastFetch ? new Date(lastFetch).toLocaleTimeString() : 'Never'} • Auto-refresh: 30s
          </div>
        </div>
      </div>
    </>
  );
};

export default OptimizedAnalytics;