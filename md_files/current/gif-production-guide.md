# GIFS

## GIF 2: LLM Workflow (25s) ⭐ **The Killer Feature**
**What to Show**: `/summary` → LLM → batch commands → execution

**Script**:
1. Start with minimal project (1-2 todos already there)
2. Type `/summary prompt all` → copy output
3. Switch to ChatGPT/Claude tab (pre-opened)
4. Paste context + prompt: *"I want to add these features/relationships and some todos, this note, this dev log - keep it SIMPLE. Add auth feature, recipes feature, 2 todos, tech stack, and relationships, keep it to 10 commands"*
5. LLM returns ~10 executable commands
6. Copy commands → switch back to Dev Codex
7. Paste into terminal → execute batch
8. Show rapid execution: "Executing 10 commands... ✓ Complete!"
9. Quick pan through UI showing populated todos, notes, components with relationships, stack

**Example LLM Output** (paste into terminal):
```bash
/add todo --title="JWT authentication" --priority=high --status=in_progress
/add todo --title="Recipe CRUD endpoints" --priority=high
/add todo --title="PostgreSQL schema" --priority=medium
/add note --title="Auth Architecture" --content="JWT with refresh tokens, Google OAuth"
/add note --title="Database Design" --content="PostgreSQL + Prisma. Users->Recipes (1:many)"
/add component --feature="Auth" --category=backend --type=service --title="Auth Service" --content="JWT authentication logic"
/add component --feature="Recipes" --category=backend --type=service --title="Recipe Service" --content="CRUD operations"
/add component --feature="Auth" --category=frontend --type=page --title="Login Page" --content="User login form"
/add relationship --source="Login Page" --target="Auth Service" --type=uses
/add relationship --source="Recipe Service" --target="Auth Service" --type=depends_on
/add stack --name="React" --category=framework --version="18"
/add stack --name="PostgreSQL" --category=database --version="15"
/add devlog --title="Day 1" --content="React + Vite frontend, Express backend, TypeScript setup"
```

---

## GIF 3: FeatureGraph (15s)
**What to Show**: Visualize features/relationships added in GIF 2

**Script**:
1. Navigate to Components page → Graph view
2. Zoom out to show full architecture (Auth + Recipes features)
3. Show relationship connections (Login Page → Auth Service, Recipe Service → Auth Service)
4. Zoom into "Auth" cluster
5. Drag "Login Page" node to reposition
6. Pan to "Recipes" cluster
7. Click "Auto Layout" → watch smooth reorganization (optional)

**Note**: Use the components/relationships created in GIF 2's LLM output

---

## PROMO VIDEOS (Longer Form for Social Media)

**Target Platforms**: Reddit, Facebook, Twitter/X, LinkedIn
**Format**: 30-90 second edited videos with narration/text overlays
**Purpose**: Show advanced features and real-world usage

### Video Ideas:

#### PROMO 1: The Complete Workflow (60s)
**Story Arc**: Idea → Structured Project → Team Collaboration
1. Show `/summary prompt` export (5s)
2. LLM generates 20+ commands (10s)
3. Paste → execute → project populated (10s)
4. Navigate through todos, notes, components (15s)
5. Invite team member → show real-time collaboration (10s)
6. Show `/standup` and `/today` commands (10s)

#### PROMO 2: Speed Comparison (45s)
**Story Arc**: Traditional PM vs Dev Codex
- Split screen: clicking through Jira/Trello vs terminal
- Show 10 minutes of clicking vs 30 seconds of commands
- Highlight: "20x faster with AI"

#### PROMO 3: Social Discovery (30s)
**What to Show**: Community features
1. Discover page → public projects
2. Filter by tech stack ("React" + "PostgreSQL")
3. Favorite a project → get notifications
4. Follow user → feed updates
5. Comment on public project

#### PROMO 4: Component Architecture (45s)
**What to Show**: Visual architecture management
1. Start with messy component list
2. Add relationships between components
3. Switch to Graph view → show visual connections
4. Drag nodes, auto-layout
5. Export graph as image
6. Show how it helps understand project structure

#### PROMO 5: Team Collaboration (60s)
**What to Show**: Real-time multi-user features
1. Show Activity Feed with 2+ users online
2. Assign todos → real-time notifications
3. Note locking (someone else editing)
4. Show team analytics/heatmaps
5. `/standup` command for daily updates

