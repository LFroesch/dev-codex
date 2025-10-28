import React from 'react';

interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  category?: string;
}

interface ProjectsRendererProps {
  projects: Project[];
  onProjectSelect?: (projectId: string) => void;
}

const ProjectsRenderer: React.FC<ProjectsRendererProps> = ({ projects, onProjectSelect }) => {
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {projects.map((project, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onProjectSelect?.(project.id)}
          className="h-30 w-full p-3 bg-base-200 rounded-lg hover:bg-primary/20 hover:border-primary/50 border-thick transition-all text-left"
        >
          <div className="flex items-start gap-3">
            {project.color && (
              <div
                className="w-3 h-3 rounded-full border-thick flex-shrink-0 mt-1"
                style={{ backgroundColor: project.color }}
              />
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="font-semibold text-sm text-base-content truncate">{project.name}</div>
              {project.category && (
                <div className="badge h-5 badge-xs border-thick">{project.category}</div>
              )}
              {project.description && (
                <p className="text-xs text-base-content/60 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default ProjectsRenderer;
