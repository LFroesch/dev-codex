import React from 'react';

interface Subtask {
  title: string;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
  status?: string;
  dueDate?: string;
}

interface ParentTodo {
  title: string;
}

interface SubtasksRendererProps {
  subtasks: Subtask[];
  parentTodo?: ParentTodo;
}

const SubtasksRenderer: React.FC<SubtasksRendererProps> = ({ subtasks, parentTodo }) => {
  return (
    <div className="mt-3 space-y-2">
      {parentTodo && (
        <div className="text-xs text-base-content/60 mb-2">
          Parent: <span className="font-semibold">{parentTodo.title}</span>
        </div>
      )}
      <div className="space-y-1">
        {subtasks.map((subtask, index) => (
          <div
            key={index}
            className={`p-2 rounded-lg transition-colors border-thick ${
              subtask.completed ? 'bg-success/10 border-success/30' : 'bg-base-200 border-base-content/20'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                {subtask.completed ? '✓' : '○'}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm break-words ${
                  subtask.completed ? 'line-through text-base-content/50' : 'text-base-content/80'
                }`}>
                  {subtask.title}
                </div>
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {subtask.priority && (
                    <span className={`badge badge-xs ${
                      subtask.priority === 'high' ? 'badge-error' :
                      subtask.priority === 'medium' ? 'badge-warning' :
                      'badge-info'
                    }`}>
                      {subtask.priority}
                    </span>
                  )}
                  {subtask.status && (
                    <span className="badge badge-xs badge-ghost">{subtask.status}</span>
                  )}
                  {subtask.dueDate && (
                    <span className="text-xs text-base-content/60">
                      📅 {new Date(subtask.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubtasksRenderer;
