# Brain Dump Assistant - AI Implementation Plan

## Overview

The Brain Dump Assistant is an AI-powered natural language interface that allows users to interact with their project management system using conversational commands. Think "Clippy meets Siri for project management."

**Current Status:** Prototype UI (no AI backend)
**Target:** Full AI integration with command parsing and execution

---

## Architecture

### Frontend (Current Prototype)
- **Location:** `/frontend/src/pages/BrainDumpPage.tsx`
- **Features:**
  - Chat-like interface
  - @ mention autocomplete for projects
  - Message history
  - Command parsing (basic, rule-based)
  - Simulated AI responses

### Backend (To Be Implemented)

```
/backend/src/
  ├── routes/
  │   └── braindump.ts          # New route for AI assistant
  ├── services/
  │   ├── aiService.ts           # AI provider integration (OpenAI, Anthropic, etc.)
  │   ├── commandParser.ts       # NLP command parsing
  │   └── actionExecutor.ts      # Execute parsed commands
  └── middleware/
      └── aiRateLimit.ts         # Rate limiting for AI calls
```

---

## Data Access

The assistant needs read/write access to all user data:

### User Data (from `User` model)
- `user.id` - Current user
- `user.email`, `user.firstName`, `user.lastName` - User info
- `user.ideas[]` - User's idea backlog

### Project Data (from `Project` model)
For each project the user owns or has access to:
- `project.name`, `project.description`, `project.category`, `project.tags`
- `project.notes[]` - All notes (id, title, content, createdAt, updatedAt)
- `project.todos[]` - All todos (id, text, description, priority, status, dueDate, assignedTo)
- `project.devLog[]` - Dev log entries (id, title, description, entry, date)
- `project.docs[]` - Documentation (id, type, title, content)
- `project.selectedTechnologies[]` - Tech stack
- `project.selectedPackages[]` - Packages
- `project.deploymentData` - Deployment info

### Team Data (via `TeamMember` model)
- Shared projects
- Team members (for @ mentions and assignment)
- Permissions (can edit, view-only, etc.)

---

## AI Integration Options

### Option 1: OpenAI GPT-4 (Recommended)
**Pros:**
- Excellent natural language understanding
- Function calling for structured outputs
- Large context window
- Well-documented

**Cons:**
- Costs money per API call
- Requires API key management
- Rate limits

**Implementation:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Function calling for structured command extraction
const functions = [
  {
    name: 'create_todo',
    description: 'Create a new todo item in a project',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        text: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        dueDate: { type: 'string', format: 'date' }
      },
      required: ['projectId', 'text']
    }
  },
  // ... more functions
];
```

### Option 2: Anthropic Claude
**Pros:**
- Very good at following instructions
- Longer context windows
- Good at reasoning

**Cons:**
- Similar costs to OpenAI
- Requires separate API integration

### Option 3: Open Source (Llama, Mistral)
**Pros:**
- Free (after setup)
- No external API calls
- Full control

**Cons:**
- Requires hosting GPU infrastructure
- More complex setup
- May not be as accurate for complex commands

---

## Command Types & Parsing

### 1. Create Actions
```
User: "@ProjectName add a todo for implementing user authentication that's high priority"

Parsed Command:
{
  action: 'create_todo',
  projectId: '12345',
  data: {
    text: 'Implement user authentication',
    priority: 'high',
    status: 'not_started'
  }
}

API Call:
POST /api/projects/:projectId/todos
```

**Variations:**
- "@Project create a note about database schema decisions"
- "@Project add dev log entry about fixing the memory leak"
- "Add idea: mobile app version" (goes to user.ideas)

### 2. Query Actions
```
User: "What are the high priority todos in @ProjectName?"

Parsed Command:
{
  action: 'query_todos',
  projectId: '12345',
  filters: {
    priority: 'high'
  }
}

Response:
"📋 High priority todos in ProjectName:
1. Implement user authentication (not started)
2. Fix security vulnerability in API (in progress)
3. Optimize database queries (blocked)"
```

**Variations:**
- "Show me all notes in @Project"
- "What's the status of @Project?"
- "List all projects with todos due this week"

### 3. Update Actions
```
User: "@ProjectName mark the authentication todo as completed"

