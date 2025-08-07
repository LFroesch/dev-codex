import React, { useState } from 'react';
import { Todo, projectAPI } from '../api';

interface TodoItemProps {
  todo: Todo;
  projectId: string;
  onUpdate: () => void;
  onArchiveToDevLog: (todo: Todo) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, projectId, onUpdate, onArchiveToDevLog }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.text);
  const [editDescription, setEditDescription] = useState(todo.description || '');
  const [editPriority, setEditPriority] = useState(todo.priority || 'medium');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!editTitle.trim()) return;

    setLoading(true);
    try {
      await projectAPI.updateTodo(projectId, todo.id, {
        text: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority
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

  return (
    <div className={`bg-base-100 border border-base-content/10 rounded-lg p-3 mb-3 ${todo.completed ? 'opacity-60' : ''}`}>
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-sm text-base-content/70">Editing Todo</h4>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="btn btn-xs btn-primary"
                disabled={loading || !editTitle.trim()}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="btn btn-xs btn-ghost"
                disabled={loading}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="input input-bordered input-sm w-full"
            placeholder="Todo title..."
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="textarea textarea-bordered textarea-sm w-full"
            placeholder="Todo description..."
            rows={2}
          />
          <div className="flex items-center gap-2">
            <label className="label-text text-sm">Priority:</label>
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="select select-bordered select-xs"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
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
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-medium text-sm ${todo.completed ? 'line-through text-base-content/60' : ''}`}>
                  {todo.text}
                </h3>
                <div className={`badge badge-xs ${getPriorityColor(todo.priority || 'medium')}`}>
                  {getPriorityIcon(todo.priority || 'medium')} {todo.priority || 'medium'}
                </div>
              </div>
              {todo.description && (
                <p className={`text-xs text-base-content/70 mt-1 ${todo.completed ? 'line-through' : ''}`}>
                  {todo.description}
                </p>
              )}
              <div className="text-xs text-base-content/50 mt-1">
                Created: {new Date(todo.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          
          <div className="flex gap-1 ml-2">
            {todo.completed && (
              <button
                onClick={handleArchive}
                className="btn btn-xs btn-info"
                title="Archive to Dev Log"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-xs btn-ghost"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn btn-xs btn-error btn-outline"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-error/10 rounded-full">
              <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-center mb-4">Delete Todo</h3>
            
            <p className="text-center text-base-content/70 mb-6">
              Are you sure you want to delete "<strong>{todo.text}</strong>"? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button 
                className="btn btn-ghost flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-error flex-1"
                onClick={handleDelete}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface NewTodoFormProps {
  projectId: string;
  onAdd: () => void;
}

const NewTodoForm: React.FC<NewTodoFormProps> = ({ projectId, onAdd }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
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
        priority: priority as 'low' | 'medium' | 'high'
      });
      setTitle('');
      setDescription('');
      setPriority('medium');
      setIsExpanded(false);
      onAdd();
    } catch (error) {
      console.error('Failed to create todo:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10 mb-4">
      <input 
        type="checkbox" 
        checked={isExpanded}
        onChange={(e) => setIsExpanded(e.target.checked)}
      />
      <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
        Create New Todo
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
              className="input input-bordered border-base-300"
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