# Dev Codex

Full-stack SaaS for development teams with terminal-style interface, LLM integration, real-time collaboration, and automated analytics.

**Status:** 🚀 Production Ready | **Launch:** October 30, 2025

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tests](https://img.shields.io/badge/tests-434%20passing-success)](https://github.com/LFroesch/project-management)

---

## Quick Start

```bash
git clone https://github.com/LFroesch/project-management.git
cd project-management
npm install
cp backend/.env.example backend/.env  # Configure your credentials
npm run dev
```

**Dev:** <http://localhost:5002> (frontend) | <http://localhost:5003> (backend)

---

## What Makes It Different

### The Terminal (Power User Interface)

![Dev Codex Terminal](media/DevCodex.png)

**Dev Codex has a full CLI built into the browser** - this is the core differentiator. Use it however you want:

#### Option 1: LLM-Powered Workflow (BYOKey)

Use any LLM to generate batch commands for instant project scaffolding:

```bash
# Export project context (bidirectional workflow)
/summary prompt all          # Full project context for LLM
/summary prompt todos        # Just todos
/summary json components     # Components as JSON
/summary markdown stack      # Tech stack as markdown

# Get command reference
/llm                        # Returns command syntax guide
```

**Formats:** `prompt` (LLM-optimized) | `json` (API/export) | `markdown` (docs) | `text` (plain)

**Entities:** `all` | `todos` | `notes` | `devlog` | `components` | `stack` | `team` | `deployment` | `settings`

**Example LLM workflow:**

```
Prompt to ChatGPT/Claude:
"I want to build a recipe app with user auth, recipe CRUD, and meal planning.

Todos: setup auth, create recipe model, build recipe UI, add search filters
Notes: Architecture decisions, API design, database schema
Components: Auth service (backend), Recipe API (backend), Recipe UI (frontend) - Auth depends on Recipe API
Tech stack: Next.js 14, PostgreSQL, Prisma, NextAuth
Invite sarah@team.com as an editor

[paste /llm output]"

LLM responds with batch commands:
/add todo --title="Setup authentication" --priority=high --status=in_progress
/add todo --title="Create recipe database model" --priority=high
/add todo --title="Build recipe CRUD UI" --priority=medium
/add todo --title="Add search and filter functionality" --priority=low
/add note --title="Architecture Decisions" --content="Using Next.js 14 with App Router. PostgreSQL for relational data. Prisma as ORM. NextAuth for OAuth providers."
/add note --title="API Design" --content="RESTful endpoints:\n/api/recipes (GET, POST)\n/api/recipes/:id (GET, PUT, DELETE)\n/api/recipes/search (GET with query params)"
/add note --title="Database Schema" --content="Users: id, email, name, createdAt\nRecipes: id, userId, title, ingredients, instructions, cookTime\nMealPlans: id, userId, recipeId, date"
/add component --feature="Auth" --category=backend --type=service --title="Auth Service" --content="Handles user registration, login, JWT generation. Uses bcrypt for passwords, NextAuth for OAuth."
/add component --feature="Recipes" --category=backend --type=route --title="Recipe API" --content="CRUD operations for recipes. Validates user ownership before updates/deletes."
/add component --feature="Recipes" --category=frontend --type=page --title="Recipe List UI" --content="Displays recipes with search, filter, and pagination. Uses TanStack Query for data fetching."
/add relationship --source="Auth Service" --target="Recipe API" --type=depends_on --description="Recipe API requires Auth Service for user authentication"
/add stack --name="Next.js" --category=framework --version="14.0"
/add stack --name="PostgreSQL" --category=database --version="15"
/add stack --name="Prisma" --category=data --version="5.0"
/add stack --name="NextAuth" --category=auth --version="4.0"
/invite sarah@team.com --role=editor
```

**Copy → paste into terminal → instant project structure.** Then use `/summary prompt all` to export updated context back to your LLM for iteration.

*Future: Paid in-line AI with subscriptions. For now, it's self-serve (BYOKey).*

#### Option 2: Interactive Wizards

Prefer guided forms? Wizards walk you through complex operations:

```bash
/wizard project    # Guided project creation
/add todo          # Opens todo wizard with form fields
/edit todo 1       # Wizard with subtask management
```

#### Option 3: Learn the Syntax

Full autocomplete, validation, and syntax hints as you type. Chain commands:

```bash
/add todo --title="Fix bug" --priority=high && /complete 2 && /add devlog --title="Fixed auth"
```

#### Option 4: Skip It Entirely

**The terminal is optional.** Use the traditional UI with clicks and forms - all the same features are available. The terminal is for power users who want speed and automation.

---

### Real-Time Session Analytics

- Heartbeat tracking (10s intervals) with gap detection (ignores idle > 5 min)
- Per-project time breakdown across team members
- Activity heatmaps, usage patterns, leaderboards

### Public Project Discovery

- Custom slugs: `yoursite.com/public/project/@username/project-slug`
- Granular visibility control (description, tech stack, components, etc.)
- Search all public projects

### Comprehensive Admin Tools

User management, support tickets, analytics leaderboards, database cleanup, news announcements

---

## Core Features

- **Projects:** Todos, notes, dev logs, components (with relationships), tech stack tracking
- **Team:** Owner/Editor/Viewer roles, email invitations (7-day expiry), real-time notifications
- **Collaboration:** Note locking (10-min with heartbeat), Socket.io updates, activity logs
- **Import/Export:** JSON format (100MB limit, security sanitization)
- **Ideas Board:** User-level brainstorming (separate from projects)
- **Support Tickets:** Built-in ticketing with email notifications

---

## Complete API (100+ endpoints)

### Auth (`/api/auth`)
`POST /register` `POST /login` `GET /google` `GET /google/callback` `POST /logout` `POST /forgot-password` `POST /reset-password` `GET /me`

### Projects (`/api/projects`)
**Base:** `POST /` `GET /` `GET /:id` `PUT /:id` `PATCH /:id/archive` `DELETE /:id`
**Notes:** `POST /:id/notes` `PUT /:id/notes/:noteId` `DELETE /:id/notes/:noteId` `POST /:id/notes/:noteId/lock` `DELETE /:id/notes/:noteId/lock` `PUT /:id/notes/:noteId/lock/heartbeat` `GET /:id/notes/:noteId/lock`
**Todos:** `POST /:id/todos` `PUT /:id/todos/:todoId` `DELETE /:id/todos/:todoId`
**Dev Log:** `POST /:id/devlog` `PUT /:id/devlog/:entryId` `DELETE /:id/devlog/:entryId`
**Stack:** `POST /:id/technologies` `PUT /:id/technologies/:category/:name` `DELETE /:id/technologies/:category/:name` `POST /:id/packages` `PUT /:id/packages/:category/:name` `DELETE /:id/packages/:category/:name`
**Components:** `POST /:id/components` `PUT /:id/components/:componentId` `DELETE /:id/components/:componentId` `POST /:id/components/:componentId/relationships` `DELETE /:id/components/:componentId/relationships/:relationshipId`
**Team:** `GET /:id/members` `POST /:id/invite` `DELETE /:id/members/:userId` `PATCH /:id/members/:userId`
**Import/Export:** `GET /:id/export` `POST /import`

### Invitations (`/api/invitations`)
`GET /` `POST /:token/accept` `POST /:id/resend` `DELETE /:id`

### Notifications (`/api/notifications`)
`GET /` `PATCH /:id/read` `PATCH /read-all` `DELETE /:id` `DELETE /clear-all`

### Analytics (`/api/analytics`)
`POST /session/start` `POST /session/end` `POST /heartbeat` `POST /project/switch` `GET /me` `GET /projects/time` `GET /project/:id/team-time`

### Activity Logs (`/api/activity-logs`)
`GET /project/:projectId` `GET /project/:projectId/recent` `GET /project/:projectId/active-users` `GET /user/:userId` `POST /smart-join` `POST /log` `DELETE /project/:projectId/clear`

### Public (`/api/public`)
`GET /project/:slug` `GET /user/:username` `GET /projects`

### Ideas (`/api/ideas`)
`GET /` `POST /` `PUT /:id` `DELETE /:id`

### Tickets (`/api/tickets`)
`GET /` `POST /` `GET /:id` `PUT /:id` `DELETE /:id`

### Admin (`/api/admin`)
**Users:** `GET /users` `GET /users/:id` `PUT /users/:id/plan` `DELETE /users/:id` `POST /users/:id/password-reset`
**Projects:** `GET /projects` `GET /stats`
**Tickets:** `GET /tickets` `GET /tickets/:id` `PUT /tickets/:id` `DELETE /tickets/:id`
**Analytics:** `GET /analytics/combined` `GET /analytics/leaderboard` `DELETE /analytics/reset`
**Cleanup:** `GET /cleanup/stats` `GET /cleanup/recommendations` `POST /cleanup/run` `POST /cleanup/optimize` `POST /cleanup/emergency`

### News (`/api/news`)
`GET /` `GET /admin` `GET /:id` `POST /` `PUT /:id` `DELETE /:id`

### Billing (`/api/billing`)
`POST /create-checkout-session` `POST /webhook` `GET /info` `POST /cancel-subscription` `POST /resume-subscription`

### Terminal (`/api/terminal`)
`POST /execute` `GET /commands` `GET /projects` `POST /validate` `GET /suggestions`

### Health (`/api/`)
`GET /health` `GET /ready` `GET /live` `GET /csrf-token`

---

## Tech Stack

**Frontend:** React 18 + TypeScript + Vite | Tailwind + DaisyUI | TanStack Query | React Router v6 | Socket.io | ReactFlow | Sentry

**Backend:** Node.js + Express + TypeScript | MongoDB (30+ indexes, TTL) | JWT (HTTP-only, 7-day) + Passport + Google OAuth | Helmet + CSRF + Rate Limiting | Stripe | Socket.io | Nodemailer | node-cron | Winston + Sentry | Jest (434 tests, 35%)

**Collections:** users, projects, teammembers, projectinvitations, tickets, notifications, analytics (TTL: 7-365 days), usersessions, activitylogs (TTL: 90 days), notelocks (TTL: 10 min), newsposts, ratelimit (TTL: 15 min)

---

## Security (Grade: A-)

| Feature | Implementation |
|---------|---------------|
| **Passwords** | bcrypt (cost 12), 12+ char, complexity required |
| **Sessions** | JWT HTTP-only cookies, 7-day sliding expiry |
| **OAuth** | Google Sign-In (Passport.js) |
| **Password Reset** | Hashed tokens (bcrypt), 15-min expiry, enumeration prevention |
| **CSRF** | Double-submit cookie, enforced in production |
| **XSS** | Input sanitization, DOMPurify, CSP headers |
| **NoSQL Injection** | Parameterized queries, ObjectId validation |
| **Mass Assignment** | Whitelist fields, ownerId protected |
| **Rate Limiting** | Database-backed, per-user + per-IP |
| **Headers** | Helmet (CSP, HSTS 1yr, X-Frame, nosniff) |

**Rate Limits:** Auth 10/15min | Password reset 3/15min | Terminal 30/min | Tickets 5/hr | Import/Export 5/hr | Public 30/min | API 60/min | Admin 20/15min

---

## Plan Tiers

| Plan | Projects | Team Members | Analytics Retention |
|------|----------|--------------|---------------------|
| **Free** | 3 | 3/project | 7 days |
| **Pro** | 20 | 10/project | 90 days |
| **Enterprise** | Unlimited | Unlimited | 365 days |

Limits enforced on project creation and team invitations. Analytics auto-deleted after retention period (TTL indexes).

---

## Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/dev-codex

# Security (enforced on startup)
NODE_ENV=production
JWT_SECRET=<64-char-random>        # Min 32 chars
CSRF_SECRET=<64-char-random>       # Required in prod

# Frontend
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com

# OAuth
GOOGLE_CLIENT_ID=<from-console>
GOOGLE_CLIENT_SECRET=<from-console>
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email@gmail.com>
SMTP_PASS=<app-password>
SMTP_FROM=<email@gmail.com>

# Stripe (live keys enforced in prod)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=<price-id>
STRIPE_ENTERPRISE_PRICE_ID=<price-id>

# Monitoring
SENTRY_DSN=<dsn>
SUPPORT_EMAIL=<support@yourdomain.com>
```

**Generate secrets:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**Startup validation fails if:** JWT_SECRET < 32 chars | CSRF_SECRET missing/default in prod | STRIPE_SECRET_KEY doesn't start with sk_live_ in prod | Required env vars missing

---

## Deployment (Railway)

```bash
npm install -g @railway/cli
railway login && railway init && railway up
```

**Checklist:**
- [ ] `NODE_ENV=production`
- [ ] Generate JWT_SECRET & CSRF_SECRET (64 chars)
- [ ] Use Stripe live keys
- [ ] Set FRONTEND_URL & CORS_ORIGINS
- [ ] MongoDB Atlas or Railway MongoDB
- [ ] Sentry DSN
- [ ] Gmail app password for SMTP
- [ ] SUPPORT_EMAIL for tickets
- [ ] Stripe webhook: `https://yourdomain.com/api/billing/webhook`

**Post-deploy:** Test auth, project limits, team invites, terminal commands, billing, analytics, admin access, public projects

**Monitoring:** Sentry (errors) | Health checks (`/api/health`, `/api/ready`, `/api/live`) | Uptime (UptimeRobot, 5min intervals)

---

## Socket.io Events

**Client→Server:** `join-project` `leave-project` `join-user-notifications` `leave-user-notifications`

**Server→Client:** `note-locked` `note-unlocked` `note-updated` `project-updated`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend |
| `npm run build` | Build for production |
| `npm test` | Run backend tests |
| `npm run test:coverage` | Coverage report |
| `npm run create-admin` | Create admin user |
| `npm run setup-stripe` | Configure Stripe products |

---

## Testing (35% - Production Ready)

434 tests covering: Auth (70+) | Authorization (15+) | Billing/Stripe (10+) | Security (17+) | CRUD (50+) | Error handling (20+) | Terminal (10+) | Analytics (8+)

Focus: Integration tests over unit tests. Test business logic, not framework code. 30-40% = production ready.

---

## License

ISC

## Support

**Issues:** <https://github.com/LFroesch/project-management/issues> | **Deployment:** `md_files/current/LAUNCH.md` | **Email:** SUPPORT_EMAIL env var

**Built by a developer, for developers. Production ready.**
