import React, { useEffect, useState } from 'react';
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

/**
 * FeatureAdoption component showing which features are most used
 * Includes breakdown by plan tier
 */
const FeatureAdoption: React.FC<FeatureAdoptionProps> = ({ days = 30 }) => {
  const [features, setFeatures] = useState<FeatureData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeatureAdoption();
  }, [days]);

  const fetchFeatureAdoption = async () => {
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
      console.error('Error fetching feature adoption:', err);
    } finally {
      setLoading(false);
    }
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
        <h3 className="card-title">Feature Adoption</h3>
        <p className="text-sm text-base-content/70 mb-4">
          Most used features in the last {days} days
        </p>

        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Users</th>
                <th>Total Usage</th>
                <th>Avg/User</th>
                <th>Adoption %</th>
                <th>By Plan</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr key={index}>
                  <td className="font-medium">{feature.name}</td>
                  <td>{feature.totalUsers.toLocaleString()}</td>
                  <td>{feature.totalUsage.toLocaleString()}</td>
                  <td>{feature.avgUsagePerUser}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-base-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.min(parseFloat(feature.adoptionRate), 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm">{feature.adoptionRate}%</span>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FeatureAdoption;
