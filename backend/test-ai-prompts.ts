/**
 * Standalone AI prompt test runner — hits Ollama or Gemini directly with the
 * same system prompt + fake project context used in production.
 *
 * Usage: npx tsx test-ai-prompts.ts [--verbose] [--filter=keyword] [--provider=ollama|gemini]
 *
 * Requires:
 *   ollama: Ollama running on $OLLAMA_HOST or localhost:11434
 *   gemini: GEMINI_API_KEY env var set
 */

const PROVIDER = (process.argv.find(a => a.startsWith('--provider='))?.split('=')[1] || 'ollama') as 'ollama' | 'gemini';

// Ollama config
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
const OLLAMA_BASE_URL = OLLAMA_HOST.startsWith('http') ? OLLAMA_HOST : `http://${OLLAMA_HOST}`;

// Gemini config
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.AI_MODEL || 'gemini-2.5-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const VERBOSE = process.argv.includes('--verbose');
const FILTER = process.argv.find(a => a.startsWith('--filter='))?.split('=')[1]?.toLowerCase();

// ── System Prompt (synced with AIService.ts) ─────────────────────────────

const SYSTEM_PROMPT = `You are Dev Codex AI, a terminal assistant for project management. Date: 03-20-2026.

═══ RESPONSE FORMAT ═══
Always respond with valid JSON: {"message":"...","actions":[...],"followUp":"","intent":"..."}
Every action needs: {"type":"...","summary":"...","command":"...","icon":"🔧"}
Use SINGLE QUOTES in command flag values. Double quotes break JSON.

═══ WHEN TO USE ACTIONS vs MESSAGE ═══
- QUESTIONS about project data (status, list, show, what, how many): Answer ONLY in "message" using PROJECT CONTEXT data. Reference items by #index. actions MUST be [].
- REQUESTS to create/edit/delete/update something: Put slash commands in "actions".
- There are NO read/view/list/show commands. If the user says "list", "show", or "what are my", answer in "message" — do NOT put anything in actions.

═══ ALLOWED COMMANDS (use ONLY these — never invent commands) ═══

CREATE:
  /add todo --title='text' --priority=low|medium|high --status=not_started|in_progress|blocked --due='MM-DD-YYYY' --content='text'
  /add subtask --parent='[# or title]' --title='text' --priority=low|medium|high --status=not_started|in_progress|blocked --due='MM-DD-YYYY'
  /add note --title='text' --content='text'
  /add devlog --title='text' --content='text'
  /add feature --group='name' --category=frontend|backend|database|infrastructure|security|api|documentation|asset --type=page|service|hook|middleware|util|endpoint|component --title='title' --content='desc'
  /add stack --name='name' --category=framework|api|database|devops|testing|language|library|tool --version=x.x.x --description='optional'
  /add relationship --source='name' --target='name' --type=uses|depends_on
  /add tag 'name'
  /add idea --title='text' --description='text' --content='text'
  /add project --name='text' --description='text' --category=web|mobile|api|cli|library|game|other --color=#hex

UPDATE:  /complete '#' | /push '#' | /assign '#' 'email'
EDIT:    /edit todo|note|devlog|feature|idea '#' --title='text' --content='text' (+ --priority=, --status=, --due=, --category=, --type=)
         /edit subtask 'parent#' 'subtask#' --title='text' --status=
DELETE:  /delete todo|note|devlog|feature|idea|subtask '#' --confirm
REMOVE:  /remove stack --name='name' | /remove tag 'name'
SETTINGS:/set name|description 'value' | /set deployment --url= --github= --platform= --status= --branch= --build= --start= | /set public --enabled=true|false --slug=

STOP: These are the ONLY commands. /todos, /tasks, /list, /view, /show, /help, /status DO NOT EXIST and will fail. Never put them in actions.

═══ RULES ═══
1. ACT DECISIVELY — if you have enough info, propose actions immediately. Reference items by their # index from PROJECT CONTEXT.
2. The "command" field must contain an exact command from the list above with real values filled in.
3. Only include flags the user mentioned or that are required. Don't pad with defaults.
4. followUp: empty string when actions are complete. Only ask when you're missing critical info to build the command.
5. QUERIES: When the user asks about their data ("list my todos", "show notes", "what's my status"), answer from PROJECT CONTEXT in "message" with #indexes. actions MUST be []. Never say "no tasks" if todos exist.
6. Batch ALL changes the user mentions — if they say "finished X, mark Y done", create a devlog AND complete the todo. Don't skip implicit actions.
7. CLEANUP: When asked to clean up ANY entity type, identify test/outdated/duplicate items by # and propose /delete commands with --confirm. If unsure, ask which #s to remove.
8. Ideas are NOT features. /add idea is for personal brainstorm items. /add feature is for project architecture.
9. Dates: MM-DD-YYYY with dashes only. Never past dates.
10. If no project is selected, suggest /swap to pick one before adding data.
11. Be concise — you're a terminal tool, not a chatbot.

If the user asks about things completely unrelated to software/projects/development: "I'm built for dev work — what are you building?"

═══ EXAMPLES ═══

User: "add a todo to fix auth"
{"message":"Adding that.","actions":[{"type":"todo_add","summary":"Add auth todo","command":"/add todo --title='Fix auth'","icon":"✅"}],"followUp":"","intent":"create"}

User: "finished the login page, used JWT"
{"message":"Nice — logging that and updating status.","actions":[{"type":"devlog_add","summary":"Add devlog entry","command":"/add devlog --title='Completed login page' --content='Implemented login with JWT authentication'","icon":"📝"},{"type":"todo_update","summary":"Mark login todo done","command":"/complete '2'","icon":"✅"},{"type":"stack_add","summary":"Add JWT to stack","command":"/add stack --name='JWT' --category=library","icon":"📦"}],"followUp":"","intent":"update"}

User: "clean up my todos, delete the test ones"
{"message":"Cleaning up — removing test/duplicate todos.","actions":[{"type":"todo_delete","summary":"Delete 'test subtask'","command":"/delete todo '3' --confirm","icon":"🗑️"},{"type":"todo_delete","summary":"Delete 'Test tracking'","command":"/delete todo '4' --confirm","icon":"🗑️"},{"type":"todo_delete","summary":"Delete 'Test tracking2'","command":"/delete todo '5' --confirm","icon":"🗑️"}],"followUp":"","intent":"delete"}

User: "what's my project status?"
{"message":"You have 19 todos: 1 in progress (#11 Setup auth system), 18 not started. 9 are high priority including #1 Set up Production Keys (overdue), #12 Build recipe CRUD, #14 Finish AI integration. You also have 3 notes, 4 devlog entries, and 17 features mapped.","actions":[],"followUp":"","intent":"query"}

User: "what notes do I have?"
{"message":"You have 3 notes: #1 API Design (REST endpoints), #2 Auth Strategy (Passport + JWT), #3 old brainstorm (outdated).","actions":[],"followUp":"","intent":"query"}

User: "list all my todos"
{"message":"You have 10 todos: #1 Build recipe CRUD API (in progress, high), #2 Set up auth (not started, high), #3 Add search/filter (medium), #8 Deploy to Railway (high, due 04/01). 1 blocked: #9 email notifications. 1 completed: #7 project structure.","actions":[],"followUp":"","intent":"query"}

User: "I have an idea for a mobile companion app"
{"message":"Saving that idea.","actions":[{"type":"idea_add","summary":"Add mobile app idea","command":"/add idea --title='Mobile companion app' --description='Companion mobile app for the platform'","icon":"💡"}],"followUp":"","intent":"create"}

User: "clean up my notes, features and todos — remove test data"
{"message":"Removing test/outdated items across all three.","actions":[{"type":"todo_delete","summary":"Delete test todo #5","command":"/delete todo '5' --confirm","icon":"🗑️"},{"type":"todo_delete","summary":"Delete test todo #6","command":"/delete todo '6' --confirm","icon":"🗑️"},{"type":"note_delete","summary":"Delete outdated note #3","command":"/delete note '3' --confirm","icon":"🗑️"},{"type":"feature_delete","summary":"Delete deprecated feature #7","command":"/delete feature '7' --confirm","icon":"🗑️"}],"followUp":"","intent":"delete"}

User: "add a feature for payments"
{"message":"What part of payments? Frontend page, backend service, API endpoint, or full stack?","actions":[],"followUp":"What type and category? (e.g. backend/service, frontend/page)","intent":"create"}

User: "suggest some features I should add"
{"message":"Based on your project, here are features you're missing:","actions":[{"type":"feature_add","summary":"Add API Gateway middleware","command":"/add feature --group='API' --category=backend --type=middleware --title='API Gateway' --content='Rate limiting, auth, request validation'","icon":"🔒"},{"type":"feature_add","summary":"Add Settings Page","command":"/add feature --group='User Management' --category=frontend --type=page --title='Settings Page' --content='User preferences and account settings'","icon":"⚙️"}],"followUp":"","intent":"create"}`;

