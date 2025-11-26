import React, { useEffect, useState } from 'react';
import { StatCard, LoadingSkeleton } from '../shared';

interface ConversionData {
  totalUsers: number;
  usersWithProjects: number;
  paidUsers: number;
  conversionRate: number;
  projectCreationRate: number;
}

/**
 * ConversionFunnel component showing user journey conversion
 * From signup → project creation → paid conversion
 */
const ConversionFunnel: React.FC = () => {
  const [data, setData] = useState<ConversionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversionData();
  }, []);

  const fetchConversionData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics/conversion-rate', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversion data');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LoadingSkeleton type="stat" count={3} />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        title="Total Signups"
        value={data.totalUsers.toLocaleString()}
        subtitle="All registered users"
        trend={{
          value: 100,
          isPositive: true
        }}
        icon={
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        }
      />

      <StatCard
        title="Created Project"
        value={data.usersWithProjects.toLocaleString()}
        subtitle={`${data.projectCreationRate.toFixed(1)}% activation rate`}
        trend={{
          value: data.projectCreationRate,
          isPositive: data.projectCreationRate > 50
        }}
        icon={
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />

      <StatCard
        title="Paid Plan"
        value={data.paidUsers.toLocaleString()}
        subtitle={`${data.conversionRate.toFixed(1)}% conversion rate`}
        trend={{
          value: data.conversionRate,
          isPositive: data.conversionRate > 10
        }}
        icon={
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    </div>
  );
};

export default ConversionFunnel;
