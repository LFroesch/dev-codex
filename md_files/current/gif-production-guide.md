# GIF Production Guide for Dev Codex

## Overview
This guide provides everything needed to create compelling promotional gifs showcasing Dev Codex's unique features.

---

## Seed Account Setup

### User Account
- **Username**: `demo_user` or `alex_dev`
- **Email**: `demo@devcodex.com`
- **Display Name**: Alex Chen
- **Plan**: Premium (for unlimited features in demo)

### Project: "Recipe App"
A realistic SaaS app project that demonstrates all features effectively.

**Project Details:**
- **Name**: Recipe App
- **Color**: `#FF6B6B` (warm red)
- **Category**: Web App
- **Description**: "Full-stack recipe sharing platform with meal planning, user auth, and social features"
- **Tags**: `react`, `node`, `postgresql`, `typescript`, `tailwind`
- **Status**: In Progress

---

## Seed Data Structure

### 1. Tech Stack
```bash
# Frontend
/add tech --name="React 18" --category=frontend --type=framework
/add tech --name="TypeScript" --category=frontend --type=language
/add tech --name="Tailwind CSS" --category=frontend --type=styling
/add tech --name="TanStack Query" --category=frontend --type=library

# Backend
/add tech --name="Node.js" --category=backend --type=runtime
/add tech --name="Express" --category=backend --type=framework
/add tech --name="PostgreSQL" --category=database --type=database
/add tech --name="Prisma" --category=backend --type=orm

# Infrastructure
/add tech --name="Vercel" --category=deployment --type=hosting
/add tech --name="Railway" --category=deployment --type=hosting
```

### 2. Components (for Feature Graph visualization)
```bash
# Frontend Components
/add component --feature="Authentication" --category=frontend --type=page --title="Login Page" --content="User login with email/password and Google OAuth"
/add component --feature="Authentication" --category=frontend --type=component --title="Auth Form" --content="Reusable authentication form component with validation"
/add component --feature="Recipes" --category=frontend --type=page --title="Recipe Feed" --content="Infinite scroll recipe feed with filters and search"
/add component --feature="Recipes" --category=frontend --type=component --title="Recipe Card" --content="Recipe display card with image, rating, and quick actions"
/add component --feature="Meal Planning" --category=frontend --type=page --title="Meal Planner" --content="Weekly meal planning calendar with drag-and-drop"

# Backend Components
/add component --feature="Authentication" --category=backend --type=service --title="Auth Service" --content="JWT-based authentication with session management"
/add component --feature="Recipes" --category=backend --type=service --title="Recipe Service" --content="CRUD operations for recipes with search and filtering"
/add component --feature="Meal Planning" --category=backend --type=service --title="Meal Plan Service" --content="Meal planning logic and weekly generation"

# API Endpoints
/add component --feature="Authentication" --category=api --type=endpoint --title="POST /auth/login" --content="Authenticate user and return JWT token"
/add component --feature="Authentication" --category=api --type=endpoint --title="POST /auth/register" --content="Register new user with validation"
/add component --feature="Recipes" --category=api --type=endpoint --title="GET /recipes" --content="Fetch paginated recipes with filters"
/add component --feature="Recipes" --category=api --type=endpoint --title="POST /recipes" --content="Create new recipe with image upload"

# Database
/add component --feature="Authentication" --category=database --type=model --title="User Model" --content="User schema with auth fields, preferences, and relationships"
/add component --feature="Recipes" --category=database --type=model --title="Recipe Model" --content="Recipe schema with ingredients, steps, images, and metadata"
/add component --feature="Meal Planning" --category=database --type=model --title="MealPlan Model" --content="Weekly meal plan with recipe associations"
```

