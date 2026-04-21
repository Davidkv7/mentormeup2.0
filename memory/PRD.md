# MentorMeUp 2.0 — Product Requirements Document

## Original Problem Statement
> "can you pull the files from github repository mentormeup2.0?"
> → "setting up the coach is the most important part of the whole app because
>    it must be connected to every page and knowing every step the user does,
>    also making changes to calendar, goals, paths, notes, guiding them through
>    each step and making sure the user meets their goals and achieves their
>    goals."

## Product Overview
**MentorMeUp** — an AI-powered personal goal-coaching web app. The AI Coach
is the product: present on every page, aware of the user's goals / tasks /
activity / mood, and actively **taking action** (and now, **nudging
proactively**) on their data.

Tagline: *"Any person. Any goal. One AI that gets you there."*

## Tech Stack

### Frontend
- Next.js 16.2 (App Router, **webpack** dev bundler — NOT Turbopack)
- React 19 · TypeScript 5.7 · Tailwind v4 · shadcn/ui · motion/react (v12)
- Auth: Bearer token in localStorage (Safari Private Mode supported)

### Backend
- FastAPI 0.115 on port 8001, all routes `/api`-prefixed
- MongoDB (motor async)
- Auth: Emergent-managed Google OAuth → 7-day Bearer token
- **ALL LLM calls use Claude Sonnet 4.6** (one brain, not two)

## Core Architecture
```
Next.js (port 3000)                FastAPI (port 8001)
├── /login                         ├── /api/auth/{session, me, logout}
├── /                              ├── /api/goals (+ /{id}, /tasks/{id}/toggle)
├── /intake/                       ├── /api/intake/chat + /{goal_id}/history
├── /path/                         ├── /api/paths/{goal_id} + /today + /retry
├── /daily/  (real path data)      ├── /api/paths/{goal_id}/tasks/{task_id}/toggle
├── /goals, /coach, /calendar      ├── /api/coach/chat (with 4-tool calling)
├── /notes  (wired to backend)     ├── /api/coach/history
├── /calendar  (wired to backend)  ├── /api/coach/evening-checkin/run
└── CoachWidget (global orb)       ├── /api/activity (POST + /recent)
                                   ├── /api/notes (CRUD)
ActivityTracker (global, logs      └── /api/calendar/events (CRUD)
  page views)

MongoDB: users, user_sessions, user_state, goals, paths, chat_messages,
         intake_messages, activity_events, notes, calendar_events
```

### Session 7 — /coach full page wired
- **`/coach` full-page route** now reads from the real `CoachContext`
  (`/api/coach/history` + `/api/coach/chat`) instead of the hard-coded
  `initialMessages` mockup. Typing indicator (three bouncing cyan dots),
  gold/red action chips under assistant messages, live `activeGoal` +
  `currentPhaseLabel` in the header and right-sidebar "Current Goal" /
  "Today's Focus" cards. Input is disabled while `sending`. Empty-state
  greeting references the user's active goal by title.
- Env fix: bumped `pydantic>=2.12,<3` in `backend/requirements.txt` (was
  `2.10.3` which broke against the shipped `pydantic_core 2.41.x` —
  `ImportError: validate_core_schema`).
- Preview fix: switched supervisor to serve the production build
  (`yarn start` → `next start`, with `yarn build --webpack` as the build
  step) because the dev webpack `eval-source-map` bundle was ballooning
  to 12 MB and stalling React hydration behind the AuthGate Loading
  screen. `yarn dev` still available for live hot-reload sessions.

### Session 8 — Settings/Preferences + Struggle detection
- **`GET/PATCH /api/users/me/preferences`** — new `user_preferences` collection
  stores `display_name`, `timezone`, `coaching_style` (gentle/balanced/direct/
  tough), `message_frequency` (minimal/moderate/frequent),
  `proactive_checkins` (bool), `preferred_work_time` (morning/afternoon/
  evening/flexible). Display-name edits also mirror to `users.name` so the
  orb greeting and AuthContext pick it up.
- **Coach system prompt injection** — `COACH_SYSTEM_PROMPT` grew two new
  blocks (`PERSONAL TONE OVERRIDE` + `SCHEDULING PREFERENCE`) that are filled
  from `user_preferences` on every `POST /api/coach/chat`. Verified via the
  new `GET /api/coach/_debug/system-prompt` endpoint and by sending the same
  provocative user message under tough-vs-gentle: Claude's reply genuinely
  shifts tone ("Stop there. 'Restart next week' is the trap" → "That's the
  exhaustion talking, not the real you").
- **`GET /api/users/me/goal-context`** — returns each goal's intake user-
  answers so the Settings page can render a read-only "Your Goal Context"
  card. This is the trust-builder: users can see what the coach knows.
- **`DELETE /api/users/me`** — requires `{"confirmation":"DELETE"}` (exact
  casing). Writes an `account_deletion_audit` row FIRST (with per-collection
  counts), then cascades in the exact order requested: activity_events →
  notes → calendar_events → paths → goals → intake_messages → chat_messages
  → user_state → user_preferences → user_sessions → users. Verified: wrong
  casing → 400, correct casing → cascading delete + audit entry.
- **`/settings` page fully wired** — display-name input, timezone picker,
  coaching-style + message-frequency + preferred-work-time dropdowns,
  proactive-checkins toggle all read from and debounce-save to the new
  endpoints. "Your Goal Context" card shows intake answers per goal. Sign
  Out calls real logout. "Export My Data" stays disabled/"Coming soon".
  Delete button opens a modal requiring the typed literal "DELETE".
- **Struggle detection shipped**: `_process_struggle_for_user` +
  `run_struggle_detection` + `POST /api/coach/struggle-detection/run` +
  new background loop that runs every 15 minutes. Triggers when a user's
  next incomplete micro-task has been `task.viewed` 3+ times in the last
  24 hours with no `task.completed`. Writes a specific Claude nudge
  (e.g. *"I noticed you've opened 'Write 500 words of chapter 3' three
  times today without getting started — what's actually happening when you
  sit down to do it?"*) as a `chat_messages` doc with `kind:
  "struggle_nudge"`. Idempotent per-user-per-task-per-24h via
  `user_state.struggle_nudges`. Honors `proactive_checkins: false`. All
  five guard cases verified.
- Frontend: `api.delete` now accepts a body (needed for typed-DELETE
  confirmation payload).

### Session 9 — SSE streaming + gold orb pulse + timezone-aware evening check-in
- **SSE streaming coach**: new `POST /api/coach/chat/stream` endpoint backed
  by litellm `acompletion(stream=True)` through the Emergent proxy. Emits
  `user_message` / `delta` / `done` / `error` SSE events. `<action>...
  </action>` blocks are swallowed inside a buffer-aware filter so they never
  leak to the client. The non-streaming `/api/coach/chat` still works for
  parity; both share a new `_prepare_coach_turn` helper.
- **Frontend streaming consumption**: `openSSE(path, body)` in `lib/api.ts`
  drives the stream over fetch+ReadableStream (EventSource can't POST or set
  Authorization headers). `CoachContext` now exposes a `streaming` state
  plus a **character-by-character painter** running on
  `requestAnimationFrame` at ~250 chars/sec — Claude's proxy delivers deltas
  in 2-3 big bursts, the painter smooths them out so the UI reads like real
  word-by-word generation. Mobile-tested at 393x852px.
- **Smooth typing→stream transition**: both the widget and `/coach` page
  use `AnimatePresence mode="wait"` to cross-fade the typing indicator out
  and the streaming bubble (with a pulsing blue caret) in. Verified
  mid-stream on mobile with len=81 and len=204 captures.
- **Gold orb "coach reached out" pulse**: new backend endpoints
  `GET /api/coach/unread` (counts `struggle_nudge` + `evening_checkin`
  messages since `user_state.last_coach_seen_at`) and
  `POST /api/coach/mark-seen`. `CoachContext` polls every 60s and auto-
  marks-seen when the drawer opens or `/coach` page loads. `AnimatedOrb`
  gained an optional `pulse` prop; `CoachWidget` renders expanding gold
  rings + a red unread count badge around the floating orb when
  `unread.count > 0`.
- **Timezone-aware evening check-in** (fix for "any real user outside UTC
  is getting nudges at the wrong time or not at all"):
  `_process_evening_checkin_for_user` now reads each user's
  `preferences.timezone` (IANA name, default UTC), computes local time via
  `zoneinfo.ZoneInfo`, and only fires when local hour ∈ [20, 21).
  Idempotency stamped by `last_evening_checkin_local_date` (LOCAL date) +
  `last_evening_checkin_timezone` so travelling users don't double-fire
  near the date boundary. Honors `proactive_checkins: false`. Also honors
  DST automatically via IANA tz. Background loop now runs every 5 min
  unconditionally (per-user tz check is inside). Verified with four
  scenarios: Kiritimati-in-window→fires, NY-out-of-window→skips, opt-out
  →skips, tz-change-into-window→fires.
- **api.delete** supports bodies (used in session 8 for the DELETE
  account flow) — unchanged this session.

## What's Been Implemented

### Sessions 1–4 — Foundation
- GitHub pull, env setup, framer-motion Turbopack fix, code-review security
  fixes.
- FastAPI backend, Emergent Google OAuth with Safari Private Mode support
  (localStorage Bearer tokens), mobile-responsive coach/intake.
- Conversational intake flow + Path Builder (goal → phases → milestones →
  steps → micro-tasks) with Trust Layer "why this path" and per-task
  `why_today`.
- `/path` page renders the full hierarchy.

### Session 5 — Coach tool calling + /daily wiring
- **Coach tool calling** — 4 real tools (`complete_micro_task`, `log_mood`,
  `reschedule_task`, `create_note`) via few-shot message priming. 100%
  action emission.
- **All LLM calls switched to Claude Sonnet 4.6.**
- **`/daily` wired to real path data** — fetches `/today`, renders next
  incomplete micro-task, mood selector writes back, checkbox advances.
- Bug fix: `goals-context.tsx` lazy-init from localStorage.

### Session 6 — Action chips, activity logging, Notes, Calendar, Evening check-in
- **Action chips** in the coach drawer — the `actions` array on every
  assistant response now renders as gold pill chips (`✓ Marked "Easy 2k jog"
  complete`). Historical actions also load from `/api/coach/history`.
- **Activity logging** — new `lib/activity.ts` fire-and-forget helper +
  global `ActivityTracker` component logs `page.viewed` on every route
  change. `/daily` logs `task.viewed` (struggle signal) + `mood.logged`.
  `coach-context` logs `coach.message_sent`. Backend toggle endpoints
  continue to log `task.completed`/`task.updated` server-side. Coach tools
  log `*_by_coach` variants. Together these give the coach a rich timeline
  of user behaviour.
- **Notes pages wired** — `/notes` fetches `/api/notes` and groups by goal
  with AI-vs-Mine filter (by `from-coach` tag). Delete button works.
  `/notes/new` saves via POST, auto-derives title from content, logs
  `note.created` activity.
- **Calendar CRUD** — new MongoDB `calendar_events` collection.
  Endpoints: `GET /api/calendar/events?start=&end=`, `POST`,
  `PATCH /api/calendar/events/{id}`, `DELETE /api/calendar/events/{id}`.
  Frontend `/calendar` week view now loads real events for the visible
  range, creates/updates via modal, logs activity on every change. Delete
  button added to edit-mode modal.
- **Evening check-in (first proactive coaching behaviour)** — background
  loop runs every 5 minutes; between 20:00–21:00 UTC it scans every user
  with an active path whose today-task is still incomplete, generates a
  warm 2–3-sentence Claude nudge referencing the specific task and goal,
  persists it as an assistant chat_message with `kind: "evening_checkin"`,
  and marks the user's `user_state.last_evening_checkin_date` so the next
  poll is a no-op. Manual trigger: `POST /api/coach/evening-checkin/run`.

## Prioritized Backlog

### P1 — next up
- [ ] Ask whether to ship **streaming coach responses (SSE)** next, or pick
      from below.
- [ ] **Struggle detection** on top of activity log: when `task.viewed`
      count for a task_id exceeds N within 24 h with no `task.completed`,
      emit a proactive coach nudge ("You've looked at this three times
      today — what's blocking you?").
- [ ] **Timezone-aware evening check-in** — currently runs 20:00 UTC. Add a
      `timezone` field to the `user_state` doc (or users doc) and fire at
      20:00 local. Small but meaningful.

### P2 — polish
- [ ] Light-mode visual QA pass.
- [ ] Production bundler (`next build && next start`).
- [ ] Component splits on oversized pages (NewNotePage, CoachChatPage).
- [ ] Escalate Claude Opus 4.6 for heavy planning turns.
- [ ] Wire the `/coach` full-page route (currently just opens the widget).

## Next Action Items (for next agent)
1. Ship P1 struggle-detection logic on top of the activity log.
2. Add per-user timezone for a correct local 20:00 evening check-in.
3. Streaming coach responses (SSE).

## Critical Guardrails (DON'T violate)
- **Auth**: don't revert to cookies; localStorage Bearer tokens are
  required for Safari Private Mode support.
- **Mobile**: use `100dvh` + `env(safe-area-inset-bottom)`, never
  `h-screen` / `bottom-0`.
- **LLM**: always `emergentintegrations.llm.chat.LlmChat` with
  `EMERGENT_LLM_KEY`. No native tool-calling API — use the few-shot
  message priming pattern in `/api/coach/chat` if you add more tools.
- **Path builder fallback**: Claude first → GPT-4o → GPT-4o-mini → Gemini.
- **Background loops**: the evening check-in loop is the only background
  task. If you add more, they share the `@app.on_event("startup")`
  handler at the bottom of `server.py`.