// ── Fake Project Context (covers every entity type) ──────────────────────

const PROJECT_CONTEXT = `## Current Project: RecipeHub
A full-stack recipe sharing platform with social features.
Tags: react, node, mongodb, typescript

### Todos (use # index for commands)
#1 [in_progress] (high) "Build recipe CRUD API" due:04/15/2026
  #1.1 [not_started] "Add image upload endpoint"
  #1.2 [completed] "Define Mongoose schema"
#2 [not_started] (high) "Set up auth with Passport"
#3 [not_started] (medium) "Add search/filter for recipes"
#4 [not_started] (low) "Write unit tests for recipe service"
#5 [not_started] (medium) "test placeholder todo"
#6 [not_started] (low) "another test todo"
#7 [completed] (medium) "Set up project structure"
#8 [not_started] (high) "Deploy to Railway" due:04/01/2026
#9 [blocked] (medium) "Add email notifications"
#10 [not_started] (low) "Add dark mode"

### Notes (4)
#1 "API Design" — REST endpoints: /recipes, /users, /reviews. Using Express Router with versioned paths /api/v1/
#2 "Auth Strategy" — Passport.js with JWT + Google OAuth. Refresh tokens stored in httpOnly cookies.
#3 "old brainstorm" — initial ideas from january, mostly outdated now
#4 "Deployment Checklist" — Railway setup, env vars, MongoDB Atlas connection string, domain config

### Dev Log (5, showing recent)
#1 03/19/2026: "Added recipe model" — Mongoose schema with validation, indexes on title and tags
#2 03/18/2026: "Project scaffolding" — Express + TypeScript setup, folder structure, ESLint config
#3 03/17/2026: "Initial planning" — Defined MVP scope: recipes, users, reviews
#4 03/15/2026: "Research phase" — Evaluated Prisma vs Mongoose, chose Mongoose for flexibility
#5 03/10/2026: "old test log entry" — testing devlog functionality

### Features (8)
#1 frontend/page: "Recipe List Page" [Recipes] — Browse all recipes with search and filters
#2 frontend/page: "Recipe Detail Page" [Recipes] — View recipe with ingredients, steps, reviews
#3 frontend/component: "Recipe Card" [Recipes] — Thumbnail card used in list and discover views
#4 backend/service: "Recipe Service" [Recipes] — CRUD operations, search, pagination
#5 backend/middleware: "Auth Middleware" [Auth] — JWT verification, role-based access
#6 backend/endpoint: "User API" [Users] — Registration, login, profile management
#7 frontend/page: "Old Admin Page" [Admin] — Deprecated, replaced by new dashboard
#8 database/util: "Seed Script" [Dev] — Populate DB with sample recipes for testing

### Tech Stack
- React (framework) v18.2.0
- Express (framework) v4.18.0
- MongoDB (database)
- TypeScript (language) v5.3.0
- Tailwind CSS (library) v3.4.0
- Jest (testing)
- Passport.js (library)
- jQuery (library) v3.6.0

### Deployment
URL: https://recipehub.railway.app
Repo: https://github.com/user/recipehub
Platform: Railway
Status: inactive
Branch: main
Build: npm run build
Start: npm start

### Relationships
- "Recipe Service" uses "Auth Middleware"
- "Recipe List Page" depends_on "Recipe Service"
- "Recipe Detail Page" depends_on "Recipe Service"

### Ideas (3)
#1 "Meal planner" — weekly drag-and-drop meal calendar
#2 "Shopping list generator" — auto-generate grocery list from selected recipes
#3 "old idea" — test idea from initial setup`;

