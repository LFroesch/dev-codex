# GIF Production Guide - Dev Codex

**Project**: Recipe App (Full-stack recipe sharing platform)
**Setup**: Premium demo account, clean workspace, dark mode

---

## Core GIF Scripts (5 Essential Demos)

### 1. LLM Workflow (25s) - The Killer Feature
**Show**: Export → LLM → Batch Import Loop

1. Type `/summary prompt all` in terminal (exports project context)
2. Copy output, switch to ChatGPT/Claude
3. (Optional) Type `/llm` to get command syntax guide, copy
4. Paste context + syntax guide + "Build recipe app with auth, CRUD, meal planning"
5. LLM generates commands, copy output
6. Switch back, paste into terminal, execute
7. Show rapid execution: "1/10... 2/10... 10/10 Complete!"
8. Pan to UI showing populated project

**What `/llm` provides** (command syntax reference for the LLM):
- General terminal guide with all command syntax
- Entity-specific guides: `/llm todos`, `/llm components`, `/llm stack`, etc.
- Shows project data when entity specified
- Downloadable text file format

**Commands LLM generates**:
```bash
/add todo --title="Implement JWT auth" --priority=high --status=in_progress
/add todo --title="Build recipe CRUD" --priority=high
/add component --feature="Auth" --category=backend --type=service --title="Auth Service" --content="JWT authentication"
/add component --feature="Recipes" --category=api --type=endpoint --title="GET /recipes" --content="Fetch recipes"
/add note --title="Architecture" --content="Next.js + PostgreSQL + Prisma"
# ... 5 more commands
```

---

### 2. Terminal Autocomplete (10s)
**Show**: Fast, guided, error-free command building

1. Type `/add` → tab shows options
2. Select `todo` → type ` --t` → autocomplete `--title=""`
3. Type inside quotes: `Implement search`
4. Type ` --p` → autocomplete `--priority=`
5. Select `high` from dropdown
6. Enter → success ✓

**Final command**: `/add todo --title="Implement search" --priority=high`

---

### 3. Features Graph (15s)
**Show**: Visual architecture with relationships

1. Start in Components view (graph mode)
2. Zoom out to show all feature clusters
3. Use minimap to jump to "Authentication"
4. Zoom into cluster, show connections
5. Drag "Login Page" node to reposition
6. Click "Auto Layout" → smooth reorganization
7. Toggle to Cards view → back to Graph

**Seed data needed**:
```bash
/add component --feature="Auth" --category=frontend --type=page --title="Login" --content="User login"
/add component --feature="Auth" --category=backend --type=service --title="Auth Service" --content="JWT logic"
/add component --feature="Auth" --category=api --type=endpoint --title="POST /auth/login" --content="Login endpoint"
/add component --feature="Auth" --category=database --type=model --title="User Model" --content="User schema"
/add relationship --source="Login" --target="POST /auth/login" --type=uses
/add relationship --source="POST /auth/login" --target="Auth Service" --type=uses
/add relationship --source="Auth Service" --target="User Model" --type=depends_on
```

---

### 4. Speed Demo (8s)
**Show**: Paste 10 commands, instant execution

1. Show empty project
2. Paste 10 commands (pre-written)
3. Hit enter
4. Show blur effect for speed
5. Pan to populated UI (todos, notes, components, stack)

**Pre-written batch** (use newlines or &&):
```bash
/add todo --title="Setup auth" --priority=high --status=in_progress
/add todo --title="Build CRUD" --priority=high
/add todo --title="Database schema" --priority=high
/add note --title="Architecture" --content="React + Node + PostgreSQL"
/add note --title="Auth Strategy" --content="JWT with refresh tokens"
/add component --feature="Auth" --category=backend --type=service --title="Auth Service" --content="JWT authentication"
/add component --feature="Recipes" --category=backend --type=service --title="Recipe Service" --content="CRUD logic"
/add stack --name="React" --category=framework --version="18"
/add stack --name="PostgreSQL" --category=database --version="15"
/add devlog --title="Day 1" --content="Project initialized"
```

## Seed Data (Minimal Setup)

**Quick batch for demos**:
```bash
/add todo --title="Implement JWT auth" --priority=high --status=in_progress --due="12-01-2025"
/add todo --title="Build recipe CRUD" --priority=high --status=not_started --due="12-03-2025"
/add todo --title="PostgreSQL schema" --priority=high --status=not_started --due="12-05-2025"
/add todo --title="Image upload to S3" --priority=medium --status=not_started --due="12-10-2025"
/add todo --title="Project setup" --priority=high --status=completed
/add note --title="Auth Architecture" --content="JWT with 7-day expiry, refresh tokens in httpOnly cookies, Google OAuth"
/add note --title="Database Design" --content="PostgreSQL + Prisma. Users->Recipes (1:many), Users->MealPlans (1:many)"
/add note --title="API Design" --content="REST with /api/v1 prefix, cursor pagination, 100 req/min rate limit"
/add devlog --title="Day 1: Setup" --content="React + Vite frontend, Express backend, TypeScript + ESLint"
/add devlog --title="Day 2: Auth" --content="Login/register endpoints, JWT middleware, Google OAuth"
/add stack --name="React" --category=framework --version="18"
/add stack --name="TypeScript" --category=runtime --version="5.0"
/add stack --name="PostgreSQL" --category=database --version="15"
/add stack --name="Prisma" --category=data --version="5.0"
```

