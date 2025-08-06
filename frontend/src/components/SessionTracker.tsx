import React, { useState, useEffect } from 'react';
import analyticsService from '../services/analytics';

interface SessionInfo {
  sessionId: string;
  duration: number;
  timeSinceLastActivity: number;
  pageViews: number;
  projectsViewed: number;
  events: number;
  isActive: boolean;
  startTime: string;
  lastActivity: string;
}

interface SessionTrackerProps {
  showDetails?: boolean;
  className?: string;
}

const SessionTracker: React.FC<SessionTrackerProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateSessionInfo = () => {
      const info = analyticsService.getSessionInfo();
      setSessionInfo(info);
    };

    // Initial update
    updateSessionInfo();

    // Update every second for live timer display
    const interval = setInterval(updateSessionInfo, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const getActivityStatus = (isActive: boolean) => {
    return isActive ? 'Active' : 'Background';
  };

  const getActivityColor = (isActive: boolean) => {
    return isActive ? 'text-success' : 'text-info';
  };

  if (!sessionInfo) {
    return null;
  }

  return (
    <div className={`session-tracker ${className}`}>
      {/* Compact view with backdrop */}
      <div className="flex items-center gap-2 bg-base-100/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-base-content/10 shadow-sm hover:bg-base-200/70 transition-all duration-200">
        <div 
          className="tooltip tooltip-left"
          data-tip={`Session: ${formatDuration(sessionInfo.duration)} | Status: ${getActivityStatus(sessionInfo.isActive)}`}
        >
          <div className={`w-2 h-2 rounded-full ${sessionInfo.isActive ? 'bg-success animate-pulse' : 'bg-info'}`}></div>
        </div>
        
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="text-xs text-base-content/70 hover:text-base-content/90 font-mono font-medium transition-colors duration-200"
        >
          {formatDuration(sessionInfo.duration)}
        </button>
      </div>

      {/* Detailed view */}
      {(isVisible || showDetails) && (
        <div className="absolute right-0 top-full mt-2 bg-base-100 border border-base-content/10 rounded-lg shadow-lg p-4 z-50 min-w-64">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">Session Info</h4>
              <button
                onClick={() => setIsVisible(false)}
                className="btn btn-ghost btn-xs"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-base-content/60">Status:</span>
                <span className={getActivityColor(sessionInfo.isActive)}>
                  {getActivityStatus(sessionInfo.isActive)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-base-content/60">Total Time:</span>
                <span className="font-mono">{formatDuration(sessionInfo.duration)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-base-content/60">Pages Viewed:</span>
                <span>{sessionInfo.pageViews}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-base-content/60">Projects:</span>
                <span>{sessionInfo.projectsViewed}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-base-content/60">Actions:</span>
                <span>{sessionInfo.events}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-base-content/60">Session ID:</span>
                <span className="font-mono text-xs truncate max-w-24" title={sessionInfo.sessionId}>
                  {sessionInfo.sessionId.slice(-8)}
                </span>
              </div>
            </div>

            <div className="divider my-2"></div>
            
            <div className="text-xs text-base-content/50">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-1 h-1 rounded-full bg-success"></div>
                <span>Active - Page is focused</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-info"></div>
                <span>Background - Page is hidden/minimized</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionTracker;