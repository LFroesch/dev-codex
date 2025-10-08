import React from 'react';
import { getContrastTextColor } from '../../utils/contrastTextColor';

interface Todo {
  id: string;
  text: string;
  priority?: string;
  status?: string;
  completed: boolean;
  dueDate?: Date;
}

interface TodosRendererProps {
  todos: Todo[];
  projectId?: string;
  onNavigate: (path: string) => void;
}

export const TodosRenderer: React.FC<TodosRendererProps> = ({ todos, projectId, onNavigate }) => {
  return (
    <div className="mt-3 space-y-2">
      <div className="space-y-1">
        {todos.map((todo, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
          >
            <div className="flex-shrink-0 mt-0.5">
              {todo.completed ? (
                <span className="text-success">✓</span>
              ) : (
                <span className="text-base-content/50">○</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm text-base-content/80 break-words ${todo.completed ? 'line-through opacity-60' : ''}`}>
                {todo.text}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {todo.priority && (
                  <span className={`badge badge-xs ${
                    todo.priority === 'high' ? 'badge-error' :
                    todo.priority === 'medium' ? 'badge-warning' :
                    'badge-info'
                  }`}>
                    {todo.priority}
                  </span>
                )}
                {todo.status && (
                  <span className="text-xs text-base-content/60">
                    {todo.status.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {projectId && (
        <button
          onClick={() => onNavigate('/notes?section=todos')}
          className="btn-primary-sm gap-2 border-thick"
          style={{ color: getContrastTextColor('primary') }}
        >
          <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          View Todos
        </button>
      )}
    </div>
  );
};
