# MentorMeUp 2.0 — Product Requirements Document

## Original Problem Statement
> "can you pull the files from github repository mentormeup2.0?"
> → Continued with: "setting up the coach is the most important part of the whole app because it must be connected to every page and knowing every step the user does, also making changes to calendar, goals, paths, notes, guiding them through each step and making sure the user meets their goals and achieves their goals."

## Product Overview
**MentorMeUp** — an AI-powered personal goal-coaching web app. The AI Coach
is the product: present on every page, aware of the user's goals / tasks /
activity, and actively guiding the user toward completion. Tagline:
*"Any person. Any goal. One AI that gets you there."*

## Tech Stack
### Frontend
- Next.js 16.2 (App Router, **webpack** dev bundler, not Turbopack — see note below)
- React 19 · TypeScript 5.7 · Tailwind v4 · shadcn/ui · motion (v12) via `motion/react`
- Fonts: Syne (display) + JetBrains Mono (mono)
- State: React Context + direct API calls (no Redux)

### Backend
- FastAPI 0.115 on port 8001, all routes prefixed `/api`
- MongoDB (motor async driver), DB name `mentormeup_db`
- Auth: Emergent-managed Google OAuth → httpOnly session cookie (7-day expiry)
- LLM: **Claude Sonnet 4.6** via `emergentintegrations.llm.chat.LlmChat`
  using the Emergent Universal LLM Key

## Architecture
```
Next.js (port 3000)
├── /login                       — Google sign-in card
├── /                             — goal input / home
├── /intake, /path, /goals, /daily, /calendar, /coach, /notes, /health, /settings
└── CoachWidget (floating orb)    — globally mounted, always accessible

FastAPI (port 8001)
├── /api/health
├── /api/auth/{session, me, logout}
├── /api/goals (GET, POST)        ├── /api/goals/{id} (PATCH, DELETE)
├── /api/goals/{gid}/tasks/{tid}/toggle
├── /api/activity (POST)          ├── /api/activity/recent (GET)
├── /api/coach/chat (POST)        └── /api/coach/history (GET)

MongoDB collections
users, user_sessions, goals, chat_messages, activity_events
```

### Key design choices
- **Activity log first.** Every meaningful user action (`goal.created`,
  `task.completed`, etc.) is logged into `activity_events`, which the coach
  reads as context on every turn.
- **System prompt is rebuilt per turn** with live goal state + last 10
  activity events, so Claude always has a fresh, accurate picture.
- **Sessions via httpOnly cookies** with `Bearer` header as fallback — the
  fallback makes curl / Playwright / test-agent integration painless.

## Routes / Pages Present
- `/` — Landing (goal entry, protected)
- `/login` — Google sign-in (public)
- `/intake` — New goal intake flow
- `/path` — Learning path
- `/daily` — Daily view
- `/goals` — Goals list
- `/calendar` — Weekly calendar
- `/coach` — Full-page AI coach chat (in addition to global widget)
- `/notes`, `/notes/new`, `/notes/ai-summary`
- `/health`, `/health/connect`
- `/settings`

## What's Been Implemented

### Session 1 — Import (Jan/Apr 2026)
- Pulled private GitHub repo via Emergent's "Pull from GitHub" feature.
- Extracted `b_KqHAyaNywDu.zip` into `/app/frontend/`.
- Switched dependency manager from pnpm to yarn (per Emergent standard).
- Wired `yarn start` → `next dev --webpack -H 0.0.0.0 -p 3000`.
- Added preview domain to `allowedDevOrigins` in `next.config.mjs`.
- **Fixed framer-motion stuck `opacity: 0`** (known framer-motion 12 + React 19
  + Turbopack issue) by (a) swapping imports `"framer-motion"` → `"motion/react"`
  across 32 files and installing `motion@latest`, (b) switching bundler to webpack.

### Session 2 — Code-Review Fixes
- Replaced `dangerouslySetInnerHTML` in `app/layout.tsx` with an external
  `/public/theme-init.js` script to kill the XSS surface.
- Rewrote `contexts/goals-context.tsx` with functional `setState` updaters to
  eliminate stale-closure bugs; `useMemo`-wrapped context value; silent
  corrupt-localStorage recovery.
- Fixed `contexts/theme-context.tsx` with `useCallback` + `useMemo`.
- Fixed `hooks/use-toast.ts:174` dep array from `[state]` → `[]`.
- `useMemo`-wrapped `currentTimeTop` in `components/calendar/weekly-view.tsx`.
- Replaced array-index keys in `app/notes/page.tsx` and `app/health/page.tsx`.
- Removed lingering `console.log` + unused `Heart`/`TrendingUp` imports.

### Session 3 — AI Coach + Auth + Backend (THIS SESSION)
- **Built `/app/backend/` from scratch**: FastAPI + MongoDB + Emergent
  integrations. All `/api` routes listed above, full auth middleware, activity
  logging, context-aware chat.
- **Integrated Emergent Google OAuth** end-to-end:
  - `/login` page with Google CTA.
  - `OAuthCallbackHandler` detects `#session_id=…` synchronously during render
    (beats race with `/api/auth/me`) and exchanges via `POST /api/auth/session`.
  - httpOnly cookie `session_token` with `secure + samesite=none`.
  - `AuthGate` component redirects all non-public routes to `/login`.
- **Integrated Claude Sonnet 4.6** via the Emergent Universal LLM Key using
  `emergentintegrations.llm.chat.LlmChat`. System prompt is rebuilt per turn
  with user name + active goals + last 10 activity events.
- **Migrated `goals-context`** from localStorage to API (keeps the same
  external interface so existing pages keep working; now `addGoal` etc. are
  `async`).
- **Built `CoachProvider` + `CoachWidget`** — a floating gold orb mounted
  globally in the root layout, opens a right-side drawer with full chat UI,
  shows existing history, sends messages, optimistic user bubble, typing dots
  while waiting, persists both turns.
- **Testing**: 19 backend + 6 frontend E2E tests all pass (iteration_1.json).
  Coach returns real Claude replies within ~4–6s referencing user's actual
  goals and name.

## Prioritized Backlog

### P0 — coach upgrades (next session)
- [ ] **Tool / function calling for the coach.** Let Claude emit structured
      action commands (`create_goal`, `toggle_task`, `add_calendar_event`,
      `create_note`) that the backend parses and executes. Currently the coach
      can only *speak* — it can't yet *do*.
- [ ] **Wire the other pages to the backend.** Notes, calendar, intake, and
      daily are still using sample/local data. Expose real CRUD endpoints and
      migrate the contexts.
- [ ] **Activity logging from the frontend** on meaningful UI actions
      (selecting a goal, opening a page, completing a daily reflection) via
      `POST /api/activity`.

### P1 — proactive coach
- [ ] Streaming responses via SSE instead of blocking POST.
- [ ] Periodic check-ins: scheduled coach messages when the user hasn't
      completed today's tasks by evening.
- [ ] Escalate genuinely hard planning turns to Claude **Opus 4.7**.

### P2 — polish & maturity
- [ ] Light-mode visual QA.
- [ ] Production bundler: `next build && next start` + re-enable Turbopack
      once framer-motion fixes the React 19 dev stall (motion repo #2668).
- [ ] Split the 600-line page files when their logic grows (natural-boundary
      approach). Not a priority until there's real logic there.
- [ ] TypeScript coverage pass across stub files.

## Next Action Items
1. P0: add tool-calling so the coach can mutate state (the "makes changes to
   calendar, goals, paths, notes" user requirement).
2. Wire the Notes / Calendar APIs + migrate those pages.
3. Activity logging from the UI so the coach sees navigation + reflections.
