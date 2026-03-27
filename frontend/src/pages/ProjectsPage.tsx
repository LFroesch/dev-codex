import React, { lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../api/types';
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

const countActiveTodos = (project: Project): number => {
  return project.todos.filter(t => !t.completed).length;
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

// --- Project Card ---

const ProjectCard: React.FC<{
  project: Project;
  isSelected: boolean;
  overdue: number;
  activeTodos: number;
  formatProjectTime: (id: string) => string;
  onClick: () => void;
}> = ({ project, isSelected, overdue, activeTodos, formatProjectTime, onClick }) => (
  <button
    onClick={onClick}
    disabled={project.isLocked}
    title={project.isLocked ? (project.lockedReason || 'This project is locked') : ''}
    className={`w-full text-left transition-all duration-200 rounded-lg overflow-hidden ${
      project.isLocked
        ? 'opacity-50 cursor-not-allowed border-2 border-warning/50'
        : isSelected
          ? 'card-interactive-selected shadow-lg'
          : 'card-interactive'
    }`}
  >
    {/* Color bar top */}
    <div className="h-1.5" style={{ backgroundColor: project.color || 'oklch(var(--p))' }} />

    <div className="p-4 flex flex-col gap-3">
      {/* Header: name + category */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3
            className="font-bold text-sm truncate px-2 py-0.5 rounded-md border-thick capitalize"
            style={{
              backgroundColor: project.color,
              color: getContrastTextColor(project.color)
            }}
          >
            {project.name}
          </h3>
          {project.isLocked && (
            <svg className="w-4 h-4 text-warning flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        {project.category && (
          <span
            className="border-thick text-xs font-semibold px-2 py-0.5 rounded-md bg-info/20 capitalize flex-shrink-0"
            style={{ color: getContrastTextColor("info/20") }}
          >
            {project.category}
          </span>
        )}
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-base-content/60 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      )}

      {/* Status badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {overdue > 0 && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-error/20 border-2 border-error/40"
            style={{ color: getContrastTextColor("error/20") }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {overdue} overdue
          </span>
        )}
        {activeTodos > 0 && overdue === 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-base-200 border-thick">
            {activeTodos} todo{activeTodos !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Footer: time + updated */}
      <div className="flex items-center justify-between pt-2 border-t-2 border-base-content/10 mt-auto">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold font-mono bg-success/40 border-2 border-base-content/20"
          style={{ color: getContrastTextColor("success/40") }}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatProjectTime(project.id)}
        </span>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold font-mono bg-accent/20 border-2 border-accent/40"
          style={{ color: getContrastTextColor("accent/20") }}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {getRelativeTime(project.updatedAt)}
        </span>
      </div>
    </div>
  </button>
);

// --- Continue Card (featured) ---

const ContinueCard: React.FC<{
  project: Project;
  overdue: number;
  activeTodos: number;
  formatProjectTime: (id: string) => string;
  onClick: () => void;
}> = ({ project, overdue, activeTodos, formatProjectTime, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left section-container transition-all duration-200 hover:shadow-xl overflow-hidden group"
  >
    {/* Thick color bar */}
    <div className="h-2" style={{ backgroundColor: project.color || 'oklch(var(--p))' }} />

    <div className="p-5">
      <div className="flex items-center gap-4">
        {/* Project color icon */}
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold flex-shrink-0 border-thick shadow-sm"
          style={{ backgroundColor: project.color, color: getContrastTextColor(project.color) }}
        >
          {project.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-base capitalize truncate">{project.name}</span>
            {project.category && (
              <span className="border-thick text-xs font-semibold px-2 py-0.5 rounded-md bg-info/20 capitalize hidden sm:inline"
                style={{ color: getContrastTextColor("info/20") }}>
                {project.category}
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-base-content/60 truncate">{project.description}</p>
          )}
        </div>

        {/* Right side stats */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {overdue > 0 && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-error/20 border-2 border-error/40"
              style={{ color: getContrastTextColor("error/20") }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {overdue} overdue
            </span>
          )}
          {activeTodos > 0 && overdue === 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-base-200 border-thick">
              {activeTodos} todo{activeTodos !== 1 ? 's' : ''}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold font-mono bg-success/40 border-2 border-base-content/20 hidden sm:inline-flex"
            style={{ color: getContrastTextColor("success/40") }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatProjectTime(project.id)}
          </span>
          <svg className="w-5 h-5 text-base-content/30 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
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

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    switch (sortMode) {
      case 'name-asc': return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc': return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'date-created': return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'last-updated': return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      default: return sorted;
    }
  }, [filter, activeProjects, archivedProjects, sharedProjects, searchTerm, sortMode]);

  // Last worked on
  const lastProject = useMemo(() => {
    if (!activeProjects.length) return null;
    return [...activeProjects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  }, [activeProjects]);

  // Projects with overdue todos (excluding lastProject to avoid duplication)
  const attentionProjects = useMemo(() => {
    return activeProjects
      .filter(p => p.id !== lastProject?.id)
      .map(p => ({ project: p, overdue: countOverdueTodos(p) }))
      .filter(x => x.overdue > 0)
      .sort((a, b) => b.overdue - a.overdue);
  }, [activeProjects, lastProject]);

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
      <div className="flex items-center justify-center min-h-[50vh] py-16">
        <div className="text-center section-container p-12 max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
          <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Initializing session...</h3>
          <p className="text-base-content/60">Please wait while we set up your workspace</p>
        </div>
      </div>
    );
  }

  // Ideas view
  if (filter === 'ideas') {
    return (
      <div className="space-y-4">
        <FilterBar
          filter={filter} setFilter={setFilter}
          activeCount={activeProjects.length} archivedCount={archivedProjects.length}
          sharedCount={sharedProjects.length} ideasCount={ideasCount}
          searchTerm={searchTerm} onSearchChange={onSearchChange}
          sortLabel={sortLabel} onCycleSort={cycleSortMode}
          showSearch={false}
        />
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

  const showContinue = lastProject && filter === 'all' && !searchTerm;
  const showAttention = attentionProjects.length > 0 && filter === 'all' && !searchTerm;

  return (
    <div className="space-y-6">

      {/* Continue where you left off */}
      {showContinue && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="section-icon">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-bold text-sm uppercase tracking-wider text-base-content/70">Continue</h2>
          </div>
          <ContinueCard
            project={lastProject}
            overdue={countOverdueTodos(lastProject)}
            activeTodos={countActiveTodos(lastProject)}
            formatProjectTime={formatProjectTime}
            onClick={() => handleSelect(lastProject)}
          />
        </section>
      )}

      {/* Needs attention */}
      {showAttention && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="section-icon">
              <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="font-bold text-sm uppercase tracking-wider text-base-content/70">
              Needs Attention
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-error/20 border-2 border-error/40"
              style={{ color: getContrastTextColor("error/20") }}>
              {attentionProjects.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {attentionProjects.slice(0, 3).map(({ project, overdue }) => (
              <ProjectCard
                key={project.id}
                project={project}
                isSelected={selectedProject?.id === project.id}
                overdue={overdue}
                activeTodos={countActiveTodos(project)}
                formatProjectTime={formatProjectTime}
                onClick={() => handleSelect(project)}
              />
            ))}
          </div>
          {attentionProjects.length > 3 && (
            <p className="text-xs text-base-content/40 mt-2 text-center">
              +{attentionProjects.length - 3} more projects need attention
            </p>
          )}
        </section>
      )}

      {/* All Projects */}
      <section>
        <FilterBar
          filter={filter} setFilter={setFilter}
          activeCount={activeProjects.length} archivedCount={archivedProjects.length}
          sharedCount={sharedProjects.length} ideasCount={ideasCount}
          searchTerm={searchTerm} onSearchChange={onSearchChange}
          sortLabel={sortLabel} onCycleSort={cycleSortMode}
        />

        {displayProjects.length === 0 ? (
          <div className="flex items-center justify-center min-h-[40vh] py-16">
            <div className="text-center section-container p-12 max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {searchTerm ? 'No matches' : filter === 'archived' ? 'No archived projects' : filter === 'shared' ? 'No shared projects' : 'No projects yet'}
              </h3>
              <p className="text-base-content/60 mb-6">
                {searchTerm ? 'Try a different search term' : 'Create your first project to get started'}
              </p>
              {!searchTerm && filter === 'all' && (
                <button onClick={() => navigate('/create-project')} className="btn btn-primary btn-lg gap-2">
                  <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Project
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {displayProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isSelected={selectedProject?.id === project.id}
                  overdue={countOverdueTodos(project)}
                  activeTodos={countActiveTodos(project)}
                  formatProjectTime={formatProjectTime}
                  onClick={() => handleSelect(project)}
                />
              ))}

              {/* New project card */}
              {filter === 'all' && (
                <button
                  onClick={() => navigate('/create-project')}
                  className="border-2 border-dashed border-base-content/20 rounded-lg p-4 flex flex-col items-center justify-center gap-3 text-base-content/40 hover:border-primary/50 hover:text-primary/70 hover:bg-primary/5 transition-all duration-200 min-h-[120px]"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold">New Project</span>
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

// --- Filter / Sort Bar ---

const FilterBar: React.FC<{
  filter: FilterMode;
  setFilter: (f: FilterMode) => void;
  activeCount: number;
  archivedCount: number;
  sharedCount: number;
  ideasCount: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortLabel: string;
  onCycleSort: () => void;
  showSearch?: boolean;
}> = ({ filter, setFilter, activeCount, archivedCount, sharedCount, ideasCount, searchTerm, onSearchChange, sortLabel, onCycleSort, showSearch = true }) => {
  const tabs: { mode: FilterMode; label: string; count: number; alwaysShow: boolean }[] = [
    { mode: 'all', label: 'Active', count: activeCount, alwaysShow: true },
    { mode: 'archived', label: 'Archived', count: archivedCount, alwaysShow: false },
    { mode: 'shared', label: 'Shared', count: sharedCount, alwaysShow: false },
    { mode: 'ideas', label: 'Ideas', count: ideasCount, alwaysShow: true },
  ];

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {/* Tab-style filter */}
      <div className="tabs-container p-1">
        {tabs.map(({ mode, label, count, alwaysShow }) => {
          if (!alwaysShow && count === 0) return null;
          return (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`tab-button ${filter === mode ? 'tab-active' : ''}`}
            >
              {label} {count > 0 && <span className="text-xs opacity-60 ml-1">({count})</span>}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Search */}
      {showSearch && (
        <div className="relative">
          <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="input-field input-sm pl-9 pr-8 w-40 sm:w-52 border-2 border-base-content/20 bg-base-200/40"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Sort */}
      {showSearch && (
        <button
          onClick={onCycleSort}
          className="btn btn-sm btn-ghost gap-1.5 border-thick"
          title={`Sort: ${sortLabel}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          <span className="text-xs">{sortLabel}</span>
        </button>
      )}
    </div>
  );
};

export default ProjectsPage;
