# Terminal Feature Demo Commands

Copy and paste these commands into your terminal to create a complete representation of the Terminal feature!

## 1. Add Terminal Feature Components

```bash
# Backend Command Parser
/add component --feature="Terminal" --category=backend --type=service --title="CommandParser" --content="Parses terminal commands into structured objects. Tokenizes input, extracts flags, handles quoted strings, and validates command syntax. Supports multi-word commands and project mentions."

# Backend Command Executor
/add component --feature="Terminal" --category=backend --type=service --title="CommandExecutor" --content="Executes parsed commands by routing to appropriate handlers. Manages command batching with && operator, handles errors, and returns structured responses. Central orchestrator for all terminal operations."

# Backend Handlers - CRUD
/add component --feature="Terminal" --category=backend --type=controller --title="CrudHandlers" --content="Handles all CRUD operations for todos, notes, devlogs, and components. Provides add/view/edit/delete functionality with wizard support and flag-based direct execution."

# Backend Handlers - Utility
/add component --feature="Terminal" --category=backend --type=controller --title="UtilityHandlers" --content="Handles utility commands like help, themes, project swapping, export, summary generation, and navigation. Includes /llm guide for AI assistants."

# Frontend Terminal Component
/add component --feature="Terminal" --category=frontend --type=page --title="TerminalPage" --content="Main terminal interface with command input, history navigation, autocomplete, and response rendering. Provides interactive CLI experience in the browser."

# Frontend Command Response Renderer
/add component --feature="Terminal" --category=frontend --type=component --title="CommandResponse" --content="Renders different response types from commands (success, error, data, wizards). Displays formatted output, tables, lists, and interactive wizards based on response type."

# Frontend Edit Wizard
/add component --feature="Terminal" --category=frontend --type=component --title="EditWizard" --content="Multi-step wizard for editing todos, notes, devlogs, and components. Includes inline relationship and subtask management with optimistic updates."

# Frontend Selector Wizard
/add component --feature="Terminal" --category=frontend --type=component --title="SelectorWizard" --content="Item selection wizard for edit/delete operations. Provides searchable dropdown for choosing items by title or ID."
```

## 2. Add Component Relationships

```bash
# Backend flow: Parser → Executor → Handlers
/add relationship --source="CommandExecutor" --target="CommandParser" --type=uses --description="Executor uses parser to tokenize and validate command strings"

/add relationship --source="CommandExecutor" --target="CrudHandlers" --type=calls --description="Routes CRUD operations (add/edit/delete) to CRUD handlers"

/add relationship --source="CommandExecutor" --target="UtilityHandlers" --type=calls --description="Routes utility commands (help, themes, info) to utility handlers"

# Frontend flow: TerminalPage → CommandExecutor → CommandResponse → Wizards
/add relationship --source="TerminalPage" --target="CommandExecutor" --type=calls --description="Sends user input to executor for processing"

/add relationship --source="TerminalPage" --target="CommandResponse" --type=contains --description="Displays command responses in the terminal interface"

/add relationship --source="CommandResponse" --target="EditWizard" --type=contains --description="Renders edit wizards for interactive item updates"

/add relationship --source="CommandResponse" --target="SelectorWizard" --type=contains --description="Renders selector wizards for choosing items to edit/delete"

# Cross-layer: Wizard ↔ Parser integration
/add relationship --source="EditWizard" --target="CommandParser" --type=uses --description="Wizard generates commands that are parsed for execution"

/add relationship --source="CrudHandlers" --target="EditWizard" --type=uses --description="CRUD handlers return wizard configs for interactive editing"

# Documentation references
/add relationship --source="Terminal Architecture" --target="CommandParser" --type=mentions --description="Architecture doc describes the parser-executor-handler pattern"
```

## 3. Add Documentation Components

```bash
# API Documentation
/add component --feature="Terminal" --category=documentation --type=api-doc --title="Command API Reference" --content="Complete reference of all 50+ terminal commands including syntax, flags, examples, and response types. Organized into 9 categories: Getting Started, Tasks, Notes, Components, Stack, Insights, Team, Project Management, and System."

# Architecture Doc
/add component --feature="Terminal" --category=documentation --type=architecture --title="Terminal Architecture" --content="Terminal follows a parser-executor-handler pattern. Commands are tokenized and parsed, then routed to specialized handlers. Supports both wizard mode (interactive) and direct mode (flag-based) execution."
```

## 4. Add Related Todos

```bash
# Add terminal enhancement todos
/add todo --title="Add command history persistence" --priority=medium --content="Save terminal command history to localStorage for session recovery" --status=not_started

/add todo --title="Implement command aliases" --priority=low --content="Allow users to create custom command shortcuts" --status=not_started

/add todo --title="Add tab completion for component names" --priority=high --content="Autocomplete should suggest component titles when typing component commands" --status=not_started
```

## 5. Add Dev Log Entries

```bash
# Document recent improvements
/add devlog --title="Added newline support in wizard fields" --content="Updated escapeForCommand to properly escape newlines, carriage returns, and tabs. Modified sanitizeText to unescape these sequences on the backend. Now users can use multi-line descriptions in wizards."

/add devlog --title="Fixed UUID display in relationship wizard" --content="Relationships now show component titles instead of UUIDs. Added allComponents array to provide unfiltered lookup for existing relationships while keeping availableComponents filtered for the add dropdown."

/add devlog --title="Implemented inline relationship editing" --content="Edit wizards now support inline relationship management. Users can add, edit, and delete relationships directly in the component edit wizard without separate commands."
```

## 6. Add Project Notes

```bash
# Add design notes
/add note --title="Terminal Command Design Philosophy" --content="Commands follow consistent patterns: /verb noun for actions, wizards for interactive flows, flags for direct execution. All commands support both modes to accommodate different user preferences and use cases."

/add note --title="Future Enhancements" --content="Potential improvements: 1) Vim-style command mode, 2) Regex search in terminal history, 3) Command macros, 4) Keyboard shortcuts for common operations, 5) Terminal themes and customization, 6) Export command history"
```

## 7. Add Tech Stack

```bash
# Backend technologies
/add stack --name="Node.js" --category=runtime --version="18.x" --type=tech

/add stack --name="Express" --category=api --version="4.18.0" --type=package

/add stack --name="MongoDB" --category=database --version="6.0" --type=tech

# Frontend technologies
/add stack --name="React" --category=framework --version="18.2.0" --type=tech

/add stack --name="TypeScript" --category=framework --version="5.0" --type=tech

/add stack --name="TailwindCSS" --category=styling --version="3.3" --type=tech
```

## 8. View Terminal Feature

```bash
# View all components in Terminal feature
/view components

# View relationships for CommandExecutor
/view relationships "CommandExecutor"

# Get project info
/info

# View today's tasks
/today
```

## Batched Commands (Copy & Paste)

**Batch 1 - Components (10 commands):**
```bash
/add component --feature="Terminal" --category=backend --type=service --title="CommandParser" --content="Parses terminal commands into structured objects. Tokenizes input, extracts flags, handles quoted strings, and validates command syntax. Supports multi-word commands and project mentions." && /add component --feature="Terminal" --category=backend --type=service --title="CommandExecutor" --content="Executes parsed commands by routing to appropriate handlers. Manages command batching with && operator, handles errors, and returns structured responses. Central orchestrator for all terminal operations." && /add component --feature="Terminal" --category=backend --type=controller --title="CrudHandlers" --content="Handles all CRUD operations for todos, notes, devlogs, and components. Provides add/view/edit/delete functionality with wizard support and flag-based direct execution." && /add component --feature="Terminal" --category=backend --type=controller --title="UtilityHandlers" --content="Handles utility commands like help, themes, project swapping, export, summary generation, and navigation. Includes /llm guide for AI assistants." && /add component --feature="Terminal" --category=frontend --type=page --title="TerminalPage" --content="Main terminal interface with command input, history navigation, autocomplete, and response rendering. Provides interactive CLI experience in the browser." && /add component --feature="Terminal" --category=frontend --type=component --title="CommandResponse" --content="Renders different response types from commands (success, error, data, wizards). Displays formatted output, tables, lists, and interactive wizards based on response type." && /add component --feature="Terminal" --category=frontend --type=component --title="EditWizard" --content="Multi-step wizard for editing todos, notes, devlogs, and components. Includes inline relationship and subtask management with optimistic updates." && /add component --feature="Terminal" --category=frontend --type=component --title="SelectorWizard" --content="Item selection wizard for edit/delete operations. Provides searchable dropdown for choosing items by title or ID." && /add component --feature="Terminal" --category=documentation --type=api-doc --title="Command API Reference" --content="Complete reference of all 50+ terminal commands including syntax, flags, examples, and response types. Organized into 9 categories: Getting Started, Tasks, Notes, Components, Stack, Insights, Team, Project Management, and System." && /add component --feature="Terminal" --category=documentation --type=architecture --title="Terminal Architecture" --content="Terminal follows a parser-executor-handler pattern. Commands are tokenized and parsed, then routed to specialized handlers. Supports both wizard mode (interactive) and direct mode (flag-based) execution."
```

