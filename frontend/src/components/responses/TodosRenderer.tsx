import React from 'react';
import { getContrastTextColor } from '../../utils/contrastTextColor';

interface Subtask {
  id: string;
  index?: number;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  completed: boolean;
  dueDate?: Date;
  reminderDate?: Date;
  assignedTo?: any;
}

interface Todo {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  completed: boolean;
  dueDate?: Date;
  reminderDate?: Date;
  assignedTo?: any;
  subtasks?: Subtask[];
}

interface TodosRendererProps {
  todos: Todo[];
  projectId?: string;
  onNavigate: (path: string) => void;
  onCommandClick?: (command: string) => void;
}

export const TodosRenderer: React.FC<TodosRendererProps> = ({ todos, projectId, onNavigate, onCommandClick }) => {
  return (
    <div className="mt-3 space-y-2">
      <div className="space-y-1">
        {todos.map((todo, index) => (
          <div key={index} className="space-y-1">
            {/* Parent Todo */}
            <button
              onClick={() => onCommandClick?.(`/edit todo ${index + 1}`)}
              className="w-full text-left flex items-start gap-3 p-2 bg-base-200 rounded-lg hover:bg-primary/10 hover:border-primary/50 transition-colors border-thick cursor-pointer"
            >
              <div className="flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/30">
                    #{index + 1}
                  </span>
                  <div className="mt-0.5">
                    {todo.completed ? (
                      <span className="text-success">✓</span>
                    ) : (
                      <span className="text-base-content/50">○</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium text-base-content/80 break-words ${todo.completed ? 'line-through opacity-60' : ''}`}>
                  {todo.title}
                  {todo.subtasks && todo.subtasks.length > 0 && (
                    <span className="ml-2 text-xs text-base-content/60">
                      ({todo.subtasks.filter(s => s.completed).length}/{todo.subtasks.length})
                    </span>
                  )}
                </div>
                {todo.description && (
                  <div className="text-xs text-base-content/60 mt-1 break-words whitespace-pre-wrap">
                    {todo.description}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1">
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
                  {todo.dueDate && (
                    <span className="text-xs text-base-content/60">
                      📅 {new Date(todo.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {todo.reminderDate && (
                    <span className="text-xs text-base-content/60">
                      🔔 {new Date(todo.reminderDate).toLocaleDateString()}
                    </span>
                  )}
                  {todo.assignedTo && (
                    <span className="text-xs text-base-content/60">
                      👤 {typeof todo.assignedTo === 'object' && todo.assignedTo.firstName
                        ? `${todo.assignedTo.firstName} ${todo.assignedTo.lastName}`
                        : 'Assigned'}
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Subtasks (indented) */}
            {todo.subtasks && todo.subtasks.length > 0 && (
              <div className="ml-8 space-y-1">
                {todo.subtasks.map((subtask, subIndex) => (
                  <button
                    key={subIndex}
                    onClick={() => onCommandClick?.(`/edit subtask ${index + 1} ${subIndex + 1}`)}
                    className="w-full text-left flex items-start gap-2 p-2 bg-base-100 rounded-lg hover:bg-primary/10 hover:border-primary/50 transition-colors border-2 border-base-content/10 cursor-pointer"
                  >
                    <div className="flex-shrink-0 mt-0.5 text-sm">
                      {subtask.completed ? (
                        <span className="text-success">✓</span>
                      ) : (
                        <span className="text-base-content/40">○</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm text-base-content/70 break-words ${subtask.completed ? 'line-through opacity-60' : ''}`}>
                        {subtask.title}
                      </div>
                      {subtask.description && (
                        <div className="text-xs text-base-content/50 mt-1 break-words whitespace-pre-wrap">
                          {subtask.description}
                        </div>
                      )}
                      {(subtask.priority || subtask.status || subtask.dueDate || subtask.reminderDate || subtask.assignedTo) && (
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          {subtask.priority && (
                            <span className={`badge badge-xs mr-1 ${
                              subtask.priority === 'high' ? 'badge-error' :
                              subtask.priority === 'medium' ? 'badge-warning' :
                              'badge-info'
                            }`}>
                              {subtask.priority}
                            </span>
                          )}
                          {subtask.status && (
                            <span className="text-xs text-base-content/50">
                              {subtask.status.replace('_', ' ')}
                            </span>
                          )}
                          {subtask.dueDate && (
                            <span className="text-xs text-base-content/50">
                              📅 {new Date(subtask.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {subtask.reminderDate && (
                            <span className="text-xs text-base-content/50">
                              🔔 {new Date(subtask.reminderDate).toLocaleDateString()}
                            </span>
                          )}
                          {subtask.assignedTo && (
                            <span className="text-xs text-base-content/50">
                              👤 {typeof subtask.assignedTo === 'object' && subtask.assignedTo.firstName
                                ? `${subtask.assignedTo.firstName} ${subtask.assignedTo.lastName}`
                                : 'Assigned'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="text-xs text-base-content/60 mt-3 p-2 bg-base-200/50 rounded border-thick">
        💡 <strong>Tip:</strong> Use the <code className="bg-base-300 px-1 rounded">#ID</code> to reference todos:
        <div className="mt-1 space-y-0.5 ml-4">
          <div>• <code className="bg-base-300 px-1 rounded">/edit todo 1 new text</code></div>
          <div>• <code className="bg-base-300 px-1 rounded">/edit todo old text to new text</code></div>
          <div>• <code className="bg-base-300 px-1 rounded">/delete todo 1 --confirm</code></div>
        </div>
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
