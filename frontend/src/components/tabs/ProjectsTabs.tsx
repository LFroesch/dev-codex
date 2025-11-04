import React from 'react';
import TabGroup from '../common/TabGroup';
import TabButton from '../common/TabButton';

interface ProjectsTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  getContrastColor: () => string;
  counts: {
    active: number;
    archived: number;
    shared: number;
  };
}

const ProjectsTabs: React.FC<ProjectsTabsProps> = ({
  activeTab,
  onTabChange,
  getContrastColor,
  counts
}) => {
  return (
    <TabGroup className="lg:mt-0.5">
      <TabButton
        isActive={activeTab === 'active'}
        onClick={() => onTabChange('active')}
        getContrastColor={getContrastColor}
      >
        <span>Active <span className="text-xs opacity-60">({counts.active})</span></span>
      </TabButton>

      {counts.archived > 0 && (
        <TabButton
          isActive={activeTab === 'archived'}
          onClick={() => onTabChange('archived')}
          getContrastColor={getContrastColor}
        >
          <span>Archived <span className="text-xs opacity-60">({counts.archived})</span></span>
        </TabButton>
      )}

      {counts.shared > 0 && (
        <TabButton
          isActive={activeTab === 'shared'}
          onClick={() => onTabChange('shared')}
          getContrastColor={getContrastColor}
        >
          <span>Shared <span className="text-xs opacity-60">({counts.shared})</span></span>
        </TabButton>
      )}

      <TabButton
        isActive={activeTab === 'ideas'}
        onClick={() => onTabChange('ideas')}
        getContrastColor={getContrastColor}
      >
        <span>Ideas</span>
      </TabButton>
    </TabGroup>
  );
};

export default ProjectsTabs;