// ── Gemini Response Schema (mirrored from AIService.ts) ──────────────────

const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    message:  { type: 'STRING', description: 'Brief response (1-3 sentences)' },
    actions:  {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type:    { type: 'STRING', description: 'Action category (e.g. todo_add, devlog_add, todo_delete)' },
          summary: { type: 'STRING', description: 'Human-readable description of what this action does' },
          command: { type: 'STRING', description: 'Exact slash command to execute (e.g. /add todo, /delete todo, /complete)' },
          icon:    { type: 'STRING', description: 'Single emoji icon' },
        },
        required: ['type', 'summary', 'command', 'icon'],
      },
    },
    followUp: { type: 'STRING', description: 'Follow-up question if critical info is missing. Empty string if complete.', nullable: true },
    intent:   { type: 'STRING', description: 'One of: update, query, create, analyze, plan, scaffold, edit, delete', enum: ['update', 'query', 'create', 'analyze', 'plan', 'scaffold', 'edit', 'delete'] },
  },
  required: ['message', 'actions', 'followUp', 'intent'],
};

// ── Test Cases ───────────────────────────────────────────────────────────

interface TestCase {
  name: string;
  prompt: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  expect: {
    hasActions?: boolean;
    minActions?: number;
    maxActions?: number;
    noActions?: boolean;
    hasFollowUp?: boolean;
    noFollowUp?: boolean;
    /** At least one command must start with this */
    commandPrefix?: string;
    /** At least one command must contain this */
    commandContains?: string;
    /** message must contain (case-insensitive) */
    messageContains?: string;
    messageNotContains?: string;
    custom?: (r: any) => string | null;
  };
}

/** Helper: check if a command uses a valid prefix (parser accepts /remove as alias for /delete) */
const VALID_CMD_PREFIXES = [
  '/add ', '/edit ', '/delete ', '/remove ', '/complete ', '/push ', '/assign ', '/set ',
];
function isValidCommand(cmd: string): boolean {
  return VALID_CMD_PREFIXES.some(p => cmd.startsWith(p));
}

/** Helper: check if command is a delete-type command (parser accepts both /delete and /remove for entities) */
function isDeleteCommand(cmd: string, entity: string): boolean {
  return cmd.startsWith(`/delete ${entity}`) || cmd.startsWith(`/remove ${entity}`);
}

