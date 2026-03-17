import React, { useState } from 'react';
import { getContrastTextColor } from '../../utils/contrastTextColor';
import { InlineEdit, InlineDate, InlineSelect, toCommandDate } from '../shared/InlineEdit';

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
  onCommandExecute?: (command: string) => void;
}

const priorityColor: Record<string, string> = {
  high: 'text-error',
  medium: 'text-warning',
  low: 'text-info',
};

const statusColor: Record<string, string> = {
  in_progress: 'text-info',
  blocked: 'text-error',
  review: 'text-warning',
  done: 'text-success',
};

const formatAssignee = (assignedTo: any): string | null => {
  if (!assignedTo) return null;
  if (typeof assignedTo === 'object' && assignedTo.firstName) {
    return `${assignedTo.firstName} ${assignedTo.lastName || ''}`.trim();
  }
  return 'Assigned';
};

const priorityOptions = [
  { value: 'low', label: 'low', className: 'text-info' },
  { value: 'medium', label: 'medium', className: 'text-warning' },
  { value: 'high', label: 'high', className: 'text-error' },
];

const statusOptions = [
  { value: 'not_started', label: 'not started', className: 'text-base-content/60' },
  { value: 'in_progress', label: 'in progress', className: 'text-info' },
  { value: 'blocked', label: 'blocked', className: 'text-error' },
  { value: 'review', label: 'review', className: 'text-warning' },
  { value: 'completed', label: 'completed', className: 'text-success' },
];