Parsed Command:
{
  action: 'update_todo',
  projectId: '12345',
  todoId: 'auto-matched',
  data: {
    completed: true,
    status: 'completed'
  }
}
```

### 4. Brain Dump (Unstructured)
```
User: "Need to fix the login bug, update API docs, and schedule team meeting for Friday"

AI Analysis:
- Detected 3 potential tasks
- No specific project mentioned
- Ask for clarification or suggest projects

Response:
"I found 3 potential items:
1. 🐛 Fix login bug
2. 📝 Update API docs
3. 📅 Schedule team meeting

Which project should these go to? Or would you like me to ask about each one?"
```

---

## Backend API Design

### New Route: `/api/braindump`

#### POST `/api/braindump/chat`
Process a user message and return AI response.

**Request:**
```json
{
  "message": "string",
  "conversationId": "string (optional, for context)",
  "context": {
    "currentProjectId": "string (optional)"
  }
}
```

**Response:**
```json
{
  "response": "string",
  "actions": [
    {
      "type": "create_todo|create_note|query|etc",
      "status": "pending|completed|error",
      "data": {},
      "result": {}
    }
  ],
  "conversationId": "string"
}
```

#### GET `/api/braindump/context`
Get user context for AI (projects, recent activity, etc.)

**Response:**
```json
{
  "user": {
    "id": "string",
    "name": "string"
  },
  "projects": [
    {
      "id": "string",
      "name": "string",
      "recentActivity": [],
      "stats": {
        "totalTodos": 10,
        "completedTodos": 5,
        "notes": 3
      }
    }
  ]
}
```

---

## Implementation Steps

### Phase 1: Backend Foundation (Week 1-2)
- [ ] Set up AI service integration (OpenAI SDK)
- [ ] Create `/api/braindump` routes
- [ ] Implement basic command parser
- [ ] Create action executor service
- [ ] Add conversation history storage (MongoDB)
- [ ] Implement rate limiting

### Phase 2: Command Parsing (Week 2-3)
- [ ] Implement function calling with GPT-4
- [ ] Create command validators
- [ ] Add entity extraction (project names, dates, priorities)
- [ ] Implement fuzzy project matching
- [ ] Add error handling and user feedback

### Phase 3: Action Execution (Week 3-4)
- [ ] Connect to existing project APIs
- [ ] Implement todo creation via AI
- [ ] Implement note creation via AI
- [ ] Implement dev log creation via AI
- [ ] Implement query responses
- [ ] Add confirmation flow for destructive actions

### Phase 4: Frontend Integration (Week 4)
- [ ] Connect frontend to real backend
- [ ] Add loading states
- [ ] Implement conversation persistence
- [ ] Add action confirmation UI
- [ ] Add error handling and retry

### Phase 5: Advanced Features (Week 5+)
- [ ] Multi-step conversations
- [ ] Smart suggestions based on patterns
- [ ] Bulk operations
- [ ] Natural language date parsing ("next Friday", "in 2 weeks")
- [ ] Attachment support
- [ ] Voice input (stretch goal)

---

## Security Considerations

### 1. Authentication
- All AI endpoints require authenticated user
- Use existing JWT middleware
- Validate user has access to mentioned projects

### 2. Authorization
- Check project permissions before executing actions
- Don't expose projects user doesn't own/isn't shared with
- Validate team member mentions

### 3. Rate Limiting
```typescript
// Prevent AI abuse
const AI_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50 // 50 requests per window
};
```

### 4. Input Validation
- Sanitize all user input before passing to AI
- Validate AI responses before execution
- Prevent injection attacks
- Limit context size to prevent token abuse

### 5. Cost Control
- Track AI usage per user
- Set spending limits
- Cache common queries
- Implement tier-based limits (free vs pro)

---

## Prompt Engineering

### System Prompt Template
```
You are an AI assistant for a project management system. You help users create tasks, notes, and queries about their projects.

User Information:
- Name: {user.firstName} {user.lastName}
- Email: {user.email}

Available Projects:
{projects.map(p => `- ${p.name} (${p.category})`).join('\n')}

When the user mentions a project, use the project name exactly as shown above.

Available Actions:
1. create_todo - Create a new todo item
2. create_note - Create a new note
3. create_devlog - Create a dev log entry
4. query_project - Get project information
5. brain_dump - Help organize unstructured thoughts

Always extract:
- Project name (if mentioned)
- Action type
- All relevant parameters (priority, due date, assignee, etc.)

If information is ambiguous, ask clarifying questions.
Be concise and friendly.
```

---

## Cost Estimation

### OpenAI GPT-4 Pricing (as of 2024)
- Input: $0.03 per 1K tokens
- Output: $0.06 per 1K tokens

**Estimated costs per user per month:**
- Light usage (50 commands): ~$2-5
- Medium usage (200 commands): ~$8-15
- Heavy usage (500 commands): ~$20-30

**Optimization strategies:**
- Use GPT-3.5-turbo for simple commands ($10x cheaper)
- Cache frequently asked questions
- Implement client-side parsing for obvious commands
- Use streaming responses to improve perceived performance

---

## Database Schema

### Conversation History
```typescript
interface Conversation {
  _id: ObjectId;
  userId: ObjectId;
  messages: [{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: {
      projectId?: string;
      action?: string;
      success?: boolean;
    };
  }];
  createdAt: Date;
  updatedAt: Date;
}
```

### AI Usage Tracking
```typescript
interface AIUsage {
  _id: ObjectId;
  userId: ObjectId;
  date: Date;
  requestCount: number;
  tokensUsed: {
    input: number;
    output: number;
  };
  cost: number;
}
```

---

## Testing Strategy

### Unit Tests
- Command parser accuracy
- Entity extraction
- Action executor
- Permission checking

### Integration Tests
- End-to-end command flow
- Multi-step conversations
- Error handling
- Rate limiting

### User Testing
- Collect common phrasings
- Test edge cases
- Measure accuracy
- Gather feedback

---

## Future Enhancements

1. **Smart Suggestions**
   - "You usually create todos with high priority on Mondays"
   - "This sounds similar to an existing todo"

2. **Proactive Assistance**
   - "You have 3 todos due tomorrow. Would you like to review them?"
   - "Your project hasn't been updated in 2 weeks. Need help?"

3. **Integrations**
   - Email: "Forward this email to add as a note"
   - Calendar: "Add todos to Google Calendar"
   - GitHub: "Create todos from GitHub issues"

4. **Voice Interface**
   - Speech-to-text input
   - Audio responses

5. **Learning & Personalization**
   - Learn user preferences
   - Custom shortcuts
   - Personalized suggestions

---

## References

- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference)
- [Natural Language Date Parsing: Chrono](https://github.com/wanasit/chrono)
- [Project Models](/backend/src/models/Project.ts)
- [User Models](/backend/src/models/User.ts)

---

## Questions to Resolve

1. **AI Provider:** OpenAI GPT-4 vs Claude vs self-hosted?
2. **Conversation Storage:** How long to keep history? Per-session vs persistent?
3. **Confirmation Flow:** Auto-execute or always confirm?
4. **Pricing Model:** Include in subscription vs usage-based billing?
5. **Multi-language:** English only or support other languages?

 🎯 Overview

    Transform the BrainDumpPage into a full-featured terminal/CLI interface with unified command API, supporting commands like /add todo @projectxyz, /swap-project x, /wizard 
    new, etc., with autocomplete for both projects (@) and commands (/).

    ---
    📊 Current Architecture Analysis

    Backend (Express + MongoDB + TypeScript)

    - ✅ RESTful API with route-based organization (/api/projects, /api/auth, etc.)
    - ✅ Middleware: auth, validation, rate limiting, analytics
    - ✅ CRUD operations for Projects, Notes, Todos, DevLog, Docs
    - ✅ Models: Project, User, TeamMember, Analytics, etc.
    - ❌ Missing: Unified command API, command parser

    Frontend (React + TypeScript)

    - ✅ Service-based API clients (BaseApiService pattern)
    - ✅ BrainDumpPage prototype with @ autocomplete for projects
    - ✅ Layout.tsx handles project selection and routing
    - ❌ Missing: / command autocomplete, command execution system, terminal UX

    ---
    🏗️ Implementation Plan

    Phase 1: Backend Command Infrastructure (Days 1-3)

    1.1 Create Command Parser Service

    File: backend/src/services/commandParser.ts
    - Parse command syntax: /command [params] [@project] [flags]
    - Extract command type, arguments, project mentions, and flags
    - Return structured command object with validation

    1.2 Create Command Executor Service

    File: backend/src/services/commandExecutor.ts
    - Execute parsed commands by routing to appropriate CRUD operations
    - Handle project resolution (current → @mentioned → prompt user)
    - Return standardized response format for CLI rendering
    - Support commands:
      - /add todo [@project] [text] - Create todo
      - /add note [@project] [text] - Create note
      - /add devlog [@project] [text] - Create dev log
      - /swap-project [name] - Switch active project
      - /wizard new - Interactive project creation
      - /export [project] - Export project data
      - /view notes [@project] - List notes
      - /view todos [@project] - List todos
      - /help - Show available commands

    1.3 Create Terminal Routes

    File: backend/src/routes/terminal.ts
    - POST /api/terminal/execute - Execute command string
    - GET /api/terminal/commands - Get available commands for autocomplete
    - GET /api/terminal/projects - Get projects for @ autocomplete
    - POST /api/terminal/validate - Validate command syntax (optional)

    1.4 Command Middleware & Security

    File: backend/src/middleware/commandSecurity.ts
    - Rate limiting for command execution (stricter than normal API)
    - Command validation middleware
    - Project access validation (ensure user can access @mentioned projects)
    - Command logging for audit trail

    1.5 Update app.ts

    - Register new terminal routes with middleware
    - Add command rate limiting

    ---
    Phase 2: Frontend Terminal Interface (Days 4-6)

    2.1 Create Terminal API Service

    File: frontend/src/api/terminal.ts
    class TerminalService extends BaseApiService {
      executeCommand(command: string, currentProjectId?: string)
      getCommands()
      getProjects()
      validateCommand(command: string)
    }

    2.2 Create Terminal Input Component

    File: frontend/src/components/TerminalInput.tsx
    - Command input with syntax highlighting
    - Dual autocomplete:
      - / triggers command autocomplete
      - @ triggers project autocomplete

    - Command history (up/down arrows)
    - Multi-line support (Shift+Enter)
    - Tab completion
    - Escape to clear

    2.3 Create Command Response Renderer

    File: frontend/src/components/CommandResponse.tsx
    - Parse and render structured command responses
    - Support different response types:
      - Success confirmations
      - Data tables (todo lists, notes)
      - Error messages with suggestions
      - Interactive prompts (for wizards)
    - Syntax highlighting for data

    2.4 Overhaul BrainDumpPage

    File: frontend/src/pages/BrainDumpPage.tsx
    - Replace prototype message system with terminal interface
    - Integrate TerminalInput and CommandResponse components
    - Add command history state management
    - Connect to terminal API service
    - Handle project context (pass current project to commands)
    - Add keyboard shortcuts (Ctrl+L to clear, etc.)

    2.5 Update Layout.tsx

    - Add route to BrainDumpPage (uncomment existing /braindump tab)
    - Pass current project context to BrainDumpPage
    - Ensure project selection works with terminal commands

    ---
    Phase 3: Command System & Wizards (Days 7-9)

    3.1 Implement Core Commands (Backend)

    For each command in commandExecutor.ts:
    - /add todo - Call existing POST /api/projects/:id/todos
    - /add note - Call existing POST /api/projects/:id/notes  
    - /add devlog - Call existing POST /api/projects/:id/devlog
    - /view notes - Call existing GET /api/projects/:id
    - /view todos - Call existing GET /api/projects/:id
    - /swap-project - Return project data for frontend to switch
    - /export - Call existing GET /api/projects/:id/export

    3.2 Create Interactive Wizard System

    File: backend/src/services/wizardService.ts
    - Multi-step command flows (like /wizard new for project creation)
    - Track wizard state per user session
    - Support wizard commands:
      - /wizard new - Create new project (interactive)
      - /wizard setup - Setup existing project
      - /wizard deploy - Deployment wizard

    3.3 Add Fuzzy Project Matching

    - Use existing project names to suggest close matches
    - Handle typos in @project mentions
    - Suggest corrections when project not found

    3.4 Natural Language Parsing (Optional Enhancement)

    File: backend/src/services/nlpParser.ts
    - Parse natural language commands (e.g., "add a todo to fix login bug")
    - Extract intent, entities, and parameters
    - Convert to structured command format
    - Fall back to strict syntax if NLP fails

    ---
    Phase 4: Testing & Polish (Days 10-11)

    4.1 Backend Tests

    File: backend/src/tests/terminal.test.ts
    - Test command parser with various inputs
    - Test command executor for each command type
    - Test project resolution logic
    - Test error handling and validation
    - Test rate limiting

    4.2 Frontend Tests

    File: frontend/src/tests/terminal.test.tsx
    - Test terminal input autocomplete
    - Test command history
    - Test response rendering
    - Test error states

    4.3 Integration Testing

    - Test full command flow (input → backend → response → render)
    - Test @ and / autocomplete with real data
    - Test project context switching
    - Test command chaining

    4.4 UX Polish

    - Add loading states during command execution
    - Add command execution animations
    - Improve error messages with helpful hints
    - Add keyboard shortcut help overlay
    - Add command examples in help system

    ---
    Phase 5: Future CLI/TUI Preparation (Day 12)

    5.1 API Token System

    File: backend/src/routes/tokens.ts
    - Generate API tokens for CLI authentication
    - Token management (create, revoke, list)
    - Scoped permissions for tokens

    5.2 CLI Authentication Middleware

    File: backend/src/middleware/cliAuth.ts
    - Support both cookie (web) and token (CLI) auth
    - Validate API tokens
    - Map tokens to user sessions

    5.3 Documentation

    File: TERMINAL_API.md
    - Document all available commands
    - Document API endpoints for CLI developers
    - Document authentication flow for external CLI
    - Add command examples and recipes

    ---
    🔐 Security Considerations

    1. Command Injection Prevention: Sanitize all command inputs before parsing
    2. Rate Limiting: Stricter limits on terminal commands (e.g., 20/min vs 100/min for normal API)
    3. Project Access: Validate user has permission to access @mentioned projects
    4. Command Auditing: Log all executed commands for security review
    5. Token Security: Use secure token generation and storage for future CLI
    6. Sensitive Data: Ensure export commands don't expose sensitive data

    ---
    📈 Benefits of This Architecture

    1. Single Source of Truth: All CRUD operations flow through existing API endpoints
    2. Consistency: Same backend API works for web UI, terminal UI, and future CLI
    3. Extensibility: Easy to add new commands without duplicating logic
    4. Security: Centralized auth and validation for all interfaces
    5. Testing: Each layer can be tested independently
    6. Future-Proof: Ready for external CLI/TUI with minimal changes

    ---
    🎨 User Experience Flow

    User types: "/add todo fix auth bug @myproject"
                    ↓
    Frontend autocompletes /add, @myproject
                    ↓
    Send to: POST /api/terminal/execute
                    ↓
    Backend: Parse → Validate → Execute
                    ↓
    Backend: POST /api/projects/{id}/todos (existing endpoint)
                    ↓
    Return structured response
                    ↓
    Frontend renders: "✅ Added todo: fix auth bug to MyProject"

    ---
    📦 New Files to Create

    Backend (8 files)

    - backend/src/services/commandParser.ts
    - backend/src/services/commandExecutor.ts
    - backend/src/services/wizardService.ts
    - backend/src/routes/terminal.ts
    - backend/src/middleware/commandSecurity.ts
    - backend/src/tests/terminal.test.ts
    - backend/src/routes/tokens.ts (Phase 5)
    - backend/src/middleware/cliAuth.ts (Phase 5)

    Frontend (4 files)

    - frontend/src/api/terminal.ts
    - frontend/src/components/TerminalInput.tsx
    - frontend/src/components/CommandResponse.tsx
    - frontend/src/tests/terminal.test.tsx

    Files to Modify (4 files)

    - backend/src/app.ts - Register terminal routes
    - frontend/src/pages/BrainDumpPage.tsx - Complete overhaul
    - frontend/src/components/Layout.tsx - Uncomment braindump tab
    - frontend/src/api/index.ts - Export terminalAPI

    ---
    ⏱️ Estimated Timeline

    - Phase 1: 3 days (Backend foundation)
    - Phase 2: 3 days (Frontend terminal UI)
    - Phase 3: 3 days (Commands & wizards)
    - Phase 4: 2 days (Testing & polish)
    - Phase 5: 1 day (Future CLI prep)

    Total: ~12 days for full implementation

---

**Last Updated:** 2025-10-01
**Status:** Planning Phase
**Owner:** Development Team