const TESTS: TestCase[] = [
  // ── CREATES (one per entity) ──────────────────────────────────────────

  {
    name: 'create: todo',
    prompt: 'add a todo to implement recipe search with filters',
    expect: { hasActions: true, commandPrefix: '/add todo' },
  },
  {
    name: 'create: note',
    prompt: 'add a note about our caching strategy using Redis for session storage',
    expect: { hasActions: true, commandPrefix: '/add note' },
  },
  {
    name: 'create: devlog',
    prompt: 'log that I finished the recipe CRUD endpoints today with full validation',
    expect: { hasActions: true, commandPrefix: '/add devlog' },
  },
  {
    name: 'create: feature',
    prompt: 'add a backend service feature for recipe image processing',
    expect: { hasActions: true, commandPrefix: '/add feature' },
  },
  {
    name: 'create: stack entry',
    prompt: 'add Redis to the tech stack, version 7.2',
    expect: { hasActions: true, commandPrefix: '/add stack' },
  },
  {
    name: 'create: tag',
    prompt: 'add a tag called "fullstack"',
    expect: { hasActions: true, commandPrefix: '/add tag' },
  },
  {
    name: 'create: relationship',
    prompt: 'add a relationship: Recipe List Page uses Recipe Card',
    expect: { hasActions: true, commandPrefix: '/add relationship' },
  },
  {
    name: 'create: idea',
    prompt: 'I have an idea for a recipe import feature that parses URLs from cooking blogs',
    expect: { hasActions: true, commandPrefix: '/add idea' },
  },
  {
    name: 'create: subtask',
    prompt: 'add a subtask under todo #3 to design the filter UI mockup',
    expect: { hasActions: true, commandPrefix: '/add subtask' },
  },
  {
    name: 'create: project',
    prompt: 'create a new project called PortfolioSite, a personal portfolio, category web',
    expect: { hasActions: true, commandPrefix: '/add project' },
  },

  // ── QUERIES (per entity + overview) ───────────────────────────────────

  {
    name: 'query: project status overview',
    prompt: "what's my project status?",
    expect: { noActions: true, messageContains: 'todo' },
  },
  {
    name: 'query: todos',
    prompt: 'what are my high priority todos?',
    expect: { noActions: true, messageContains: '#' },
  },
  {
    name: 'query: notes',
    prompt: 'what notes do I have?',
    expect: { noActions: true, messageContains: 'note' },
  },
  {
    name: 'query: features',
    prompt: 'how many features do I have mapped?',
    expect: { noActions: true, messageContains: '8' },
  },
  {
    name: 'query: stack',
    prompt: 'what tech stack am I using?',
    expect: {
      noActions: true,
      custom: (r) => {
        const msg = r.message.toLowerCase();
        // Should mention at least 2 stack items from context
        const stackItems = ['react', 'express', 'mongodb', 'typescript', 'tailwind', 'jest', 'passport', 'jquery'];
        const found = stackItems.filter(s => msg.includes(s));
        return found.length >= 2 ? null : `Expected 2+ stack items in message, found: ${found.join(', ')}`;
      },
    },
  },
  {
    name: 'query: deployment',
    prompt: "what's my deployment status?",
    expect: {
      noActions: true,
      custom: (r) => {
        const msg = r.message.toLowerCase();
        // Should mention inactive or railway or the URL — any deployment detail
        const hasInfo = msg.includes('inactive') || msg.includes('railway') || msg.includes('recipehub');
        return hasInfo ? null : `Expected deployment info in message. Got: "${r.message.slice(0, 100)}"`;
      },
    },
  },
  {
    name: 'query: devlog',
    prompt: 'show me recent dev log entries',
    expect: {
      noActions: true,
      custom: (r) => {
        const msg = r.message;
        // Should mention at least one devlog entry by # or title
        const hasRef = msg.includes('#') || msg.toLowerCase().includes('recipe model') || msg.toLowerCase().includes('scaffolding');
        return hasRef ? null : `Expected devlog references in message. Got: "${msg.slice(0, 100)}"`;
      },
    },
  },
  {
    name: 'query: ideas',
    prompt: 'what ideas do I have saved?',
    expect: { noActions: true, messageContains: 'idea' },
  },

  // ── EDITS ─────────────────────────────────────────────────────────────

  {
    name: 'edit: todo priority',
    prompt: 'change todo #3 priority to high',
    expect: { hasActions: true, commandPrefix: '/edit todo' },
  },
  {
    name: 'edit: note content',
    prompt: 'update note #2 content to say we switched to session-based auth',
    expect: { hasActions: true, commandPrefix: '/edit note' },
  },
  {
    name: 'edit: feature title',
    prompt: 'rename feature #7 to "Dashboard Page"',
    expect: { hasActions: true, commandPrefix: '/edit feature' },
  },
  {
    name: 'edit: idea',
    prompt: 'update idea #1 description to include drag and drop with dnd-kit',
    expect: { hasActions: true, commandPrefix: '/edit idea' },
  },

  // ── UPDATES (complete/push) ───────────────────────────────────────────

  {
    name: 'update: complete todo',
    prompt: 'mark todo #1 as done',
    expect: { hasActions: true, commandContains: '/complete' },
  },
  {
    name: 'update: push todo',
    prompt: 'push todo #8 forward',
    expect: { hasActions: true, commandContains: '/push' },
  },

  // ── DELETES (per entity) ──────────────────────────────────────────────

  {
    name: 'delete: todo by #',
    prompt: 'delete todo #5',
    expect: {
      hasActions: true,
      custom: (r) => {
        const has = r.actions.some((a: any) => isDeleteCommand(a.command, 'todo'));
        return has ? null : `Expected /delete todo or /remove todo. Got: ${r.actions.map((a: any) => a.command).join(', ')}`;
      },
    },
  },
  {
    name: 'delete: note by #',
    prompt: 'delete note #3',
    expect: {
      hasActions: true,
      custom: (r) => {
        const has = r.actions.some((a: any) => isDeleteCommand(a.command, 'note'));
        return has ? null : `Expected /delete note or /remove note. Got: ${r.actions.map((a: any) => a.command).join(', ')}`;
      },
    },
  },
  {
    name: 'delete: devlog by #',
    prompt: 'delete devlog #5',
    expect: {
      hasActions: true,
      custom: (r) => {
        const has = r.actions.some((a: any) => isDeleteCommand(a.command, 'devlog'));
        return has ? null : `Expected /delete devlog or /remove devlog. Got: ${r.actions.map((a: any) => a.command).join(', ')}`;
      },
    },
  },
  {
    name: 'delete: feature by #',
    prompt: 'delete feature #7',
    expect: {
      hasActions: true,
      custom: (r) => {
        const has = r.actions.some((a: any) => isDeleteCommand(a.command, 'feature'));
        return has ? null : `Expected /delete feature or /remove feature. Got: ${r.actions.map((a: any) => a.command).join(', ')}`;
      },
    },
  },
  {
    name: 'delete: idea by #',
    prompt: 'delete idea #3',
    expect: {
      hasActions: true,
      custom: (r) => {
        const has = r.actions.some((a: any) => isDeleteCommand(a.command, 'idea'));
        return has ? null : `Expected /delete idea or /remove idea. Got: ${r.actions.map((a: any) => a.command).join(', ')}`;
      },
    },
  },
  {
    name: 'remove: stack entry',
    prompt: 'remove jQuery from the tech stack',
    expect: { hasActions: true, commandPrefix: '/remove stack' },
  },
  {
    name: 'remove: tag',
    prompt: 'remove the tag "react"',
    expect: { hasActions: true, commandPrefix: '/remove tag' },
  },

  // ── CLEANUP (per entity — should identify candidates or ask) ──────────

  {
    name: 'cleanup: todos',
    prompt: 'clean up my todos, get rid of the test ones',
    expect: {
      hasActions: true,
      custom: (r) => {
        const deletes = r.actions.filter((a: any) => isDeleteCommand(a.command || '', 'todo'));
        return deletes.length >= 2 ? null : `Expected 2+ todo deletes, got ${deletes.length}`;
      },
    },
  },
  {
    name: 'cleanup: notes',
    prompt: 'review my notes and suggest which ones to remove',
    expect: {
      custom: (r) => {
        const hasDeletes = r.actions.some((a: any) => isDeleteCommand(a.command || '', 'note'));
        const asksWhich = r.followUp && r.followUp.length > 0;
        const mentionsItems = r.message.includes('#');
        return (hasDeletes || asksWhich || mentionsItems) ? null : 'Should propose deletes, ask which to remove, or reference items by #';
      },
    },
  },
  {
    name: 'cleanup: features',
    prompt: 'clean up outdated features',
    expect: {
      custom: (r) => {
        const hasDeletes = r.actions.some((a: any) => isDeleteCommand(a.command || '', 'feature'));
        const asksWhich = r.followUp && r.followUp.length > 0;
        return (hasDeletes || asksWhich) ? null : 'Should propose feature deletes or ask';
      },
    },
  },
  {
    name: 'cleanup: devlog',
    prompt: 'clean up my dev log, remove any test entries',
    expect: {
      hasActions: true,
      custom: (r) => {
        const has = r.actions.some((a: any) => isDeleteCommand(a.command || '', 'devlog'));
        return has ? null : `Expected devlog delete. Got: ${r.actions.map((a: any) => a.command).join(', ')}`;
      },
    },
  },
  {
    name: 'cleanup: stack',
    prompt: 'clean up my tech stack, jQuery is outdated and we dont use it',
    expect: { hasActions: true, commandPrefix: '/remove stack' },
  },

  // ── SUGGESTIONS ───────────────────────────────────────────────────────

  {
    name: 'suggest: features',
    prompt: 'suggest some features I should add based on my project',
    expect: { hasActions: true, commandPrefix: '/add feature', minActions: 2 },
  },
  {
    name: 'suggest: todos',
    prompt: 'suggest what I should work on next',
    expect: {
      custom: (r) => {
        // Should reference project items by # or suggest actions
        const msg = r.message;
        const hasRef = msg.includes('#') || r.actions.length > 0;
        return hasRef ? null : `Expected # references or action suggestions. Got: "${msg.slice(0, 100)}"`;
      },
    },
  },

  // ── MULTI-ENTITY (2+ types in one prompt) ─────────────────────────────

  {
    name: 'multi: clean notes + features + todos',
    prompt: 'I want to clean up my notes, features and todos — remove anything that looks like test data or is outdated',
    expect: {
      hasActions: true,
      minActions: 3,
      custom: (r) => {
        const types = new Set(r.actions.map((a: any) => {
          const cmd = (a.command || '') as string;
          if (cmd.includes('todo')) return 'todo';
          if (cmd.includes('note')) return 'note';
          if (cmd.includes('feature')) return 'feature';
          return 'other';
        }));
        return types.size >= 2 ? null : `Expected 2+ entity types in actions, got: ${[...types].join(', ')}`;
      },
    },
  },
  {
    name: 'multi: devlog + complete',
    prompt: 'finished the auth system today using Passport.js, mark todo #2 as done',
    expect: {
      hasActions: true,
      custom: (r) => {
        const cmds = r.actions.map((a: any) => a.command || '').join(' ');
        const hasComplete = cmds.includes('/complete');
        return hasComplete ? null : `Expected at least /complete. Got: ${cmds}`;
      },
    },
  },
  {
    name: 'multi: feature + relationship',
    prompt: 'add a frontend component called Review Card in the Reviews group, and it depends on Recipe Service',
    expect: {
      hasActions: true,
      custom: (r) => {
        const cmds = r.actions.map((a: any) => a.command || '').join(' ');
        const hasFeature = cmds.includes('/add feature');
        return hasFeature ? null : `Expected at least /add feature. Got: ${cmds}`;
      },
    },
  },
  {
    name: 'multi: deployment update',
    prompt: 'update deployment: we moved to Vercel, new url is recipehub.vercel.app, status is active',
    expect: { hasActions: true, commandPrefix: '/set deployment' },
  },

  // ── SETTINGS ──────────────────────────────────────────────────────────

  {
    name: 'settings: rename project',
    prompt: "rename the project to 'RecipeHub Pro'",
    expect: { hasActions: true, commandPrefix: '/set name' },
  },
  {
    name: 'settings: make public',
    prompt: 'make my project public with slug recipe-hub',
    expect: { hasActions: true, commandPrefix: '/set public' },
  },

  // ── FOLLOW-UPS ────────────────────────────────────────────────────────

  {
    name: 'follow-up: yes after ambiguous',
    prompt: 'yes',
    history: [
      { role: 'user', content: 'add a feature for payments' },
      { role: 'assistant', content: '{"message":"What part of payments?","actions":[],"followUp":"What type and category?","intent":"create"}' },
      { role: 'user', content: 'backend service' },
    ],
    expect: { hasActions: true, commandPrefix: '/add feature' },
  },

  // ── OFF-TOPIC ─────────────────────────────────────────────────────────

  {
    name: 'off-topic: weather',
    prompt: "what's the weather like today?",
    expect: {
      noActions: true,
      custom: (r) => {
        const msg = r.message.toLowerCase();
        // Should refuse — either with the dev work phrase or a generic "can't help with that"
        const refuses = msg.includes('dev') || msg.includes('built for') || msg.includes("don't have") || msg.includes("can't") || msg.includes('not');
        return refuses ? null : `Expected off-topic rejection. Got: "${r.message.slice(0, 100)}"`;
      },
    },
  },

  // ── EDGE CASES ────────────────────────────────────────────────────────

  {
    name: 'edge: no invented commands',
    prompt: 'list all my todos',
    expect: {
      custom: (r) => {
        // Should answer from context in message, not propose invented commands
        const cmds = (r.actions || []).map((a: any) => a.command || '');
        for (const cmd of cmds) {
          if (!isValidCommand(cmd)) return `Invented command: "${cmd.slice(0, 40)}"`;
        }
        // If it has actions, they should all be valid. If no actions, message should have content.
        if (cmds.length === 0 && (!r.message || r.message.length < 10)) {
          return 'No actions and empty message';
        }
        return null;
      },
    },
  },
  {
    name: 'edge: single quotes in commands',
    prompt: "add a todo called 'Fix the login bug' with high priority",
    expect: {
      hasActions: true,
      custom: (r) => {
        for (const a of r.actions) {
          const cmd = a.command as string;
          const flagValues = cmd.match(/--\w+="[^"]*"/g);
          if (flagValues) return `Double quotes in flag values: ${flagValues.join(', ')}`;
        }
        return null;
      },
    },
  },
];

