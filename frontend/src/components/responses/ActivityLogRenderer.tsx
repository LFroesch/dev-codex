import React from 'react';

interface ActivityEntry {
  timestamp: string;
  user: string;
  action: string;
  resourceType: string;
  resourceName: string;
  project?: string;
}

interface ActivityLogRendererProps {
  activityEntries: ActivityEntry[];
  hasMore: boolean;
  remainingCount: number;
}

const ActivityLogRenderer: React.FC<ActivityLogRendererProps> = ({
  activityEntries,
  hasMore,
  remainingCount
}) => {
  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'text-success';
      case 'updated': return 'text-info';
      case 'deleted': return 'text-error';
      default: return 'text-primary';
    }
  };

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'todo': return '☑️';
      case 'note': return '📝';
      case 'devlog': return '📋';
      case 'component': return '🧩';
      case 'project': return '📁';
      case 'team': return '👥';
      case 'settings': return '⚙️';
      default: return '📄';
    }
  };

  if (activityEntries.length === 0) {
    return (
      <div className="mt-3 p-4 bg-base-200/50 rounded-lg border-thick text-center">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-base-content/70">No activity found</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {activityEntries.map((entry, idx) => (
        <div
          key={idx}
          className="p-3 bg-base-200/50 hover:bg-base-200 rounded-lg border-thick transition-colors"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">{getResourceIcon(entry.resourceType)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold">{entry.user}</span>
                <span className={`font-medium ${getActionColor(entry.action)}`}>
                  {entry.action}
                </span>
                <span className="text-base-content/60">{entry.resourceType}</span>
              </div>
              <div className="mt-1">
                <span className="italic text-base-content/80">"{entry.resourceName}"</span>
                {entry.project && (
                  <span className="ml-2 text-sm text-base-content/60">
                    @{entry.project}
                  </span>
                )}
              </div>
              <div className="text-xs text-base-content/50 mt-1">
                {entry.timestamp}
              </div>
            </div>
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="p-3 bg-base-300/30 rounded-lg border-thick text-center">
          <span className="text-sm text-base-content/60">
            ... and {remainingCount} more {remainingCount === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ActivityLogRenderer;