### 3. Relationships (for graph visualization)
```bash
# Show component relationships
/relationship add --from="Login Page" --to="Auth Form" --type=uses
/relationship add --from="Auth Form" --to="POST /auth/login" --type=calls
/relationship add --from="POST /auth/login" --to="Auth Service" --type=uses
/relationship add --from="Auth Service" --to="User Model" --type=depends_on
/relationship add --from="Recipe Feed" --to="Recipe Card" --type=contains
/relationship add --from="Recipe Feed" --to="GET /recipes" --type=calls
/relationship add --from="GET /recipes" --to="Recipe Service" --type=uses
/relationship add --from="Recipe Service" --to="Recipe Model" --type=depends_on
/relationship add --from="Meal Planner" --to="Meal Plan Service" --type=uses
/relationship add --from="Meal Plan Service" --to="Recipe Service" --type=depends_on
```

### 4. Todos (for task demonstration)
```bash
# High Priority - In Progress
/add todo --title="Implement JWT authentication" --priority=high --status=in_progress --assigned="Alex Chen" --due="2025-12-01"
/add todo --title="Build recipe CRUD endpoints" --priority=high --status=in_progress --due="2025-12-03"

# High Priority - Not Started
/add todo --title="Set up PostgreSQL schema" --priority=high --status=not_started --due="2025-12-05"
/add todo --title="Create recipe feed UI" --priority=high --status=not_started --due="2025-12-07"

# Medium Priority
/add todo --title="Add image upload to S3" --priority=medium --status=not_started --due="2025-12-10"
/add todo --title="Implement search filters" --priority=medium --status=not_started --due="2025-12-12"
/add todo --title="Build meal planner calendar" --priority=medium --status=not_started --due="2025-12-15"

# Low Priority
/add todo --title="Add recipe sharing" --priority=low --status=not_started --due="2025-12-20"
/add todo --title="Social features (likes, comments)" --priority=low --status=not_started --due="2025-12-25"

# Completed
/add todo --title="Project setup and configuration" --priority=high --status=completed --completed="2025-11-15"
```

### 5. Notes (for documentation)
```bash
/add note --title="Authentication Architecture" --content="Using JWT tokens with 7-day expiry. Refresh tokens stored in httpOnly cookies. Google OAuth via Passport.js. Password hashing with bcrypt (10 rounds)."

/add note --title="Database Schema Design" --content="PostgreSQL with Prisma ORM. Users -> Recipes (1:many). Users -> MealPlans (1:many). MealPlans -> Recipes (many:many through MealPlanRecipes junction table)."

/add note --title="API Design Decisions" --content="RESTful API with /api/v1 prefix. Pagination using cursor-based approach for infinite scroll. Rate limiting: 100 req/min for authenticated users."

/add note --title="Deployment Strategy" --content="Frontend on Vercel (auto-deploy from main). Backend on Railway with Docker. PostgreSQL managed instance. Environment: staging + production."

/add note --title="Performance Optimizations" --content="Image CDN for recipe photos. Database indexing on user_id, created_at. React Query for client-side caching. API response caching with Redis (5min TTL)."
```

### 6. Dev Logs (for activity tracking)
```bash
/add devlog --title="Day 1: Project Setup" --content="Initialized React + Vite frontend. Set up Express backend. Configured TypeScript and ESLint. Created database connection."

/add devlog --title="Day 2: Authentication Flow" --content="Implemented login/register endpoints. Built JWT middleware. Created protected routes. Added Google OAuth integration."

/add devlog --title="Day 3: Recipe Model" --content="Designed recipe schema with ingredients array. Built CRUD endpoints. Added image upload to temp storage. Testing with Postman."
```

---

## GIF Recording Scripts

### GIF 1: The LLM Workflow (25-30 seconds)
**Objective**: Show the complete loop: export → LLM → batch import

**Script:**
1. **Start**: Terminal open, empty Recipe App project visible
2. **Type**: `/summary prompt all` (show autocomplete)
3. **Show**: Copy the generated context (highlight clipboard action)
4. **Switch**: To ChatGPT/Claude tab (already have prompt ready)
5. **Paste**: Context into LLM chat
6. **Show**: LLM generating batch commands (scroll through output)
7. **Copy**: Generated commands
8. **Switch**: Back to Dev Codex terminal
9. **Paste**: Commands and hit enter
10. **Show**: Rapid execution with progress: "Executing 1/10... 2/10... 3/10..."
11. **Pan**: To UI showing populated project (todos, components, notes visible)
12. **End**: Zoom out to show full project structure

**Terminal Commands to Demonstrate:**
```bash
# In Dev Codex terminal
/summary prompt all

# (Copy output, paste to LLM)
# LLM returns commands like:
/add todo --title="Build login page" --priority=high --status=in_progress
/add component --feature="Auth" --category=frontend --type=page --title="Login" --content="User login page"
/add note --title="API Design" --content="RESTful endpoints with JWT auth"
# ... 7 more commands

# (Copy LLM output, paste back to terminal)
# All commands execute in sequence
```

---

### GIF 2: Terminal Autocomplete (10 seconds)
**Objective**: Show guided, error-free command building

**Script:**
1. **Type**: `/add` → autocomplete shows: `todo`, `note`, `component`, `tech`, `devlog`
2. **Tab**: Complete to `/add todo`
3. **Type**: ` --t` → autocomplete shows: `--title`, `--tags`, `--team`
4. **Tab**: Complete to `--title=""`
5. **Show**: Cursor jumps inside quotes automatically
6. **Type**: `Implement search feature`
7. **Type**: ` --p` → autocomplete shows `--priority`
8. **Tab**: Complete to `--priority=`
9. **Show**: Dropdown with `high`, `medium`, `low`
10. **Select**: `high`
11. **Enter**: Success message with checkmark

**Commands:**
```bash
# Show progressive autocomplete
/add todo --title="Implement search feature" --priority=high --status=not_started --due="2025-12-10"
```

---

### GIF 3: Speed Demo (8 seconds)
**Objective**: Raw power - paste and execute instantly

**Script:**
1. **Start**: Empty project screen
2. **Switch**: To terminal (already has 10 commands pre-written)
3. **Paste**: All commands at once
4. **Hit**: Enter
5. **Show**: Rapid-fire execution messages (blur effect for speed)
6. **Pan**: To UI showing everything populated instantly
7. **Show**: Todos (5), Notes (3), Components (2), Tech Stack filled

**Pre-written Commands:**
```bash
/add todo --title="Setup auth system" --priority=high --status=in_progress && /add todo --title="Build recipe CRUD" --priority=high --status=not_started && /add todo --title="Design database schema" --priority=high --status=not_started && /add note --title="Architecture Overview" --content="Full-stack recipe app with React + Node + PostgreSQL" && /add note --title="Auth Strategy" --content="JWT with refresh tokens and Google OAuth" && /add component --feature="Auth" --category=frontend --type=page --title="Login" --content="User authentication page" && /add component --feature="Recipes" --category=backend --type=service --title="Recipe Service" --content="Business logic for recipes" && /add tech --name="React" --category=frontend --type=framework && /add tech --name="PostgreSQL" --category=database --type=database && /add devlog --title="Day 1" --content="Project initialized, planning complete"
```

---

### GIF 4: Features Graph (15 seconds)
**Objective**: Show component relationship visualization

**Script:**
1. **Start**: Components view with graph displayed
2. **Show**: Zoom out to see all features clustered
3. **Click**: Minimap to jump to "Authentication" cluster
4. **Zoom**: Into cluster to show relationships
5. **Drag**: "Login Page" node to reposition
6. **Click**: Node to show relationship sidebar
7. **Add**: New relationship: "Login Page" → "Auth Service" (type: "uses")
8. **Show**: Edge appears instantly with animation
9. **Click**: "Auto Layout" button to reorganize
10. **Show**: Smooth animation to optimal positions
11. **Toggle**: Between "Graph" and "Cards" view
12. **End**: Return to graph view showing full architecture

**Setup:**
- Ensure all components from seed data are created
- All relationships added
- Graph should show clear hierarchy: Frontend → API → Backend → Database

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
