import React, { useState } from 'react';
import { Todo, projectAPI } from '../api';
import DatePicker from './DatePicker';
import TeamMemberSelect from './TeamMemberSelect';
import SubtaskList from './SubtaskList';
import ConfirmationModal from './ConfirmationModal';

interface TodoItemProps {
  todo: Todo;
  projectId: string;
  onUpdate: () => void;
  onArchiveToDevLog: (todo: Todo) => void;
  isSharedProject?: boolean;
  canEdit?: boolean;
  isSubtask?: boolean;
  allTodos?: Todo[]; // Needed to find subtasks
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, projectId, onUpdate, onArchiveToDevLog, isSharedProject = false, canEdit = true, isSubtask = false, allTodos = [] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.text);
  const [editDescription, setEditDescription] = useState(todo.description || '');
  const [editPriority, setEditPriority] = useState(todo.priority || 'medium');
  const [editStatus, setEditStatus] = useState(todo.status || 'not_started');
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
        status: editStatus,
        dueDate: editDueDate || undefined,
        reminderDate: editReminderDate || undefined,
        assignedTo: editAssignedTo || undefined
      });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update todo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    try {
      await projectAPI.updateTodo(projectId, todo.id, { completed: !todo.completed });
      onUpdate();
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await projectAPI.deleteTodo(projectId, todo.id);
      onUpdate();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete todo:', error);
      setShowDeleteConfirm(false);
    }
  };

  const handleArchive = () => {
    onArchiveToDevLog(todo);
  };

  const handleAddSubtask = () => {
    setShowAddSubtask(false);
    onUpdate();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'badge-error';
      case 'medium': return 'badge-warning';
      case 'low': return 'badge-success';
      default: return 'badge-neutral';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔥';
      case 'medium': return '⚡';
      case 'low': return '🌱';
      default: return '⚪';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'in_progress': return 'badge-info';
      case 'blocked': return 'badge-error';
      case 'not_started': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'blocked': return '🚫';
      case 'not_started': return '⭕';
      default: return '⭕';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isDueSoon = (dueDate?: string) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 24; // Due within 24 hours
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    return due.getTime() < now.getTime();
  };

  // Find subtasks for this todo
  const subtasks = allTodos.filter(t => t.parentTodoId === todo.id);
  const hasSubtasks = subtasks.length > 0;

  return (
    <div className={`bg-base-100 border-subtle rounded-lg p-3 mb-3 ${todo.completed ? 'opacity-60' : ''}`}>
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex-center-gap-2 justify-between mb-3">
            <h4 className="font-medium text-sm text-base-content/70">Editing Todo</h4>
            <div className="flex-center-gap-2">
              <button
                onClick={handleSave}
                className="btn-primary-xs"
                disabled={loading || !editTitle.trim()}
              >
                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="btn-ghost-xs"
                disabled={loading}
              >
                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          </div>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="input-field input-sm w-full"
            placeholder="Todo title..."
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="textarea textarea-bordered textarea-sm w-full"
            placeholder="Todo description..."
            rows={2}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Priority</span>
              </label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="select select-bordered select-xs"
              >
                <option value="low">🌱 Low</option>
                <option value="medium">⚡ Medium</option>
                <option value="high">🔥 High</option>
              </select>
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Status</span>
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as 'not_started' | 'in_progress' | 'blocked' | 'completed')}
                className="select select-bordered select-xs"
              >
                <option value="not_started">⭕ Not Started</option>
                <option value="in_progress">🔄 In Progress</option>
                <option value="blocked">🚫 Blocked</option>
                <option value="completed">✅ Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DatePicker
              label="Due Date"
              value={editDueDate}
              onChange={setEditDueDate}
              placeholder="Set due date..."
              className=""
            />
            
            <DatePicker
              label="Reminder Date"
              value={editReminderDate}
              onChange={setEditReminderDate}
              placeholder="Set reminder..."
              className=""
            />
          </div>

            <TeamMemberSelect
              projectId={projectId}
              value={editAssignedTo}
              onChange={(userId) => setEditAssignedTo(userId ?? '')}
              isSharedProject={isSharedProject}
              placeholder="Assign to team member..."
            />
          <div className="flex-center-gap-2 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="btn-ghost-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary-sm"
              disabled={loading || !editTitle.trim()}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={handleToggleComplete}
              className="checkbox checkbox-primary checkbox-sm mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex-center-gap-2 flex-wrap">
                <h3 className={`font-semibold text-lg ${todo.completed ? 'line-through text-base-content/60' : ''}`}>
                  {todo.text}
                </h3>
                <div className={`badge badge-xs ${getPriorityColor(todo.priority || 'medium')}`}>
                  {getPriorityIcon(todo.priority || 'medium')} {todo.priority || 'medium'}
                </div>
                <div className={`badge badge-xs ${getStatusColor(todo.status || 'not_started')}`}>
                  {getStatusIcon(todo.status || 'not_started')} {(todo.status || 'not_started').replace('_', ' ')}
                </div>
                {hasSubtasks && (
                  <div className="badge badge-xs badge-info">
                    📋 {subtasks.filter(s => s.completed).length}/{subtasks.length} subtasks
                  </div>
                )}
                {isOverdue(todo.dueDate) && (
                  <div className="badge badge-xs badge-error">
                    🚨 Overdue
                  </div>
                )}
                {!isOverdue(todo.dueDate) && isDueSoon(todo.dueDate) && (
                  <div className="badge badge-xs badge-warning">
                    ⏰ Due Soon
                  </div>
                )}
              </div>
              {todo.description && (
                <p className={`text-sm text-base-content/70 mt-1 ${todo.completed ? 'line-through' : ''}`}>
                  {todo.description}
                </p>
              )}
              
              {/* Additional metadata */}
              <div className="space-y-1 mt-2">
                {todo.dueDate && (
                  <div className={`text-xs ${isOverdue(todo.dueDate) ? 'text-error' : isDueSoon(todo.dueDate) ? 'text-warning' : 'text-base-content/70'}`}>
                    📅 Due: {formatDate(todo.dueDate)}
                  </div>
                )}
                {todo.reminderDate && (
                  <div className="text-xs text-base-content/70">
                    🔔 Reminder: {formatDate(todo.reminderDate)}
                  </div>
                )}
                {todo.assignedTo && isSharedProject && (
                  <div className="text-xs text-base-content/70">
                    👤 Assigned to: {typeof todo.assignedTo === 'object' 
                      ? `${todo.assignedTo.firstName} ${todo.assignedTo.lastName}` 
                      : todo.assignedTo}
                  </div>
                )}
                <div className="text-xs text-base-content/50">
                  Created: {new Date(todo.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-center-gap-2 ml-2">
            {/* Add Subtask Button - Only show for parent todos (not subtasks themselves) */}
            {!isSubtask && canEdit && (
              <button
                onClick={() => setShowAddSubtask(true)}
                className="btn btn-sm btn-primary btn-outline"
                title="Add Subtask"
              >
                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Subtask
              </button>
            )}
            
            {todo.completed && (
              <button
                onClick={handleArchive}
                className="btn btn-sm btn-info btn-outline"
                title="Archive to Dev Log"
              >
                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
                </svg>
                Archive
              </button>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="btn-ghost-sm"
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn btn-sm btn-error btn-outline"
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}
      
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Todo"
        message={`Are you sure you want to delete "<strong>${todo.text}</strong>"? This action cannot be undone.`}
        confirmText="Delete Todo"
        variant="error"
      />

      {/* Add Subtask Form */}
      {showAddSubtask && !isSubtask && (
        <div className="mt-3 p-3 bg-base-200/50 rounded-lg border-l-4 border-primary">
          <div className="flex-center-gap-2 justify-between mb-3">
            <h4 className="font-medium text-sm text-primary">Add Subtask to "{todo.text}"</h4>
            <button
              onClick={() => setShowAddSubtask(false)}
              className="btn-ghost-xs"
              title="Cancel"
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <NewTodoForm
            projectId={projectId}
            onAdd={handleAddSubtask}
            isSharedProject={isSharedProject}
            parentTodoId={todo.id}
            compact={true}
          />
        </div>
      )}

      {/* Subtask List - Only show for parent todos (not subtasks themselves) */}
      {!isSubtask && hasSubtasks && (
        <SubtaskList
          parentTodo={todo}
          subtasks={subtasks}
          projectId={projectId}
          onUpdate={onUpdate}
          onArchiveToDevLog={onArchiveToDevLog}
          isSharedProject={isSharedProject}
          canEdit={canEdit}
        />
      )}
    </div>
  );
};

interface NewTodoFormProps {
  projectId: string;
  onAdd: () => void;
  isSharedProject?: boolean;
  parentTodoId?: string;
  compact?: boolean;
}

const NewTodoForm: React.FC<NewTodoFormProps> = ({ projectId, onAdd, isSharedProject = false, parentTodoId, compact = false }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('not_started');
  const [dueDate, setDueDate] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await projectAPI.createTodo(projectId, {
        text: title.trim(),
        description: description.trim(),
        priority: priority as 'low' | 'medium' | 'high',
        status: status as 'not_started' | 'in_progress' | 'blocked' | 'completed',
        dueDate: dueDate || undefined,
        reminderDate: reminderDate || undefined,
        assignedTo: assignedTo || undefined,
        parentTodoId: parentTodoId || undefined
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setStatus('not_started');
      setDueDate('');
      setReminderDate('');
      setAssignedTo('');
      setIsExpanded(false);
      onAdd();
    } catch (error) {
      console.error('Failed to create todo:', error);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="form-control">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field input-sm"
            placeholder="Enter subtask title..."
            required
          />
        </div>
        
        <div className="collapse collapse-arrow bg-base-100/50">
          <input type="checkbox" />
          <div className="collapse-title text-sm font-medium py-2 min-h-0">
            Additional Options
          </div>
          <div className="collapse-content space-y-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered textarea-sm w-full"
              placeholder="Subtask description..."
              rows={2}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Priority</span>
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="select select-bordered select-xs"
                >
                  <option value="low">🌱 Low</option>
                  <option value="medium">⚡ Medium</option>
                  <option value="high">🔥 High</option>
                </select>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Status</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'not_started' | 'in_progress' | 'blocked' | 'completed')}
                  className="select select-bordered select-xs"
                >
                  <option value="not_started">⭕ Not Started</option>
                  <option value="in_progress">🔄 In Progress</option>
                  <option value="blocked">🚫 Blocked</option>
                  <option value="completed">✅ Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DatePicker
                label="Due Date"
                value={dueDate}
                onChange={setDueDate}
                placeholder="Set due date..."
                className=""
              />
              
              <DatePicker
                label="Reminder Date"
                value={reminderDate}
                onChange={setReminderDate}
                placeholder="Set reminder..."
                className=""
              />
            </div>

            <TeamMemberSelect
              projectId={projectId}
              value={assignedTo}
              onChange={(userId) => setAssignedTo(userId ?? '')}
              isSharedProject={isSharedProject}
              placeholder="Assign to team member..."
            />
          </div>
        </div>
        
        <div className="flex-center-gap-2 justify-end">
          <button
            type="submit"
            className="btn-primary-sm"
            disabled={loading || !title.trim()}
          >
            {loading ? 'Adding...' : 'Add Subtask'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="collapse collapse-arrow bg-base-100 shadow-lg border-subtle mb-4">
      <input 
        type="checkbox" 
        checked={isExpanded}
        onChange={(e) => setIsExpanded(e.target.checked)}
      />
      <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-subtle">
        {parentTodoId ? 'Create New Subtask' : 'Create New Todo'}
      </div>
      <div className="collapse-content">
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Todo Title</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field border-base-300"
              placeholder="Enter todo title..."
              required
            />
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Description (Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered border-base-300"
              placeholder="Todo description..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Priority</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="select select-bordered border-base-300"
              >
                <option value="low">🌱 Low</option>
                <option value="medium">⚡ Medium</option>
                <option value="high">🔥 High</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Status</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'not_started' | 'in_progress' | 'blocked' | 'completed')}
                className="select select-bordered border-base-300"
              >
                <option value="not_started">⭕ Not Started</option>
                <option value="in_progress">🔄 In Progress</option>
                <option value="blocked">🚫 Blocked</option>
                <option value="completed">✅ Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker
              label="Due Date"
              value={dueDate}
              onChange={setDueDate}
              placeholder="Set due date..."
            />
            
            <DatePicker
              label="Reminder Date"
              value={reminderDate}
              onChange={setReminderDate}
              placeholder="Set reminder..."
            />
          </div>

          <TeamMemberSelect
            projectId={projectId}
            value={assignedTo}
            onChange={(userId) => setAssignedTo(userId ?? '')}
            isSharedProject={isSharedProject}
            placeholder="Assign to team member..."
          />

          
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !title.trim()}
            >
              {loading ? 'Adding...' : 'Add Todo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { TodoItem, NewTodoForm };