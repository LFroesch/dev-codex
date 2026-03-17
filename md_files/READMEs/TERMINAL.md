# Terminal System Documentation

## Status: ✅ Complete (55+ commands + AI assistant)

### Features
- **Built-in AI assistant** — type natural language (no `/` prefix), AI reads project context, proposes actions, user confirms
  - Powered by Gemini 2.5 Flash (prod) / Ollama (dev), swappable to any OpenAI-compatible API
  - Multi-turn sessions with 30min TTL
  - Action confirmation UI with checkboxes, expandable raw commands
  - Tier-based access: free=blocked, pro/premium=allowed, self-hosted=unlimited
- **55+ slash commands** — CRUD for todos, notes, devlog, features, relationships, subtasks, stack, team, settings
- **Interactive wizards** — edit/delete with wizard UI or direct flag updates
- **Batch commands** — chain with `&&` or newlines (max 10 per batch)
- **Dual autocomplete** — `/` commands + `@` project mentions
- **Export & summary** — 4 formats (markdown, json, prompt, text) with entity filtering
- **External AI integration** — `/bridge` (command reference for CLAUDE.md/.cursorrules), `/context` (project state export)
- **Full-text search** with MongoDB text indexing
- **Workflow commands** — `/today`, `/week`, `/standup`, `/info`, `/stale`, `/activity`

---

## AI Natural Language Input

Type anything without a `/` prefix and it routes to the built-in AI assistant. The AI reads your current project context (todos, devlog, features, stack) and proposes actions.

**Examples:**
- `finished the auth page, used JWT tokens` → AI proposes devlog entry + todo completion
- `what should I work on next?` → AI analyzes open todos and suggests priorities
- `break down the payment feature into tasks` → AI creates a todo list

**How it works:**
1. Non-slash input → `aiHandler.handleAIQuery()` → Gemini/Ollama (OpenAI-compatible API)
2. AI returns structured JSON: `{ message, actions[], followUp? }`
3. Frontend renders `AIResponseRenderer` with checkboxes per action
4. User confirms → `POST /api/terminal/ai/confirm` → `CommandExecutor` runs each action

**Session management:** In-memory Map, 30min TTL, resets on `/clear` or project switch.

**Config:** `GEMINI_API_KEY`, `OLLAMA_BASE_URL`, `AI_MODEL`, `AI_ENABLED` env vars in `.env`.

---

## Available Commands (55+)

### Add Commands
- `/add todo --title="text" --priority=low|medium|high --status=not_started|in_progress|blocked --due="MM-DD-YYYY TIME"` - Create todo
- `/add subtask "[parent todo]" "[subtask text]"` - Add subtask to a todo
- `/add note --title="text" --content="text"` - Create note
- `/add devlog --title="text" --content="text"` - Create dev log entry
- `/add feature --group="name" --category="cat" --type="type" --title="title" --content="content"` - Add feature
- `/add stack --name="name" --category=[category]` - Add technology to stack
- `/add tag "[name]"` - Add tag to project
- `/add idea --title="title" --content="content"` - Add a personal idea
- `/add project --name="name" --description="desc" --category="cat" --color="#hex"` - Create project
- `/add relationship --source="feature" --target="feature" --type=uses|depends_on` - Add feature relationship

### View Commands
- `/view todos`, `/view notes`, `/view devlog`, `/view features`, `/view stack`
- `/view subtasks "[todo]"`, `/view relationships`
- `/view deployment`, `/view public`, `/view team`, `/view settings`
- `/view ideas`, `/view projects`, `/view news`, `/view themes`, `/view notifications`

### Edit Commands (Wizards + Direct Flags)
- `/edit todo [#]`, `/edit note [#]`, `/edit devlog [#]`, `/edit feature [#]`
- `/edit subtask [parent#] [subtask#]`, `/edit idea [#]`
- Direct: `/edit todo 1 --title="new" --priority=high --status=in_progress`

### Delete Commands (with `--confirm` flag)
- `/delete todo [#] --confirm`, `/delete note [#] --confirm`, `/delete devlog [#] --confirm`
- `/delete feature [#] --confirm`, `/delete subtask [parent#] [subtask#] --confirm`
- `/delete idea [#] --confirm`
- `/remove stack --name="name"`, `/remove tag "[name]"`, `/remove member "[email]"`

### Project Management
- `/swap @project` - Switch active project
- `/set name "..."`, `/set description "..."` - Update project settings
- `/set deployment --url="..." --platform="..."`, `/set public --enabled=true|false`
- `/export` (alias for /context), `/invite "[email]" --role=editor|viewer`

### Search & Task Management
- `/search "[query]"` - Full-text search across all content
- `/complete "[todo]"` - Mark todo as completed
- `/assign "[todo]" "[email]"` - Assign todo to team member
- `/push "[todo]"` - Push completed todo to devlog

### Workflow & Insights
- `/today` - Today's tasks and activity
- `/week` - Weekly summary and upcoming tasks
- `/standup` - Standup report (yesterday/today/blockers)
- `/info` - Project overview with stats
- `/stale` - Find stale items (14+ days for notes, 7+ days for todos)
- `/activity` - View activity log

### Export & AI Integration
- `/context [entity]` - Export project as .md (aliases: /export, /summary). Entities: all|full|todos|notes|devlog|features|stack|team|deployment|settings|projects
- `/bridge` - Command reference for external AI tools (CLAUDE.md, .cursorrules)
- `/llm` - Alias for `/bridge`
- `/context` - Current project state for AI (open todos, stack, features, recent devlog)
- `/context full` - Full project dump (all entities, no truncation)

### Batch Commands
Chain with `&&` or newlines (max 10, stops on first error):
```
/add todo implement feature
/add note architecture decisions
/add devlog completed user auth
```

### Utility
- `/help`, `/goto "[page]"`, `/set theme "[name]"`, `/clear notifications`

---

## Architecture

### Backend (`/backend/src/`)
```
services/
  ├── commandParser.ts       # Parse command syntax, 55+ command types
  ├── commandExecutor.ts     # Route commands to handler modules
  ├── AIService.ts           # Gemini/Ollama client, system prompt
  ├── AIContextBuilder.ts    # Build project context from MongoDB
  ├── aiHandler.ts           # Session management, AI query orchestration
  └── handlers/
      ├── crud/              # TodoHandlers, NoteHandlers, DevLogHandlers, etc.
      ├── UtilityHandlers.ts # Help, export, summary, bridge, context, workflows
      ├── StackHandlers.ts
      ├── TeamHandlers.ts
      └── SettingsHandlers.ts

routes/
  └── terminal.ts            # API endpoints (execute, ai/confirm, commands, etc.)
```

### Frontend (`/frontend/src/`)
```
pages/
  └── TerminalPage.tsx       # Main terminal, AI session state, welcome screen

components/
  ├── TerminalInput.tsx      # Input with dual autocomplete, AI session awareness
  ├── CommandResponse.tsx    # Routes responses to specialized renderers
  └── responses/
      ├── AIResponseRenderer.tsx   # AI response with action checkboxes
      ├── AIActionPreview.tsx      # Individual action checkbox
      ├── BatchCommandsRenderer.tsx
      ├── TodosRenderer, NotesRenderer, etc.
      └── index.ts

api/
  └── terminal.ts            # TerminalService (executeCommand, confirmAIActions)
```

### API Endpoints
- `POST /api/terminal/execute` - Execute command (slash) or AI query (natural language)
- `POST /api/terminal/ai/confirm` - Execute confirmed AI-proposed actions
- `GET /api/terminal/commands` - Get command list for autocomplete
- `GET /api/terminal/projects` - Get projects for `@` autocomplete
- `POST /api/terminal/validate` - Validate syntax
- `GET /api/terminal/suggestions` - Get suggestions

---

## Security

- **Rate Limiting**: 20 commands/min per user (terminal), separate AI rate limits per tier
- **Input Sanitization**: XSS, injection prevention, prompt sanitization
- **Authorization**: JWT auth, project access validation, team permission checks
- **AI Safeguards**: Tier gating, token tracking, input length validation, monthly caps
- **Audit Logging**: All commands logged, activity tracking

---

**Last Updated:** 2026-02-13