#### PROMO 6: Self-Hosted Freedom (30s)
**What to Show**: SELF_HOSTED=true features
1. Show deployment process (Railway/DO)
2. Highlight: "No rate limits, unlimited projects"
3. Show it's 100% free and open source
4. "You own your data"

**Recording Requirements**:
- Multiple demo accounts for collaboration videos
- 7+ days of tracked data for analytics
- Public projects set up for discovery features
- Clean, professional narration or text overlays
- Background music (royalty-free)

---

## **Optimization**:
```bash
# Convert MP4 to optimized GIF
ffmpeg -i input.mp4 -vf "fps=20,scale=1080:-1:flags=lanczos" -c:v pam -f image2pipe - | convert -delay 5 - -loop 0 -layers optimize output.gif

# Compress further with gifsicle
gifsicle -O3 --colors 256 output.gif -o final.gif
```

---

## Seed Data

**For PROMO Videos** (comprehensive project setup):
```bash
/add project --name="Recipe App" --description="Full-stack recipe sharing platform" --category="Web Application" --color="#10B981"
/swap @Recipe App
/add todo --title="JWT authentication" --priority=high --status=in_progress
/add todo --title="Recipe CRUD endpoints" --priority=high
/add todo --title="PostgreSQL schema" --priority=high
/add todo --title="Image upload to S3" --priority=medium
/add todo --title="Project setup" --priority=high --status=completed
/add note --title="Auth Architecture" --content="JWT 7-day expiry, refresh tokens in httpOnly cookies, Google OAuth"
/add note --title="Database Design" --content="PostgreSQL + Prisma. Users->Recipes (1:many), Users->MealPlans (1:many)"
/add note --title="API Design" --content="REST with /api/v1 prefix, cursor pagination, 100 req/min rate limit"
/add component --feature="Auth" --category=backend --type=service --title="Auth Service" --content="JWT authentication logic"
/add component --feature="Recipes" --category=backend --type=service --title="Recipe Service" --content="CRUD operations"
/add component --feature="Auth" --category=frontend --type=page --title="Login Page" --content="User login form"
/add component --feature="Recipes" --category=frontend --type=page --title="Recipe List" --content="Display all recipes"
/add relationship --source="Login Page" --target="Auth Service" --type=uses
/add relationship --source="Recipe List" --target="Recipe Service" --type=uses
/add relationship --source="Recipe Service" --target="Auth Service" --type=depends_on
/add stack --name="React" --category=framework --version="18"
/add stack --name="TypeScript" --category=runtime --version="5.0"
/add stack --name="PostgreSQL" --category=database --version="15"
/add stack --name="Prisma" --category=data --version="5.0"
/add devlog --title="Day 1: Setup" --content="React + Vite frontend, Express backend, TypeScript + ESLint"
/add devlog --title="Day 2: Auth" --content="Login/register endpoints, JWT middleware, Google OAuth integration"
```

---

## Production Checklist

**Pre-Recording (README GIFs)**:
- [ ] Test all commands for smooth execution
- [ ] Open LLM in separate tab (for GIF 2)

**Recording (README GIFs)**:
- [ ] GIF 1: Intro to Terminal (15s) - `/help` + autocomplete
- [ ] GIF 2: LLM Workflow (25s) - `/summary` → LLM → batch commands
- [ ] GIF 3: FeatureGraph (15s) - Show components/relationships from GIF 2

**Pre-Recording (PROMO Videos)**:
- [ ] Set up multiple demo accounts for collaboration features
- [ ] Populate project with 7+ days of tracked data (for analytics)
- [ ] Create public projects for discovery features
- [ ] Prepare narration script or text overlays
- [ ] Download royalty-free background music

**Recording (PROMO Videos)**:
- [ ] PROMO 1: The Complete Workflow (60s)
- [ ] PROMO 2: Speed Comparison (45s)
- [ ] PROMO 3: Social Discovery (30s)
- [ ] PROMO 4: Component Architecture (45s)
- [ ] PROMO 5: Team Collaboration (60s)
- [ ] PROMO 6: Self-Hosted Freedom (30s)

**Post-Production**:
- [ ] Convert MP4 → GIF for README (ffmpeg + gifsicle)
- [ ] Edit PROMO videos with narration/overlays
- [ ] Optimize GIF file sizes (<5MB per GIF)
- [ ] Upload GIFs to `media/gifs/` folder
- [ ] Upload PROMO videos to hosting (YouTube/Vimeo)
- [ ] Update README with GIF embeds
- [ ] Test all media links