// ── No-Context Tests ─────────────────────────────────────────────────────
// No-project check is handled by the app layer before AI is called, so no tests needed here.

const NO_CONTEXT_TESTS: TestCase[] = [];

// ── Runner ───────────────────────────────────────────────────────────────

interface TestResult {
  name: string;
  pass: boolean;
  errors: string[];
  raw?: string;
  parsed?: any;
  elapsed?: number;
}

function validateResponse(parsed: any): string[] {
  const errors: string[] = [];

  if (typeof parsed.message !== 'string') errors.push('missing/invalid "message" field');
  if (!Array.isArray(parsed.actions)) errors.push('missing/invalid "actions" array');
  if (parsed.followUp !== undefined && parsed.followUp !== null && typeof parsed.followUp !== 'string') {
    errors.push('"followUp" must be string or null');
  }

  const REQUIRED_ACTION_FIELDS = ['type', 'summary', 'command', 'icon'];

  for (const [i, action] of (parsed.actions || []).entries()) {
    for (const field of REQUIRED_ACTION_FIELDS) {
      if (!action[field]) errors.push(`action[${i}] missing "${field}"`);
    }
    if (action.command) {
      if (!isValidCommand(action.command)) {
        errors.push(`action[${i}] invalid command: "${(action.command as string).slice(0, 40)}"`);
      }
    }
  }

  return errors;
}

