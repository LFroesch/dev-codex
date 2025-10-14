import React, { useState } from 'react';
import { Todo, projectAPI } from '../api';
import DatePicker from './DatePicker';
import TeamMemberSelect from './TeamMemberSelect';
import SubtaskList from './SubtaskList';
import ConfirmationModal from './ConfirmationModal';
import { getContrastTextColor } from '../utils/contrastTextColor';

interface TodoItemProps {
  todo: Todo;
  projectId: string;
  onUpdate: () => Promise<void>;
  onArchiveToDevLog: (todo: Todo) => void;
  isSharedProject?: boolean;
  canEdit?: boolean;
  isSubtask?: boolean;
  allTodos?: Todo[];
}

const TodoItem: React.FC<TodoItemProps> = ({ 
  todo, 
  projectId, 
  onUpdate, 
  onArchiveToDevLog, 
  isSharedProject = false, 
  canEdit = true, 
  isSubtask = false, 
  allTodos = [] 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.text);
  const [editDescription, setEditDescription] = useState(todo.description || '');
  const [editPriority, setEditPriority] = useState(todo.priority || 'medium');
  const [editDueDate, setEditDueDate] = useState(todo.dueDate || '');
  const [editReminderDate, setEditReminderDate] = useState(todo.reminderDate || '');
  const [editAssignedTo, setEditAssignedTo] = useState(
    typeof todo.assignedTo === 'object' ? todo.assignedTo._id : (todo.assignedTo || '')
  );
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!editTitle.trim()) return;

    setLoading(true);
    try {
      await projectAPI.updateTodo(projectId, todo.id, {
        text: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority,
        dueDate: editDueDate || undefined,
        reminderDate: editReminderDate || undefined,
        assignedTo: editAssignedTo || undefined
      });
      setIsEditing(false);
      await onUpdate();
    } catch (error) {
      console.error('Failed to update todo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    try {
      await projectAPI.updateTodo(projectId, todo.id, { completed: !todo.completed });
      await onUpdate();
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await projectAPI.deleteTodo(projectId, todo.id);
      await onUpdate();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete todo:', error);
      setShowDeleteConfirm(false);
    }
  };

  const handleArchive = () => {
    onArchiveToDevLog(todo);
  };

  const handleAddSubtask = async () => {
    setShowAddSubtask(false);
    await onUpdate();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-error';
      case 'medium': return 'text-warning';
      case 'low': return 'text-success';
      default: return 'text-base-content/60';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };


  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const isDueSoon = (dueDate?: string) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 24;
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    return due.getTime() < now.getTime();
  };

  const subtasks = allTodos.filter(t => t.parentTodoId === todo.id);
  const hasSubtasks = subtasks.length > 0;
  const completedSubtasks = subtasks.filter(s => s.completed).length;

  if (isEditing) {
    return (
      <div className="bg-base-100 p-3 rounded-lg h-full shadow-sm">
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="input input-bordered w-full text-lg font-semibold"
            placeholder="Todo title..."
            autoFocus
          />
          
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="textarea textarea-bordered w-full font-semibold text-md"
            placeholder="Description..."
            rows={2}
          />

          <div className="grid grid-cols-1 gap-3">
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="select select-bordered select-sm"
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DatePicker
              label="Due Date"
              value={editDueDate}
              onChange={setEditDueDate}
              placeholder="Set due date..."
            />
            
            <DatePicker
              label="Reminder"
              value={editReminderDate}
              onChange={setEditReminderDate}
              placeholder="Set reminder..."
            />
          </div>

          <TeamMemberSelect
            projectId={projectId}
            value={editAssignedTo}
            onChange={(userId) => setEditAssignedTo(userId ?? '')}
            isSharedProject={isSharedProject}
            placeholder="Assign to team member..."
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEditing(false)}
              className="btn btn-ghost btn-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary btn-sm"
              disabled={loading || !editTitle.trim()}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group p-3 flex-1 h-full ${
      todo.completed ? 'opacity-70' : ''
    }`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={handleToggleComplete}
          className="checkbox checkbox-primary mt-1 flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={`font-semibold text-lg leading-tight px-2 py-1 rounded-md bg-primary inline-block w-fit border-thick ${
                todo.completed ? 'line-through text-base-content/60' : ''
              }`}
              style={{
                color: getContrastTextColor()
              }}
            >
              {todo.text}
            </h3>
            
            <span className={`text-sm ${getPriorityColor(todo.priority || 'medium')}`}>
              {getPriorityIcon(todo.priority || 'medium')}
            </span>
            
            {hasSubtasks && (
              <span className="text-xs bg-info/20 text-info px-2 py-0.5 rounded-full">
                {completedSubtasks}/{subtasks.length}
              </span>
            )}
            
            {isOverdue(todo.dueDate) && (
              <span className="text-xs bg-error/20 text-error px-2 py-0.5 rounded-full">
                Overdue
              </span>
            )}
            
            {!isOverdue(todo.dueDate) && isDueSoon(todo.dueDate) && (
              <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">
                Due soon
              </span>
            )}
          </div>
          
          {todo.description && (
            <p className={`text-sm text-base-content/70 mb-2 ${todo.completed ? 'line-through' : ''}`}>
              {todo.description}
            </p>
          )}
          
          {(todo.dueDate || todo.assignedTo) && (
            <div className="flex items-center gap-4 text-xs text-base-content/60">
              {todo.dueDate && (
                <span>📅 {formatDate(todo.dueDate)}</span>
              )}
              {todo.assignedTo && isSharedProject && (
                <span>👤 {typeof todo.assignedTo === 'object' 
                  ? `${todo.assignedTo.firstName} ${todo.assignedTo.lastName}` 
                  : todo.assignedTo}</span>
              )}
            </div>
          )}
        </div>

        <div className="group-hover:opacity-100 transition-opacity flex items-center gap-1">
          {!isSubtask && canEdit && (
            <button
              onClick={() => setShowAddSubtask(true)}
              className="btn btn-ghost btn-xs border-2 border-base-300 bg-base-200"
              title="Add Subtask"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          )}
          
          {todo.completed && (
            <button
              onClick={handleArchive}
              className="btn btn-ghost btn-xs border-2 border-base-300 bg-base-200"
              title="Archive"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
              </svg>
            </button>
          )}
          
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-ghost btn-xs border-2 border-base-300 bg-base-200"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-ghost btn-xs text-error hover:bg-error hover:text-error-content border-2 border-base-300 bg-base-200"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Todo"
        message={`Are you sure you want to delete "${todo.text}"?`}
        confirmText="Delete"
        variant="error"
      />

      {showAddSubtask && !isSubtask && (
        <div className="mt-3 pt-3 border-t border-base-200">
          <QuickAddForm
            projectId={projectId}
            onAdd={handleAddSubtask}
            parentTodoId={todo.id}
            placeholder="Add a subtask..."
            onCancel={() => setShowAddSubtask(false)}
          />
        </div>
      )}

      {!isSubtask && hasSubtasks && (
        <div className="mt-3">
          <SubtaskList
            parentTodo={todo}
            subtasks={subtasks}
            projectId={projectId}
            onUpdate={onUpdate}
            onArchiveToDevLog={onArchiveToDevLog}
            isSharedProject={isSharedProject}
            canEdit={canEdit}
          />
        </div>
      )}
    </div>
  );
};

// Simple, fast todo creation
interface QuickAddFormProps {
  projectId: string;
  onAdd: () => Promise<void>;
  parentTodoId?: string;
  placeholder?: string;
  onCancel?: () => void;
}

const QuickAddForm: React.FC<QuickAddFormProps> = ({ 
  projectId, 
  onAdd, 
  parentTodoId, 
  placeholder = "Add a new todo...",
  onCancel 
}) => {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await projectAPI.createTodo(projectId, {
        text: title.trim(),
        parentTodoId: parentTodoId || undefined
      });

      setTitle('');
      await onAdd();
    } catch (error) {
      console.error('Failed to create todo:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="input input-bordered input-sm text-base-content/40 flex-1"
        placeholder={placeholder}
        autoFocus
        disabled={loading}
      />
      <button
        type="submit"
        className="btn btn-primary btn-sm"
        disabled={loading || !title.trim()}
      >
        {loading ? '...' : 'Add'}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-ghost btn-sm"
          disabled={loading}
        >
          ✕
        </button>
      )}
    </form>
  );
};

// Main creation form - clean and simple
interface NewTodoFormProps {
  projectId: string;
  onAdd: () => Promise<void>;
  isSharedProject?: boolean;
  parentTodoId?: string;
  compact?: boolean;
}

const NewTodoForm: React.FC<NewTodoFormProps> = ({ projectId, onAdd, parentTodoId, compact = false }) => {
  if (compact) {
    return (
      <QuickAddForm
        projectId={projectId}
        onAdd={onAdd}
        parentTodoId={parentTodoId}
      />
    );
  }

  return (
    <div className="bg-base-100 border-2 border-base-200 rounded-lg p-4 mb-4">
      <QuickAddForm
        projectId={projectId}
        onAdd={onAdd}
        parentTodoId={parentTodoId}
        placeholder="What needs to be done?"
      />
    </div>
  );
};

export { TodoItem, NewTodoForm };