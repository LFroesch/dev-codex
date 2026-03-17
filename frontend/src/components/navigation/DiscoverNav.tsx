import React from 'react';

interface DiscoverNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  getContrastColor: () => string;
  variant?: 'desktop' | 'mobile';
}

const DiscoverNav: React.FC<DiscoverNavProps> = ({ currentPath, onNavigate, getContrastColor, variant = 'desktop' }) => {
  const isDetailsPage = currentPath.startsWith('/discover/project/') || currentPath.startsWith('/discover/user/');
  const isMobile = variant === 'mobile';
  const iconClass = isMobile ? 'w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0' : 'icon-sm flex-shrink-0';
  const gapClass = isMobile ? 'gap-1 sm:gap-2' : 'gap-2';

  return (
    <div className="flex justify-center">
      <div className="tabs-container p-1">
        <button
          onClick={() => onNavigate('/discover')}
          className={`tab-button ${gapClass} ${currentPath === '/discover' ? 'tab-active' : ''}`}
          style={currentPath === '/discover' ? { color: getContrastColor() } : {}}
        >
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Discover
        </button>
        <button
          onClick={() => onNavigate('/discover')}
          className={`tab-button ${gapClass} ${isDetailsPage ? 'tab-active' : ''}`}
          style={isDetailsPage ? { color: getContrastColor() } : {}}
          disabled={!isDetailsPage}
        >
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Details
        </button>
      </div>
    </div>
  );
};

export default DiscoverNav;
