# Terminal System Documentation

## Status: ✅ Phases 1, 2, 4, 5 Complete + New Features (95% Implementation)

### Completed Features
- ✅ Backend command infrastructure (parser, executor, routes)
- ✅ Frontend terminal UI with dual autocomplete
- ✅ 50+ commands implemented (add, view, set, remove, search, task management, edit, delete, subtasks)
- ✅ Full-text search with MongoDB text indexing
- ✅ Task management commands (complete, assign, priority, due)
- ✅ **NEW: Subtask system** (add, view subtasks)
- ✅ **NEW: Edit operations with interactive wizards** (edit todos, notes, devlog, docs with wizard UI or direct field updates)
- ✅ **NEW: Delete operations with confirmation** (delete with --confirm flag)
- ✅ **NEW: Batch command execution** (chain commands with && or newlines, max 10 per batch)
- ✅ Summary/export with 4 formats (markdown, json, prompt, text)
- ✅ News and theme management
- ✅ Navigation buttons and query param support
- ✅ Security middleware with rate limiting
- ✅ Performance optimizations (caching, indexes)

### Pending Features (Phase 3)
- ✅ **Interactive /wizard new command** (project creation)
- ✅ **Interactive edit wizards** (todos, notes, docs, devlog)
- 🚧 Advanced NLP parsing
- 🚧 CLI token authentication

---

## Available Commands (50+)

### Add Commands
- `/add todo [text] [@project]` - Create todo
- `/add subtask [parent todo] [subtask text] [@project]` - Add subtask to a todo
- `/add note [text] [@project]` - Create note
- `/add devlog [text] [@project]` - Create dev log entry
- `/add doc [type] [title] - [content] [@project] --feature="Feature Name"` - Create documentation (optional feature grouping)
- `/add tech [name] --category=[category]` - Add technology to stack
- `/add package [name]` - Add package to project
- `/add tag [name]` - Add tag to project
- `/add idea --title="title" --description="description" --content="content"` - Add a personal idea to your account
- `/add project --name="name" --description="description" --category="category" --color="#hex"` - Create a new project with flags

### View Commands
- `/view notes [@project]` - List notes
- `/view todos [@project]` - List todos
- `/view subtasks [todo text/id] [@project]` - View subtasks for a todo
- `/view devlog [@project]` - List dev log entries
- `/view docs [@project]` - List documentation (grouped by feature)
- `/view stack [@project]` - View tech stack
- `/view deployment [@project]` - View deployment info
- `/view public [@project]` - View public settings
- `/view team [@project]` - View team members
- `/view settings [@project]` - View project settings
- `/view news` - View latest news
- `/view themes` - List available themes
- `/view ideas` - View all your personal ideas
- `/view projects` - List all your projects

### Edit Commands (Interactive Wizards + Direct Updates)
- `/edit todo [id] [@project]` - Opens interactive wizard to edit todo (or use `--title=`, `--content=`, `--priority=`, `--status=`, `--due=` for direct updates)
- `/edit note [id] [@project]` - Opens interactive wizard to edit note (or use `--field=` and `--content=` for direct updates)
- `/edit devlog [id] [@project]` - Opens interactive wizard to edit dev log entry (or use `--field=` and `--content=` for direct updates)
- `/edit doc [id] [@project]` - Opens interactive wizard to edit documentation (or use `--field=` and `--content=` for direct updates)
- `/edit subtask [parent_idx] [subtask_idx] [@project]` - Opens interactive wizard to edit subtask (per-parent indexing, or use `--title=`, `--content=`, `--priority=`, `--status=`, `--due=` for direct updates)
- `/edit idea [id/#] --title="title" --description="description" --content="content"` - Edit a personal idea by ID or index number

Examples:
```bash
/edit todo 1                              # Opens wizard for interactive editing with subtask management
/edit note 1 --field=title --content="New Title"  # Direct field update
/edit doc 2 --field=content --content="Updated documentation"
/edit doc 3 --field=feature --content="Authentication System"  # Update feature grouping
/edit subtask 1 2                         # Opens wizard for editing 2nd subtask of parent todo #1
/edit subtask 1 2 --title="Updated subtask title" --priority=high  # Direct subtask update
/edit subtask 2 3 --status=in_progress    # Update 3rd subtask of parent todo #2
```