**Batch 2 - Todos, DevLogs, Notes, Stack (9 commands):**
```bash
/add todo --title="Add command history persistence" --priority=medium --content="Save terminal command history to localStorage for session recovery" --status=not_started && /add todo --title="Implement command aliases" --priority=low --content="Allow users to create custom command shortcuts" --status=not_started && /add todo --title="Add tab completion for component names" --priority=high --content="Autocomplete should suggest component titles when typing component commands" --status=not_started && /add devlog --title="Added newline support in wizard fields" --content="Updated escapeForCommand to properly escape newlines, carriage returns, and tabs. Modified sanitizeText to unescape these sequences on the backend. Now users can use multi-line descriptions in wizards." && /add devlog --title="Fixed UUID display in relationship wizard" --content="Relationships now show component titles instead of UUIDs. Added allComponents array to provide unfiltered lookup for existing relationships while keeping availableComponents filtered for the add dropdown." && /add note --title="Terminal Command Design Philosophy" --content="Commands follow consistent patterns: /verb noun for actions, wizards for interactive flows, flags for direct execution. All commands support both modes to accommodate different user preferences and use cases." && /add stack --name="Node.js" --category=runtime --version="18.x" --type=tech && /add stack --name="Express" --category=api --version="4.18.0" --type=package && /add stack --name="React" --category=framework --version="18.2.0" --type=tech
```

**Batch 3 - Component Relationships (10 commands):**
```bash
/add relationship --source="CommandExecutor" --target="CommandParser" --type=uses --description="Executor uses parser to tokenize and validate command strings" && /add relationship --source="CommandExecutor" --target="CrudHandlers" --type=calls --description="Routes CRUD operations (add/edit/delete) to CRUD handlers" && /add relationship --source="CommandExecutor" --target="UtilityHandlers" --type=calls --description="Routes utility commands (help, themes, info) to utility handlers" && /add relationship --source="TerminalPage" --target="CommandExecutor" --type=calls --description="Sends user input to executor for processing" && /add relationship --source="TerminalPage" --target="CommandResponse" --type=contains --description="Displays command responses in the terminal interface" && /add relationship --source="CommandResponse" --target="EditWizard" --type=contains --description="Renders edit wizards for interactive item updates" && /add relationship --source="CommandResponse" --target="SelectorWizard" --type=contains --description="Renders selector wizards for choosing items to edit/delete" && /add relationship --source="EditWizard" --target="CommandParser" --type=uses --description="Wizard generates commands that are parsed for execution" && /add relationship --source="CrudHandlers" --target="EditWizard" --type=uses --description="CRUD handlers return wizard configs for interactive editing" && /add relationship --source="Terminal Architecture" --target="CommandParser" --type=mentions --description="Architecture doc describes the parser-executor-handler pattern"
```

---

## Reset/Cleanup Commands

**Reset Features - Delete All Components (10 commands):**

```bash
/delete component "CommandParser" --confirm && /delete component "CommandExecutor" --confirm && /delete component "CrudHandlers" --confirm && /delete component "UtilityHandlers" --confirm && /delete component "TerminalPage" --confirm && /delete component "CommandResponse" --confirm && /delete component "EditWizard" --confirm && /delete component "SelectorWizard" --confirm && /delete component "Command API Reference" --confirm && /delete component "Terminal Architecture" --confirm
```

This batch will delete all 10 components created for the Terminal feature. Relationships will be cascade deleted automatically.

---

## Notes
- **Total Commands**: 29 individual commands (split into 3 batches due to 10 command limit)
  - Batch 1: 10 component definitions
  - Batch 2: 9 todos/devlogs/notes/stack items
  - Batch 3: 10 component relationships
- **Components Created**: 10 (8 code components + 2 documentation)
- **Relationships**: 10 component relationships showing architecture flow
- **Todos**: 3 enhancement tasks
- **Dev Logs**: 2 recent improvements (newline support + UUID fix)
- **Notes**: 1 design philosophy document
- **Stack Items**: 3 core technologies

**Key Feature**: The batch command splitting now properly respects quoted strings, so content containing `&&` operators won't break the batch execution!

**Relationship Architecture**:
- Backend: CommandParser → CommandExecutor → (CrudHandlers + UtilityHandlers)
- Frontend: TerminalPage → CommandResponse → (EditWizard + SelectorWizard)
- Cross-layer: EditWizard ↔ CommandParser (command generation)

This demonstrates the full workflow of documenting a feature using the terminal!
