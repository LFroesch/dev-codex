import React, { useState } from 'react';
import { Todo } from '../api';
import { TodoItem, NewTodoForm } from './TodoItem';

interface SubtaskListProps {
  parentTodo: Todo;
  subtasks: Todo[];
  projectId: string;
  onUpdate: () => Promise<void>;
  onArchiveToDevLog: (todo: Todo) => void;
  isSharedProject?: boolean;
  canEdit?: boolean;
}

const SubtaskList: React.FC<SubtaskListProps> = ({
  parentTodo,
  subtasks,
  projectId,
  onUpdate,
  onArchiveToDevLog,
  isSharedProject = false,
  canEdit = true
}) => {
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const completedSubtasks = subtasks.filter(subtask => subtask.completed).length;
  const progressPercentage = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  // Auto-sort subtasks: overdue first, then priority, then due date, then creation date
  const sortSubtasks = (subtasks: Todo[]) => {
    return [...subtasks].sort((a, b) => {
      // Helper function to check if overdue
      const isOverdue = (dueDate?: string) => {
        if (!dueDate) return false;
        return new Date(dueDate).getTime() < new Date().getTime();
      };

      // Helper function to get priority weight
      const getPriorityWeight = (priority?: string) => {
        switch (priority) {
          case 'high': return 3;
          case 'medium': return 2;
          case 'low': return 1;
          default: return 2; // default to medium
        }
      };

      // Completed items go to bottom
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      // Overdue items first
      const aOverdue = isOverdue(a.dueDate);
      const bOverdue = isOverdue(b.dueDate);
      if (aOverdue !== bOverdue) {
        return aOverdue ? -1 : 1;
      }

      // Then sort by priority (high to low)
      const aPriority = getPriorityWeight(a.priority);
      const bPriority = getPriorityWeight(b.priority);
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Sort by due date (soonest first)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1; // Items with due dates come before items without
      if (b.dueDate) return 1;

      // Finally sort by creation date (newer first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const sortedSubtasks = sortSubtasks(subtasks);

  const handleAddSubtask = async () => {
    setShowAddSubtask(false);
    await onUpdate();
  };

  return (
    <div className="ml-6 mt-3 border-l-2 border-base-300 pl-4">
      {/* Subtask Summary */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn btn-xs btn-ghost"
            disabled={subtasks.length === 0}
          >
            <svg 
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          
          <span className="text-sm font-medium text-base-content/80">
            Subtasks ({completedSubtasks}/{subtasks.length})
          </span>
          
          {subtasks.length > 0 && (
            <div className="flex items-center gap-2">
              <progress 
                className="progress progress-primary w-20" 
                value={progressPercentage} 
                max="100"
                />
              <span className="text-xs text-base-content/60">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          )}
          </button>
        </div>
      </div>

      {/* Add Subtask Form */}
      {showAddSubtask && (
        <div className="mb-3 p-3 bg-base-200 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-sm">Add Subtask</h4>
            <button
              onClick={() => setShowAddSubtask(false)}
              className="btn btn-xs btn-ghost"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <NewTodoForm
            projectId={projectId}
            onAdd={handleAddSubtask}
            isSharedProject={isSharedProject}
            parentTodoId={parentTodo.id}
            compact={true}
          />
        </div>
      )}

      {/* Subtask List */}
      {isExpanded && subtasks.length > 0 && (
        <div className="space-y-2">
          {sortedSubtasks.map((subtask) => (
            <div key={subtask.id} className="bg-base-50 rounded-lg hover:border-thick hover:border-primary hover:bg-primary/20">
              <TodoItem
                todo={subtask}
                projectId={projectId}
                onUpdate={onUpdate}
                onArchiveToDevLog={onArchiveToDevLog}
                isSharedProject={isSharedProject}
                canEdit={canEdit}
                isSubtask={true}
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {isExpanded && subtasks.length === 0 && (
        <div className="text-center text-sm text-base-content/60 py-4">
          No subtasks yet. Click "Add Subtask" to break this todo into smaller tasks.
        </div>
      )}
    </div>
  );
};

export default SubtaskList;