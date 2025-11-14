import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Project, projectAPI, Todo } from '../api';
import {TodoItem} from '../components/TodoItem';
import { NoteModal } from '../components/NoteItem';
import DatePicker from '../components/DatePicker';
import TeamMemberSelect from '../components/TeamMemberSelect';
import activityTracker from '../services/activityTracker';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { isOverdue, isToday, isTomorrow, isSoon, isFuture } from '../utils/dateHelpers';
import { getPriorityWeight } from '../utils/priorityHelpers';
import { useItemModal } from '../hooks/useItemModal';
import { analyticsService } from '../services/analytics';

interface ContextType {
  selectedProject: Project | null;
  user: any;
  onProjectUpdate: (projectId: string, updatedData: any) => Promise<any>;
  onProjectRefresh: () => Promise<void>;
  activeNotesTab: 'notes' | 'todos' | 'devlog';
}

const NotesPage: React.FC = () => {
  const { selectedProject, user, onProjectRefresh, activeNotesTab } = useOutletContext<ContextType>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Modal state using custom hook
  const noteModal = useItemModal<any>({
    initialMode: 'view',
    onItemSync: (currentItem, isOpen) => {
      if (currentItem && selectedProject && isOpen) {
        return selectedProject.notes?.find(note => note.id === currentItem.id);
      }
      return undefined;
    }
  });

  const devLogModal = useItemModal<any>({
    initialMode: 'view',
    onItemSync: (currentItem, isOpen) => {
      if (currentItem && selectedProject && isOpen) {
        return selectedProject.devLog?.find(entry => entry.id === currentItem.id);
      }
      return undefined;
    }
  });

  const [error, setError] = useState('');

  // Set activity tracker context when project changes
  useEffect(() => {
    if (selectedProject && user) {
      activityTracker.setContext(selectedProject.id, user.id);
    }
  }, [selectedProject, user]);

  const handleNoteClick = (note: any) => {
    noteModal.open(note, 'view');
  };

  const handleDevLogClick = (entry: any) => {
    devLogModal.open(entry, 'view');
  };

  const handleNoteUpdate = async () => {
    await onProjectRefresh();
  };

  const handleDevLogUpdate = async () => {
    await onProjectRefresh();
  };

  const handleArchiveTodoToDevLog = async (todo: Todo) => {
    if (!selectedProject) return;

    try {
      // Create dev log entry from todo
      await projectAPI.createDevLogEntry(selectedProject.id, {
        title: `${todo.title}`,
        description: todo.description || ' ',
      });
      
      // Delete the todo
      await projectAPI.deleteTodo(selectedProject.id, todo.id);
      
      // Refresh project data
      await onProjectRefresh();
    } catch (err) {
      setError('Failed to archive todo to dev log');
    }
  };


  // Sort todos within a group by overdue, priority, due date, then creation date
  const sortTodosInGroup = (todos: Todo[]) => {
    return [...todos].sort((a, b) => {
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

      // Sort by priority
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

      // Finally by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  // Group todos by time period
  const groupTodosByTime = (todos: Todo[]) => {
    // Filter out subtasks - only show parent todos
    const parentTodos = todos.filter(todo => !todo.parentTodoId);

    // Apply global filters if needed
    let filteredTodos = parentTodos;
    if (todoFilterBy !== 'all') {
      if (todoFilterBy === 'overdue') {
        filteredTodos = parentTodos.filter(todo => isOverdue(todo.dueDate));
      } else if (todoFilterBy === 'completed') {
        filteredTodos = parentTodos.filter(todo => todo.completed);
      } else {
        // Filter by priority
        filteredTodos = parentTodos.filter(todo => todo.priority === todoFilterBy);
      }
    }

    const overdue = sortTodosInGroup(filteredTodos.filter(todo => isOverdue(todo.dueDate)));
    const today = sortTodosInGroup(filteredTodos.filter(todo => !isOverdue(todo.dueDate) && isToday(todo.dueDate)));
    const tomorrow = sortTodosInGroup(filteredTodos.filter(todo => isTomorrow(todo.dueDate)));
    const soon = sortTodosInGroup(filteredTodos.filter(todo => isSoon(todo.dueDate)));
    const future = sortTodosInGroup(filteredTodos.filter(todo => isFuture(todo.dueDate) && !isToday(todo.dueDate) && !isTomorrow(todo.dueDate) && !isSoon(todo.dueDate) && !isOverdue(todo.dueDate)));

    return { overdue, today, tomorrow, soon, future };
  };

  if (!selectedProject) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-bold mb-2">Select a project</h2>
          <p className="text-base-content/60">Choose a project from the sidebar to view notes and tasks</p>
        </div>
      </div>
    );
  }

  // Auto-select todo from URL params (for notifications)
  useEffect(() => {
    const todoId = searchParams.get('todoId');
    if (todoId && selectedProject?.todos && activeNotesTab === 'todos') {
      const todo = selectedProject.todos.find(t => t.id === todoId);
      if (todo) {
        setSelectedTodo(todo);
        // Clear the todoId param after selecting to avoid re-selecting on page refresh
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('todoId');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, selectedProject?.todos, activeNotesTab]);

  // Compact note form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  // Compact todo form state
  const [showCreateTodoForm, setShowCreateTodoForm] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [newTodoReminderDate, setNewTodoReminderDate] = useState('');
  const [newTodoAssignedTo, setNewTodoAssignedTo] = useState('');
  const [isCreatingTodo, setIsCreatingTodo] = useState(false);

  // Compact dev log form state
  const [showCreateDevLogForm, setShowCreateDevLogForm] = useState(false);
  const [newDevLogTitle, setNewDevLogTitle] = useState('');
  const [newDevLogDescription, setNewDevLogDescription] = useState('');
  const [isCreatingDevLog, setIsCreatingDevLog] = useState(false);

  const [todoFilterBy, setTodoFilterBy] = useState<'all' | 'high' | 'medium' | 'low' | 'overdue' | 'completed'>('all');

  // Selected todo for detail view
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);

  // Effect to update selectedTodo when project data changes
  useEffect(() => {
    if (selectedTodo && selectedProject) {
      const updatedTodo = selectedProject.todos?.find(t => t.id === selectedTodo.id);
      if (updatedTodo) {
        setSelectedTodo(updatedTodo);
      } else {
        // Todo was deleted
        setSelectedTodo(null);
      }
    }
  }, [selectedProject?.todos, selectedTodo?.id]);

  // Collapsible sections state (persisted to localStorage)
  const [collapsedTodoSections, setCollapsedTodoSections] = useState<{[key: string]: boolean}>(() => {
    const saved = localStorage.getItem('collapsedTodoSections');
    return saved ? JSON.parse(saved) : { overdue: false, today: false, tomorrow: true, soon: true, future: true };
  });

  // Save collapsed sections to localStorage
  useEffect(() => {
    localStorage.setItem('collapsedTodoSections', JSON.stringify(collapsedTodoSections));
  }, [collapsedTodoSections]);

  // Toggle section collapse
  const toggleTodoSection = (section: string) => {
    setCollapsedTodoSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    setIsCreatingNote(true);
    try {
      await projectAPI.createNote(selectedProject.id, {
        title: newNoteTitle.trim(),
        content: newNoteContent.trim()
      });

      await activityTracker.trackCreate(
        'note',
        'new-note',
        newNoteTitle.trim(),
        undefined,
        { contentLength: newNoteContent.trim().length }
      );

      analyticsService.trackFeatureUsage('note_create', {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        hasContent: !!newNoteContent.trim()
      });

      setNewNoteTitle('');
      setNewNoteContent('');
      setShowCreateForm(false);
      onProjectRefresh();
    } catch (err) {
      setError('Failed to create note');
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    setIsCreatingTodo(true);
    try {
      await projectAPI.createTodo(selectedProject.id, {
        text: newTodoText.trim(),
        description: newTodoDescription.trim(),
        priority: newTodoPriority,
        status: 'not_started',
        dueDate: newTodoDueDate || undefined,
        reminderDate: newTodoReminderDate || undefined,
        assignedTo: newTodoAssignedTo || undefined
      });

      await activityTracker.trackCreate(
        'todo',
        'new-todo',
        newTodoText.trim(),
        undefined,
        {
          hasDescription: !!newTodoDescription.trim(),
          priority: newTodoPriority,
          hasDueDate: !!newTodoDueDate,
          hasReminder: !!newTodoReminderDate,
          isAssigned: !!newTodoAssignedTo
        }
      );

      analyticsService.trackFeatureUsage('todo_create', {
        projectId: selectedProject.id,
        hasDueDate: !!newTodoDueDate,
        hasAssignee: !!newTodoAssignedTo,
        priority: newTodoPriority
      });

      setNewTodoText('');
      setNewTodoDescription('');
      setNewTodoPriority('medium');
      setNewTodoDueDate('');
      setNewTodoReminderDate('');
      setNewTodoAssignedTo('');
      setShowCreateTodoForm(false);
      await onProjectRefresh();
    } catch (err) {
      setError('Failed to create todo');
    } finally {
      setIsCreatingTodo(false);
    }
  };

  const handleCreateDevLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevLogTitle.trim()) return;

    setIsCreatingDevLog(true);
    try {
      await projectAPI.createDevLogEntry(selectedProject.id, {
        title: newDevLogTitle.trim(),
        description: newDevLogDescription.trim(),
      });
      
      await activityTracker.trackCreate(
        'devlog',
        'new-devlog',
        newDevLogTitle.trim(),
        undefined,
        { hasDescription: !!newDevLogDescription.trim() }
      );

      analyticsService.trackFeatureUsage('devlog_create', {
        projectId: selectedProject.id,
        hasDescription: !!newDevLogDescription.trim()
      });

      setNewDevLogTitle('');
      setNewDevLogDescription('');
      setShowCreateDevLogForm(false);
      onProjectRefresh();
    } catch (err) {
      setError('Failed to create dev log entry');
    } finally {
      setIsCreatingDevLog(false);
    }
  };

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      {error && (
        <div className="alert alert-error shadow-md">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Notes Section */}
      {activeNotesTab === 'notes' && (
        <div className="space-y-6">
          {/* Compact Create Note Form */}
          <div className="border-2 border-base-content/20 rounded-lg mb-4">
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-base-200/40 transition-colors rounded-lg"
              >
                <div className="w-8 h-8 bg-success/50 border-thick rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-base-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-base-content/60">Create a new note...</span>
              </button>
            ) : (
              <form onSubmit={handleCreateNote} className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm text-base-content/70">New Note</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewNoteTitle('');
                      setNewNoteContent('');
                    }}
                    className="text-base-content/40 hover:text-base-content/60 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="input input-bordered input-sm text-base-content/40 w-full"
                  placeholder="Note title..."
                  required
                  autoFocus
                />
                
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="textarea textarea-bordered textarea-sm w-full"
                  placeholder="Write your note content..."
                  rows={3}
                  required
                />
                
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="bg-primary rounded-lg border-thick p-2 font-semibold"
                    style={{ color: getContrastTextColor('primary') }}
                    disabled={isCreatingNote || !newNoteTitle.trim() || !newNoteContent.trim()}
                  >
                    {isCreatingNote ? 'Creating...' : 'Create Note'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewNoteTitle('');
                      setNewNoteContent('');
                    }}
                    className="btn btn-ghost btn-sm"
                    disabled={isCreatingNote}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {selectedProject.notes?.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-base-200 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2 text-base-content/80">No notes yet</h3>
              <p className="text-sm text-base-content/60">Start documenting your thoughts and ideas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {selectedProject.notes
                ?.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                ?.map((note) => (
                  <div 
                    key={note.id}
                    className="card-interactive group cursor-pointer flex flex-col"
                    onClick={() => handleNoteClick(note)}
                  >
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <h3
                          className="font-semibold truncate px-2 py-1 rounded-md bg-primary inline-block w-fit border-thick"
                          style={{
                            color: getContrastTextColor("primary")
                          }}
                        >
                          {note.title}
                        </h3>
                        <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-4 h-4 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      
                      {note.description && (
                        <p className="text-sm text-base-content/60 mb-2 line-clamp-1">
                          {note.description}
                        </p>
                      )}
                      
                      <p className="text-sm text-base-content/70 mb-3 line-clamp-3 flex-1 whitespace-pre-wrap leading-5">
                        {note.content}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-base-content/50 pt-3 mt-auto">
                        <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>{note.content?.length || 0} chars</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Todos Section */}
      {activeNotesTab === 'todos' && (
        <div className="space-y-4">
          {/* Create New Todo Button/Form - Always at Top */}
          <div className="border-2 border-base-content/20 rounded-lg bg-base-100">
            {!showCreateTodoForm ? (
              <button
                onClick={() => setShowCreateTodoForm(true)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-base-200/40 transition-colors rounded-lg"
              >
                <div className="w-8 h-8 bg-success/50 border-thick rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-base-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-base-content/60 font-medium">Create New Todo</span>
              </button>
            ) : (
              <form onSubmit={handleCreateTodo} className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-base text-base-content/80">New Todo</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateTodoForm(false);
                      setNewTodoText('');
                      setNewTodoDescription('');
                      setNewTodoPriority('medium');
                      setNewTodoDueDate('');
                      setNewTodoReminderDate('');
                      setNewTodoAssignedTo('');
                    }}
                    className="text-base-content/40 hover:text-base-content/60 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <input
                  type="text"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  className="input input-bordered input-sm text-base-content/40 w-full"
                  placeholder="Todo title..."
                  required
                  autoFocus
                />

                <textarea
                  value={newTodoDescription}
                  onChange={(e) => setNewTodoDescription(e.target.value)}
                  className="textarea textarea-bordered textarea-sm w-full"
                  placeholder="Description (optional)..."
                  rows={2}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-base-content/70">Priority</label>
                    <select
                      value={newTodoPriority}
                      onChange={(e) => setNewTodoPriority(e.target.value as 'low' | 'medium' | 'high')}
                      className="select select-bordered select-sm w-full"
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🔴 High</option>
                    </select>
                  </div>

                  <DatePicker
                    label="Due Date"
                    value={newTodoDueDate}
                    onChange={setNewTodoDueDate}
                    placeholder="Set due date..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DatePicker
                    label="Reminder"
                    value={newTodoReminderDate}
                    onChange={setNewTodoReminderDate}
                    placeholder="Set reminder..."
                  />

                  {selectedProject.isShared && (
                    <TeamMemberSelect
                      projectId={selectedProject.id}
                      value={newTodoAssignedTo}
                      onChange={(userId) => setNewTodoAssignedTo(userId ?? '')}
                      isSharedProject={selectedProject.isShared}
                      placeholder="Assign to..."
                    />
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="btn btn-success btn-sm flex-1"
                    disabled={isCreatingTodo || !newTodoText.trim()}
                  >
                    {isCreatingTodo ? 'Creating...' : 'Create Todo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateTodoForm(false);
                      setNewTodoText('');
                      setNewTodoDescription('');
                      setNewTodoPriority('medium');
                      setNewTodoDueDate('');
                      setNewTodoReminderDate('');
                      setNewTodoAssignedTo('');
                    }}
                    className="btn btn-ghost btn-sm"
                    disabled={isCreatingTodo}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {selectedProject.todos?.length === 0 ? (
            <div className="text-center py-12 min-h-[500px] flex items-center justify-center">
              <div>
                <div className="w-16 h-16 mx-auto mb-4 bg-base-200 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2 text-base-content/80">No tasks yet</h3>
                <p className="text-sm text-base-content/60">Use the form above to create your first todo</p>
              </div>
            </div>
          ) : (
            // Master-Detail Layout
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-4 min-h-[500px] max-w-full">
              {/* Left Panel - Compact Todo List */}
              <div className="lg:col-span-2 space-y-2 lg:space-y-3 min-w-0 max-w-full">
                {/* Filter Controls */}
                {selectedProject.todos && selectedProject.todos.filter((todo: Todo) => !todo.parentTodoId).length > 0 && (
                  <div className="border-2 border-base-content/20 rounded-lg p-3 bg-base-100 max-w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-base-content/80">Filter:</span>
                      <select
                        value={todoFilterBy}
                        onChange={(e) => setTodoFilterBy(e.target.value as 'all' | 'high' | 'medium' | 'low' | 'overdue' | 'completed')}
                        className="select select-bordered select-xs flex-1"
                      >
                        <option value="all">📋 All Todos</option>
                        <option value="overdue">🚨 Overdue</option>
                        <option value="high">🔴 High Priority</option>
                        <option value="medium">🟡 Medium Priority</option>
                        <option value="low">🟢 Low Priority</option>
                        <option value="completed">✅ Completed</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Time-based Sections */}
                {(() => {
                  const timeGroups = groupTodosByTime(selectedProject.todos || []);
                  const sections: Array<{key: string; label: string; icon: string; todos: Todo[]}> = [
                    { key: 'overdue', label: 'Overdue', icon: '🚨', todos: timeGroups.overdue },
                    { key: 'today', label: 'Today', icon: '📅', todos: timeGroups.today },
                    { key: 'tomorrow', label: 'Tomorrow', icon: '📆', todos: timeGroups.tomorrow },
                    { key: 'soon', label: 'This Week', icon: '📋', todos: timeGroups.soon },
                    { key: 'future', label: 'Future', icon: '🗓️', todos: timeGroups.future }
                  ];

                  return sections.map(section => section.todos.length > 0 && (
                    <div key={section.key} className="border-2 border-base-content/20 rounded-lg bg-base-100 max-w-full">
                      {/* Section Header */}
                      <button
                        onClick={() => toggleTodoSection(section.key)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-base-200/40 transition-colors rounded-t-lg"
                      >
                        <div className="flex items-center gap-2">
                          <svg
                            className={`w-4 h-4 transition-transform ${collapsedTodoSections[section.key] ? '' : 'rotate-90'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-sm font-semibold">{section.icon} {section.label}</span>
                          <span className="text-xs bg-base-200 px-2 py-0.5 rounded-full font-medium">
                            {section.todos.length}
                          </span>
                        </div>
                      </button>

                      {/* Collapsible Todo List */}
                      {!collapsedTodoSections[section.key] && (
                        <div className="px-2 pb-2 space-y-1">
                          {section.todos.map(todo => (
                            <button
                              key={todo.id}
                              onClick={() => setSelectedTodo(todo)}
                              className={`w-full text-left p-3 rounded-lg transition-all ${
                                selectedTodo?.id === todo.id
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'hover:bg-base-200/60 border-2 border-transparent'
                              }`}
                            >
                              <div className="flex items-start gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={todo.completed}
                                  onChange={async (e) => {
                                    e.stopPropagation();
                                    await projectAPI.updateTodo(selectedProject.id, todo.id, { completed: !todo.completed });
                                    analyticsService.trackFeatureUsage('todo_complete', {
                                      projectId: selectedProject.id,
                                      completed: !todo.completed
                                    });
                                    await onProjectRefresh();
                                  }}
                                  className="checkbox checkbox-sm checkbox-primary mt-0.5 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <div className="flex items-center gap-2 mb-1 min-w-0">
                                    <span className={`text-sm font-medium break-words ${todo.completed ? 'line-through text-base-content/50' : ''}`}>
                                      {todo.title}
                                    </span>
                                    <span className="text-xs flex-shrink-0">
                                      {todo.priority === 'high' ? '🔴' : todo.priority === 'medium' ? '🟡' : '🟢'}
                                    </span>
                                  </div>
                                  {todo.dueDate && (
                                    <span className="text-xs text-base-content/60 break-words">
                                      {new Date(todo.dueDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>

              {/* Right Panel - Detail View */}
              <div className="lg:col-span-3 min-h-[500px] min-w-0 max-w-full">
                {!selectedTodo ? (
                  <div className="border-2 border-base-content/20 rounded-lg p-8 text-center bg-base-100 h-full flex items-center justify-center">
                    <div>
                      <svg className="w-16 h-16 mx-auto mb-4 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <h3 className="text-lg font-medium text-base-content/70 mb-2">Select a todo</h3>
                      <p className="text-sm text-base-content/50">Choose a todo from the list to view details</p>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-base-content/20 rounded-lg bg-base-100 overflow-auto h-full flex flex-col">
                    <TodoItem
                      key={selectedTodo.id}
                      todo={selectedTodo}
                      projectId={selectedProject.id}
                      onUpdate={onProjectRefresh}
                      onArchiveToDevLog={handleArchiveTodoToDevLog}
                      isSharedProject={selectedProject.isShared || false}
                      canEdit={selectedProject.canEdit !== false}
                      allTodos={selectedProject.todos || []}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dev Log Section */}
      {activeNotesTab === 'devlog' && (
        <div className="space-y-6">
          {/* Compact Create Dev Log Form */}
          <div className="border-2 border-base-content/20 rounded-lg mb-4">
            {!showCreateDevLogForm ? (
              <button
                onClick={() => setShowCreateDevLogForm(true)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-base-200/40 transition-colors rounded-lg"
              >
                <div className="w-8 h-8 bg-success/50 border-thick rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-base-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-base-content/60">Create a new dev log entry...</span>
              </button>
            ) : (
              <form onSubmit={handleCreateDevLog} className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm text-base-content/70">New Dev Log Entry</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateDevLogForm(false);
                      setNewDevLogTitle('');
                      setNewDevLogDescription('');
                    }}
                    className="text-base-content/40 hover:text-base-content/60 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <input
                  type="text"
                  value={newDevLogTitle}
                  onChange={(e) => setNewDevLogTitle(e.target.value)}
                  className="input input-bordered input-sm text-base-content/40 w-full"
                  placeholder="Dev log title..."
                  required
                  autoFocus
                />
                
                <textarea
                  value={newDevLogDescription}
                  onChange={(e) => setNewDevLogDescription(e.target.value)}
                  className="textarea textarea-bordered textarea-sm w-full"
                  placeholder="Describe your development progress..."
                  rows={3}
                />
                
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="btn btn-info btn-sm"
                    disabled={isCreatingDevLog || !newDevLogTitle.trim()}
                  >
                    {isCreatingDevLog ? 'Creating...' : 'Create Entry'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateDevLogForm(false);
                      setNewDevLogTitle('');
                      setNewDevLogDescription('');
                    }}
                    className="btn btn-ghost btn-sm"
                    disabled={isCreatingDevLog}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
          
          {selectedProject.devLog?.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-base-200 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2 text-base-content/80">No dev log entries</h3>
              <p className="text-sm text-base-content/60">Document your development progress and decisions</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {selectedProject.devLog
                ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                ?.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="card-interactive group cursor-pointer h-48 flex flex-col"
                    onClick={() => handleDevLogClick(entry)}
                  >
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <h3
                          className="font-semibold truncate px-2 py-1 rounded-md bg-primary inline-block w-fit border-thick"
                          style={{
                            color: getContrastTextColor("primary")
                          }}
                        >
                          {entry.title}
                        </h3>
                        <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-4 h-4 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                      </div>
                      
                      {entry.description && (
                        <p className="text-sm text-base-content/70 mb-3 line-clamp-3 flex-1">
                          {entry.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-base-content/50 pt-3 mt-auto">
                        <span>Created {new Date(entry.date).toLocaleDateString()}</span>
                        
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Note Modal */}
      <NoteModal
        note={noteModal.item}
        projectId={selectedProject.id}
        isOpen={noteModal.isOpen}
        onClose={noteModal.close}
        onUpdate={handleNoteUpdate}
        mode={noteModal.mode}
        onModeChange={noteModal.setMode}
        project={selectedProject}
      />

      {/* Dev Log Modal - reusing NoteModal for consistency */}
      {devLogModal.item && (
        <NoteModal
          note={{
            id: devLogModal.item.id,
            title: devLogModal.item.title,
            content: devLogModal.item.description || '',
            createdAt: devLogModal.item.date,
            updatedAt: devLogModal.item.date
          }}
          projectId={selectedProject.id}
          isOpen={devLogModal.isOpen}
          onClose={devLogModal.close}
          onUpdate={handleDevLogUpdate}
          mode={devLogModal.mode}
          onModeChange={devLogModal.setMode}
          project={selectedProject}
          type="devlog"
        />
      )}
    </div>
  );
};

export default NotesPage;