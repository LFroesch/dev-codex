import React from 'react';
import MobileHeader from './MobileHeader';
import DesktopHeader from './DesktopHeader';
import type { Project } from '../../api/types';

interface HeaderProps {
  user: any;
  selectedProject: Project | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onNavigateWithCheck: (path: string) => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = (props) => {
  return (
    <header className="bg-base-100 border-b-2 border-base-content/20 shadow-sm sticky top-0 z-40 w-full">
      <MobileHeader {...props} />
      <DesktopHeader {...props} />
    </header>
  );
};

export default Header;