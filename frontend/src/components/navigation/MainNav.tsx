import React from 'react';
import { MainNavProps } from './types';

const MainNav: React.FC<MainNavProps> = ({ currentPath, onNavigate, getContrastColor, variant = 'desktop' }) => {
  const isActive = (path: string, additionalPaths?: string[]) => {
    if (additionalPaths) {
      return currentPath === path || additionalPaths.includes(currentPath);
    }
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  const projectDetailsPaths = ['/notes', '/stack', '/features', '/deployment', '/public', '/sharing', '/settings'];

  const isMobile = variant === 'mobile';
  const buttonClass = isMobile ? 'tab tab-sm flex-shrink-0 min-h-10' : 'tab-button';
  const iconClass = isMobile ? 'w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0' : 'icon-sm';
  const gapClass = isMobile ? 'gap-1 sm:gap-2 font-bold whitespace-nowrap px-2 sm:px-4' : 'gap-2';
  const wrapperClass = isMobile ? 'flex justify-center' : 'absolute left-1/2 transform -translate-x-1/2';

  return (
    <div className={wrapperClass}>
      <div className="tabs-container p-1">
        <button
          className={`${buttonClass} ${isActive('/projects') && !projectDetailsPaths.includes(currentPath) ? 'tab-active' : ''} ${gapClass}`}
          style={isActive('/projects') && !projectDetailsPaths.includes(currentPath) ? { color: getContrastColor() } : {}}
          onClick={() => onNavigate('/projects')}
        >
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          {isMobile ? <span className="text-sm sm:text-base">Projects</span> : 'My Projects'}
        </button>

        <button
          className={`${buttonClass} ${projectDetailsPaths.includes(currentPath) ? 'tab-active' : ''} ${gapClass}`}
          style={projectDetailsPaths.includes(currentPath) ? { color: getContrastColor() } : {}}
          onClick={() => onNavigate('/notes')}
        >
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {isMobile ? <span className="text-sm sm:text-base">Details</span> : 'Project Details'}
        </button>

        <button
          className={`${buttonClass} ${isActive('/discover') ? 'tab-active' : ''} ${gapClass}`}
          style={isActive('/discover') ? { color: getContrastColor() } : {}}
          onClick={() => onNavigate('/discover')}
        >
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {isMobile ? <span className="text-sm sm:text-base">Discover</span> : 'Discover'}
        </button>

        <button
          className={`${buttonClass} ${isActive('/terminal') ? 'tab-active' : ''} ${gapClass}`}
          style={isActive('/terminal') ? { color: getContrastColor() } : {}}
          onClick={() => onNavigate('/terminal')}
        >
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {isMobile ? <span className="text-sm sm:text-base">Terminal</span> : 'Terminal'}
        </button>
      </div>
    </div>
  );
};

export default MainNav;
