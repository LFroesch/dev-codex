# Dev Codex

Terminal-first project management with a built-in AI assistant.

Dev Codex lets you manage a software project through slash commands or plain-English prompts. The terminal is the primary interface, but the app also includes project views, analytics, collaboration features, and an AI workflow that proposes structured actions instead of directly mutating data.

**Live app:** [dev-codex.com](https://dev-codex.com)
**Portfolio:** [froesch.dev](https://froesch.dev)

## What it does

- Manage projects with slash commands, guided flows, and tab completion
- Track todos, notes, features, ideas, dev logs, and tech stack details
- Ask the AI questions about project state or have it draft safe, reviewable actions
- Export project context for external LLMs, then paste generated commands back in
- Collaborate with team roles, notifications, and shared project state
- View analytics, public project pages, and admin tooling

## Core workflow

1. Open a project in the terminal UI.
2. Use slash commands for direct actions like creating todos, switching projects, or exporting context.
3. Type plain English when you want the AI to interpret intent.
4. Review the AI response and confirm only the actions you want to run.

The AI path is intentionally approval-based. Queries stay as messages; mutations come back as explicit proposed commands.

## Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 18, TypeScript, Vite, Tailwind, DaisyUI |
| Backend | Node.js, Express, TypeScript, MongoDB, Mongoose |
| Realtime | Socket.IO |
| AI | Gemini 2.5 Flash in production, Ollama in development |
| Billing/Auth | Stripe, JWT, Google OAuth |

## Local development

Requirements:

- Node.js 20+
- npm 9+
- MongoDB

Install dependencies:

```bash
git clone https://github.com/LFroesch/dev-codex.git
cd dev-codex
npm install
npm install --prefix backend
npm install --prefix frontend
```

Set up environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Then update the values in:

- [`backend/.env.example`](backend/.env.example)
- [`frontend/.env.example`](frontend/.env.example)

Start the app:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5002`
- Backend: `http://localhost:5003`

## AI setup

Development defaults to Ollama. A practical local setup is:

```bash
ollama pull qwen2.5:3b
```

Use `OLLAMA_BASE_URL` if your Ollama instance is not on `http://localhost:11434`.

If you want hosted-model behavior locally, configure the Gemini variables in `backend/.env`.

## Scripts

Root scripts:

| Command | Purpose |
|---------|---------|
| `npm run dev` | Run frontend and backend together |
| `npm run build` | Install subproject deps and build frontend + backend |
| `npm test` | Run backend tests |
| `npm run test:frontend` | Run frontend tests once |
| `npm run test:all` | Run backend and frontend tests |
| `npm run test:coverage` | Backend coverage run |

Backend-only scripts:

| Command | Purpose |
|---------|---------|
| `npm run seed-demo --prefix backend` | Seed demo data |
| `npm run create-admin --prefix backend` | Create an admin user |
| `npm run reset-password --prefix backend` | Reset a user password |
| `npm run setup-stripe --prefix backend` | Create Stripe products/prices |

## Self-hosting

Set `SELF_HOSTED=true` if you want the product without hosted billing limits.

Important backend variables for deployment:

- `MONGODB_URI`
- `JWT_SECRET`
- `CSRF_SECRET`
- `FRONTEND_URL`
- `CORS_ORIGINS`

Email, OAuth, Stripe, and Sentry are optional depending on how complete a deployment you want.

## License

[AGPL-3.0](LICENSE)
