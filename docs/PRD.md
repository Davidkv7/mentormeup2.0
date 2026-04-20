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
