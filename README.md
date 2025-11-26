# Dev Codex

**The first project manager built for the AI era.**

Export your project to any LLM. Get back executable commands. Paste and run. Your entire project structure—built in seconds, not hours.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tests](https://img.shields.io/badge/tests-1100%20passing-success)](https://github.com/LFroesch/project-management)

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

**Stop clicking through forms. Start thinking in commands.**

Traditional project managers force you to manually create every task, note, and component through a UI. Dev Codex flips this: describe what you want to an LLM, get executable commands back, paste them in. Done.

### The LLM Loop (3 Steps)

![Dev Codex Terminal](media/DevCodex.png)

**1. Export project context**
```bash
/summary prompt all    # → Full project exported as AI-optimized prompt
```

**2. Get AI to generate or update your structure**
```
Paste into ChatGPT/Claude:

"Build a recipe app with auth, CRUD, and meal planning.
Stack: Next.js, PostgreSQL, Prisma, NextAuth
Create 12 todos for the full implementation..."

[AI returns 15 executable commands in 3 seconds]
```

**3. Paste commands back**
```bash
/add todo --title="Setup authentication" --priority=high
/add todo --title="Create recipe model"
/add note --title="Architecture" --content="Next.js 14 with Prisma"
/add component --feature="Auth" --category=backend
...paste 10 more commands, hit enter, done
```

**What just happened?** You went from idea to structured project in 30 seconds. Traditional tools take 20+ minutes of clicking.

*Supported: ChatGPT, Claude, any LLM. Self-host or use our hosted version.*

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

### **Browser-Native Terminal (50+ Commands)**
- **Lightning Fast:** Chain 10 commands in one paste—execute in <1s
- **Smart Autocomplete:** Tab completion learns your patterns
- **Batch Operations:** `/add todo "task 1" && /add note "doc" && /add devlog "progress"`
- **Interactive Wizards:** Prefer forms? Use `/wizard new` for guided setup
- **Workflow Helpers:** `/today`, `/week`, `/standup`, `/stale`, `/info`
- **Export Formats:** Markdown README, JSON, AI prompt, plain text
- **Full History:** Navigate with ↑/↓ arrows

### **Project Management**
- **Todos:** Subtasks, priorities, due dates, assignments, dependencies
- **Notes:** Real-time locking (10-min heartbeat prevents edit conflicts)
- **Dev Logs:** Daily progress journal with timestamps
- **Components:** Visual relationship graph (ReactFlow) with drag & zoom
- **Tech Stack:** Track technologies, packages, deployment config
- **Ideas:** Personal parking lot (separate from projects)
- **Import/Export:** JSON (100MB limit, XSS sanitized)

### **Social & Discovery**
- **Posts:** Share profile or project updates (public/followers/private)
- **Comments:** Threaded discussions on public projects (with replies)
- **Likes:** React to posts and comments
- **Follow System:** Follow users for feed updates
- **Favorites:** Bookmark projects, get notified on updates
- **Discover Feed:** Explore public projects by technology, category
- **Custom Slugs:** `/discover/@username/project-slug`

### **Team Collaboration**
- **3 Roles:** Owner / Editor / Viewer permissions
- **Email Invites** with token-based acceptance
- **Real-time Sync:** Socket.io (live notifications, activity feed, presence)
- **Activity Logs:** See who changed what, when
- **Team Analytics:** Time tracking, heatmaps, leaderboards
- **Note Locking:** Automatic conflict prevention

### **Analytics**
- **Session Tracking:** 10s heartbeats, 5-min idle detection
- **Time Breakdown:** Per-project hours, daily/weekly summaries
- **Heatmaps:** Visualize when you work on each project
- **Team Stats:** Leaderboards, contribution tracking
- **Feature Adoption:** See which features drive engagement
- **Retention Data:** 30/90/365-day windows (plan-based)

### **Admin Dashboard** *(Self-Hosted: Full Access)*
- User management (ban/unban, plan changes, password resets, refunds)
- Support tickets with Kanban board
- Database cleanup & optimization tools
- Analytics: conversion rates, user growth, feature adoption
- News/announcement system
- Performance recommendations

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

**API:** 130+ RESTful endpoints—[view full API docs](md_files/READMEs/API.md)

**Onboarding:** Interactive 14-step tutorial system for new users

---

## Quick Start

```bash
git clone https://github.com/LFroesch/project-management.git
cd project-management
npm install
cp backend/.env.example backend/.env  # Add your MongoDB URI, JWT secret, etc
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
