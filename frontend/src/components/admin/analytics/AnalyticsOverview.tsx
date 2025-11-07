import React, { useEffect, useState } from 'react';
import { StatCard, LoadingSkeleton } from '../shared';

interface OverviewData {
  users: {
    total: number;
    new: number;
    growth: number;
  };
  mrr: {
    current: number;
    growth: number;
  };
  projects: {
    total: number;
    new: number;
    growth: number;
  };
  errorRate: {
    percentage: number;
    total: number;
  };
}

interface AnalyticsOverviewProps {
  days?: number;
}

/**
 * Analytics Overview component showing key metrics
 * Displays user growth, MRR, projects, and error rate
 */
const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({ days = 30 }) => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview();
  }, [days]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/overview?days=${days}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics overview');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching analytics overview:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <LoadingSkeleton type="stat" count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Error loading analytics: {error}</span>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
          title="Total Users"
          value={data.users.total.toLocaleString()}
          subtitle={`${data.users.new} new this period`}
          trend={{
            value: data.users.growth,
            isPositive: data.users.growth >= 0
          }}
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <StatCard
          title="Monthly Revenue"
          value={`$${data.mrr.current.toLocaleString()}`}
          subtitle="MRR from subscriptions"
          trend={{
            value: data.mrr.growth,
            isPositive: data.mrr.growth >= 0
          }}
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Active Projects"
          value={data.projects.total.toLocaleString()}
          subtitle={`${data.projects.new} created this period`}
          trend={{
            value: data.projects.growth,
            isPositive: data.projects.growth >= 0
          }}
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        <StatCard
          title="Error Rate"
          value={`${data.errorRate.percentage.toFixed(2)}%`}
          subtitle={`${data.errorRate.total} errors`}
          trend={{
            value: data.errorRate.percentage,
            isPositive: false
          }}
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
    </div>
  );
};

export default AnalyticsOverview;
