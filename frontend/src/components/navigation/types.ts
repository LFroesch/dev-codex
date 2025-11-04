export interface NavTab {
  id: string;
  label: string;
  path: string;
}

export interface ProjectTab extends NavTab {
  icon: React.ReactNode;
}

export interface MainNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  getContrastColor: () => string;
}

export interface SecondaryNavProps {
  currentPath: string;
  selectedProject: any;
  onNavigate: (path: string) => void;
  getContrastColor: () => string;
}
