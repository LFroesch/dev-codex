
"# Project Management Terminal - LLM Guide

## 🤖 AI-Assisted Workflow (BYOK - Bring Your Own Key)

**This terminal is not directly connected to AI.** Instead, this guide enables a collaborative async workflow:

1. **User provides context** → User runs \`/summary prompt\` or \`/search "query"\` to gather project data
2. **User brings data + guide to AI** → User copies the output and pastes it into their AI chat (ChatGPT, Claude, etc.) along with this guide
3. **AI generates commands** → AI analyzes the request and generates terminal commands following this guide's syntax
4. **User executes commands** → User copy/pastes the AI-generated commands back into the terminal
5. **Repeat** → User brings new results back to AI for further assistance

**Key Commands for AI Context:**
- \`/summary prompt\` - Generate full AI-friendly project context
- \`/summary prompt todos\` - Export only todos for AI
- \`/summary prompt components\` - Export architecture/components for AI
- \`/search "keyword"\` - Find specific items across all entities before editing/deleting

**Example Workflow:**
\`\`\`
User: [Runs /summary prompt in terminal]
User: [Copies output + this guide to ChatGPT]
User: "I need to add a todo for implementing OAuth, due tomorrow at noon, high priority"
AI: "/add todo --title=\\"Implement OAuth\\" --priority=high --due=\\"10-26-2025 12:00PM\\""
User: [Pastes command into terminal]
User: [Sees success, continues with next request or brings results back to AI]
\`\`\`

## Overview
A command-line interface for managing projects, tasks, notes, and documentation. All commands start with "/" and support batch execution, flags, and project references.

## Syntax Fundamentals

\`\`\`
/command "arguments" @project --flag="value"
\`\`\`

- **Commands**: Start with / (e.g., /add todo, /edit notes)
- **Arguments**: Text following command (use quotes for multi-word text)
- **Project References**: @projectname or @My Project Name to apply command to specific project, used at the end of the command
- **Flags**: --key="value" or --key for boolean flags
- **Chaining**: Use && to chain commands (e.g., /add todo fix bug && /edit todos)
- **Wizards**: Many commands support interactive wizards - omit arguments to trigger step-by-step forms

## Command Parsing & Syntax Details

### Tokenization
Commands are parsed using a sophisticated tokenizer that respects quotes and escape sequences:

**Quote Handling:**
- Both single quotes (\') and double quotes (") preserve multi-word text
- Quotes are removed from final tokens - only use for grouping
- Example: \`--title="My Todo"\` becomes \`title=My Todo\`

**Escape Sequences:**
- Use backslash (\\) to escape special characters
- \\n becomes a literal newline in content fields
- \\\\ becomes a single backslash
- \\" or \\' to include quotes in quoted strings
- Example: \`--content="Line 1\\nLine 2\\nLine 3"\` creates multi-line content

**Space Handling:**
- Spaces outside quotes are token separators
- Spaces inside quotes are preserved
- Example: \`"fix login bug"\` is one token, \`fix login bug\` is three tokens

### Project Mention Extraction (@project)
- Format: \`@ProjectName\` or \`@My Multi Word Project\`
- Supports spaces in project names automatically
- Always place at the end of the command
- Must appear before flags if both are used
- Example: \`/add todo "task" @My Project --priority=high\`

### Flag Parsing (--key=value)
- Format: \`--flagName="value"\` or \`--flagName=value\` or \`--flagName\` (boolean)
- Flag names are alphanumeric (no spaces)
- Boolean flags: \`--unread\` (sets flag to true)
- Value flags: \`--priority=high\` or \`--priority="high priority"\`
- Flags can appear anywhere after the command
- Example: \`/add todo --title="Task" --priority=high --status=in_progress\`

### Command Matching Priority
Commands are matched in this order:
1. Two-word commands (e.g., "add todo", "view notes")
2. One-word commands (e.g., "help", "search")
3. Aliases (e.g., "t" for "view todos", "notes" for "view notes")

### Batch Command Chaining (&&)
- Use \`&&\` to chain multiple commands
- Commands execute sequentially (left to right)
- Execution stops on first error
- Quotes and escapes work across && boundaries
- Maximum 10 commands per batch
- Example: \`/add todo "task 1" && /add note "note 1" && /view todos\`

**Important:** && is only recognized outside of quotes:
- ✅ \`/add todo "fix bug" && /add note "notes"\` - Two commands
- ❌ \`/add todo "fix && test bug"\` - One command (&&  inside quotes)

### Markdown Support in Content Fields
All content fields (--content, --description, --title) support markdown formatting:

**Line Breaks:**
\`\`\`bash
/add note --title="Guide" --content="Line 1\\nLine 2\\nLine 3"
\`\`\`

**Rich Formatting:**
\`\`\`bash
/add devlog --title="Update" --content="## Completed\\n- Feature A\\n- Feature B\\n\\n**Next:** Feature C"
\`\`\`

**Code Blocks:**
\`\`\`bash
/add note --content="Example:\\n\\\`\\\`\\\`javascript\\nconst x = 1;\\n\\\`\\\`\\\`"
\`\`\`

**Lists & Headers:**
- Use # for headers, - for lists, ** for bold, * for italic
- All standard markdown syntax is supported

## Command Categories (9 Groups)

### 1. ⚡ Getting Started
- \`/help\` - Show all commands grouped by category
- \`/help "command"\` - Get specific command help

### 2. 📋 Tasks & Todos
- \`/add todo --title="text" --content="text" --priority=high|medium|low --status=not_started|in_progress|blocked|completed --due="MM-DD-YYYY TIME"\` - Create todo
- \`/edit todo "todo_idx/text" --title= --content= --priority= --status= --due=\` - Edit todo
- \`/delete todo "todo_idx/text"\` - Delete todo
- \`/complete "todo_idx/text"\` - Mark complete
- \`/assign "todo_idx/text" "email"\` - Assign to team member
- \`/push "todo_idx/text"\` - Push completed todo to devlog
- \`/add subtask "parent_idx" "text"\` - Add subtask
- \`/edit subtask "parent_idx" "subtask_idx" --title= --content= --priority= --status= --due=\` - Edit subtask (per-parent indexing)
- \`/delete subtask "parent_idx" "subtask_idx"\` - Delete subtask (per-parent indexing)

**Todo Priority:** low | medium | high
**Todo Status:** not_started | in_progress | blocked | completed

### 3. 📝 Notes & Dev Log (Supports Markdown)
- \`/add note --title="text" --content="text"\` - Create note
- \`/edit note "id"\` - Edit note
- \`/delete note "id"\` - Delete note
- \`/add devlog --title="text" --content="text"\` - Add dev log entry
- \`/edit devlog "id"\` - Edit entry
- \`/delete devlog "id"\` - Delete entry

### 4. 🧩 Features & Components
- \`/add component --feature="name" --category="category" --type="type" --title="title" --content="content"\`
- \`/edit component "id"\` - Edit component (opens wizard with relationship management)
- \`/delete component "id"\` - Delete component
- \`/add relationship --source="component" --target="target" --type=uses --description="optional"\` - Add relationship between components
- \`/edit relationship "component" "relationship_id" "new_type" --description="optional"\` - Edit relationship
- \`/delete relationship "component_id" "relationship_id"\` - Delete relationship

**Component Categories:** frontend | backend | database | infrastructure | security | api | documentation | asset

**Component Types by Category:**
- **frontend:** page | component | hook | context | layout | util | custom
- **backend:** service | route | model | controller | middleware | util | custom
- **database:** schema | migration | seed | query | index | custom
- **infrastructure:** deployment | cicd | env | config | monitoring | docker | custom
- **security:** auth | authz | encryption | validation | sanitization | custom
- **api:** client | integration | webhook | contract | graphql | custom
- **documentation:** area | section | guide | architecture | api-doc | readme | changelog | custom (Useful for high level grouping, explanations, etc.)
- **asset:** image | font | video | audio | document | dependency | custom

**Relationship Types:** uses | implements | extends | depends_on | calls | contains | mentions | similar

### 5. 📦 Tech Stack
- \`/add stack --name="name" --category="category" --version="version" --description="optional"\` - Add technology or package
- \`/remove stack --name="name"\` - Remove technology

**Stack Categories:** framework | runtime | database | styling | deployment | testing | tooling | ui | state | routing | forms | animation | api | auth | data | utility

### 6. 📊 Project Insights
- \`/info\` - Quick project overview with stats
- \`/today\` - Today's tasks and activity
- \`/week\` - Weekly summary and planning
- \`/standup\` - Generate standup report
- \`/summary "[format]" "[entity]"\` - Generate downloadable summary (formats: markdown/json/prompt/text, entities: all/todos/notes/devlog/components/stack/team/deployment/settings), useful for AI context of specific areas
- \`/search "query"\` - Search across all content

### 7. 👥 Team & Deployment
- \`/invite "email" --role=editor|viewer\` - Invite member
- \`/remove member "email"\` - Remove member
- \`/set deployment --url="liveUrl" --platform="platform" --status="active|inactive|error" --github="repo" --build="cmd" --start="cmd" --branch="branch" --lastDeploy="date"\` - Update deployment
- \`/set public --enabled=true|false --slug="slug"\` - Set public visibility

**Deployment Status:** active | inactive | error
**Common Platforms:** vercel | netlify | railway | render | heroku | aws | gcp | azure | digitalocean | cloudflare

### 8. ⚙️ Project Management
- \`/wizard new\` - Interactive project creation
- \`/swap @project\` - Switch project
- \`/set name "new name"\` - Update project name
- \`/set description "text"\` - Update description
- \`/add tag "tag"\` - Add project tag
- \`/remove tag "tag"\` - Remove tag
- \`/export\` - Export project data

### 9. 🔔 System & Preferences
- \`/llm\` - Show this guide

**Use direct mode with flags for instant execution:**
- \`/add todo --title="fix bug" --priority=high\` - Creates todo without wizard
- \`/edit todo 1 --title="new title"\` - Direct edit without wizard

## Key Usage Patterns

**Create todo with flags (skip wizard):**
\`\`\`
/add todo --title="fix login bug" --priority=high --content="Fix validation" --due="12-25-2025 8:00PM"
\`\`\`

**Batch operations:**
\`\`\`
/add todo --title="implement feature" && /add note --title="notes" --content="details"
/add stack --name="React" --category=framework --version=18.2.0 && /add stack --name="Node.js" --category=runtime --version=18.x
\`\`\`

**Project references:**
\`\`\`
/add todo --title="fix bug" @project
/swap @My Cool Project
\`\`\`

**Edit directly:**
\`\`\`
/edit todo 1 --title="new title" --priority=high
/edit subtask 1 2 --title="Updated subtask" --status=in_progress
\`\`\`

**Search and summarize:**
\`\`\`
/summary prompt           # Generate full AI-friendly context
/summary "json" "todos"   # Export only todos as JSON
/summary "markdown" "components" # Export components as markdown
/summary "json" "team"    # Export team members as JSON
/summary "prompt" "deployment" # Export deployment config for AI
/summary "markdown" "settings" # Export project settings as markdown
\`\`\`

## Complete Flags Reference

### Todo/Subtask Flags
- \`--title="text"\` - Set title (required for most add commands)
- \`--content="text"\` - Set content/description
- \`--priority=low|medium|high\` - Set priority level
- \`--status=not_started|in_progress|blocked|completed\` - Set status
- \`--due="MM-DD-YYYY TIME"\` - Set due date (flexible formats: "12-25-2025 8:00PM", "3-15 14:30")

### Note/DevLog Flags
- \`--title="text"\` - Set title
- \`--content="text"\` - Set content
- \`--description="text"\` - Set description (for notes)

### Component Flags
- \`--feature="text"\` - Set feature name (required - components belong to features)
- \`--category=frontend|backend|database|infrastructure|security|api|documentation|asset\` - Set component category
- \`--type="text"\` - Set component type (varies by category, see Component Types section)
- \`--title="text"\` - Set component title
- \`--content="text"\` - Set component content

### Relationship Flags
- \`--source="text"\` - Set source component (for add)
- \`--target="text"\` - Set target component (for add)
- \`--type=uses|implements|extends|depends_on|calls|contains|mentions|similar\` - Set relationship type
- \`--description="text"\` - Set relationship description (optional)

### Stack Flags
- \`--name="text"\` - Set technology/package name (required)
- \`--category=framework|runtime|database|styling|deployment|testing|tooling|ui|state|routing|forms|animation|api|auth|data|utility\` - Set stack category
- \`--version="text"\` - Set version number
- \`--description="text"\` - Set description (optional)

### Deployment Flags
- \`--url="url"\` - Set live URL
- \`--github="url"\` - Set GitHub repository URL
- \`--platform="text"\` - Set deployment platform (vercel, netlify, etc.)
- \`--status=active|inactive|error\` - Set deployment status
- \`--branch="text"\` - Set deployment branch (default: main)
- \`--build="text"\` - Set build command
- \`--start="text"\` - Set start command
- \`--lastDeploy="date"\` - Set last deployment date

### Team & Public Flags
- \`--role=editor|viewer\` - Set user role when inviting members
- \`--enabled=true|false\` - Enable/disable public visibility
- \`--slug="text"\` - Set public URL slug

## Response Types

- ✅ **success** - Operation completed
- ❌ **error** - Operation failed
- ℹ️ **info** - Information message
- 📊 **data** - Data display (lists, tables)
- ❓ **prompt** - Interactive wizard/prompt
- ⚠️ **warning** - Warning message

## Tips for LLMs

1. Chain related commands with && for efficiency
2. Use @project to reference specific projects
3. Use flags for automation/scripting
4. Have the user run /summary prompt to generate AI-friendly project context (full or filtered by entity)
5. Filter /summary exports by entity: todos, notes, devlog, components, stack, team, deployment, settings, or all
6. Have the user run /search to fuzzy find items across project before editing/deleting
7. /info, /today, /week, /standup provide different views of project status
8. Batch operations stop on first error
9. Use quotes for multi-word arguments
10. Reference items by ID or text content (system will fuzzy match)
11. Entity aliases work for both singular and plural (todo/todos, note/notes, etc.)
12. **Components MUST belong to a feature** - use --feature flag when adding components
13. All date formats are flexible: "MM-DD-YYYY TIME" or "M-D HH:MM" both work
14. Categories and types are strictly validated against allowed enums
15. Public slugs must be unique, lowercase, and use only alphanumeric characters and hyphens
16. Markdown / line escape is supported in content fields by doing this: \`--content="Line 1\\nLine 2"\`

## Item Matching Rules (For Edit/Delete/View Commands)

When referencing items (todos, notes, components, etc.), the system uses a **3-tier priority matching system**:

1. **UUID Match (Priority 1)** - Exact match on item ID (e.g., \`a1b2c3d4-...\`)
2. **Numeric Index (Priority 2)** - 1-based index (e.g., \`/edit todo 1\` edits first todo)
3. **Partial Text Match (Priority 3)** - Case-insensitive substring match on title/content
   - Example: \`/edit component "auth"\` will match "Authentication Service"
   - Example: \`/delete note "meeting"\` will match "Meeting Notes from 10/20"

**Best Practice:** Use \`/search "keyword"\` first to verify item exists before editing/deleting.

## Common Error Patterns

Understanding error responses helps debug commands:

\`\`\`bash
# Missing required flags
❌ --title flag is required
✅ /add todo --title="fix bug" --priority=high

# Item not found (fuzzy match failed)
❌ Component not found: "login"
✅ /view components  # Check exact titles first
✅ /add component --feature="Auth" --title="Login Service" ...

# Invalid enum value
❌ Invalid priority. Must be: low, medium, or high
✅ /add todo --title="task" --priority=high

# Relationship with non-existent component
❌ Target component not found: "NonExistentService"
✅ /view components  # Verify both components exist
✅ /add relationship --source="Login" --target="Auth Service" --type=uses

# Missing feature for component
❌ --feature flag is required for components
✅ /add component --feature="Authentication" --category=backend --type=service --title="OAuth Handler"
\`\`\`

## Batch Command Examples for AI Automation

Create a full project setup:
\`\`\`bash
/add stack --name="React" --category=framework --version=18.2.0 && /add stack --name="TypeScript" --category=runtime --version=5.0 && /add component --feature="Auth" --category=backend --type=service --title="Login Service" --content="Handles user authentication" && /add todo --title="Implement OAuth" --priority=high --status=in_progress
\`\`\`

Document codebase analysis:
\`\`\`bash
/add note --title="Architecture Overview" --content="System uses microservices..." && /add component --feature="API Gateway" --category=backend --type=service --title="Gateway" --content="Routes requests to services" && /add relationship "component1" "component2" "uses"
\`\`\`

Project status update:
\`\`\`bash
/complete "implement auth" && /add devlog --title="Completed Auth" --content="OAuth implementation complete" && /add todo --title="Write tests" --priority=high
\`\`\`

## Error Handling

- Commands validate required arguments
- Projects must exist for project-specific commands
- Batch commands stop on first error
- System provides suggestions for typos and similar commands
- Use /help "command" for specific syntax help
- Component categories and types are validated against enums
- Features are required for all components
- Date parsing is flexible but must be valid dates

This terminal provides a powerful CLI for project management with support for tasks, documentation, team collaboration, and deployment tracking. All operations are command-based with support for both interactive wizards and direct flag-based execution."