export const TodosRenderer: React.FC<TodosRendererProps> = ({ todos, projectId, onNavigate, onCommandClick, onCommandExecute }) => {
  const [localTodos, setLocalTodos] = useState(todos);
  const completed = localTodos.filter(t => t.completed).length;
  const pct = localTodos.length > 0 ? Math.round((completed / localTodos.length) * 100) : 0;

  const exec = (cmd: string) => onCommandExecute?.(cmd);

  const handleToggle = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const todo = localTodos[index];
    const wasCompleted = todo.completed;
    setLocalTodos(prev => prev.map((t, i) =>
      i === index ? { ...t, completed: !t.completed, status: wasCompleted ? 'not_started' : 'completed' } : t
    ));
    if (wasCompleted) {
      // No /uncomplete command — use status flag
      exec(`/edit todo ${index + 1} --status=not_started`);
    } else {
      exec(`/complete ${index + 1}`);
    }
  };

  const handleSubtaskToggle = (e: React.MouseEvent, todoIndex: number, subtaskIndex: number) => {
    e.stopPropagation();
    const subtask = localTodos[todoIndex]?.subtasks?.[subtaskIndex];
    const wasCompleted = subtask?.completed;
    setLocalTodos(prev => prev.map((t, i) =>
      i === todoIndex ? {
        ...t,
        subtasks: t.subtasks?.map((s, si) =>
          si === subtaskIndex ? { ...s, completed: !s.completed, status: wasCompleted ? 'not_started' : 'completed' } : s
        )
      } : t
    ));
    if (wasCompleted) {
      exec(`/edit subtask ${todoIndex + 1} ${subtaskIndex + 1} --status=not_started`);
    } else {
      exec(`/complete ${todoIndex + 1}.${subtaskIndex + 1}`);
    }
  };

  const handlePushToDevlog = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    exec(`/push ${index + 1}`);
    setLocalTodos(prev => prev.filter((_, i) => i !== index));
  };

  const handleDelete = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    exec(`/delete todo ${index + 1} --confirm`);
    setLocalTodos(prev => prev.filter((_, i) => i !== index));
  };

  const handleTitleSave = (index: number, newTitle: string) => {
    setLocalTodos(prev => prev.map((t, i) =>
      i === index ? { ...t, title: newTitle } : t
    ));
    exec(`/edit todo ${index + 1} --title="${newTitle.replace(/"/g, '\\"')}"`);
  };

  const handleDescriptionSave = (index: number, newDesc: string) => {
    setLocalTodos(prev => prev.map((t, i) =>
      i === index ? { ...t, description: newDesc } : t
    ));
    exec(`/edit todo ${index + 1} --content="${newDesc.replace(/"/g, '\\"')}"`);
  };

  const handlePriorityChange = (index: number, newPriority: string) => {
    setLocalTodos(prev => prev.map((t, i) =>
      i === index ? { ...t, priority: newPriority } : t
    ));
    exec(`/edit todo ${index + 1} --priority=${newPriority}`);
  };

  const handleStatusChange = (index: number, newStatus: string) => {
    setLocalTodos(prev => prev.map((t, i) =>
      i === index ? { ...t, status: newStatus } : t
    ));
    exec(`/edit todo ${index + 1} --status=${newStatus}`);
  };

  const handleDueDateChange = (index: number, isoDate: string) => {
    setLocalTodos(prev => prev.map((t, i) =>
      i === index ? { ...t, dueDate: new Date(isoDate) } : t
    ));
    exec(`/edit todo ${index + 1} --due="${toCommandDate(isoDate)}"`);
  };

  const handleDueDateClear = (index: number) => {
    setLocalTodos(prev => prev.map((t, i) =>
      i === index ? { ...t, dueDate: undefined } : t
    ));
    exec(`/edit todo ${index + 1} --due="none"`);
  };

  const handleSubtaskTitleSave = (todoIndex: number, subtaskIndex: number, newTitle: string) => {
    setLocalTodos(prev => prev.map((t, i) =>
      i === todoIndex ? {
        ...t,
        subtasks: t.subtasks?.map((s, si) =>
          si === subtaskIndex ? { ...s, title: newTitle } : s
        )
      } : t
    ));
    exec(`/edit subtask ${todoIndex + 1} ${subtaskIndex + 1} --title="${newTitle.replace(/"/g, '\\"')}"`);
  };

  const handleSubtaskPriorityChange = (todoIndex: number, subtaskIndex: number, val: string) => {
    setLocalTodos(prev => prev.map((t, i) =>
      i === todoIndex ? {
        ...t,
        subtasks: t.subtasks?.map((s, si) =>
          si === subtaskIndex ? { ...s, priority: val } : s
        )
      } : t
    ));
    exec(`/edit subtask ${todoIndex + 1} ${subtaskIndex + 1} --priority=${val}`);
  };

  const handleSubtaskStatusChange = (todoIndex: number, subtaskIndex: number, val: string) => {
    setLocalTodos(prev => prev.map((t, i) =>
      i === todoIndex ? {
        ...t,
        subtasks: t.subtasks?.map((s, si) =>
          si === subtaskIndex ? { ...s, status: val } : s
        )
      } : t
    ));
    exec(`/edit subtask ${todoIndex + 1} ${subtaskIndex + 1} --status=${val}`);
  };

  const handleSubtaskDueDateChange = (todoIndex: number, subtaskIndex: number, isoDate: string) => {
    setLocalTodos(prev => prev.map((t, i) =>
      i === todoIndex ? {
        ...t,
        subtasks: t.subtasks?.map((s, si) =>
          si === subtaskIndex ? { ...s, dueDate: new Date(isoDate) } : s
        )
      } : t
    ));
    exec(`/edit subtask ${todoIndex + 1} ${subtaskIndex + 1} --due="${toCommandDate(isoDate)}"`);
  };

  return (
    <div className="mt-3 space-y-2">
      {/* Header card */}
      <div className="flex items-center gap-3 px-4 py-3 bg-base-200 border-thick border-l-4 border-l-primary rounded-lg">
        <span className="text-base font-bold text-base-content">Todos</span>
        <span className="text-sm font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/30">{completed}/{localTodos.length}</span>
        <div className="flex-1 h-2 bg-base-content/8 rounded-full overflow-hidden ml-auto max-w-40">
          <div
            className="h-full bg-success rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-base-content/50">{pct}%</span>
      </div>

      {/* Todo cards */}
      {localTodos.map((todo, index) => (
        <div key={index} className="rounded-lg border-thick bg-base-200/60 hover:bg-base-200 transition-colors">
          <div className="flex items-start gap-3 px-4 py-3 group">
            {/* Checkbox */}
            <button
              onClick={(e) => handleToggle(e, index)}
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all cursor-pointer hover:scale-110 ${
                todo.completed
                  ? 'bg-success/25 border-success hover:bg-success/40'
                  : 'border-base-content/30 hover:border-success hover:bg-success/10'
              }`}
              title={todo.completed ? 'Mark incomplete' : 'Mark complete'}
            >
              {todo.completed && (
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <div className={`text-base font-semibold break-words ${
                todo.completed ? 'line-through text-base-content/40' : 'text-base-content'
              }`}>
                <InlineEdit
                  value={todo.title}
                  onSave={(val) => handleTitleSave(index, val)}
                  inputClassName="text-base font-semibold"
                />
                {todo.subtasks && todo.subtasks.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-base-content/50 font-mono">
                    ({todo.subtasks.filter(s => s.completed).length}/{todo.subtasks.length})
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="text-sm text-base-content/60 mt-1">
                <InlineEdit
                  value={todo.description || ''}
                  onSave={(val) => handleDescriptionSave(index, val)}
                  inputClassName="text-sm text-base-content/60"
                  multiline
                  placeholder="Add description..."
                />
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                <InlineSelect
                  value={todo.priority || 'medium'}
                  options={priorityOptions}
                  onSelect={(val) => handlePriorityChange(index, val)}
                />
                <span className="text-base-content/15">|</span>
                <InlineSelect
                  value={todo.status || 'not_started'}
                  options={statusOptions}
                  onSelect={(val) => handleStatusChange(index, val)}
                />
                <span className="text-base-content/15">|</span>
                <InlineDate
                  value={todo.dueDate}
                  onSave={(isoDate) => handleDueDateChange(index, isoDate)}
                  onClear={() => handleDueDateClear(index)}
                />
                {formatAssignee(todo.assignedTo) && (
                  <>
                    <span className="text-base-content/15">|</span>
                    <span className="text-sm text-base-content/50">
                      {formatAssignee(todo.assignedTo)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Actions — hover */}
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {todo.completed && (
                <button
                  onClick={(e) => handlePushToDevlog(e, index)}
                  className="btn btn-xs btn-ghost border border-base-content/15 hover:border-primary/50 hover:text-primary"
                  title="Move to devlog"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </button>
              )}
              <button
                onClick={(e) => handleDelete(e, index)}
                className="btn btn-xs btn-ghost border border-base-content/15 hover:border-error/50 hover:text-error"
                title="Delete todo"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Subtasks */}
          {todo.subtasks && todo.subtasks.length > 0 && (
            <div className="mx-3 mb-3 rounded-lg border border-base-content/10 bg-base-100/50 divide-y divide-base-content/5">
              {todo.subtasks.map((subtask, subIndex) => (
                <div
                  key={subIndex}
                  className="flex items-start gap-3 py-2 px-3 group/sub"
                >
                  <button
                    onClick={(e) => handleSubtaskToggle(e, index, subIndex)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all cursor-pointer hover:scale-110 ${
                      subtask.completed
                        ? 'bg-success/25 border-success hover:bg-success/40'
                        : 'border-base-content/20 hover:border-success hover:bg-success/10'
                    }`}
                    title={subtask.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {subtask.completed && (
                      <svg className="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium break-words ${
                      subtask.completed ? 'line-through text-base-content/35' : 'text-base-content/75'
                    }`}>
                      <InlineEdit
                        value={subtask.title}
                        onSave={(val) => handleSubtaskTitleSave(index, subIndex, val)}
                        inputClassName="text-sm font-medium"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                      <InlineSelect
                        value={subtask.priority || 'medium'}
                        options={priorityOptions}
                        onSelect={(val) => handleSubtaskPriorityChange(index, subIndex, val)}
                      />
                      <span className="text-base-content/15">|</span>
                      <InlineSelect
                        value={subtask.status || 'not_started'}
                        options={statusOptions}
                        onSelect={(val) => handleSubtaskStatusChange(index, subIndex, val)}
                      />
                      <span className="text-base-content/15">|</span>
                      <InlineDate
                        value={subtask.dueDate}
                        onSave={(isoDate) => handleSubtaskDueDateChange(index, subIndex, isoDate)}
                        placeholder="Set date"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Footer */}
      <div className="px-4 py-2.5 bg-base-200/50 border-thick rounded-lg flex items-center justify-between">
        <span className="text-xs text-base-content/40 font-mono">
          click to edit · checkboxes toggle
        </span>
        {projectId && (
          <button
            onClick={() => onNavigate('/notes?section=todos')}
            className="btn btn-xs btn-primary border-thick font-semibold"
            style={{ color: getContrastTextColor('primary') }}
          >
            Open Todos
          </button>
        )}
      </div>
    </div>
  );
};
