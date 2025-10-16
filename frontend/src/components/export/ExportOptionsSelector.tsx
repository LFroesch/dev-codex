import React from 'react';
import type { ExportOptions } from '../../utils/exportGenerators';

interface ExportOptionsSelectorProps {
  options: ExportOptions;
  onToggleOption: (key: keyof ExportOptions) => void;
  onToggleAll: (value: boolean) => void;
}

const ExportOptionsSelector: React.FC<ExportOptionsSelectorProps> = ({
  options,
  onToggleOption
}) => {
  const selectedCount = Object.values(options).filter(Boolean).length;

  const optionLabels: Record<keyof ExportOptions, string> = {
    basicInfo: 'Basic Info',
    description: 'Description',
    tags: 'Tags',
    links: 'Links',
    notes: 'Notes',
    todos: 'To-dos',
    devLog: 'Dev Log',
    components: 'Components',
    techStack: 'Tech Stack',
    deploymentData: 'Deployment',
    publicPageData: 'Public Page',
    timestamps: 'Timestamps'
  };

  // Group options by category for better UX
  const categoryGroups = {
    'Project Info': ['basicInfo', 'description', 'tags', 'timestamps'] as (keyof ExportOptions)[],
    'Content': ['notes', 'todos', 'devLog', 'components'] as (keyof ExportOptions)[],
    'Technical': ['techStack', 'deploymentData', 'links'] as (keyof ExportOptions)[],
    'Public': ['publicPageData'] as (keyof ExportOptions)[]
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">
        Select Data to Export ({selectedCount})
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(categoryGroups).map(([groupName, groupOptions]) => (
          <div key={groupName} className="space-y-2">
            <h5 className="text-xs font-medium text-base-content/70 uppercase tracking-wide">
              {groupName}
            </h5>
            <div className="space-y-2">
              {groupOptions.map((optionKey) => (
                <label key={optionKey} className="flex items-center gap-2 cursor-pointer hover:bg-base-200/50 p-2 rounded">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm"
                    checked={options[optionKey]}
                    onChange={() => onToggleOption(optionKey)}
                  />
                  <span className="text-sm flex-1">
                    {optionLabels[optionKey]}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExportOptionsSelector;