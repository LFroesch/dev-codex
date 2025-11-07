import React, { useState } from 'react';
import AnalyticsOverview from './AnalyticsOverview';
import ConversionFunnel from './ConversionFunnel';
import FeatureAdoption from './FeatureAdoption';
import ErrorsSummary from './ErrorsSummary';
import CollapsibleSection from './CollapsibleSection';

const AnalyticsTab: React.FC = () => {
  const [timeRange, setTimeRange] = useState<number>(30);

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Clean Header Bar */}
      <div className="flex items-center justify-between bg-base-200 p-3 rounded-lg">
        <div>
          <h1 className="text-2xl font-bold">Platform Analytics</h1>
          <p className="text-sm text-base-content/60">Last {timeRange} days</p>
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
    </div>
  );
};

export default AnalyticsTab;
