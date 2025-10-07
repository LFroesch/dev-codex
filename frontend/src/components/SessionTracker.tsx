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
  currentUserId?: string;
  projectId?: string;
}

const SessionTracker: React.FC<SessionTrackerProps> = ({ 
  showDetails = false, 
  className = '',
  currentUserId,
  projectId
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

  const getActivityStatus = (isActive: boolean, timeSinceLastActivity: number) => {
    if (!isActive) return 'Background';
    return timeSinceLastActivity > 300 ? 'Idle' : 'Active';
  };

  const getActivityColor = (isActive: boolean, timeSinceLastActivity: number) => {
    if (!isActive) return 'text-info';
    return timeSinceLastActivity > 300 ? 'text-info' : 'text-success';
  };

  if (!sessionInfo) {
    return null;
  }

  return (
    <div className={`session-tracker relative z-[100] ${className}`}>
      {/* Compact view with backdrop - matching project indicator style */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100/80 rounded-lg border-2 border-base-content/20 shadow-sm hover:bg-base-200/70 transition-all duration-200 w-28 h-8">
        <div 
          className="tooltip tooltip-left"
          data-tip={`Session: ${formatDuration(sessionInfo.duration)} | Status: ${getActivityStatus(sessionInfo.isActive, sessionInfo.timeSinceLastActivity)}`}
        >
          <div className={`w-2 h-2 rounded-full shadow-sm ${
            sessionInfo.isActive 
              ? (sessionInfo.timeSinceLastActivity > 300 ? 'bg-info' : 'bg-success animate-pulse')
              : 'bg-info'
          }`}></div>
        </div>
        
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="text-xs text-base-content/70 hover:text-base-content/90 font-mono font-medium transition-colors duration-200 flex-1 text-center"
        >
          {formatDuration(sessionInfo.duration)}
        </button>

      </div>

      {/* Detailed view */}
      {(isVisible || showDetails) && (
        <div className="absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw-2rem)] bg-base-100 border-2 border-base-content/20 rounded-lg shadow-lg p-4 z-[9999] transform translate-x-1/4">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">Session Info</h4>
              <button
                onClick={() => setIsVisible(false)}
                className="btn btn-ghost btn-xs"
              >
                ×
              </button>
            </div>
            <div className="divider"></div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-base-content/60">Status:</span>
                <span className={getActivityColor(sessionInfo.isActive, sessionInfo.timeSinceLastActivity)}>
                  {getActivityStatus(sessionInfo.isActive, sessionInfo.timeSinceLastActivity)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-base-content/60">Total Time:</span>
                <span className="font-mono">{formatDuration(sessionInfo.duration)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-base-content/60">Time AFK:</span>
                <span>{formatDuration(sessionInfo.timeSinceLastActivity)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-base-content/60">Session ID:</span>
                <span className="font-mono text-xs truncate max-w-24" title={sessionInfo.sessionId}>
                  {sessionInfo.sessionId.slice(-8)}
                </span>
              </div>
            </div>  
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionTracker;