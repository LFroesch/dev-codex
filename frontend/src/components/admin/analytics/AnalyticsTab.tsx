import React, { useState } from 'react';
import AnalyticsOverview from './AnalyticsOverview';
import ConversionFunnel from './ConversionFunnel';
import FeatureAdoption from './FeatureAdoption';
import ErrorsSummary from './ErrorsSummary';
import CollapsibleSection from './CollapsibleSection';
import { analyticsAPI } from '../../../api/analytics';

const AnalyticsTab: React.FC = () => {
  const [timeRange, setTimeRange] = useState<number>(30);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Clean Header Bar */}
      <div className="flex items-center justify-between bg-base-200 p-3 rounded-lg border-thick">
        <div>
          <h1 className="text-2xl font-bold">Platform Analytics</h1>
          <p className="text-sm text-base-content/60">{timeRange == 9999 ? "All Time Stats" : `Last ${timeRange} days`}</p>
        </div>
        <div className="flex gap-2">
          <select
            className="select select-sm select-bordered"
            value={timeRange}
            onChange={(e) => setTimeRange(+e.target.value)}
          >
            <option value={1}>24 Hours</option>
            <option value={7}>7 Days</option>
            <option value={30}>30 Days</option>
            <option value={90}>90 Days</option>
            <option value={365}>365 Days</option>
            <option value={9999}>All Time</option>
          </select>
          <button
            className="btn btn-sm btn-ghost"
            onClick={async () => {
              try {
                const res = await fetch('/api/admin/cleanup/stats', { credentials: 'include' });
                const d = await res.json();
                alert(`System Status\n\nDatabase: ${d.database}\nUptime: ${d.uptime}\nMemory: ${d.memory}`);
              } catch { alert('Health check failed'); }
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Health
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={async () => {
              try {
                const res = await fetch(`/api/admin/analytics/export?days=${timeRange}`, { credentials: 'include' });
                if (!res.ok) throw new Error();
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              } catch { alert('Export failed'); }
            }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            className="btn btn-sm btn-error"
            onClick={() => setShowResetModal(true)}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Reset
          </button>
        </div>
      </div>

      {/* Overview Stats - Open by Default */}
      <CollapsibleSection title="Overview Stats" defaultOpen={true}>
        <AnalyticsOverview days={timeRange} />
      </CollapsibleSection>

      {/* Conversion Funnel - Collapsed by Default */}
      <CollapsibleSection title="Conversion Funnel" defaultOpen={false}>
        <ConversionFunnel />
      </CollapsibleSection>

      {/* Feature Adoption - Collapsed by Default */}
      <CollapsibleSection title="Feature Adoption" defaultOpen={false}>
        <FeatureAdoption days={timeRange} />
      </CollapsibleSection>

      {/* Recent Errors - Collapsed by Default */}
      <CollapsibleSection title="Recent Errors" defaultOpen={false}>
        <ErrorsSummary hours={24} />
      </CollapsibleSection>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-6 rounded-lg max-w-md border-thick">
            <h3 className="text-xl font-bold mb-4 text-error">Reset All Analytics?</h3>
            <p className="mb-6 text-base-content/80">
              This will permanently delete all analytics data, user sessions, and activity logs.
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="btn btn-ghost"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={async () => {
                  setIsResetting(true);
                  try {
                    const result = await analyticsAPI.resetAllAnalytics();
                    alert(`Reset Complete!\n\nDeleted:\n- ${result.deletedAnalytics} analytics records\n- ${result.deletedSessions} user sessions\n- ${result.deletedActivityLogs} activity logs`);
                    setShowResetModal(false);
                    window.location.reload(); // Refresh to show empty state
                  } catch (error) {
                    alert('Failed to reset analytics. Please try again.');
                  } finally {
                    setIsResetting(false);
                  }
                }}
                disabled={isResetting}
              >
                {isResetting ? 'Resetting...' : 'Yes, Reset All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsTab;