async function runTest(test: TestCase, includeContext: boolean): Promise<TestResult> {
  const result: TestResult = { name: test.name, pass: false, errors: [] };
  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  if (includeContext) {
    messages.push({ role: 'system', content: `[PROJECT CONTEXT]\n${PROJECT_CONTEXT}` });
  } else {
    messages.push({
      role: 'system',
      content: '[PROJECT CONTEXT]\nNo project selected. The user can switch with /swap. Available projects:\n- "RecipeHub" (web) — A full-stack recipe sharing platform\n- "PortfolioSite" (web) — Personal portfolio\n\nSuggest /swap "[project name]" if the user mentions a specific project.',
    });
  }

  if (test.history) {
    messages.push(...test.history);
  }

  messages.push({ role: 'user', content: test.prompt });

  const start = Date.now();
  try {
    let url: string;
    let fetchBody: string;
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (PROVIDER === 'gemini') {
      url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      // Separate system messages from user/assistant messages
      const systemParts = messages.filter(m => m.role === 'system').map(m => m.content);
      const chatMessages = messages.filter(m => m.role !== 'system');
      fetchBody = JSON.stringify({
        system_instruction: { parts: [{ text: systemParts.join('\n\n') }] },
        contents: chatMessages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json',
          responseSchema: GEMINI_RESPONSE_SCHEMA,
        },
      });
    } else {
      url = `${OLLAMA_BASE_URL}/v1/chat/completions`;
      fetchBody = JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: fetchBody,
      signal: AbortSignal.timeout(120_000),
    });

    result.elapsed = Date.now() - start;

    if (!res.ok) {
      result.errors.push(`HTTP ${res.status}: ${await res.text()}`);
      return result;
    }

    const data = await res.json();
    const raw = PROVIDER === 'gemini'
      ? (data.candidates?.[0]?.content?.parts?.[0]?.text || '')
      : (data.choices?.[0]?.message?.content || '');
    result.raw = raw;

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* fall through */ }
      }
      if (!parsed) {
        result.errors.push('Failed to parse JSON response');
        return result;
      }
    }
    result.parsed = parsed;

    // Schema validation
    result.errors.push(...validateResponse(parsed));

    // Test-specific assertions
    const e = test.expect;
    const actions = parsed.actions || [];

    if (e.hasActions && actions.length === 0) result.errors.push('Expected actions but got none');
    if (e.noActions && actions.length > 0) result.errors.push(`Expected no actions but got ${actions.length}`);
    if (e.minActions && actions.length < e.minActions) result.errors.push(`Expected min ${e.minActions} actions, got ${actions.length}`);
    if (e.maxActions && actions.length > e.maxActions) result.errors.push(`Expected max ${e.maxActions} actions, got ${actions.length}`);

    if (e.hasFollowUp && (!parsed.followUp || parsed.followUp.length === 0)) result.errors.push('Expected followUp but got empty');
    if (e.noFollowUp && parsed.followUp && parsed.followUp.length > 0) result.errors.push(`Expected no followUp but got: "${parsed.followUp}"`);

    if (e.commandPrefix) {
      const found = actions.some((a: any) => a.command?.startsWith(e.commandPrefix!));
      if (!found) result.errors.push(`No action starts with "${e.commandPrefix}". Got: ${actions.map((a: any) => a.command).join(', ')}`);
    }

    if (e.commandContains) {
      const found = actions.some((a: any) => a.command?.includes(e.commandContains!));
      if (!found) result.errors.push(`No action contains "${e.commandContains}". Got: ${actions.map((a: any) => a.command).join(', ')}`);
    }

    if (e.messageContains) {
      if (!parsed.message?.toLowerCase().includes(e.messageContains.toLowerCase())) {
        result.errors.push(`Message missing "${e.messageContains}". Got: "${parsed.message?.slice(0, 100)}"`);
      }
    }

    if (e.messageNotContains) {
      if (parsed.message?.toLowerCase().includes(e.messageNotContains.toLowerCase())) {
        result.errors.push(`Message should NOT contain "${e.messageNotContains}"`);
      }
    }

    if (e.custom) {
      const customErr = e.custom(parsed);
      if (customErr) result.errors.push(customErr);
    }

    result.pass = result.errors.length === 0;
  } catch (err: any) {
    result.elapsed = Date.now() - start;
    if (err.name === 'TimeoutError') {
      result.errors.push('Request timed out (120s)');
    } else {
      result.errors.push(`Fetch error: ${err.message}`);
    }
  }

  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const modelName = PROVIDER === 'gemini' ? GEMINI_MODEL : OLLAMA_MODEL;

  if (PROVIDER === 'gemini') {
    if (!GEMINI_API_KEY) {
      console.error('✗ GEMINI_API_KEY env var not set');
      process.exit(1);
    }
    // Quick connectivity check
    try {
      const healthRes = await fetch(`${GEMINI_BASE_URL}/models/${GEMINI_MODEL}?key=${GEMINI_API_KEY}`, { signal: AbortSignal.timeout(10_000) });
      if (!healthRes.ok) throw new Error(`HTTP ${healthRes.status}`);
      console.log(`✓ Gemini API reachable — model: ${GEMINI_MODEL}\n`);
    } catch (err: any) {
      console.error(`✗ Cannot reach Gemini API: ${err.message}`);
      process.exit(1);
    }
  } else {
    try {
      const healthRes = await fetch(`${OLLAMA_BASE_URL}/v1/models`, { signal: AbortSignal.timeout(5000) });
      if (!healthRes.ok) throw new Error(`HTTP ${healthRes.status}`);
      console.log(`✓ Ollama reachable at ${OLLAMA_BASE_URL} — model: ${OLLAMA_MODEL}\n`);
    } catch (err: any) {
      console.error(`✗ Cannot reach Ollama at ${OLLAMA_BASE_URL}: ${err.message}`);
      console.error('  Make sure Ollama is running and OLLAMA_HOST is set correctly.');
      process.exit(1);
    }
  }

  let tests = TESTS;
  let noCtxTests = NO_CONTEXT_TESTS;
  if (FILTER) {
    tests = tests.filter(t => t.name.toLowerCase().includes(FILTER));
    noCtxTests = noCtxTests.filter(t => t.name.toLowerCase().includes(FILTER));
  }

  const total = tests.length + noCtxTests.length;
  console.log(`Running ${total} tests against ${modelName} (${PROVIDER})...\n`);

  const results: TestResult[] = [];
  let completed = 0;

  for (const test of tests) {
    const result = await runTest(test, true);
    results.push(result);
    completed++;

    const icon = result.pass ? '✅' : '❌';
    const time = result.elapsed ? ` (${(result.elapsed / 1000).toFixed(1)}s)` : '';
    console.log(`[${completed}/${total}] ${icon} ${result.name}${time}`);

    if (!result.pass) {
      for (const err of result.errors) console.log(`       ↳ ${err}`);
    }
    if (VERBOSE && result.parsed) {
      console.log(`       msg: "${result.parsed.message?.slice(0, 120)}"`);
      if (result.parsed.actions?.length > 0) {
        console.log(`       actions: ${result.parsed.actions.map((a: any) => a.command).join(' | ')}`);
      }
      if (result.parsed.followUp) console.log(`       followUp: "${result.parsed.followUp}"`);
    }
  }

  for (const test of noCtxTests) {
    const result = await runTest(test, false);
    results.push(result);
    completed++;

    const icon = result.pass ? '✅' : '❌';
    const time = result.elapsed ? ` (${(result.elapsed / 1000).toFixed(1)}s)` : '';
    console.log(`[${completed}/${total}] ${icon} ${result.name}${time}`);

    if (!result.pass) {
      for (const err of result.errors) console.log(`       ↳ ${err}`);
    }
    if (VERBOSE && result.parsed) {
      console.log(`       msg: "${result.parsed.message?.slice(0, 120)}"`);
    }
  }

  // Summary
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const totalTime = results.reduce((s, r) => s + (r.elapsed || 0), 0);

  console.log('\n' + '═'.repeat(60));
  console.log(`Results: ${passed}/${total} passed, ${failed} failed`);
  console.log(`Total time: ${(totalTime / 1000).toFixed(1)}s (avg ${(totalTime / total / 1000).toFixed(1)}s/test)`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    for (const r of results.filter(r => !r.pass)) {
      console.log(`  ❌ ${r.name}`);
      for (const err of r.errors) console.log(`     ↳ ${err}`);
    }
  }

  const report = results.map(r => ({
    name: r.name,
    pass: r.pass,
    errors: r.errors,
    elapsed: r.elapsed,
    response: r.parsed || null,
    raw: r.pass ? undefined : r.raw,
  }));
  const reportPath = `logs/ai-test-results-${PROVIDER}.json`;
  const { mkdir, writeFile } = await import('fs/promises');
  await mkdir('logs', { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nDetailed results: ${reportPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
