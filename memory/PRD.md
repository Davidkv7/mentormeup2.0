# MentorMeUp 2.0 — Product Requirements Document

## Original Problem Statement
> "can you pull the files from github repository mentormeup2.0?"

User provided a private GitHub repo (`https://github.com/Davidkv7/mentormeup2.0`) that contained the project as a zipped archive (`b_KqHAyaNywDu.zip`). Goal: clone/import the project into Emergent workspace and set it up so the user can continue building features.

## Product Overview
**MentorMeUp** — an AI-powered personal mentorship / goal-coaching web app.
Tagline: *"Any person. Any goal. One AI that gets you there."*

## Tech Stack (detected from imported codebase)
- **Framework**: Next.js 16.2.0 (App Router)
- **Language**: TypeScript 5.7
- **UI**: React 19, Tailwind CSS v4 (`@tailwindcss/postcss`), shadcn/ui (Radix primitives), lucide-react icons
- **Animation**: `motion` (v12, successor to framer-motion) — imported via `motion/react`
- **Forms/Validation**: react-hook-form + zod
- **Charts**: recharts
- **Fonts**: Syne (display) + JetBrains Mono (mono)
- **No backend yet** — all state lives in React contexts (localStorage persisted)

## Routes / Pages Present
- `/` — Landing (goal entry)
- `/intake` — New goal intake flow
- `/path` — Learning path
- `/daily` — Daily view
- `/goals` — Goals list
- `/calendar` — Weekly calendar
- `/coach` — AI coach chat
- `/notes`, `/notes/new`, `/notes/ai-summary`
- `/health`, `/health/connect`
- `/settings`

## What's Been Implemented (Jan 2026 — import session)
- Pulled private GitHub repo via Emergent's "Pull from GitHub" feature.
- Extracted `b_KqHAyaNywDu.zip` into `/app/frontend/`.
- Switched dependency manager from pnpm to yarn (per Emergent standard).
- Installed all dependencies via `yarn install`.
- Wired `yarn start` (used by supervisor) to `next dev --webpack -H 0.0.0.0 -p 3000`.
- Added `allowedDevOrigins` to `next.config.mjs` so the preview domain can access dev HMR.
- **Fixed framer-motion stuck `opacity: 0` bug**:
  - Root cause: framer-motion 12 stable + React 19 + Turbopack dev is a known-broken combination — `initial` state never transitions to `animate`.
  - Fix 1: Swapped import path from `"framer-motion"` → `"motion/react"` across all 32 `.tsx` files, and installed `motion@latest`.
  - Fix 2: Switched Next.js dev bundler from Turbopack (default in v16) to Webpack via `--webpack` flag.
- App verified running end-to-end: landing page animates in correctly, logo/tagline/input/CTA/goal chips all visible.

### Code-Review Fixes (Jan 2026 — session 2)
Applied the Critical + safer Important items from the `mentor-hub-141` review:
- **Security — removed `dangerouslySetInnerHTML`** in `app/layout.tsx`. Theme-init script moved to static `public/theme-init.js` and loaded via `<script src="/theme-init.js">` (still runs pre-hydration, no XSS surface).
- **Hook dependency bugs**:
  - `contexts/goals-context.tsx`: rewrote all callbacks to use functional `setState` updaters so closures can't go stale; wrapped the context value in `useMemo`; switched silent catch for localStorage parse; memoized `activeGoal`.
  - `contexts/theme-context.tsx`: wrapped `toggleTheme`/`setTheme` in `useCallback`, `useMemo`-ed context value, extracted `applyThemeToDocument` helper.
  - `hooks/use-toast.ts`: corrected subscribe effect's dep array from `[state]` → `[]` (was re-subscribing on every state change).
  - `components/calendar/weekly-view.tsx`: wrapped `currentTimeTop` in `useMemo` so the scroll effect only re-runs when its inputs change.
- **Array-index keys replaced with stable IDs**:
  - `app/notes/page.tsx`: `${selectedNote.id}-block-${index}-${block.type}` key on content blocks.
  - `app/health/page.tsx`: tooltip `payload.map` now keys on `entry.dataKey ?? entry.name`.
- **Cleanliness**:
  - Removed `console.log("Saving note:"…)` in `app/notes/new/page.tsx`.
  - Removed unused `Heart`, `TrendingUp` imports from `app/health/page.tsx`.
- Verified: `/`, `/notes`, `/health` all render with zero runtime errors after fixes.

## Architecture Notes / Deviations from Standard Emergent Template
- The default `/app/backend` (FastAPI) and MongoDB are **not used** by this project — the supervisor's `backend` program may log "No such file" style errors; that's expected since the imported app is frontend-only for now.
- Supervisor runs `yarn start` from `/app/frontend`, which we remapped to `next dev --webpack`.

## Prioritized Backlog (P0/P1/P2)
### P0 — Core functionality
- [ ] Wire up a real backend (FastAPI + MongoDB) for goals, notes, calendar events, coach chat, and user profile — currently all data is in React context / localStorage.
- [ ] Integrate an AI provider for the `/coach` conversational mentor and the `/notes/ai-summary` route (recommend Emergent Universal LLM Key + `emergentintegrations`).
- [ ] Add authentication (JWT or Emergent-managed Google OAuth).

### P1 — Product completeness
- [ ] Persist user goals across sessions (DB).
- [ ] Implement Intake flow → generates a personalized path via LLM.
- [ ] Implement Daily check-in + mood tracking persistence.
- [ ] Health integrations (Google Fit / Apple Health) — currently `/health/connect` is a stub.

### P2 — Polish
- [ ] Re-enable Turbopack once framer-motion / motion releases a fix for React 19 dev stall (track motion repo issues #2668, #2624).
- [ ] Production build pipeline (`next build && next start`).
- [ ] Light-mode visual QA pass.

## Next Action Items
1. Confirm with user which pages/features to prioritize next (AI coach? goal persistence? auth?).
2. On user's green-light, gather required API keys and integrate.
