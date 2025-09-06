import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import SearchBar from './SearchBar';
import SessionTracker from '../SessionTracker';
import NotificationBell from '../NotificationBell';
import UserMenu from '../UserMenu';
import type { Project } from '../../api/types';

interface MobileHeaderProps {
  user: any;
  selectedProject: Project | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onNavigateWithCheck: (path: string) => void;
  onLogout: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  user,
  selectedProject,
  searchTerm,
  onSearchChange,
  onNavigateWithCheck,
  onLogout
}) => {
  const navigate = useNavigate();

  return (
    <div className="block desktop:hidden px-3 py-4">
      <div className="flex flex-col gap-3">
        {/* Top row: Logo + Search (tablet), Project indicator (tablet), Session Tracker, and User Menu */}
        <div className="flex items-center justify-between min-w-0 gap-3">
          <div className="flex items-center gap-3 bg-base-200 backdrop-blur-none border-2 border-base-content/20 rounded-xl px-3 py-2 h-12 shadow-sm hover:shadow-md transition-all min-w-0">
            <Logo size="tablet" />
            
            {/* Search bar on tablet - hidden on mobile */}
            {user && selectedProject && (
              <div className="hidden tablet:flex relative ml-4 flex-center-gap-2">
                <SearchBar
                  searchTerm={searchTerm}
                  onSearchChange={onSearchChange}
                  className="flex-1"
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNavigateWithCheck('/create');
                  }}
                  className="btn btn-primary btn-sm gap-1 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create
                </button>
              </div>
            )}
          </div>

          {/* User section or Sign In */}
          {user ? (
            <div className="flex items-center gap-3">
              {/* Project info on tablet */}
              {selectedProject && (
                <div className="hidden tablet:flex items-center gap-2 px-3 py-2 bg-base-200 backdrop-blur-none rounded-lg border-2 border-base-content/20 shadow-sm hover:bg-base-200/70 transition-all duration-200 cursor-pointer"
                     onClick={() => onNavigateWithCheck('/notes')}
                     title={`Current project: ${selectedProject.name}`}>
                  <div 
                    className="w-3 h-3 rounded-full shadow-sm"
                    style={{ backgroundColor: selectedProject.color }}
                  ></div>
                  <span className="text-sm font-medium">{selectedProject.name}</span>
                  {selectedProject.userRole && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      selectedProject.isOwner 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-base-300 text-base-content/60'
                    }`}>
                      {selectedProject.isOwner ? 'owner' : selectedProject.userRole || 'member'}
                    </span>
                  )}
                </div>
              )}
              
              {selectedProject && (
                <SessionTracker 
                  projectId={selectedProject?.id}
                  currentUserId={user?.id}
                />
              )}
              
              <span className="hidden tablet:block text-sm font-medium text-base-content/80 ml-2">
                Hi, {user?.firstName}!
              </span>

              <NotificationBell />
              <UserMenu user={user} onLogout={onLogout} />
            </div>
          ) : (
            <div className="flex items-center bg-base-200 backdrop-blur-none border border-base-content/10 rounded-xl px-2 py-2 h-12 shadow-sm flex-shrink-0">
              <button 
                onClick={() => navigate('/login')}
                className="btn btn-primary btn-sm"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
        
        {/* Current Project and Search/Create Row - Mobile only */}
        {user && selectedProject && (
          <div className="flex tablet:hidden items-center gap-3">
            <div 
              className="flex items-center gap-2 px-3 py-2 bg-base-200 backdrop-blur-none rounded-lg border-2 border-base-content/20 shadow-sm hover:bg-base-200/70 transition-all duration-200 cursor-pointer min-w-0 flex-shrink-0 h-10"
              onClick={() => onNavigateWithCheck('/notes')}
              title={`Current project: ${selectedProject.name}`}
            >
              <div 
                className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0"
                style={{ backgroundColor: selectedProject.color }}
              ></div>
              <span className="text-sm font-medium truncate">{selectedProject.name}</span>
            </div>
            
            {/* Search bar and create button - Mobile */}
            <div className="flex items-center gap-2 flex-1">
              <SearchBar
                searchTerm={searchTerm}
                onSearchChange={onSearchChange}
                size="sm"
                className="flex-1"
              />
              <button
                onClick={() => onNavigateWithCheck('/create')}
                className="btn btn-primary btn-sm flex-shrink-0 w-10 h-10 p-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Tabs Row */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="tabs tabs-boxed bg-base-200 border-2 border-base-content/20 shadow-sm p-1 rounded-xl flex-1 min-w-0">
              <button 
                className="tab tab-sm h-8 min-h-8 flex-1 text-xs font-bold"
                onClick={() => onNavigateWithCheck('/notes?view=projects')}
              >
                Projects
              </button>
              <button 
                className="tab tab-sm h-8 min-h-8 flex-1 text-xs font-bold"
                onClick={() => onNavigateWithCheck('/notes?view=details')}
              >
                Details
              </button>
              <button 
                className="tab tab-sm h-8 min-h-8 flex-1 text-xs font-bold"
                onClick={() => onNavigateWithCheck('/discover')}
              >
                Discover
              </button>
              <button 
                className="tab tab-sm h-8 min-h-8 flex-1 text-xs font-bold"
                onClick={() => onNavigateWithCheck('/ideas')}
              >
                Ideas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileHeader;