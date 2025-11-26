import React, { useEffect, useState, useCallback } from 'react';
import { PlanBadge, LoadingSkeleton } from '../shared';

interface FeatureData {
  name: string;
  totalUsers: number;
  totalUsage: number;
  avgUsagePerUser: string;
  adoptionRate: string;
  byPlan: {
    [key: string]: {
      users: number;
      percentage: string;
    };
  };
}

interface FeatureAdoptionProps {
  days?: number;
}

type SortField = 'name' | 'users' | 'usage' | 'adoption';
type SortOrder = 'asc' | 'desc';

/**
 * FeatureAdoption component showing which features are most used
 * Includes breakdown by plan tier with improved UX
 */
const FeatureAdoption: React.FC<FeatureAdoptionProps> = ({ days = 30 }) => {
  const [features, setFeatures] = useState<FeatureData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('adoption');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const fetchFeatureAdoption = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/features/adoption?days=${days}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feature adoption');
      }

      const result = await response.json();
      setFeatures(result.features || []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchFeatureAdoption();
  }, [fetchFeatureAdoption]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedFeatures = [...features].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (sortField) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'users':
        aVal = a.totalUsers;
        bVal = b.totalUsers;
        break;
      case 'usage':
        aVal = a.totalUsage;
        bVal = b.totalUsage;
        break;
      case 'adoption':
        aVal = parseFloat(a.adoptionRate);
        bVal = parseFloat(b.adoptionRate);
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const getAdoptionColor = (rate: string) => {
    const val = parseFloat(rate);
    if (val >= 75) return 'bg-success';
    if (val >= 50) return 'bg-primary';
    if (val >= 25) return 'bg-warning';
    return 'bg-error';
  };

  const getAdoptionBadge = (rate: string) => {
    const val = parseFloat(rate);
    if (val >= 75) return { text: 'High', class: 'badge-success' };
    if (val >= 50) return { text: 'Good', class: 'badge-primary' };
    if (val >= 25) return { text: 'Medium', class: 'badge-warning' };
    return { text: 'Low', class: 'badge-error' };
  };

  if (loading) {
    return <LoadingSkeleton type="card" />;
  }

  if (features.length === 0) {
    return (
      <div className="card bg-base-100 shadow-lg border-2 border-base-content/20">
        <div className="card-body">
          <h3 className="card-title">Feature Adoption</h3>
          <p className="text-base-content/70">No feature usage data available yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-lg border-2 border-base-content/20">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="card-title">Feature Adoption</h3>
            <p className="text-sm text-base-content/70">
              Most used features in the last {days === 9999 ? 'all time' : `${days} days`}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="btn-group">
              <button
                className={`btn btn-sm ${viewMode === 'cards' ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setViewMode('cards')}
                title="Card view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setViewMode('table')}
                title="Table view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'cards' ? (
          <>
            {/* Sort Controls for Cards */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                className={`btn btn-xs ${sortField === 'adoption' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleSort('adoption')}
              >
                Adoption {sortField === 'adoption' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              <button
                className={`btn btn-xs ${sortField === 'users' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleSort('users')}
              >
                Users {sortField === 'users' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              <button
                className={`btn btn-xs ${sortField === 'usage' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleSort('usage')}
              >
                Usage {sortField === 'usage' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              <button
                className={`btn btn-xs ${sortField === 'name' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleSort('name')}
              >
                Name {sortField === 'name' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
            </div>

            {/* Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedFeatures.map((feature, index) => {
                const badge = getAdoptionBadge(feature.adoptionRate);
                return (
                  <div
                    key={index}
                    className="card bg-base-200 border-2 border-base-content/10 hover:border-primary/50 transition-all"
                  >
                    <div className="card-body p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-bold text-base">{feature.name}</h4>
                        <div className={`badge ${badge.class} badge-sm`}>
                          {badge.text}
                        </div>
                      </div>

                      {/* Adoption Rate - Large Visual */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-base-content/60">Adoption Rate</span>
                          <span className="text-lg font-bold">{feature.adoptionRate}%</span>
                        </div>
                        <div className="w-full bg-base-300 rounded-full h-3">
                          <div
                            className={`${getAdoptionColor(feature.adoptionRate)} h-3 rounded-full transition-all`}
                            style={{ width: `${Math.min(parseFloat(feature.adoptionRate), 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                        <div className="bg-base-300 rounded p-2">
                          <div className="text-xs text-base-content/60">Users</div>
                          <div className="font-bold">{feature.totalUsers.toLocaleString()}</div>
                        </div>
                        <div className="bg-base-300 rounded p-2">
                          <div className="text-xs text-base-content/60">Usage</div>
                          <div className="font-bold">{feature.totalUsage.toLocaleString()}</div>
                        </div>
                        <div className="bg-base-300 rounded p-2">
                          <div className="text-xs text-base-content/60">Avg/User</div>
                          <div className="font-bold">{feature.avgUsagePerUser}</div>
                        </div>
                      </div>

                      {/* Plan Breakdown */}
                      <div>
                        <div className="text-xs text-base-content/60 mb-2">By Plan</div>
                        <div className="space-y-1">
                          {feature.byPlan.free && (
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <PlanBadge plan="free" size="sm" />
                              </div>
                              <span className="font-semibold">
                                {feature.byPlan.free.users} users ({feature.byPlan.free.percentage}%)
                              </span>
                            </div>
                          )}
                          {feature.byPlan.pro && (
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <PlanBadge plan="pro" size="sm" />
                              </div>
                              <span className="font-semibold">
                                {feature.byPlan.pro.users} users ({feature.byPlan.pro.percentage}%)
                              </span>
                            </div>
                          )}
                          {feature.byPlan.premium && (
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <PlanBadge plan="premium" size="sm" />
                              </div>
                              <span className="font-semibold">
                                {feature.byPlan.premium.users} users ({feature.byPlan.premium.percentage}%)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>
                    <button
                      className="flex items-center gap-1 hover:text-primary"
                      onClick={() => handleSort('name')}
                    >
                      Feature
                      {sortField === 'name' && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
                    </button>
                  </th>
                  <th>
                    <button
                      className="flex items-center gap-1 hover:text-primary"
                      onClick={() => handleSort('users')}
                    >
                      Users
                      {sortField === 'users' && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
                    </button>
                  </th>
                  <th>
                    <button
                      className="flex items-center gap-1 hover:text-primary"
                      onClick={() => handleSort('usage')}
                    >
                      Total Usage
                      {sortField === 'usage' && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
                    </button>
                  </th>
                  <th>Avg/User</th>
                  <th>
                    <button
                      className="flex items-center gap-1 hover:text-primary"
                      onClick={() => handleSort('adoption')}
                    >
                      Adoption
                      {sortField === 'adoption' && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
                    </button>
                  </th>
                  <th>By Plan</th>
                </tr>
              </thead>
              <tbody>
                {sortedFeatures.map((feature, index) => {
                  const badge = getAdoptionBadge(feature.adoptionRate);
                  return (
                    <tr key={index}>
                      <td className="font-medium">{feature.name}</td>
                      <td>{feature.totalUsers.toLocaleString()}</td>
                      <td>{feature.totalUsage.toLocaleString()}</td>
                      <td>{feature.avgUsagePerUser}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-base-200 rounded-full h-2.5">
                            <div
                              className={`${getAdoptionColor(feature.adoptionRate)} h-2.5 rounded-full`}
                              style={{ width: `${Math.min(parseFloat(feature.adoptionRate), 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold">{feature.adoptionRate}%</span>
                          <div className={`badge ${badge.class} badge-xs`}>
                            {badge.text}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {feature.byPlan.free && (
                            <div className="tooltip" data-tip={`${feature.byPlan.free.users} users (${feature.byPlan.free.percentage}%)`}>
                              <PlanBadge plan="free" size="sm" />
                            </div>
                          )}
                          {feature.byPlan.pro && (
                            <div className="tooltip" data-tip={`${feature.byPlan.pro.users} users (${feature.byPlan.pro.percentage}%)`}>
                              <PlanBadge plan="pro" size="sm" />
                            </div>
                          )}
                          {feature.byPlan.premium && (
                            <div className="tooltip" data-tip={`${feature.byPlan.premium.users} users (${feature.byPlan.premium.percentage}%)`}>
                              <PlanBadge plan="premium" size="sm" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeatureAdoption;
