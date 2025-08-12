import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Project, projectAPI, Todo } from '../api';
import {TodoItem, NewTodoForm} from '../components/TodoItem';
import { DevLogItem, NewDevLogForm } from '../components/DevLogItem';
import { NoteItem, NewNoteForm } from '../components/NoteItem';
import activityTracker from '../services/activityTracker';

interface ContextType {
  selectedProject: Project | null;
  user: any;
  onProjectUpdate: (projectId: string, updatedData: any) => Promise<any>;
  onProjectRefresh: () => Promise<void>;
}

const NotesPage: React.FC = () => {
  const { selectedProject, user, onProjectRefresh } = useOutletContext<ContextType>();
  
  // State for expanded notes
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  // Set activity tracker context when project changes
  useEffect(() => {
    if (selectedProject && user) {
      activityTracker.setContext(selectedProject.id, user.id);
    }
  }, [selectedProject, user]);

  const toggleNoteExpanded = (noteId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

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

  return (
    <div className="p-6 space-y-6">
      {error && (
        <div className="alert alert-error shadow-md">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Notes Section */}
      <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
        <input type="checkbox" defaultChecked />
        <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
          Notes ({selectedProject.notes?.length || 0})
        </div>
        <div className="collapse-content">
          <div className="pt-4">
            <NewNoteForm 
              projectId={selectedProject.id} 
              onAdd={onProjectRefresh}
            />
            
            <div className="space-y-3">
              {selectedProject.notes?.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📄</div>
                  <p className="text-base-content/60">No notes yet. Create one above!</p>
                </div>
              ) : (
                selectedProject.notes
                  ?.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  ?.map((note) => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      projectId={selectedProject.id}
                      onUpdate={onProjectRefresh}
                      isExpanded={expandedNotes.has(note.id)}
                      onToggleExpand={() => toggleNoteExpanded(note.id)}
                    />
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Todo List Section */}
      <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
        <input type="checkbox" defaultChecked />
        <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
          To Do ({selectedProject.todos?.filter(todo => !todo.parentTodoId).length || 0})
        </div>
        <div className="collapse-content">
          <div className="pt-4">
            <NewTodoForm 
              projectId={selectedProject.id} 
              onAdd={onProjectRefresh}
              isSharedProject={selectedProject.isShared || false}
            />
            
            <div className="space-y-3">
              {selectedProject.todos?.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-base-content/60">No todos yet. Create one above!</p>
                </div>
              ) : (
                selectedProject.todos
                  ?.filter(todo => !todo.parentTodoId) // Only show parent todos, subtasks are shown within their parents
                  ?.map((todo) => (
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
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dev Log Section */}
      <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
        <input type="checkbox" />
        <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
          Dev Log ({selectedProject.devLog?.length || 0})
        </div>
        <div className="collapse-content">
          <div className="pt-4">
            <NewDevLogForm 
              projectId={selectedProject.id} 
              onAdd={onProjectRefresh}
            />
            
            <div className="space-y-3">
              {selectedProject.devLog?.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📖</div>
                  <p className="text-base-content/60">No dev log entries yet. Create one above!</p>
                </div>
              ) : (
                selectedProject.devLog?.map((entry) => (
                  <DevLogItem
                    key={entry.id}
                    entry={entry}
                    projectId={selectedProject.id}
                    onUpdate={onProjectRefresh}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesPage;