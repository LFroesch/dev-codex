import React from 'react';

interface DiscoverNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  getContrastColor: () => string;
  variant?: 'desktop' | 'mobile';
}

const DiscoverNav: React.FC<DiscoverNavProps> = ({ currentPath, onNavigate, getContrastColor, variant = 'desktop' }) => {
  const isDetailsPage = currentPath.startsWith('/discover/project/') || currentPath.startsWith('/discover/user/');

  return (
    <div className="flex justify-center">
      <div className="tabs-container p-1">
        <button
          onClick={() => onNavigate('/discover')}
          className={`tab-button ${currentPath === '/discover' ? 'tab-active' : ''}`}
          style={currentPath === '/discover' ? { color: getContrastColor() } : {}}
        >
          Discover
        </button>
        <button
          onClick={() => onNavigate('/discover')}
          className={`tab-button ${isDetailsPage ? 'tab-active' : ''}`}
          style={isDetailsPage ? { color: getContrastColor() } : {}}
          disabled={!isDetailsPage}
        >
          Details
        </button>
      </div>
    </div>
  );
};

export default DiscoverNav;
