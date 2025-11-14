# Dev Codex

**Project management that moves at the speed of thought—powered by AI collaboration.**

Build your entire project structure in seconds. Export context to any LLM. Import batch commands. Iterate endlessly. The fastest way to go from idea to execution.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tests](https://img.shields.io/badge/tests-434%20passing-success)](https://github.com/LFroesch/project-management)

---

## 🆓 Free & Open Source

**Clone it. Deploy it. It's yours. No strings attached.**

### Two Options:

**1. Self-Host (Free Forever)**
- Deploy anywhere (Railway, DO, AWS, your server)
- Set `SELF_HOSTED=true` → unlimited everything, no rate limits
- You control the data, infrastructure, and costs

**2. Use the Hosted Version**
- Production instance at [TBA]
- Optional paid plans for convenience
- Same features, but I handle deployment & monitoring
- Free tier: 3 projects to try it out

**Choose your path.** Self-hosting = control. Hosted = convenience. Both get the same great software.

---

## Why Dev Codex?

**The only project manager designed for the AI era.** Instead of manually clicking through forms, you collaborate with LLMs to build and iterate on your project structure at machine speed.

### The Magic: LLM-Powered Workflow

[GIF #1: Full LLM workflow - 25 seconds]
*Coming soon: Watch the complete loop from export → LLM → batch import*

![Dev Codex Terminal](media/DevCodex.png)

**Dev Codex has a full CLI built into the browser.** This isn't just a feature—it's a completely different way to work:

#### 1. Export Your Project Context to Any LLM
```bash
/summary prompt all          # Full project context
/summary json todos         # Just your todos
/llm                        # Get command syntax reference
```

#### 2. Paste Into ChatGPT/Claude
```
"Build a recipe app with auth, CRUD, and meal planning.
Todos: auth setup, recipe model, UI, filters
Stack: Next.js, PostgreSQL, Prisma, NextAuth
Invite sarah@team.com as editor

[paste /llm output for command syntax]"
```

#### 3. LLM Generates Batch Commands → Copy & Paste Back
```bash
/add todo --title="Setup authentication" --priority=high --status=in_progress
/add todo --title="Create recipe model" --priority=high
/add note --title="Architecture" --content="Next.js 14, Prisma ORM, PostgreSQL"
/add component --feature="Auth" --category=backend --title="Auth Service"
...and 10 more commands
```

**Result:** Instant project structure. Then export again with `/summary prompt all` to iterate. It's bidirectional planning at the speed of thought.

*Future: Paid in-app AI integration. For now, BYO LLM API key.*

---

### Terminal Autocomplete

[GIF #2: Autocomplete in action - 10 seconds]
*Coming soon: Watch guided autocomplete for fast, error-free commands*

Full autocomplete with validation and syntax hints as you type. Feels like a modern CLI, not a chatbot.

---

### Speed Demo

[GIF #3: 10 commands in 2 seconds - 8 seconds]
*Coming soon: Paste 10 commands, hit enter, watch instant execution*

**Paste. Execute. Done.** No clicking. No forms. No waiting.

---

### Other Ways to Use the Terminal

**Don't like terminals?** No problem:

- **Interactive Wizards:** `/wizard project` → guided forms for everything
- **Full Autocomplete:** Type `/add t` → autocomplete suggests `todo` → tab → `--title=""` → cursor jumps inside quotes
- **Traditional UI:** Every single feature works via point-and-click too

---

## Core Features

[GIF #4: Component Graph - 15 seconds]
*Coming soon: Watch relationship visualization, drag components, zoom & navigate*

### **Projects & Planning**
- **Todos** with subtasks, priorities, due dates, assignments
- **Notes** with real-time locking (prevent edit conflicts)
- **Dev Logs** for daily progress tracking
- **Components** with relationship graph visualization (ReactFlow)
- **Tech Stack** tracking (technologies, packages, deployment info)
- **Ideas** - Personal idea parking lot (separate from projects)
- **Import/Export** JSON (100MB limit, XSS sanitized)

### **Terminal Power**
- **50+ Commands** - Add, view, edit, delete, search anything
- **Batch Execution** - Chain 10 commands with `&&` or newlines
- **Full Autocomplete** - Tab completion for commands, flags, and values
- **Interactive Wizards** - Guided forms when you need them (`/wizard`)
- **Smart Search** - Full-text search across all content (`/search`)
- **Stale Reminders** - Surface forgotten todos/notes (`/stale`)
- **Workflow Commands** - `/today`, `/week`, `/standup` for daily planning
- **Summary Export** - 4 formats (markdown, JSON, AI prompt, text)

### **Team Collaboration**
- **Roles:** Owner / Editor / Viewer permissions
- **Email Invites** with token-based acceptance
- **Real-time Updates** via Socket.io (live notifications, activity feed)
- **Note Locking** with 10-min heartbeat (prevents conflicts)
- **Activity Logs** - See who's working on what, when
- **Team Analytics** - Time tracking per project, leaderboards

### **Analytics & Insights**
- **Session Tracking:** 10s heartbeats, 5-min idle detection
- **Time Breakdown:** Per-project hours, daily/weekly summaries
- **Heatmaps:** Visualize when you work on each project
- **Leaderboards:** Team productivity rankings
- **Feature Adoption:** Track which features users actually use

### **Public Sharing**
- **Custom Slugs:** `/public/@username/project-slug`
- **Granular Control:** Choose what's visible (todos, notes, components, etc.)
- **Discover Page:** Searchable directory of public projects

### **Admin Tools**
- User management (ban/unban, plan changes, password resets, refunds)
- Custom notification creator
- Support ticket system with Kanban board
- Database cleanup & optimization tools
- Analytics dashboard (conversion rates, user growth, feature adoption)
- News/announcement system

---

## Tech Stack

**Frontend:**
- React 18 + TypeScript + Vite
- Tailwind CSS + DaisyUI (themes)
- TanStack Query (data fetching)
- Socket.io Client (real-time)
- ReactFlow (component graph visualization)
- @dnd-kit (drag & drop)

**Backend:**
- Node.js + Express + TypeScript
- MongoDB with 30+ indexes, TTL collections
- JWT + Passport (Google OAuth)
- Stripe (billing)
- Socket.io (real-time updates)
- Resend (transactional emails)
- Sentry (error tracking)
- Jest (1000+ tests, ~50% coverage)

**Security:**
- bcrypt (password hashing)
- CSRF protection (csrf-csrf)
- XSS sanitization (DOMPurify)
- Rate limiting (express-rate-limit)
- Helmet (security headers)
- Input validation & sanitization

**API:** 100+ RESTful endpoints—[view full API docs](md_files/READMEs/API.md)

---

## Quick Start

```bash
git clone https://github.com/LFroesch/project-management.git
cd project-management
npm install
cp backend/.env.example backend/.env  # Add your MongoDB URI, JWT secret
npm run dev
```

**Dev URLs:** <http://localhost:5002> (frontend) | <http://localhost:5003> (backend)

---

## Deployment

**Self-Hosted (Railway example):**
```bash
npm install -g @railway/cli
railway login && railway init && railway up
```

**Required env vars:**
- `MONGODB_URI` (Atlas/Railway/your instance)
- `JWT_SECRET` & `CSRF_SECRET` (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `FRONTEND_URL` & `CORS_ORIGINS`
- `SELF_HOSTED=true` (disables rate limits & billing)

**Optional:**
- Email: `SMTP_*` **OR** `RESEND_API_KEY` (pick one or both - production uses Resend, self-hosted can use either)
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` for OAuth login
- `STRIPE_*` for billing (only needed if not self-hosted)
- `SENTRY_DSN` for error monitoring

**What `SELF_HOSTED=true` does:**
- ✅ Unlimited projects, team members, requests
- ✅ No billing/subscription features
- ✅ No rate limiting
- ✅ Stripe becomes optional (billing disabled)
- ✅ Email becomes optional (but recommended for invitations/password resets)

[Full deployment guide →](/md_files/READMEs/DEPLOYMENT.md#self-hosted-deployment)

---

## Plan Tiers

**Self-Hosted:** Unlimited everything when `SELF_HOSTED=true`

**Hosted Version:**
| Plan | Projects | Team Members | Terminal Commands | Analytics Retention |
|------|----------|--------------|-------------------|---------------------|
| **Free** | 3 | 3/project | ~10/min | 30 days |
| **Pro** | 20 | 10/project | 60/min | 90 days |
| **Premium** | Unlimited | Unlimited | 120/min | 365 days |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend |
| `npm run build` | Production build |
| `npm test` | Run backend tests |
| `npm run create-admin` | Create admin user |

---

## License

ISC

---

## Support

**Issues:** <https://github.com/LFroesch/project-management/issues>

**Built by a developer, for developers.**
