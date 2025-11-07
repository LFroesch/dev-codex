import React, { useEffect, useState } from 'react';
import { StatusBadge, LoadingSkeleton } from '../shared';

interface ErrorData {
  type: string;
  message: string;
  count: number;
  affectedUsers: number;
  firstOccurrence: string;
  lastOccurrence: string;
}

interface ErrorsSummaryProps {
  hours?: number;
}

/**
 * ErrorsSummary component showing recent errors
 * Helps identify and triage issues quickly
 */
const ErrorsSummary: React.FC<ErrorsSummaryProps> = ({ hours = 24 }) => {
  const [errors, setErrors] = useState<ErrorData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchErrors();
  }, [hours]);

  const fetchErrors = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/errors/summary?hours=${hours}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch errors');
      }

      const result = await response.json();
      setErrors(result.errors || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error('Error fetching errors summary:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton type="card" />;
  }

  return (
    <div className="card bg-base-100 shadow-lg border-2 border-base-content/20">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-title">Recent Errors</h3>
          <StatusBadge status={total > 0 ? 'error' : 'success'} label={`${total} total`} />
        </div>

        {errors.length === 0 ? (
          <div className="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>No errors in the last {hours} hours!</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Error Type</th>
                  <th>Message</th>
                  <th>Count</th>
                  <th>Users Affected</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((error, index) => (
                  <tr key={index} className="hover">
                    <td>
                      <code className="text-xs bg-base-200 px-2 py-1 rounded">
                        {error.type}
                      </code>
                    </td>
                    <td className="max-w-xs truncate" title={error.message}>
                      {error.message}
                    </td>
                    <td>
                      <span className="badge badge-error">{error.count}</span>
                    </td>
                    <td>{error.affectedUsers}</td>
                    <td className="text-xs text-base-content/60">
                      {new Date(error.lastOccurrence).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorsSummary;