### Delete Commands (with confirmation)
- `/delete todo [todo text/id] [@project] --confirm` - Delete a todo
- `/delete note [note id/title] [@project] --confirm` - Delete a note
- `/delete devlog [entry id] [@project] --confirm` - Delete a dev log entry
- `/delete doc [doc id/title] [@project] --confirm` - Delete documentation
- `/delete subtask [parent_idx] [subtask_idx] [@project] --confirm` - Delete a subtask (per-parent indexing)
- `/delete idea [id/#] --confirm` - Delete a personal idea by ID or index number

### Set Commands
- `/set deployment --url=[url] --platform=[platform]` - Update deployment
- `/set public --enabled=[true/false]` - Toggle public visibility
- `/set name [name]` - Update project name
- `/set description [text]` - Update description
- `/set theme [name]` - Change app theme

### Remove Commands
- `/remove tech [name]` - Remove technology
- `/remove package [name]` - Remove package
- `/remove member [email]` - Remove team member
- `/remove tag [name]` - Remove tag

### Relationship Commands (Component Graph)
- `/add relationship --from=[component] --to=[component] --type=[type] [@project]` - Add relationship between components
- `/view relationships [@project]` - View all component relationships
- `/edit relationship [id] [@project]` - Edit relationship type or description
- `/delete relationship [id] [@project] --confirm` - Delete a relationship

### Project Management
- `/add project [name] [description] [category] [color]` - Create new project
- `/swap [project]` - Switch active project
- `/export [@project]` - Export project data
- `/invite [email] --role=[role]` - Invite team member
- `/help` - Show command help

### Search & Task Management
- `/search [query] [@project]` - Full-text search across all content
- `/complete [todo] [@project]` - Mark todo as completed
- `/assign [todo] [email] [@project]` - Assign todo to team member

### Export & Summary
- `/summary [format] [entities] [@project]` - Generate downloadable project summary
  - Formats: `markdown` (README), `json` (structured data), `prompt` (AI template), `text` (plain)
  - Aliases: `/readme`, `/prompt`
  - Entities: `all|todos|notes|devlog|components|stack|team|deployment|settings|projects`

### Batch Command Execution
Execute multiple commands in sequence using `&&` or newlines (max 10 per batch):

Using newlines (easier to read/edit):
```bash
/add todo implement feature
/add note architecture decisions
/add devlog completed user auth
```

Using && (backwards compatible):
```bash
/add todo implement feature && /add note architecture decisions && /add devlog completed user auth
```

Mixed (newlines + &&):
```bash
/add todo task 1 &&
/add todo task 2 &&
/add note documentation
```

- Executes commands sequentially
- Stops on first error
- Returns combined results
- Maximum 10 commands per batch
- No AI processing - direct command execution
- LLMs should split large command sets into batches of 10

### Workflow Commands
- `/today [@project]` - Show today's tasks and activity
- `/week [@project]` - Weekly summary and planning
- `/standup [@project]` - Generate standup report (what I did yesterday, working on today, stuck on)
- `/info [@project]` - Quick project overview with stats
- `/stale [@project]` - Find stale todos and notes (not updated in 30+ days)
- `/activity [@project]` - View activity log for a project

#### Interactive Features
- `/wizard new` - Interactive project creation wizard (aliases: `/wizard project`, `/new project`, `/new`)
- `/suggest [request]` - AI-powered suggestions (see clippy.md)
- `/dump [requests]` - Batch AI operations

---

## Architecture

### Backend (`/backend/src/`)
```
services/
  ├── commandParser.ts      # Parse command syntax (~800 lines)
  ├── commandExecutor.ts    # Execute commands (~2300 lines)
  └── wizardService.ts      # Interactive wizards (TODO)

routes/
  └── terminal.ts           # API endpoints (~270 lines)

middleware/
  └── commandSecurity.ts    # Rate limiting & validation (~200 lines)
```

### Frontend (`/frontend/src/`)
```
pages/
  └── TerminalPage.tsx      # Main terminal interface

components/
  ├── TerminalInput.tsx     # Command input with autocomplete
  └── CommandResponse.tsx   # Response rendering

api/
  └── terminal.ts           # Backend integration
```

