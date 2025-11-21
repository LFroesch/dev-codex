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

---

### 5. Discovery & Search (12s)
**Show**: Todo management + search

1. Type `/view todos` → show list with priorities
2. Type `/today` → show today's tasks
3. Type `/search "auth"` → instant results across todos, notes, components
4. Type `/complete 1` → mark first todo complete
5. Show updated list with strikethrough

---

## Additional Ideas (No Scripts - Just Concepts)

- **Team Collab**: Invite member, assign todo, show real-time notification
- **Analytics**: Navigate to analytics, show heatmap + time tracking
- **Public Sharing**: Toggle public, copy URL, open in incognito
- **Stale Detection**: `/stale todos` → highlight 30+ day old items
- **Workflow**: `/week` → weekly summary, `/standup` → daily report

---

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

---

## Key Commands Reference

### `/help` - Show command help
```bash
/help              # Show all commands
/help "add todo"   # Show help for specific command
/help "llm"        # Show help for LLM guide
```

### `/llm` - LLM interaction guide (for AI context)
```bash
/llm               # General terminal command syntax guide
/llm todos         # Todos guide with current project todos
/llm components    # Components guide with architecture
/llm notes         # Notes guide with project notes
/llm stack         # Tech stack guide
/llm team          # Team management guide
/llm deployment    # Deployment guide
/llm settings      # Settings guide
/llm projects      # Projects overview
```
**Use case**: Copy `/llm` output + project context from `/summary prompt` → paste to ChatGPT/Claude → get valid commands back

### `/summary` - Export project data
```bash
/summary prompt all      # AI-optimized format with full project data
/summary markdown all    # README-style markdown
/summary json todos      # JSON export of todos only
/summary text projects   # Plain text list of projects
```

---

## Recording Tips

**Software**: Cleanshot X (Mac), OBS Studio (Win/Linux)
**Settings**: 1920x1080 @ 30fps → convert to 1280x720 GIF
**Target**: <5MB per GIF
**Style**: Dark mode, slow typing (70% speed), 0.5s pauses

**Conversion**:
```bash
ffmpeg -i input.mp4 -vf "fps=20,scale=1280:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" output.gif
gifsicle -O3 --colors 256 output.gif -o final.gif
```

---

## Recording Setup

### Software Recommendations
- **Screen Recording**:
  - Mac: Cleanshot X or ScreenFlow
  - Windows: OBS Studio or ShareX
  - Linux: Peek or SimpleScreenRecorder
- **GIF Conversion**:
  - Gifski (best quality)
  - ffmpeg (command-line)
  - ezgif.com (online)

### Recording Settings
- **Resolution**: 1920x1080 (scale to 1280x720 for smaller file size)
- **Frame Rate**: 30 FPS (sufficient for smooth playback)
- **Duration**: Follow scripts (8-30 seconds per gif)
- **Format**: Record in MP4, convert to GIF
- **File Size Target**: < 5MB per GIF for GitHub README

### Conversion Command (ffmpeg)
```bash
# High-quality GIF with optimized palette
ffmpeg -i input.mp4 -vf "fps=20,scale=1280:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 output.gif

# Further optimize with gifsicle
gifsicle -O3 --colors 256 output.gif -o output-optimized.gif
```

### UI Tips for Recording
1. **Clean workspace**: Close unnecessary tabs/windows
2. **Cursor visibility**: Use cursor highlighting (Cleanshot X has this)
3. **Slow down typing**: Type at 60-70% normal speed for clarity
4. **Wait between actions**: 0.5s pause after autocomplete, 1s after command execution
5. **Smooth panning**: Use mouse for slow, deliberate movements
6. **Dark mode**: Use dark theme for better contrast in GIFs

---

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
