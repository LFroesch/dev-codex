import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Project, projectAPI, Todo } from '../api';
import {TodoItem} from '../components/TodoItem';
import { NoteModal } from '../components/NoteItem';
import activityTracker from '../services/activityTracker';
import { getContrastTextColor } from '../utils/contrastTextColor';

interface ContextType {
  selectedProject: Project | null;
  user: any;
  onProjectUpdate: (projectId: string, updatedData: any) => Promise<any>;
  onProjectRefresh: () => Promise<void>;
}

const NotesPage: React.FC = () => {
  const { selectedProject, user, onProjectRefresh } = useOutletContext<ContextType>();
  
  // State for note modal
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  
  // State for dev log editing
  const [selectedDevLog, setSelectedDevLog] = useState<any>(null);
  const [isDevLogModalOpen, setIsDevLogModalOpen] = useState(false);
  const [devLogModalMode, setDevLogModalMode] = useState<'view' | 'edit'>('view');
  
  const [error, setError] = useState('');

  // Set activity tracker context when project changes
  useEffect(() => {
    if (selectedProject && user) {
      activityTracker.setContext(selectedProject.id, user.id);
    }
  }, [selectedProject, user]);

  const handleNoteClick = (note: any) => {
    setSelectedNote(note);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNote(null);
  };

  const handleDevLogClick = (entry: any) => {
    setSelectedDevLog(entry);
    setDevLogModalMode('view');
    setIsDevLogModalOpen(true);
  };

  const handleCloseDevLogModal = () => {
    setIsDevLogModalOpen(false);
    setSelectedDevLog(null);
  };

  const handleNoteUpdate = async () => {
    // Refresh the project data first
    await onProjectRefresh();
  };

  const handleDevLogUpdate = async () => {
    // Refresh the project data first
    await onProjectRefresh();
  };

  // Effect to update selectedNote when project data changes
  useEffect(() => {
    if (selectedNote && selectedProject && isModalOpen) {
      const updatedNote = selectedProject.notes?.find(note => note.id === selectedNote.id);
      if (updatedNote) {
        setSelectedNote(updatedNote);
      }
    }
  }, [selectedProject?.notes, selectedNote?.id, isModalOpen]);

  // Effect to update selectedDevLog when project data changes
  useEffect(() => {
    if (selectedDevLog && selectedProject && isDevLogModalOpen) {
      const updatedDevLog = selectedProject.devLog?.find(entry => entry.id === selectedDevLog.id);
      if (updatedDevLog) {
        setSelectedDevLog(updatedDevLog);
      }
    }
  }, [selectedProject?.devLog, selectedDevLog?.id, isDevLogModalOpen]);

  const handleArchiveTodoToDevLog = async (todo: Todo) => {
    if (!selectedProject) return;

    try {
      // Create dev log entry from todo
      await projectAPI.createDevLogEntry(selectedProject.id, {
        title: `${todo.text}`,
        description: todo.description || ' ',
        entry: `${todo.text}` // Keep backward compatibility
      });
      
      // Delete the todo
      await projectAPI.deleteTodo(selectedProject.id, todo.id);
      
      // Refresh project data
      await onProjectRefresh();
    } catch (err) {
      setError('Failed to archive todo to dev log');
    }
  };

  // Todo sorting and filtering functions
  const filterAndSortTodos = (todos: Todo[]) => {
    // Filter out subtasks - only show parent todos
    let filteredTodos = todos.filter(todo => !todo.parentTodoId);
    
    // Apply filters
    if (todoFilterBy !== 'all') {
      if (todoFilterBy === 'overdue') {
        filteredTodos = filteredTodos.filter(todo => {
          if (!todo.dueDate) return false;
          return new Date(todo.dueDate).getTime() < new Date().getTime();
        });
      } else if (todoFilterBy === 'completed') {
        filteredTodos = filteredTodos.filter(todo => todo.completed);
      } else {
        // Filter by priority
        filteredTodos = filteredTodos.filter(todo => todo.priority === todoFilterBy);
      }
    }
    
    // Sort todos
    return [...filteredTodos].sort((a, b) => {
      // Helper functions
      const isOverdue = (dueDate?: string) => {
        if (!dueDate) return false;
        return new Date(dueDate).getTime() < new Date().getTime();
      };

      const getPriorityWeight = (priority?: string) => {
        switch (priority) {
          case 'high': return 3;
          case 'medium': return 2;
          case 'low': return 1;
          default: return 2;
        }
      };

      if (todoSortBy === 'priority') {
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

        // Then by priority
        const aPriority = getPriorityWeight(a.priority);
        const bPriority = getPriorityWeight(b.priority);
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }

        // Finally by creation date
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (todoSortBy === 'dueDate') {
        // Sort by due date (items without due date go last)
        if (!a.dueDate && !b.dueDate) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else {
        // Sort by creation date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
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

  const [activeSection, setActiveSection] = useState<'notes' | 'todos' | 'devlog'>('notes');

  // Compact note form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  // Compact todo form state
  const [showCreateTodoForm, setShowCreateTodoForm] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');
  const [isCreatingTodo, setIsCreatingTodo] = useState(false);

  // Compact dev log form state
  const [showCreateDevLogForm, setShowCreateDevLogForm] = useState(false);
  const [newDevLogTitle, setNewDevLogTitle] = useState('');
  const [newDevLogDescription, setNewDevLogDescription] = useState('');
  const [isCreatingDevLog, setIsCreatingDevLog] = useState(false);

  const [todoSortBy, setTodoSortBy] = useState<'priority' | 'dueDate' | 'created'>('priority');
  const [todoFilterBy, setTodoFilterBy] = useState<'all' | 'high' | 'medium' | 'low' | 'overdue' | 'completed'>('all');

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
        priority: 'medium',
        status: 'not_started'
      });
      
      await activityTracker.trackCreate(
        'todo',
        'new-todo',
        newTodoText.trim(),
        undefined,
        { hasDescription: !!newTodoDescription.trim() }
      );
      
      setNewTodoText('');
      setNewTodoDescription('');
      setShowCreateTodoForm(false);
      onProjectRefresh();
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
        entry: newDevLogTitle.trim()
      });
      
      await activityTracker.trackCreate(
        'devlog',
        'new-devlog',
        newDevLogTitle.trim(),
        undefined,
        { hasDescription: !!newDevLogDescription.trim() }
      );
      
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
    <div className="space-y-4">
      {error && (
        <div className="alert alert-error shadow-md">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Category Navigation */}
      <div className="flex justify-center px-2">
        <div className="tabs-container">
          <button 
            className={`tab-button ${activeSection === 'notes' ? 'tab-active' : ''}`}
            style={activeSection === 'notes' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveSection('notes')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Notes <span className="text-xs opacity-70">({selectedProject.notes?.length || 0})</span></span>
          </button>
          <button 
            className={`tab-button ${activeSection === 'todos' ? 'tab-active' : ''}`}
            style={activeSection === 'todos' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveSection('todos')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Todos <span className="text-xs opacity-70">({selectedProject.todos?.filter(todo => !todo.parentTodoId).length || 0})</span></span>
          </button>
          <button 
            className={`tab-button ${activeSection === 'devlog' ? 'tab-active' : ''}`}
            style={activeSection === 'devlog' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveSection('devlog')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Dev Log <span className="text-xs opacity-70">({selectedProject.devLog?.length || 0})</span></span>
          </button>
        </div>
      </div>

      {/* Notes Section */}
      {activeSection === 'notes' && (
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
                    className="btn btn-primary btn-sm"
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
                            color: getContrastTextColor()
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
      {activeSection === 'todos' && (
        <div className="space-y-6">
          {/* Compact Create Todo Form */}
          <div className="border-2 border-base-content/20 rounded-lg mb-4">
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
                <span className="text-base-content/60">Create a new todo...</span>
              </button>
            ) : (
              <form onSubmit={handleCreateTodo} className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm text-base-content/70">New Todo</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateTodoForm(false);
                      setNewTodoText('');
                      setNewTodoDescription('');
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
                  placeholder="Todo description (optional)..."
                  rows={2}
                />
                
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="btn btn-success btn-sm"
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

          {/* Todo Filter and Sort Controls */}
          {selectedProject.todos && selectedProject.todos.filter(todo => !todo.parentTodoId).length > 0 && (
            <div className="border-2 border-base-content/20 rounded-lg mb-4 p-4">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-base-content/80">Sort by:</span>
                  <select 
                    value={todoSortBy} 
                    onChange={(e) => setTodoSortBy(e.target.value as 'priority' | 'dueDate' | 'created')}
                    className="select select-bordered select-xs"
                  >
                    <option value="priority">🔴 Priority</option>
                    <option value="dueDate">📅 Due Date</option>
                    <option value="created">⏰ Created</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-base-content/80">Filter:</span>
                  <select 
                    value={todoFilterBy} 
                    onChange={(e) => setTodoFilterBy(e.target.value as any)}
                    className="select select-bordered select-xs"
                  >
                    <option value="all">📋 All Todos</option>
                    <option value="overdue">🚨 Overdue</option>
                    <option value="high">🔴 High Priority</option>
                    <option value="medium">🟡 Medium Priority</option>
                    <option value="low">🟢 Low Priority</option>
                    <option value="completed">✅ Completed</option>
                  </select>
                </div>

                <div className="items-center text-xs text-base-content/60">
                  {filterAndSortTodos(selectedProject.todos || []).length} of {selectedProject.todos?.filter(todo => !todo.parentTodoId).length || 0} todos
                </div>
              </div>
            </div>
          )}
          
          {selectedProject.todos?.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-base-200 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2 text-base-content/80">No tasks yet</h3>
              <p className="text-sm text-base-content/60">Add your first todo to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filterAndSortTodos(selectedProject.todos || []).map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  projectId={selectedProject.id}
                  onUpdate={onProjectRefresh}
                  onArchiveToDevLog={handleArchiveTodoToDevLog}
                  isSharedProject={selectedProject.isShared || false}
                  canEdit={selectedProject.canEdit !== false}
                  allTodos={selectedProject.todos || []}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dev Log Section */}
      {activeSection === 'devlog' && (
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
                            color: getContrastTextColor()
                          }}
                        >
                          {entry.title || entry.entry}
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
        note={selectedNote}
        projectId={selectedProject.id}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onUpdate={handleNoteUpdate}
        mode={modalMode}
        onModeChange={setModalMode}
        project={selectedProject}
      />

      {/* Dev Log Modal - reusing NoteModal for consistency */}
      {selectedDevLog && (
        <NoteModal
          note={{
            id: selectedDevLog.id,
            title: selectedDevLog.title || selectedDevLog.entry,
            content: selectedDevLog.description || '',
            createdAt: selectedDevLog.date,
            updatedAt: selectedDevLog.date
          }}
          projectId={selectedProject.id}
          isOpen={isDevLogModalOpen}
          onClose={handleCloseDevLogModal}
          onUpdate={handleDevLogUpdate}
          mode={devLogModalMode}
          onModeChange={setDevLogModalMode}
          project={selectedProject}
          type="devlog"
        />
      )}
    </div>
  );
};

export default NotesPage;