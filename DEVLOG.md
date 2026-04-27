## DevLog
### 2026-04-19: Reduce production CORS noise for raw-IP requests
Kept production CORS locked to the configured frontend domains, but changed rejected origins to be treated as expected operational 403s instead of surfacing as high-severity "Unexpected error" noise. Added a regression test to pin the `AppError` path used by CORS failures and documented that `CORS_ORIGINS` should contain canonical frontend origins, not the droplet IP.
Files: `backend/src/app.ts`, `backend/src/tests/error-handling.test.ts`, `README.md`, `WORK.md`

### 2026-04-19: Build-gated droplet deploy workflow
Added a CI build gate in front of production deploys. Pushes to `main` now build in GitHub Actions first, then SSH to the droplet, fast-forward pull, rebuild the `dev-codex` Compose service, and verify `https://dev-codex.com/health`. Also removed stale README deployment links and replaced them with the actual deploy flow.
Files: `.github/workflows/deploy.yml`, `README.md`, `WORK.md`

### 2026-03-27: Snake background, textContrastColor, project card accents
1. **BackgroundGrid**: Added 3 more templates per zone (7 left/right, 6 top/bottom). Snakes now track which templates are in use by siblings — `makeSnake` takes an `excludeIdxs` set so no two snakes in the same zone ever use the same template simultaneously. Fixed both initial assignment and regeneration.
2. **ProjectsPage textContrastColor cleanup**: Replaced all `getContrastTextColor("info/20")`, `"error/20"`, `"success/40"`, `"accent/20"` calls with proper `text-{color}` Tailwind classes. These were redundant — low-opacity DaisyUI backgrounds just need the semantic text class. Kept `getContrastTextColor(project.color)` for dynamic hex colors.
3. **Project card accent bars**: Replaced child `<div className="h-1.5">` color bars with `border-t-[3px]` + inline `borderTopColor` on the card itself. Eliminates clipping issues from `overflow-hidden` inside bordered rounded cards.
Files: `BackgroundGrid.tsx`, `ProjectsPage.tsx`

### 2026-03-26: Fix refund not demoting user plan
`handleRefund` only sent email + notification — never cancelled the Stripe subscription. Full refunds now call `stripe.subscriptions.cancel()`, which triggers the existing `customer.subscription.deleted` webhook → demotion to free. Partial refunds unchanged. `billing.ts`

### 2026-03-26: Fix URIError from malformed request paths
Added early middleware in `app.ts` to catch invalid URI encodings (e.g. `/%c0`) before Express router tries to decode them. Returns 400 instead of throwing URIError to Sentry. Triggered by bot/scanner traffic.

### 2026-03-24: Fix 5 email/notification bugs
1. Email "Notification Settings" link pointed to `/account` instead of `/account-settings` — all email footers were broken.
2. `prefsFooter` was a const string evaluated at module load — converted to a function so `FRONTEND_URL` is read at send time.
3. Password-changed email was gated by user's security preference — security emails should always send. Removed preference check.
4. Weekly summary counted ALL completed todos ever, not just this week. Added `completedAt` field to todo schema, set it in `/done` and `/edit todo --status=completed`. Weekly email now filters by `completedAt >= oneWeekAgo`.
5. Subscription cancelled email said "you'll keep access until [date]" but code had already downgraded user to Free. Fixed email text to say "your plan has ended."
Files: `emailService.ts`, `auth.ts`, `billing.ts`, `reminderService.ts`, `Project.ts`, `TodoHandlers.ts`, `test-email.ts`

### 2026-03-24: Email notifications + preferences system
Added 5 new email types: payment receipt, payment failed, refund processed, password changed, weekly summary. New Stripe webhook handler for `charge.refunded`. Enhanced `invoice.payment_failed` with email + in-app notification. All emails now gated by user `emailPreferences` (billing, payments, security, weeklySummary) — defaults all true. Added `PATCH /auth/email-preferences` endpoint. New "Notifications" tab in Account Settings with toggle UI. All emails include footer link to notification settings. Weekly summary cron runs Mondays 8:30 AM with project stats, todos, and activity breakdown. Password reset flow now sends confirmation email.
Files: `User.ts`, `shared/types/user.ts`, `backend/src/types/shared.ts`, `emailService.ts`, `billing.ts`, `auth.ts`, `reminderService.ts`, `frontend/api/auth.ts`, `AccountSettingsPage.tsx`

### 2026-03-24: Billing page cleanup + pricing alignment
Fixed pricing inconsistencies across entire codebase. Set official prices: Free/$0, Pro/$5, Premium/$15. Premium now unlimited projects (-1 instead of 50). Pro notes limit 200→100. BillingPage features updated from vague marketing copy to real limits (AI tokens, content caps, team sizes, analytics retention). Fixed setup-stripe.ts (Enterprise→Premium naming, $20→$15 price). Fixed emailService.ts prices ($10/$25 → $5/$15). Fixed billing.ts conversion value ($25→$15). Fixed .env.example var names. Updated README plan table, agent_spec.md, stripe-webhooks test.
Files: `BillingPage.tsx`, `billing.ts`, `planLimits.ts`, `emailService.ts`, `setup-stripe.ts`, `.env.example`, `README.md`, `agent_spec.md`, `stripe-webhooks.test.ts`

### 2026-03-23: Hard gate — no AI without project selected
Removed `!aiSessionId` from the no-project intercept condition. AI queries now always require a project, regardless of stale session state. Existing project picker + pending input replay flow handles the UX. `TerminalPage.tsx`

### 2026-03-23: Split AI API keys by tier (free vs paid)
Two Gemini API keys: `GEMINI_API_KEY_FREE` for free/demo users (3 queries/day, 2k char limit), `GEMINI_API_KEY` for pro/premium. Demo and free share the same free key pool. Unified rate limiting — removed separate demo AI limiter. `AIService.ts`, `aiHandler.ts`, `terminal.ts`, `.env.example`

### 2026-03-23: Ripped out SMTP/nodemailer, Resend-only email
DO blocks port 587. Removed nodemailer fallback entirely — emailService.ts now uses Resend SDK only. Cleaned up .env, .env.example, tests, mocks. `emailService.ts`, `emailService.test.ts`, `mocks.ts`, `auth.ts`, `.env.example`, `README.md`

### 2026-03-23: Mobile terminal toolbar buttons
Hid floating "New Output" button on mobile (redundant with nav bar). Made Usage (`$`) and Context (`Ctx`) buttons visible on mobile — were `hidden xl:` only. `TerminalPage.tsx`, `TerminalInput.tsx`

### 2026-03-23: Terminal page mobile QA fixes
Responsive pass on the terminal page — the flagship recruiter-facing screen. Changes: `h-screen` → `h-dvh` (fixes mobile browser chrome eating viewport), `viewport-fit=cover` + `env(safe-area-inset-bottom)` for iOS notch/home bar, autocomplete dropdown capped at `max-h-48` on mobile (was 320px, overflowed with keyboard open), tighter padding/gaps/font sizes below `sm` breakpoint across TerminalInput, AISessionBar, AIResponseRenderer, AIActionPreview, CommandResponse, WelcomeScreen. "New Output" scroll button repositioned higher on mobile. Timestamps hidden on mobile command echo to save horizontal space. AISessionBar idle text shortened on mobile ("Ready" vs full sentence).
Files: `Layout.tsx`, `index.html`, `TerminalPage.tsx`, `TerminalInput.tsx`, `AISessionBar.tsx`, `CommandResponse.tsx`, `WelcomeScreen.tsx`, `AIResponseRenderer.tsx`, `AIActionPreview.tsx`

### 2026-03-20: AI system prompt overhaul + test harness
Rewrote system prompt in `AIService.ts` for better small-model compliance: explicit actions-vs-message routing, stronger anti-invented-command rules, negative examples for queries, multi-entity cleanup example, idea vs feature distinction, batch inference rule. Added 11 few-shot examples (up from 9). Created `test-ai-prompts.ts` — standalone 48-test suite hitting Ollama directly to validate prompt quality. Tests cover every entity type (create/query/edit/delete/cleanup/suggest), multi-entity batching, follow-ups, off-topic, edge cases. Result: 98% pass on qwen2.5:3b (up from 67%). Files: `AIService.ts`, `test-ai-prompts.ts`.

### 2026-03-19: Deployed to droplet
SSL/HTTPS via certbot, rotated production secrets, set CORS_ORIGINS + FRONTEND_URL for dev-codex.com. Switched AI to Gemini API key.

### 2026-03-19: Site footer with portfolio + GitHub links
Added a footer to the main Layout with "Built by Lucas Froesch", link to froesch.dev, and GitHub profile. `Layout.tsx`

### 2026-03-19: Ollama GPU config + seed/demo/tutorial polish
Ollama dev fallback to `qwen2.5:3b`. Demo user improvements: tutorialCompleted false, 3 ideas, updated banner. Seed data cleanup.

### 2026-03-19: Add trust proxy for Docker/DO deploy
`app.set('trust proxy', 1)` — fixes per-IP rate limiting behind reverse proxy. `app.ts`

### 2026-03-18: Fix /health unreachable in production
Moved `/health` above catch-all `*` route. `app.ts`

### 2026-03-18: Demo overhaul — AI access, writable sandbox, repo rename, seed data
Demo AI with IP-based rate limiting (3/day). Demo writes unlocked (30/day). Data resets on each demo login. Repo renamed project-management → dev-codex. 3 showcase seed projects.

### 2026-03-18: README restructure for demo media
Hero section simplified. Core Features in collapsible `<details>` with screenshot placeholders. Created `media/screenshots/`.

### 2026-03-17: AI terminal bug fixes — streaming, context panel, project forwarding
Streaming raw JSON fix, entity context panel (zero AI tokens), AI cleanup prompt, stale closure fix.

### 2026-03-17: AI context gaps filled — deployment, relationships, ideas
Promoted deployment/relationships/ideas to full context entities in AIClassifier + AIContextBuilder.

### 2026-03-17: Git history cleanup
Squashed 5 commits into 4 clean ones. Untracked md_files/. Backup at `backup/ai-fixes-and-cleanup`.

### 2026-03-17: AI flow minor fixes
Entry ID collisions (→ crypto.randomUUID), streaming guard, double-confirm prevention.

### 2026-03-17: License switched to AGPL-3.0

### 2026-03-17: Socket.IO auth verified complete
JWT auth on room joins already implemented. Task closed.

### 2026-03-17: AI UX Overhaul — Streaming, Security, Polish
8 fixes: live streaming display, API key to header, markdown rendering, retry button, follow-up visibility, session persistence, End vs New Chat, deduplicated streaming.

### 2026-03-17: AI Conversation UX — Clarity & Onboarding
AISessionBar always visible, WelcomeScreen 3-step explainer, tutorial rewritten AI-first.

### 2026-03-16: Logging Cleanup + URL State / Back Button
Gutted Winston logging. Added `?tab=` URL param sync for all 10 tabbed pages.

### 2026-03-09: Production Hardening Complete
13/16 items: body size limit, API 404, failing tests, dailyTokensUsed, meta/OG tags, password hints, SSE error format, OAuth CSRF.

### 2026-03-06: Terminal Security Audit
6/7 fixes: session hijacking, SSE disconnect, unbounded confirms, clearAISession ownership, demo theme, AI timeout.

### 2026-02-23: Pre-Production Audit + AI/Terminal Overhaul
Security fixes, dead code removal (~800 lines), terminal redesign 4-phase overhaul, component → feature rebrand.

### 2026-02-17: Unified Export Commands
`/export`, `/summary`, `/download` aliased to `/context`. Removed ~800 lines dead code.

### 2026-02-16: AI Session UX + System Review
AISessionBar component. Project selection flow. AI system review (6 critical + 3 scalability concerns).

### 2026-02-13: AI Quality, Streaming, Phase 2 Commands
Switched to qwen2.5:7b, SSE streaming, context optimization, `/reset`, `/bridge`, `/context`, `/usage`.

### 2026-02-12: AI Integration — Phase 1
System prompt, multi-turn, AIContextBuilder, free tier blocking, rate limiting, token tracking, prompt sanitization.

### 2026-02-10: AI Integration Plan v3
AI-first terminal: natural language default, slash commands secondary.

### 2026-01-07: Initial Setup
Created WORK.md. Project status: 50+ commands, 130+ endpoints, 1000+ tests.