### API Endpoints
- `POST /api/terminal/execute` - Execute command
- `GET /api/terminal/commands` - Get command list
- `GET /api/terminal/projects` - Get projects for autocomplete
- `POST /api/terminal/validate` - Validate syntax
- `GET /api/terminal/suggestions` - Get suggestions
- `GET /api/terminal/history` - Get command history

---

## Command Flow

```
User: "/add todo fix bug @project"
         ↓
TerminalInput (autocomplete / and @)
         ↓
POST /api/terminal/execute
         ↓
CommandParser extracts:
  - type: ADD_TODO
  - args: ["fix", "bug"]
  - project: "myproject"
         ↓
CommandExecutor:
  1. Resolve project
  2. Verify permissions
  3. Call: POST /api/projects/:id/todos
  4. Return structured response
         ↓
CommandResponse renders:
  "✅ Added todo: fix bug to MyProject"
  [View Todos Button]
```

---

## Security

### Rate Limiting
- 20 commands/minute per user
- Stricter than normal API (100/min)

### Input Sanitization
- XSS prevention
- SQL injection prevention
- Command injection prevention

### Authorization
- JWT authentication required
- Project access validation
- Team permission checks

### Audit Logging
- All commands logged
- Suspicious pattern detection
- User activity tracking

---

## Development Guide

### Adding a New Command

1. **Add to commandParser.ts**
```typescript
// Add enum
SEARCH = 'search',

// Add aliases
'search': CommandType.SEARCH,

// Add metadata
[CommandType.SEARCH]: {
  type: CommandType.SEARCH,
  syntax: '/search [query] [@project]',
  description: 'Search across all content',
  examples: ['/search bug report'],
  requiresProject: false,
  requiresArgs: true
}
```

2. **Add to commandExecutor.ts**
```typescript
case CommandType.SEARCH:
  return await this.handleSearch(parsed, currentProjectId);

private async handleSearch(parsed, currentProjectId) {
  const query = parsed.args.join(' ');
  // Implementation here
  return {
    type: ResponseType.DATA,
    message: `Search results for "${query}"`,
    data: { results: [...] }
  };
}
```

3. **Add response rendering to CommandResponse.tsx**
```typescript
case 'search':
  return (
    <div>
      {data.results.map(r => (
        <div key={r.id}>{r.title}</div>
      ))}
    </div>
  );
```

---

## Testing

### Manual Testing
```bash
# Start backend
cd backend && npm run dev

# Login and get token from cookies

# Test commands
curl -X POST http://localhost:5003/api/terminal/execute \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN" \
  -d '{"command": "/help"}'
```

### Build Status
- ✅ TypeScript compilation: PASSING
- ✅ Server startup: PASSING
- ✅ No runtime errors

---


**Last Updated:** 2025-10-14
**Progress:** 95% (Phases 1, 2, 4, 5 complete + subtasks, edit, delete, batch commands)
**Next:** Phase 3 (Wizards) + Workflow commands + AI integration

## Future Enhancements

### CLI/TUI Support
- API token authentication
- External CLI tool
- Terminal UI companion app

### AI Integration
- Command suggestions based on patterns
- Natural language parsing
- Bulk operations via AI
- Smart autocomplete

### Cross-Project Operations
- /recent [limit] - View recently accessed projects or recent activity
- /all search [query] - Search across ALL projects (not just current one)
- /all todos [--status=pending/completed] - View todos across all projects

### Account Statistics & Analytics
- /stats or /analytics - View account-wide statistics:
  - Total projects created
  - Todos completed (all-time / this week / this month)
  - Most active projects
  - Contribution streaks
- /activity [--days=7] - View user activity log/timeline
- /achievements - Gamification: show user achievements/badges

### Data Management
- /export all - Export all projects at once
- /backup - Create full account backup
- /archive @project - Archive a project (soft delete)
- /archived - View archived projects
- /restore @project - Restore an archived project

### Collaboration & Social
- /invites - View pending project invitations
- /accept [invitation-id] / /decline [invitation-id] - Manage invitations
- /shared - View projects shared with you
- /mentions - View where you've been mentioned/assigned
