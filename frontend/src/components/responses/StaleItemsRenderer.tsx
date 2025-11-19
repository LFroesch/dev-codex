import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface StaleItem {
  projectId: string;
  projectName: string;
  itemId: string;
  itemType: 'note' | 'todo';
  title: string;
  daysSinceUpdate: number;
  updatedAt: string;
}

interface StaleItemsRendererProps {
  staleNotes: StaleItem[];
  staleTodos: StaleItem[];
  notesByProject?: Record<string, StaleItem[]>;
  todosByProject?: Record<string, StaleItem[]>;
  totalCount: number;
}

const StaleItemsRenderer: React.FC<StaleItemsRendererProps> = ({
  staleNotes,
  staleTodos,
  notesByProject = {},
  todosByProject = {},
  totalCount
}) => {
  const navigate = useNavigate();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const handleItemClick = (item: StaleItem) => {
    // Dispatch event to set active project
    window.dispatchEvent(new CustomEvent('selectProject', { detail: { projectId: item.projectId } }));

    // Navigate to the appropriate page
    if (item.itemType === 'note') {
      navigate('/notes');
    } else {
      navigate('/notes?section=todos');
    }
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  if (totalCount === 0) {
    return (
      <div className="mt-3 p-4 bg-base-200/50 rounded-lg border-thick text-center">
        <div className="text-4xl mb-2">✨</div>
        <p className="text-base-content/70">No stale items found! All your notes and todos are up to date.</p>
      </div>
    );
  }

  // Group all items by project for better organization
  const projectGroups: Record<string, { notes: StaleItem[], todos: StaleItem[] }> = {};

  staleNotes.forEach(note => {
    if (!projectGroups[note.projectId]) {
      projectGroups[note.projectId] = { notes: [], todos: [] };
    }
    projectGroups[note.projectId].notes.push(note);
  });

  staleTodos.forEach(todo => {
    if (!projectGroups[todo.projectId]) {
      projectGroups[todo.projectId] = { notes: [], todos: [] };
    }
    projectGroups[todo.projectId].todos.push(todo);
  });

  return (
    <div className="mt-3 space-y-3">

      {Object.entries(projectGroups).map(([projectId, items]) => {
        const projectName = items.notes[0]?.projectName || items.todos[0]?.projectName || 'Unknown Project';
        const totalItems = items.notes.length + items.todos.length;
        const isExpanded = expandedProjects.has(projectId);

        return (
          <div key={projectId} className="bg-base-200/50 rounded-lg border-thick overflow-hidden">
            <button
              onClick={() => toggleProject(projectId)}
              className="w-full p-4 flex items-center justify-between hover:bg-base-300/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {isExpanded ? '▼' : '▶'}
                </span>
                <h3 className="font-semibold text-lg">{projectName}</h3>
              </div>
              <span className="badge badge-sm">{totalItems} stale item{totalItems !== 1 ? 's' : ''}</span>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4">
                {items.notes.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-base-content/70 mb-2">
                  Notes ({items.notes.length})
                </h4>
                <div className="space-y-1">
                  {items.notes.map(note => (
                    <button
                      key={note.itemId}
                      onClick={() => handleItemClick(note)}
                      className="block w-full text-left p-2 bg-base-300/50 hover:bg-primary/10 hover:border-primary/30 rounded border border-transparent transition-all group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium group-hover:text-primary transition-colors">
                          📝 {note.title}
                        </span>
                        <span className="text-sm text-base-content/60">
                          {note.daysSinceUpdate}d ago
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {items.todos.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-base-content/70 mb-2">
                  Todos ({items.todos.length})
                </h4>
                <div className="space-y-1">
                  {items.todos.map(todo => (
                    <button
                      key={todo.itemId}
                      onClick={() => handleItemClick(todo)}
                      className="block w-full text-left p-2 bg-base-300/50 hover:bg-primary/10 hover:border-primary/30 rounded border border-transparent transition-all group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium group-hover:text-primary transition-colors">
                          ☑️ {todo.title}
                        </span>
                        <span className="text-sm text-base-content/60">
                          {todo.daysSinceUpdate}d ago
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="text-sm text-base-content/60 text-center mt-4">
        Click on any item to navigate to its project
      </div>
    </div>
  );
};

export default StaleItemsRenderer;
