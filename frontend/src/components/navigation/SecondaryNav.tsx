import React from 'react';
import ProjectDetailsNav from './ProjectDetailsNav';
import DiscoverNav from './DiscoverNav';

interface SecondaryNavProps {
  currentPath: string;
  selectedProject: any;
  onNavigate: (path: string) => void;
  getContrastColor: () => string;
  variant?: 'desktop' | 'mobile';
}

const SecondaryNav: React.FC<SecondaryNavProps> = ({
  currentPath,
  selectedProject,
  onNavigate,
  getContrastColor,
  variant = 'desktop'
}) => {
  const projectDetailsPaths = ['/notes', '/stack', '/features', '/deployment', '/public', '/sharing', '/settings'];
  const showProjectDetails = selectedProject && projectDetailsPaths.includes(currentPath);
  const showDiscover = currentPath === '/discover' || currentPath.startsWith('/discover/');

  // Don't render anything if there's no secondary nav to show
  if (!showProjectDetails && !showDiscover) {
    return null;
  }

  return (
    <>
      {showProjectDetails && (
        <div className='mt-0.5'>
        <ProjectDetailsNav
          currentPath={currentPath}
          onNavigate={onNavigate}
          getContrastColor={getContrastColor}
          variant={variant}
        />
        </div>
      )}

      {showDiscover && (
        <div className='mt-0.5'>
        <DiscoverNav
          currentPath={currentPath}
          onNavigate={onNavigate}
          getContrastColor={getContrastColor}
          variant={variant}
        />
        </div>
      )}
    </>
  );
};

export default SecondaryNav;
