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

### Session 4 — Intake Flow + Path Generation (shipped & confirmed working on mobile)
- Added `POST /api/intake/chat` — runs Claude Sonnet 4.6 with the MentorOS intake system prompt,
  enforces 5–7 question protocol, detects `[INTAKE_COMPLETE]` token.
- Server-side dedup + force-close at turn 8 so Claude can't trap users in an endless interview.
- Added background `_generate_and_save_path` task — on intake completion fires the Path Builder
  prompt against a model fallback chain (gpt-4o-mini → gemini-2.0-flash → gpt-4o → claude-sonnet-4-6)
  to survive gateway 502s / budget hiccups.
- New `paths` collection with the full Goal → Phases → Milestones → Steps → Micro-tasks hierarchy
  + `why_this_path` Trust Layer + `intake_summary` (starting_point, motivation, weekly_hours,
  past_attempts, constraints, learning_style, **preferred_time_of_day**) + `streak_count: 0` at
  goal level + `mood_today: null` on every micro-task.
- `GET /api/paths/{goal_id}` + `POST /api/paths/{goal_id}/retry` + `GET /api/paths`.
- Added proper prior-turn replay via `LlmChat.initial_messages` for BOTH intake and coach chat
  (was a silent bug before — Claude saw only the current message).
- Rebuilt `/app/intake/page.tsx` — real Claude conversation, "Building your path…" state,
  polls `/api/paths/{goal_id}` and redirects to `/path?goal_id=…` when ready.
- Rebuilt `/app/path/page.tsx` — renders the hierarchy with the Trust Layer card as a prominent
  gradient-bordered hero at the top, 4 stat pills (duration / weekly / tasks / streak), expandable
  phases/milestones, and per-micro-task `why_today` coaching line.

### Session 4b — Auth robustness pass (Safari Private Mode + mobile UX)
Shipped while iterating with the user on iOS Safari Private Mode:
1. **Hydration-safe OAuth callback** — read URL hash only inside `useEffect`, module-level Set of
   consumed `session_id`s to prevent React double-fire.
2. **Server-side session_id dedup** — backend caches the Emergent→session_token mapping so a
   concurrent/re-sent POST returns the same cookie instead of 401 (Emergent's session-data is
   single-use and 404s on 2nd call).
3. **CORS regex** — `https://.*\.(emergentagent\.com|emergentcf\.cloud)$` — preview proxy routes
   from `*.emergentagent.com` to `*.emergentcf.cloud` internally; the old explicit allow-list
   blocked the route.
4. **Relative API URLs** — API calls use same-origin paths so cookies are first-party to whatever
   preview hostname the user is on (e.g. `mentor-hub-141.preview.emergentagent.com`).
5. **Bearer-token auth in localStorage** — the REAL fix for Safari Private Mode. Backend already
   accepted `Authorization: Bearer`; frontend now stores the `session_token` in localStorage on
   login, sends it on every request, clears it on 401. Cookies still used as a belt-and-braces
   fallback for non-private browsers.
6. **Mobile layout fixes** — intake/coach inputs were hidden behind the bottom tab bar and Safari's
   URL bar. Moved to `bottom-[72px]` above mobile nav, added `env(safe-area-inset-bottom)` padding,
   switched full-height drawer from `h-screen` → `h-[100dvh]`, bumped coach orb above the nav.

Confirmed on iPhone Safari Private Mode: login → intake conversation → "Building your path…" →
redirect to `/path` with Trust Layer card rendering correctly.