## Terminal Recording Tips

### For LLM Workflow GIF
- Pre-stage ChatGPT tab with prompt ready to paste
- Use keyboard shortcuts for copy/paste (Cmd/Ctrl+C, Cmd/Ctrl+V)
- Show clipboard indicator if possible
- Keep LLM response concise (10 commands max)

### For Autocomplete GIF
- Type naturally but deliberately
- Pause 0.5s after each autocomplete suggestion appears
- Show cursor jumping into quotes (slow motion effect optional)
- Use actual project context for realism

### For Speed Demo GIF
- Have commands ready in a text file
- Use fast paste action (instant)
- Show execution messages rapidly (may need post-processing speed-up)
- End with a satisfying "Complete!" or checkmark animation

### For Features Graph GIF
- Start zoomed out to show scope
- Use minimap for dramatic navigation
- Drag nodes slowly and deliberately
- Show auto-layout animation at normal speed (it's already impressive)

---

## Post-Production

### Editing
1. **Trim**: Remove dead space at start/end
2. **Speed**: 1.2x speed for typing, 0.8x for graph animations
3. **Annotations**: Add text overlays for key moments (optional)
4. **Loop**: Ensure smooth looping (2s pause at end)

### Optimization
1. **Reduce colors**: 256 colors usually sufficient
2. **Lower framerate**: 15-20 FPS for smaller files
3. **Compress**: Use gifsicle or online tools
4. **Test**: Ensure quality is maintained after optimization

### Placement in README
```markdown
## The Magic: LLM-Powered Workflow
![LLM Workflow Demo](media/gifs/llm-workflow.gif)
**Export → LLM → Import.** Build your project structure at the speed of thought.

## Terminal Autocomplete
![Autocomplete Demo](media/gifs/autocomplete.gif)
Guided command building with full validation. Fast, error-free, powerful.

## Speed Demo
![Speed Demo](media/gifs/speed-demo.gif)
Paste 10 commands. Hit enter. Done.

## Features Graph
![Features Graph](media/gifs/features-graph.gif)
Visualize your architecture. See relationships. Understand dependencies.
```

---

## Quick Command Reference for Terminal Demos

### Most Impressive Commands
```bash
# LLM Integration
/summary prompt all
/summary json todos
/llm

# Batch Operations
/add todo --title="Task 1" && /add todo --title="Task 2" && /add todo --title="Task 3"

# Search & Analysis
/search "authentication"
/stale todos
/today
/week

# Wizards (for guided demo)
/wizard project
/wizard todo

# Complex Queries
/view todos --priority=high --status=in_progress
/view components --feature="Authentication"
```

---

## Additional Gif Ideas (Nice-to-Have)

### 5. Search & Stale Detection (10s)
- Type `/search "auth"`
- Show instant results across todos, notes, components
- Type `/stale todos`
- Show todos untouched for 30+ days highlighted

### 6. Team Collaboration (15s)
- Show multiple users online (Activity Feed)
- Add team member
- Assign todo to teammate
- Show real-time notification badge
- Click to see activity: "Sarah added a new component"

### 7. Analytics Dashboard (12s)
- Navigate to Analytics
- Show time tracking heatmap
- Scroll through project breakdown
- Show productivity leaderboard

### 8. Public Sharing (10s)
- Navigate to Public Settings
- Toggle project visibility
- Copy public URL
- Open in new tab (incognito)
- Show beautiful public project page

---

## Production Checklist

- [ ] Create seed account with realistic data
- [ ] Populate Recipe App project with all components
- [ ] Test all terminal commands for smooth execution
- [ ] Set up recording software with optimal settings
- [ ] Record GIF 1: LLM Workflow (25-30s)
- [ ] Record GIF 2: Terminal Autocomplete (10s)
- [ ] Record GIF 3: Speed Demo (8s)
- [ ] Record GIF 4: Features Graph (15s)
- [ ] Convert MP4s to optimized GIFs
- [ ] Test GIFs in README preview
- [ ] Get feedback and iterate
- [ ] Upload to media/gifs/ folder
- [ ] Update README with GIF embeds

---

## Contact & Feedback
If you need help or want to suggest improvements to this guide, open an issue or reach out!
