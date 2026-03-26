import React, { lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project, Todo } from '../api/types';
import { getContrastTextColor } from '../utils/contrastTextColor';

const IdeasPage = lazy(() => import('./IdeasPage'));

// --- Helpers ---

const getRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

const countOverdueTodos = (project: Project): number => {
  const now = new Date();
  return project.todos.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now).length;
};

// --- Types ---

type FilterMode = 'all' | 'archived' | 'shared' | 'ideas';
type SortMode = 'name-asc' | 'name-desc' | 'last-updated' | 'date-created';

interface ProjectsPageProps {
  projects: Project[];
  selectedProject: Project | null;
  analyticsReady: boolean;
  onProjectSelect: (project: Project) => void;
  formatProjectTime: (projectId: string) => string;
  ideasCount: number;
  onIdeasCountChange: (count: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

// --- Components ---

const ProjectRow: React.FC<{
  project: Project;
  isSelected: boolean;
  overdue: number;
  formatProjectTime: (id: string) => string;
  onClick: () => void;
}> = ({ project, isSelected, overdue, formatProjectTime, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left group ${
      project.isLocked
        ? 'opacity-50 cursor-not-allowed'
        : isSelected
          ? 'border-base-content/30 bg-base-200/80 shadow-md'
          : 'border-base-content/10 hover:border-base-content/25 hover:bg-base-200/40'
    }`}
    style={{
      borderLeftWidth: '4px',
      borderLeftColor: project.color || 'transparent',
    }}
    disabled={project.isLocked}
    title={project.isLocked ? (project.lockedReason || 'This project is locked') : ''}
  >
    {/* Name + category */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm capitalize truncate">{project.name}</span>
        {project.isLocked && (
          <svg className="w-3.5 h-3.5 text-warning flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        )}
        {project.category && (
          <span className="text-xs text-base-content/50 capitalize hidden sm:inline">{project.category}</span>
        )}
      </div>
      {project.description && (
        <p className="text-xs text-base-content/50 truncate mt-0.5">{project.description}</p>
      )}
    </div>

    {/* Overdue badge */}
    {overdue > 0 && (
      <div className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-error/15 border border-error/30 text-error">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {overdue}
      </div>
    )}

    {/* Time worked */}
    <span className="flex-shrink-0 text-xs font-mono text-base-content/40 hidden md:inline">
      {formatProjectTime(project.id)}
    </span>

    {/* Updated */}
    <span className="flex-shrink-0 text-xs text-base-content/40 w-16 text-right hidden sm:inline">
      {getRelativeTime(project.updatedAt)}
    </span>
  </button>
);

// --- Main Page ---

const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  selectedProject,
  analyticsReady,
  onProjectSelect,
  formatProjectTime,
  ideasCount,
  onIdeasCountChange,
  searchTerm,
  onSearchChange,
}) => {
  const navigate = useNavigate();

  const [filter, setFilter] = React.useState<FilterMode>('all');
  const [sortMode, setSortMode] = React.useState<SortMode>(() => {
    const saved = localStorage.getItem('projectSortMode');
    return (saved === 'name-asc' || saved === 'name-desc' || saved === 'date-created' || saved === 'last-updated') ? saved : 'last-updated';
  });

  React.useEffect(() => {
    localStorage.setItem('projectSortMode', sortMode);
  }, [sortMode]);

  // Derived data
  const activeProjects = useMemo(() => projects.filter(p => !p.isArchived && !p.isShared), [projects]);
  const archivedProjects = useMemo(() => projects.filter(p => p.isArchived), [projects]);
  const sharedProjects = useMemo(() => projects.filter(p => p.isShared), [projects]);

  const displayProjects = useMemo(() => {
    let list = filter === 'archived' ? archivedProjects
      : filter === 'shared' ? sharedProjects
      : activeProjects;

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }

    // Sort
    const sorted = [...list];
    switch (sortMode) {
      case 'name-asc': return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc': return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'date-created': return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'last-updated': return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      default: return sorted;
    }
  }, [filter, activeProjects, archivedProjects, sharedProjects, searchTerm, sortMode]);

  // Last worked on (most recently updated active project)
  const lastProject = useMemo(() => {
    if (!activeProjects.length) return null;
    return [...activeProjects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  }, [activeProjects]);

  // Projects with overdue todos
  const projectsWithOverdue = useMemo(() => {
    return activeProjects
      .map(p => ({ project: p, overdue: countOverdueTodos(p) }))
      .filter(x => x.overdue > 0)
      .sort((a, b) => b.overdue - a.overdue);
  }, [activeProjects]);

  const handleSelect = (project: Project) => {
    onProjectSelect(project);
    navigate('/notes');
  };

  const cycleSortMode = () => {
    const modes: SortMode[] = ['last-updated', 'name-asc', 'name-desc', 'date-created'];
    const idx = modes.indexOf(sortMode);
    setSortMode(modes[(idx + 1) % modes.length]);
  };

  const sortLabel = sortMode === 'name-asc' ? 'A-Z'
    : sortMode === 'name-desc' ? 'Z-A'
    : sortMode === 'date-created' ? 'Created'
    : 'Recent';

  // Loading state
  if (!analyticsReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-base-content/60 text-sm">Loading projects...</p>
        </div>
      </div>
    );
  }

  // Ideas tab
  if (filter === 'ideas') {
    return (
      <div>
        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {renderFilterPills(filter, setFilter, activeProjects.length, archivedProjects.length, sharedProjects.length, ideasCount)}
        </div>
        <Suspense fallback={
          <div className="p-8 animate-pulse">
            <div className="h-8 bg-base-300 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-base-300 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-base-300 rounded w-1/2"></div>
          </div>
        }>
          <IdeasPage onIdeasCountChange={onIdeasCountChange} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Continue where you left off */}
      {lastProject && filter === 'all' && !searchTerm && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-2 px-1">Continue</h3>
          <button
            onClick={() => handleSelect(lastProject)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-all text-left hover:shadow-md hover:bg-base-200/60 bg-base-100"
            style={{
              borderColor: lastProject.color || 'var(--fallback-bc,oklch(var(--bc)/0.2))',
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0 border-2 border-base-content/10"
              style={{ backgroundColor: lastProject.color, color: getContrastTextColor(lastProject.color) }}
            >
              {lastProject.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold capitalize truncate">{lastProject.name}</div>
              {lastProject.description && (
                <p className="text-xs text-base-content/50 truncate">{lastProject.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {countOverdueTodos(lastProject) > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-error/15 border border-error/30 text-error">
                  {countOverdueTodos(lastProject)} overdue
                </span>
              )}
              <span className="text-xs text-base-content/40">{getRelativeTime(lastProject.updatedAt)}</span>
              <svg className="w-4 h-4 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </section>
      )}

      {/* Needs attention */}
      {projectsWithOverdue.length > 0 && filter === 'all' && !searchTerm && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-2 px-1">
            Needs attention
            <span className="ml-1.5 text-error/70">{projectsWithOverdue.length}</span>
          </h3>
          <div className="space-y-1.5">
            {projectsWithOverdue.slice(0, 4).map(({ project, overdue }) => (
              <ProjectRow
                key={project.id}
                project={project}
                isSelected={selectedProject?.id === project.id}
                overdue={overdue}
                formatProjectTime={formatProjectTime}
                onClick={() => handleSelect(project)}
              />
            ))}
            {projectsWithOverdue.length > 4 && (
              <p className="text-xs text-base-content/40 px-4">+{projectsWithOverdue.length - 4} more</p>
            )}
          </div>
        </section>
      )}

      {/* Filter bar + search + sort */}
      <section>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {renderFilterPills(filter, setFilter, activeProjects.length, archivedProjects.length, sharedProjects.length, ideasCount)}

          {/* Search */}
          <div className="relative ml-auto">
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              className="input input-sm input-bordered pl-8 w-36 sm:w-48 bg-base-100 border-base-content/15 focus:border-primary/40 text-sm"
            />
          </div>

          {/* Sort */}
          <button
            onClick={cycleSortMode}
            className="btn btn-sm btn-ghost gap-1 text-base-content/50 border border-base-content/10"
            title={`Sort: ${sortLabel}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            <span className="text-xs">{sortLabel}</span>
          </button>
        </div>

        {/* Project list */}
        {displayProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="w-12 h-12 text-base-content/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-base-content/60 mb-1">
              {searchTerm ? 'No matches' : filter === 'archived' ? 'No archived projects' : filter === 'shared' ? 'No shared projects' : 'No projects yet'}
            </h3>
            <p className="text-sm text-base-content/40 mb-4">
              {searchTerm ? 'Try a different search term' : 'Create your first project to get started'}
            </p>
            {!searchTerm && filter === 'all' && (
              <button onClick={() => navigate('/create-project')} className="btn btn-primary btn-sm gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                </svg>
                New Project
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayProjects.map(project => (
              <ProjectRow
                key={project.id}
                project={project}
                isSelected={selectedProject?.id === project.id}
                overdue={countOverdueTodos(project)}
                formatProjectTime={formatProjectTime}
                onClick={() => handleSelect(project)}
              />
            ))}
          </div>
        )}

        {/* New project button */}
        {filter === 'all' && displayProjects.length > 0 && (
          <button
            onClick={() => navigate('/create-project')}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-base-content/15 text-base-content/40 hover:border-primary/30 hover:text-primary/60 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
            </svg>
            New Project
          </button>
        )}
      </section>
    </div>
  );
};

// Filter pills helper
function renderFilterPills(
  filter: FilterMode,
  setFilter: (f: FilterMode) => void,
  activeCount: number,
  archivedCount: number,
  sharedCount: number,
  ideasCount: number,
) {
  const pill = (mode: FilterMode, label: string, count: number, alwaysShow = true) => {
    if (!alwaysShow && count === 0) return null;
    const active = filter === mode;
    return (
      <button
        key={mode}
        onClick={() => setFilter(mode)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
          active
            ? 'bg-primary/15 border-primary/30 text-primary'
            : 'border-base-content/10 text-base-content/50 hover:border-base-content/20 hover:text-base-content/70'
        }`}
      >
        {label} {count > 0 && <span className="opacity-60">({count})</span>}
      </button>
    );
  };

  return (
    <>
      {pill('all', 'Active', activeCount)}
      {pill('archived', 'Archived', archivedCount, false)}
      {pill('shared', 'Shared', sharedCount, false)}
      {pill('ideas', 'Ideas', ideasCount)}
    </>
  );
}

export default ProjectsPage;
