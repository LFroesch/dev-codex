# Dev Codex

**A terminal-first project manager with a built-in AI assistant.**

Manage projects with slash commands or plain English. The AI reads your project context, proposes structured actions, and you confirm with one click. Export your entire project to any external LLM and get back executable commands you can paste and run.

**[Try the live demo](https://dev-codex.com)** | **[Self-host it](#self-hosting)**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tests](https://img.shields.io/badge/tests-1000%2B%20passing-success)](https://github.com/LFroesch/dev-codex)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

---

## How It Works

### 1. Terminal with 70+ Commands

![Terminal Intro](media/gifs/intro-terminal.gif)

Type `/help` to see every command. Tab-complete builds commands with flags and quoted values — no guessing syntax. Chain commands with `&&`, navigate history with arrow keys, or use `/wizard new` for guided setup.

### 2. Built-in AI Assistant

Type without a `/` prefix and the AI takes over. It reads your todos, notes, features, tech stack, and devlog — then proposes actions you approve with checkboxes.

- Multi-turn conversations with session persistence
- Gemini 2.5 Flash (prod) or Ollama (dev — free, runs locally)
- Streaming responses via SSE

### 3. The LLM Bridge

![LLM Workflow](media/gifs/llm-workflow.gif)

**Export** → `/context prompt all` copies your project as an AI-optimized prompt.
**Prompt** → Paste into Claude, ChatGPT, or any LLM. Ask it to generate Dev Codex commands.
**Run** → Paste the commands back. Idea to structured project in 30 seconds.

`/bridge` exports a command reference you can drop into CLAUDE.md, .cursorrules, or any AI system prompt.

---

## Features

**Project Management** — Todos with subtasks, priorities, due dates, dependencies. Notes with real-time edit locking. Dev logs. Ideas. Tech stack tracking. JSON import/export.

**Feature Graph** — Visualize your architecture as a draggable, zoomable node graph (ReactFlow). Map relationships between features.

**Analytics** — Session tracking with heartbeats and idle detection. Per-project time breakdowns, daily/weekly summaries, work heatmaps.

**Teams** — Owner/Editor/Viewer roles. Email invites. Real-time sync via Socket.io — live notifications, activity feed, presence indicators.

**Social & Discovery** — Public project profiles, follow system, favorites, threaded comments, discover feed. Custom slugs: `/discover/@user/project`.

**Admin Dashboard** — User management, support ticket Kanban, database tools, conversion analytics, announcements.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind + DaisyUI, TanStack Query, Socket.io, ReactFlow, @dnd-kit |
| **Backend** | Node.js, Express, TypeScript, MongoDB (30+ indexes, TTL), JWT + Google OAuth, Stripe, Socket.io, Resend, Sentry |
| **AI** | Gemini 2.5 Flash / Ollama (any OpenAI-compatible provider), structured JSON output, multi-turn sessions, context-aware prompts |
| **Security** | bcrypt, CSRF (csrf-csrf), XSS sanitization (DOMPurify), rate limiting, Helmet, input validation |

**200+ REST endpoints** — [API docs](md_files/READMEs/API.md) · **1000+ tests** (Jest) · **106k+ lines of TypeScript** · **14-step interactive onboarding**

---

## Quick Start

```bash
git clone https://github.com/LFroesch/dev-codex.git
cd dev-codex
npm install
cp backend/.env.example backend/.env  # Add MongoDB URI, JWT secret, etc.
npm run dev
```

Frontend: `http://localhost:5002` · Backend: `http://localhost:5003`

For local AI, install [Ollama](https://ollama.ai), run `ollama pull qwen2.5:3b`, and set `AI_ENABLED=true` in your `.env`. [Full Ollama setup guide →](md_files/READMEs/DEPLOYMENT.md#running-with-ollama)

---

## Self-Hosting

Set `SELF_HOSTED=true` and deploy anywhere — DO, AWS, Railway, your own server.

**What self-hosted mode unlocks:**
- Unlimited projects, team members, AI queries — no caps, no billing
- Stripe and email become optional
- You own the data and infrastructure

**Required env vars:** `MONGODB_URI`, `JWT_SECRET`, `CSRF_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`

[Full deployment guide →](md_files/READMEs/DEPLOYMENT.md)

---

## Hosted Plans

| Plan | Price | Projects | AI | Team |
|------|-------|----------|-----|------|
| **Free** | $0 | 3 | 3 queries/day | 3/project |
| **Pro** | $5/mo | 20 | 500k tokens/mo | 10/project |
| **Premium** | $15/mo | Unlimited | 2M tokens/mo | Unlimited |

---

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start frontend + backend |
| `npm run build` | Production build |
| `npm test` | Backend tests |
| `npm run test:all` | All tests |
| `npm run seed-demo` | Seed demo data |
| `npm run create-admin` | Create admin user |

---

## License

AGPL-3.0 — see [LICENSE](LICENSE)

**Issues:** [github.com/LFroesch/dev-codex/issues](https://github.com/LFroesch/dev-codex/issues)
