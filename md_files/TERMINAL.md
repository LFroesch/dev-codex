# Terminal System Documentation

## Status: ✅ Phases 1, 2, 4, 5 Complete (85% Implementation)

### Completed Features
- ✅ Backend command infrastructure (parser, executor, routes)
- ✅ Frontend terminal UI with dual autocomplete
- ✅ 35+ commands implemented (add, view, set, remove, search, task management)
- ✅ Full-text search with MongoDB text indexing
- ✅ Task management commands (complete, assign, priority, due)
- ✅ Summary/export with 4 formats (markdown, json, prompt, text)
- ✅ News and theme management
- ✅ Navigation buttons and query param support
- ✅ Security middleware with rate limiting
- ✅ Performance optimizations (caching, indexes)

### Pending Features (Phase 3)
- 🚧 Interactive /wizard commands
- 🚧 Advanced NLP parsing
- 🚧 CLI token authentication

---

## Available Commands (30+)

### Add Commands
- `/add todo [text] [@project]` - Create todo
- `/add note [text] [@project]` - Create note
- `/add devlog [text] [@project]` - Create dev log entry
- `/add doc [type] [title] - [content] [@project]` - Create documentation
- `/add tech [name] --category=[category]` - Add technology to stack
- `/add package [name]` - Add package to project
- `/add tag [name]` - Add tag to project

### View Commands
- `/view notes [@project]` - List notes
- `/view todos [@project]` - List todos
- `/view devlog [@project]` - List dev log entries
- `/view docs [@project]` - List documentation
- `/view stack [@project]` - View tech stack
- `/view deployment [@project]` - View deployment info
- `/view public [@project]` - View public settings
- `/view team [@project]` - View team members
- `/view settings [@project]` - View project settings
- `/view news` - View latest news
- `/view themes` - List available themes

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

### Project Management
- `/swap [project]` - Switch active project
- `/export [@project]` - Export project data
- `/invite [email] --role=[role]` - Invite team member
- `/help` - Show command help

### Search & Task Management
- `/search [query] [@project]` - Full-text search across all content
- `/complete [todo] [@project]` - Mark todo as completed
- `/assign [todo] [email] [@project]` - Assign todo to team member
- `/priority [todo] [low/medium/high] [@project]` - Set todo priority
- `/due [todo] [date] [@project]` - Set due date (supports "today", "tomorrow", YYYY-MM-DD)

### Export & Summary
- `/summary [format] [@project]` - Generate downloadable project summary
  - Formats: `markdown` (README), `json` (structured data), `prompt` (AI template), `text` (plain)
  - Aliases: `/readme`, `/prompt`

### Coming Soon

#### High Priority
- **Batch/Chain Commands** - Execute multiple commands in sequence
  - Syntax: `/add todo X && /set priority high`
  - optional AI-powered batch via `/clippydump` *Hold off on this for now*
- **Better Command Flags** - Enhanced flag system for all commands
  - More intuitive syntax
  - Better validation and help text
- **Delete & Edit Operations** - Inline editing GUI
  - `/edit todo [title]` - Opens inline editor
  - `/delete [type] [title]` - Delete items with confirmation
- **Subtask System** - Full subtask support for todos
  - `/add subtask [parent-title] [sub-title]`
  - `/view subtasks [todo-id]`

#### Workflow Commands
- `/today [@project]` - Show today's tasks and activity
- `/week [@project]` - Weekly summary and planning
- `/standup [@project]` - Generate standup report
- `/info [@project]` - Quick project overview

#### Interactive Features
- `/wizard new/setup/deploy` - Interactive wizards
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
User: "/add todo fix bug @myproject"
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

## Future Enhancements

### Phase 3: Wizards & Advanced Features
- Interactive project creation wizard
- Multi-step deployment wizard
- Setup wizard for new projects
- NLP parsing for natural language commands

### CLI/TUI Support
- API token authentication
- External CLI tool
- Terminal UI companion app

### AI Integration
- Command suggestions based on patterns
- Natural language parsing
- Bulk operations via AI
- Smart autocomplete

---

**Last Updated:** 2025-10-08
**Progress:** 85% (Phases 1, 2, 4, 5 complete + search, task mgmt, summaries)
**Next:** Phase 3 (Wizards) + AI integration
