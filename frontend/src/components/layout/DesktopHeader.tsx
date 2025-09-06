import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import SearchBar from './SearchBar';
import SessionTracker from '../SessionTracker';
import NotificationBell from '../NotificationBell';
import UserMenu from '../UserMenu';
import type { Project } from '../../api/types';

interface DesktopHeaderProps {
  user: any;
  selectedProject: Project | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onNavigateWithCheck: (path: string) => void;
  onLogout: () => void;
}

const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  user,
  selectedProject,
  searchTerm,
  onSearchChange,
  onNavigateWithCheck,
  onLogout
}) => {
  const navigate = useNavigate();

  return (
    <div className="hidden desktop:block px-6 py-2">
      <div className="relative flex-between-center">
        {/* Left side - Logo and Search */}
        <div className="flex items-center gap-3 bg-base-200 backdrop-blur-none border-2 border-base-content/20 rounded-xl px-4 py-2 h-12 shadow-sm hover:shadow-md transition-all">
          <Logo size="desktop" onClick={() => navigate('/notes?view=projects')} />
          
          {/* Search bar */}
          <div className="relative ml-4 flex-center-gap-2">
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={onSearchChange}
              size="sm"
              className="w-48"
            />
            <button
              onClick={() => onNavigateWithCheck('/create')}
              className="btn btn-primary btn-sm gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create
            </button>
          </div>
        </div>

        {/* Center - Current Project Info */}
        {user && selectedProject && (
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div 
              className="flex items-center gap-2 px-4 py-2 bg-base-200 backdrop-blur-none rounded-lg border-2 border-base-content/20 shadow-sm hover:bg-base-200/70 transition-all duration-200 cursor-pointer"
              onClick={() => onNavigateWithCheck('/notes')}
              title={`Current project: ${selectedProject.name}`}
            >
              <div 
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: selectedProject.color }}
              ></div>
              <span className="text-sm font-medium whitespace-nowrap">{selectedProject.name}</span>
              {selectedProject.userRole && (
                <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                  selectedProject.isOwner 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-base-300 text-base-content/60'
                }`}>
                  {selectedProject.isOwner ? 'owner' : selectedProject.userRole || 'member'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Right side - Session Tracker, Greeting, Notifications, User Menu */}
        {user ? (
          <div className="flex items-center gap-4">
            {selectedProject && (
              <SessionTracker 
                projectId={selectedProject?.id}
                currentUserId={user?.id}
              />
            )}
            
            <span className="text-sm font-medium text-base-content/80">
              Hi, {user?.firstName}!
            </span>

            <NotificationBell />
            <UserMenu user={user} onLogout={onLogout} />
          </div>
        ) : (
          <div className="flex items-center bg-base-200 backdrop-blur-none border border-base-content/10 rounded-xl px-3 py-2 h-10 shadow-sm">
            <button 
              onClick={() => navigate('/login')}
              className="btn btn-primary btn-sm"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      {user && (
        <div className="flex justify-center mt-2">
          <div className="tabs tabs-boxed bg-base-200 border-2 border-base-content/20 shadow-sm p-1 rounded-xl">
            <button 
              className="tab tab-sm h-8 min-h-8 px-6 text-xs font-bold"
              onClick={() => onNavigateWithCheck('/notes?view=projects')}
            >
              Projects
            </button>
            <button 
              className="tab tab-sm h-8 min-h-8 px-6 text-xs font-bold"
              onClick={() => onNavigateWithCheck('/notes?view=details')}
            >
              Details
            </button>
            <button 
              className="tab tab-sm h-8 min-h-8 px-6 text-xs font-bold"
              onClick={() => onNavigateWithCheck('/discover')}
            >
              Discover
            </button>
            <button 
              className="tab tab-sm h-8 min-h-8 px-6 text-xs font-bold"
              onClick={() => onNavigateWithCheck('/ideas')}
            >
              Ideas
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopHeader;