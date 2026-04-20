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
activity, and actively **taking action** on their data when they ask.
Tagline: *"Any person. Any goal. One AI that gets you there."*

## Tech Stack

### Frontend
- Next.js 16.2 (App Router, **webpack** dev bundler — NOT Turbopack)
- React 19 · TypeScript 5.7 · Tailwind v4 · shadcn/ui · motion/react (v12)
- Auth: Bearer token in localStorage (for Safari Private Mode support)

### Backend
- FastAPI 0.115 on port 8001, all routes `/api`-prefixed
- MongoDB (motor async)
- Auth: Emergent-managed Google OAuth → 7-day Bearer token
- **ALL LLM calls now use Claude Sonnet 4.6** via emergentintegrations +
  Emergent Universal LLM Key. One brain, not two.

## Core Architecture
```
Next.js (port 3000)           FastAPI (port 8001)
├── /login                    ├── /api/auth/{session, me, logout}
├── /                         ├── /api/goals (+ /{id}, /tasks/{id}/toggle)
├── /intake/                  ├── /api/intake/chat + /{goal_id}/history
├── /path/                    ├── /api/paths/{goal_id} + /today + /retry
├── /daily/ ← REAL PATH DATA  ├── /api/paths/{goal_id}/tasks/{task_id}/toggle
├── /goals, /coach, /calendar ├── /api/coach/chat (with 4-tool calling!)
├── /notes, /health, /settings├── /api/coach/history
└── CoachWidget (global orb)  ├── /api/activity (POST + /recent)
                              └── /api/notes (CRUD)

MongoDB: users, user_sessions, goals, paths, chat_messages, intake_messages,
         activity_events, notes
```

## What's Been Implemented

### Sessions 1–4 (previous agents) — foundation
- GitHub pull, env setup, framer-motion Turbopack fix, code-review security
  fixes (XSS, hook deps, etc.).
- FastAPI backend, Emergent Google OAuth, Safari Private Mode fix (Bearer
  tokens in localStorage), mobile-responsive coach/intake with dvh +
  safe-area insets.
- Conversational intake flow (`/api/intake/chat`) with Claude Sonnet 4.6 and
  server-side dedup/force-close at turn 8.
- Path Builder: goal → phases → milestones → steps → micro-tasks with
  Trust Layer "why this path" and per-task `why_today`.
- `/path` page renders the full hierarchy with the Trust Layer hero card.

### Session 5 (current session, Feb 2026) — Coach tool calling + /daily
- **P0 COMPLETE: Coach tool calling** — 4 real tools in `/api/coach/chat`:
    1. `complete_micro_task(task_id)` — marks done, triggers progress recalc
    2. `log_mood(task_id, mood)` — great/ok/drained on micro-task
    3. `reschedule_task(task_id, scheduled_date)` — YYYY-MM-DD or natural
        words (today / tomorrow / next monday / +3 days)
    4. `create_note(title, content, goal_id?)` — saves to notes, validated
        goal ownership
  Implementation: **few-shot message priming** (synthetic user/assistant
  pairs prepended to the conversation history) that pattern-locks Claude
  into emitting `<action>{tool, args}</action>` blocks. Claude had been
  fake-roleplaying actions in prose with the prompt-only approach; the
  few-shot lock produced 100% action-emission in end-to-end tests.

- **P0 COMPLETE: All LLM calls switched to Claude Sonnet 4.6** — coach +
  intake + path builder. Model rotation chain reordered with Claude first.

- **P1 COMPLETE: `/daily` wired to real path data** — fetches
  `GET /api/paths/{goal_id}/today`, renders the next incomplete micro-task
  with its `why_today`, milestone, and step title; the `Mood` selector now
  writes back via the toggle endpoint; the task checkbox marks complete and
  the page auto-advances to the next task. States for: loading / no active
  goal / no path yet / all-tasks-complete.

- **Bug fix in `goals-context.tsx`** — the activeGoalId persistence effect
  was wiping localStorage on first render because state initialised to null.
  Switched to lazy initialiser reading localStorage synchronously, plus
  default-to-first-active-goal on refresh if nothing stored.

## Prioritized Backlog

### P1 — next up
- [ ] **Wire `/notes` pages to the backend** — CRUD endpoints already exist,
      just migrate the pages off local/sample data.
- [ ] **Activity logging from the frontend** on meaningful UI actions
      (page navigation, task toggles, reflections) via POST /api/activity
      so the coach's context window stays rich.
- [ ] **Wire `/calendar` to real data** — need backend CRUD for calendar
      events first, then bind the weekly view.

### P2 — proactive coach
- [ ] Streaming coach responses via SSE (currently blocking POST).
- [ ] Scheduled check-ins: cron-style coach nudges in evening when day's
      tasks still incomplete.
- [ ] Escalate genuinely hard planning turns to Claude Opus 4.6.
- [ ] Surface coach action results as confirmation chips under assistant
      bubbles in the coach widget (the response already includes `actions`;
      frontend just ignores them).

### P3 — polish & maturity
- [ ] Light-mode visual QA pass.
- [ ] Production bundler (`next build && next start`).
- [ ] Component splits when they earn the split (NewNotePage,
      CoachChatPage, CalendarPage, etc).
- [ ] TypeScript coverage pass on older stub files.

## Next Action Items (for next agent)
1. Wire `/notes` pages to the already-working `/api/notes` CRUD endpoints.
2. Add frontend activity-log hooks on page navigation + key UI actions.
3. Build backend calendar-events CRUD, then wire `/calendar`.

## Critical Guardrails (DON'T violate)
- **Auth**: don't revert to cookies; localStorage Bearer tokens are required
  for Safari Private Mode support.
- **Mobile**: use `100dvh` + `env(safe-area-inset-bottom)`, never `h-screen`
  or `bottom-0` on fixed elements.
- **LLM**: always `emergentintegrations.llm.chat.LlmChat` with the
  EMERGENT_LLM_KEY. It's wrapper-only — no native tool-calling API. The
  few-shot-priming pattern in `/api/coach/chat` is the pattern to reuse if
  you add more tools.
- **Path builder**: Claude first, fallback order is
  `anthropic/claude-sonnet-4-6 → openai/gpt-4o → openai/gpt-4o-mini →
   gemini/gemini-2.0-flash`.
