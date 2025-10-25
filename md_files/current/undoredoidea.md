 Game Plan: Undo/Redo Implementation

  Architecture Overview

  Your system has:
  - CommandParser - Parses command strings
  - CommandExecutor - Routes commands to specialized handlers
  - CRUD Handlers (TodoHandlers, NoteHandlers, etc.) - Execute operations that modify project data
  - Project model - Contains all the data (todos, notes, devlog, components, etc.)

  What Needs to be Implemented

  1. History Tracking System

  - CommandHistory Service - New service to track undoable operations
    - Store history per user session (in-memory with periodic cleanup)
    - Track last 10-20 operations
    - Store both the operation metadata and state snapshots

  2. What to Track

  For each undoable command, store:
  - Before state - The data before the change
  - After state - The data after the change (for redo)
  - Command metadata - Command type, target ID, timestamp
  - Project context - Which project was affected

  Undoable operations:
  - ✅ Add (todo, note, devlog, component, subtask, relationship, stack)
  - ✅ Edit (todo, note, devlog, component, subtask, relationship)
  - ✅ Delete (todo, note, devlog, component, subtask, relationship)
  - ✅ Complete todo
  - ✅ Assign todo
  - ✅ Push todo (to devlog)

  Non-undoable operations:
  - ❌ View commands (no state change)
  - ❌ Swap project (navigation)
  - ❌ Settings changes (theme, notifications, etc.)
  - ❌ Export/Summary (read-only)

  3. Storage Strategy

  Option A: Snapshot-based (Recommended)
  - Store complete copies of affected items
  - Easier to implement
  - More memory usage but simpler logic
  - Example: When editing todo #5, store the entire todo object before and after

  Option B: Delta-based
  - Store only what changed (diffs)
  - More complex but memory efficient
  - Example: {field: 'title', old: 'old title', new: 'new title'}

  Recommendation: Start with Option A (Snapshots) for MVP, can optimize later

  4. Implementation Components

  Backend:

  1. CommandHistory Service (backend/src/services/commandHistory.ts)
    - recordCommand(userId, projectId, operation) - Record an undoable operation
    - getUndoStack(userId, projectId) - Get undo history
    - getRedoStack(userId, projectId) - Get redo history
    - popUndo(userId, projectId) - Pop last undo operation
    - popRedo(userId, projectId) - Pop last redo operation
    - clearHistory(userId, projectId) - Clear history for cleanup
  2. Update CRUD Handlers
    - Modify all handlers to record operations before making changes
    - Pattern: capture state → make change → save → record history
    - Example in TodoHandlers:
  async handleEditTodo(...) {
    const oldState = { ...todo }; // Capture before
    todo.title = newTitle; // Make change
    await project.save();
    await commandHistory.record({ // Record
      type: 'edit_todo',
      before: oldState,
      after: todo,
      ...
    });
  }
  3. New Undo/Redo Handlers (UtilityHandlers.ts)
    - handleUndo() - Restore previous state
    - handleRedo() - Re-apply undone change
    - Handle validation (can't undo if nothing to undo)
    - Handle conflicts (item was deleted in the meantime)
  4. Add Command Types
    - Add UNDO and REDO to CommandType enum
    - Add to COMMAND_ALIASES and COMMAND_METADATA

  Data Structure:

  interface HistoryEntry {
    id: string;
    userId: string;
    projectId: string;
    timestamp: Date;
    commandType: CommandType;
    operation: {
      type: 'add' | 'edit' | 'delete' | 'complete' | 'assign' | 'push';
      entityType: 'todo' | 'note' | 'devlog' | 'component' | 'subtask' | 'relationship' | 'stack';
      entityId?: string; // ID of the affected item
      before?: any; // State before change (for undo)
      after?: any; // State after change (for redo)
      metadata?: any; // Additional context
    };
  }

  interface UserHistory {
    userId: string;
    projectId: string;
    undoStack: HistoryEntry[]; // Last 20 operations
    redoStack: HistoryEntry[]; // Cleared when new command executed
  }

  5. Edge Cases & Considerations

  Batch Commands (&&):
  - Option 1: Treat as single atomic operation (undo all or nothing)
  - Option 2: Undo each command individually (last-to-first order)
  - Recommendation: Option 2 (individual undo) for flexibility

  Item Deletion:
  - If item was deleted, undo should recreate it
  - If item was deleted and then project structure changed, show warning

  Redo Clearing:
  - Any new command should clear the redo stack
  - Only undo populates the redo stack

  Session Management:
  - Clear history after 1 hour of inactivity
  - Limit to 20 operations per project per session
  - Use in-memory storage (Map) for speed

  Conflict Resolution:
  - If trying to undo but item no longer exists (deleted by another user)
  - Show error: "Cannot undo: Item no longer exists"

  6. Frontend Considerations

  (No changes needed for MVP - commands work through existing terminal)
  - /undo - Undo last operation
  - /redo - Redo last undone operation
  - Could add visual indicators showing undo/redo availability

  7. Implementation Order

  1. Phase 1: Infrastructure
    - Create CommandHistory service
    - Add UNDO/REDO command types
    - Add history recording to one handler (e.g., TodoHandlers)
  2. Phase 2: Core Undo/Redo
    - Implement handleUndo in UtilityHandlers
    - Implement handleRedo in UtilityHandlers
    - Test with todos
  3. Phase 3: Expand Coverage
    - Add history recording to all CRUD handlers
    - Handle edge cases (batch commands, deletions)
  4. Phase 4: Polish
    - Add history limits
    - Add cleanup logic
    - Handle conflicts
    - Add helpful error messages

  Summary

  New Files:
  - backend/src/services/commandHistory.ts - History tracking service

  Modified Files:
  - backend/src/services/commandParser.ts - Add UNDO/REDO command types
  - backend/src/services/commandExecutor.ts - Route UNDO/REDO commands
  - backend/src/services/handlers/UtilityHandlers.ts - Implement undo/redo handlers
  - backend/src/services/handlers/crud/TodoHandlers.ts - Add history recording
  - backend/src/services/handlers/crud/NoteHandlers.ts - Add history recording
  - backend/src/services/handlers/crud/DevLogHandlers.ts - Add history recording
  - backend/src/services/handlers/crud/ComponentHandlers.ts - Add history recording
  - (etc. for other handlers)

  Storage:
  - In-memory Map: userId:projectId -> UserHistory
  - Could persist to Redis later for multi-server setups

  Complexity:
  - Moderate - Requires careful state management but straightforward architecture
  - Estimated effort: 4-6 hours for MVP, 2-3 more for full coverage and edge cases
