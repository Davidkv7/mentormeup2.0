"""
MentorMeUp backend — FastAPI + MongoDB + Claude Sonnet 4.6 via Emergent LLM key.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, AsyncGenerator, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from fastapi import Cookie, Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

load_dotenv()

# ------------------------------------------------------------------ config
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
EMERGENT_AUTH_SESSION_URL = os.environ["EMERGENT_AUTH_SESSION_URL"]
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
CORS_ORIGIN_REGEX = os.environ.get(
    "CORS_ORIGIN_REGEX",
    r"https://.*\.(emergentagent\.com|emergentcf\.cloud)$",
)

COACH_MODEL_PROVIDER = "anthropic"
COACH_MODEL_NAME = "claude-sonnet-4-6"
INTAKE_MODEL_PROVIDER = "anthropic"
INTAKE_MODEL_NAME = "claude-sonnet-4-6"
SESSION_DURATION_DAYS = 7

# ------------------------------------------------------------------ db
_mongo_client = AsyncIOMotorClient(MONGO_URL)
db = _mongo_client[DB_NAME]

# ------------------------------------------------------------------ models
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: str | None = None
    created_at: datetime


class MilestoneStatus(BaseModel):
    id: str
    title: str
    status: Literal["complete", "active", "locked"]


class GoalPhase(BaseModel):
    id: str
    title: str
    milestones: list[MilestoneStatus]


class GoalTask(BaseModel):
    id: str
    title: str
    duration: str
    completed: bool
    goal_id: str


class Goal(BaseModel):
    goal_id: str
    user_id: str
    title: str
    description: str | None = None
    color: Literal["gold", "cyan", "purple", "green", "red"] = "gold"
    status: Literal["active", "paused", "completed", "archived"] = "active"
    progress: int = 0
    phases: list[GoalPhase]
    current_phase: int = 1
    daily_tasks: list[GoalTask]
    created_at: datetime


class GoalCreate(BaseModel):
    title: str
    description: str | None = None
    color: Literal["gold", "cyan", "purple", "green", "red"] = "gold"


class GoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: Literal["active", "paused", "completed", "archived"] | None = None
    progress: int | None = None
    current_phase: int | None = None


class ChatMessage(BaseModel):
    message_id: str
    user_id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    message_id: str
    reply: str
    created_at: datetime
    actions: list[dict[str, Any]] = Field(default_factory=list)


class ActivityEvent(BaseModel):
    event_id: str
    user_id: str
    kind: str  # e.g. "goal.created", "task.completed", "note.added"
    summary: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class ActivityCreate(BaseModel):
    kind: str
    summary: str
    payload: dict[str, Any] = Field(default_factory=dict)


class AuthSessionRequest(BaseModel):
    session_id: str


# ---- Preferences ----
CoachingStyle = Literal["gentle", "balanced", "direct", "tough"]
MessageFrequency = Literal["minimal", "moderate", "frequent"]
PreferredWorkTime = Literal["morning", "afternoon", "evening", "flexible"]


class UserPreferences(BaseModel):
    display_name: str
    timezone: str = "UTC"
    coaching_style: CoachingStyle = "balanced"
    message_frequency: MessageFrequency = "moderate"
    proactive_checkins: bool = True
    preferred_work_time: PreferredWorkTime = "flexible"


class UserPreferencesUpdate(BaseModel):
    display_name: str | None = None
    timezone: str | None = None
    coaching_style: CoachingStyle | None = None
    message_frequency: MessageFrequency | None = None
    proactive_checkins: bool | None = None
    preferred_work_time: PreferredWorkTime | None = None


class DeleteAccountRequest(BaseModel):
    confirmation: str


# ------------------------------------------------------------------ helpers
GOAL_COLORS: list[str] = ["gold", "cyan", "purple", "green", "red"]


def _default_phases() -> list[dict[str, Any]]:
    return [
        {
            "id": "phase-1",
            "title": "Foundation & Clarity",
            "milestones": [
                {"id": "m1-1", "title": "Define success metrics", "status": "active"},
                {"id": "m1-2", "title": "Identify current baseline", "status": "locked"},
                {"id": "m1-3", "title": "Set first milestone target", "status": "locked"},
            ],
        },
        {
            "id": "phase-2",
            "title": "Build Momentum",
            "milestones": [
                {"id": "m2-1", "title": "Establish daily habits", "status": "locked"},
                {"id": "m2-2", "title": "Track progress for 2 weeks", "status": "locked"},
                {"id": "m2-3", "title": "First progress review", "status": "locked"},
            ],
        },
        {
            "id": "phase-3",
            "title": "Accelerate & Refine",
            "milestones": [
                {"id": "m3-1", "title": "Optimize approach", "status": "locked"},
                {"id": "m3-2", "title": "Push toward final goal", "status": "locked"},
                {"id": "m3-3", "title": "Celebrate completion", "status": "locked"},
            ],
        },
    ]


def _default_tasks(goal_id: str, goal_title: str) -> list[dict[str, Any]]:
    return [
        {
            "id": f"{goal_id}-task-1",
            "title": f"Review {goal_title} progress",
            "duration": "5 min",
            "completed": False,
            "goal_id": goal_id,
        },
        {
            "id": f"{goal_id}-task-2",
            "title": f"Work on {goal_title}",
            "duration": "30 min",
            "completed": False,
            "goal_id": goal_id,
        },
    ]


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ------------------------------------------------------------------ app
app = FastAPI(title="MentorMeUp API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or [],
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------ auth dep
async def get_current_user(
    session_token: str | None = Cookie(default=None),
    authorization: str | None = Header(default=None),
) -> User:
    token = session_token
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < _now():
        await db.user_sessions.delete_one({"session_token": token})
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)


# ------------------------------------------------------------------ auth routes
@app.post("/api/auth/session")
async def exchange_session(body: AuthSessionRequest, request: Request, response: Response):
    """Exchange Emergent session_id for a session_token, create/update user, set cookie.

    Deduplicates concurrent requests with the same session_id: if we've already
    consumed this id against Emergent's single-use endpoint in the last 60s,
    we reuse the resulting session_token instead of calling Emergent again
    (which would return 404 user_data_not_found).
    """
    import sys
    origin = request.headers.get("origin", "?")
    print(f"[auth.session] POST from origin={origin} session_id={body.session_id[:10]}…", flush=True, file=sys.stderr)

    # Check if we already processed this session_id (within the last 2 hours).
    existing = await db.user_sessions.find_one(
        {"emergent_session_id": body.session_id}, {"_id": 0}
    )
    if existing:
        expires_at = existing["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at >= _now():
            print(f"[auth.session] DEDUP hit — reusing existing session_token for session_id", flush=True, file=sys.stderr)
            response.set_cookie(
                key="session_token",
                value=existing["session_token"],
                httponly=True,
                secure=True,
                samesite="none",
                path="/",
                max_age=SESSION_DURATION_DAYS * 24 * 60 * 60,
            )
            user_doc = await db.users.find_one({"user_id": existing["user_id"]}, {"_id": 0})
            return {"user": User(**user_doc).model_dump(mode="json"), "session_token": existing["session_token"]}

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            EMERGENT_AUTH_SESSION_URL,
            headers={"X-Session-ID": body.session_id},
        )
    if r.status_code != 200:
        print(f"[auth.session] Emergent returned {r.status_code}: {r.text[:200]}", flush=True, file=sys.stderr)
        raise HTTPException(status_code=401, detail="Invalid Emergent session_id")
    data = r.json()
    print(f"[auth.session] Emergent OK: email={data.get('email')} name={data.get('name')}", flush=True, file=sys.stderr)
    email = data["email"]
    name = data["name"]
    picture = data.get("picture")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one(
            {
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "created_at": _now(),
            }
        )

    expires_at = _now() + timedelta(days=SESSION_DURATION_DAYS)
    await db.user_sessions.insert_one(
        {
            "user_id": user_id,
            "session_token": session_token,
            "emergent_session_id": body.session_id,
            "expires_at": expires_at,
            "created_at": _now(),
        }
    )

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_DURATION_DAYS * 24 * 60 * 60,
    )

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": User(**user_doc).model_dump(mode="json"), "session_token": session_token}


@app.get("/api/auth/me")
async def me(user: User = Depends(get_current_user)):
    return user.model_dump(mode="json")


@app.post("/api/auth/logout")
async def logout(
    response: Response,
    session_token: str | None = Cookie(default=None),
    authorization: str | None = Header(default=None),
):
    token = session_token
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"ok": True}


# ------------------------------------------------------------------ preferences
COACHING_STYLE_DESCRIPTIONS: dict[str, str] = {
    "gentle": (
        "Speak softly. Reassure before challenging. Lead with empathy, never pressure. "
        "Celebrate small wins. When they're struggling, normalise it before redirecting."
    ),
    "balanced": (
        "Warm but candid. Mix encouragement with honest pushback. Default tone."
    ),
    "direct": (
        "Cut to the point. Light on pleasantries, heavy on specifics. "
        "Tell them what to do next; don't dance around it."
    ),
    "tough": (
        "No hand-holding. Call out avoidance, excuses, weak plans directly. "
        "Respect them enough to be blunt. Brief. High standards. Still kind underneath."
    ),
}

PREFERRED_WORK_TIME_DESCRIPTIONS: dict[str, str] = {
    "morning": (
        "The user does their best deep work in the MORNING. When suggesting when to do "
        "a task or scheduling, default to morning slots. Frame evenings as recovery."
    ),
    "afternoon": (
        "The user does their best deep work in the AFTERNOON. Default new work slots "
        "to afternoon. Mornings are for warm-up and planning."
    ),
    "evening": (
        "The user does their best deep work in the EVENING. Default new work slots to "
        "evening. Don't push morning heavy work unless they ask."
    ),
    "flexible": (
        "The user hasn't picked a preferred focus window — ask before scheduling if "
        "timing matters."
    ),
}


def _default_preferences(user: User) -> UserPreferences:
    return UserPreferences(display_name=user.name)


async def _load_preferences(user: User) -> UserPreferences:
    doc = await db.user_preferences.find_one({"user_id": user.user_id}, {"_id": 0, "user_id": 0})
    if not doc:
        return _default_preferences(user)
    # Merge with defaults so missing fields don't break the model.
    base = _default_preferences(user).model_dump()
    base.update({k: v for k, v in doc.items() if v is not None})
    return UserPreferences(**base)


# =====================================================================
# USER MODEL — silent, always-updating behavioural profile
# =====================================================================
#
# One `user_model` doc per user. Updated inline (no LLM calls) after every
# task completion, mood log, coach message, nudge, and goal status change.
# At coach-chat time, `_build_behavioral_profile_lines` formats the fields
# with enough signal (n≥5) into a natural-language block that gets
# injected into the system prompt. Fields below the threshold are
# omitted — we never guess.
#
USER_MODEL_MIN_SIGNAL = 5          # global n threshold per field
LANGUAGE_TONE_WINDOW = 30          # last N user messages (recency > history)

# Simple deterministic keyword scorers. Updated via running avg over the
# last LANGUAGE_TONE_WINDOW user messages (stored as a short array on the
# user_model doc).
_TONE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "analytical": (
        "metric", "number", "framework", "data", "analyze", "analyse",
        "plan", "strategy", "optimize", "efficient", "system", "track",
        "measure", "process", "compare", "evaluate",
    ),
    "emotional": (
        "feel", "scared", "anxious", "tired", "worried", "stuck", "sad",
        "hope", "love", "hate", "frustrated", "overwhelmed", "exhausted",
        "doubt", "afraid", "joy", "nervous", "lonely", "angry", "upset",
    ),
    "action_oriented": (
        "do", "ship", "finish", "start", "move", "build", "execute",
        "launch", "now", "next", "today", "tomorrow", "tonight", "make",
        "complete", "run", "push",
    ),
}


def _score_tone(text: str) -> dict[str, float]:
    """Return {analytical, emotional, action_oriented} weights summing to 1.0
    for this one message. Ties broken by even split."""
    low = text.lower()
    scores = {k: 0.0 for k in _TONE_KEYWORDS}
    for k, words in _TONE_KEYWORDS.items():
        for w in words:
            if w in low:
                scores[k] += 1.0
    total = sum(scores.values())
    if total == 0:
        return {k: 1 / 3 for k in scores}
    return {k: v / total for k, v in scores.items()}


def _infer_task_kind(title: str) -> str:
    """Deterministic categorisation of a task for skip_patterns."""
    t = title.lower()
    if any(w in t for w in ("read", "article", "chapter", "book", "paper", "docs")):
        return "reading"
    if any(w in t for w in ("watch", "video", "course", "tutorial", "lecture")):
        return "watching"
    if any(w in t for w in ("write", "draft", "journal", "note", "essay", "outline")):
        return "writing"
    return "doing"


def _new_user_model_doc(user_id: str) -> dict[str, Any]:
    return {
        "user_id": user_id,
        "events_observed": 0,
        "actual_completion_times": {
            "hourly_histogram": {str(h): 0 for h in range(24)},
            "sample_size": 0,
        },
        "skip_patterns": {"by_kind": {}, "total_assigned": 0, "total_skipped": 0},
        "response_to_tone": {},
        "session_samples": [],     # last 100 msg timestamps for session_length calc
        "language_tone_window": [],  # list of {"a":..,"e":..,"o":..} weights, len<=30
        "dropout_risk_score": {"value": 0.0, "computed_at": None},
        "fastest_progress_weeks": {},  # iso_week -> {completed:int, tone:str, peak_hour:int}
        "goal_completion_pattern": {
            "completed_goals": 0,
            "abandoned_goals": 0,
            "furthest_phase_reached": 0,
            "phases_completed_on_abandon": [],  # list[int]
            "abandonment_triggers": {},  # {phase_transition: N, mid_phase: N, first_week: N}
        },
        "created_at": _now(),
        "updated_at": _now(),
    }


async def _get_user_model(user_id: str) -> dict[str, Any]:
    doc = await db.user_model.find_one({"user_id": user_id}, {"_id": 0})
    if doc:
        return doc
    fresh = _new_user_model_doc(user_id)
    await db.user_model.insert_one(fresh.copy())
    return fresh


async def _user_model_save(user_id: str, model: dict[str, Any]) -> None:
    model["updated_at"] = _now()
    await db.user_model.update_one(
        {"user_id": user_id}, {"$set": model}, upsert=True,
    )


async def _get_user_timezone(user_id: str) -> str:
    prefs = await db.user_preferences.find_one({"user_id": user_id}, {"_id": 0, "timezone": 1})
    return (prefs or {}).get("timezone") or "UTC"


async def _local_hour_now(user_id: str) -> int:
    tz_name = await _get_user_timezone(user_id)
    try:
        tz = ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        tz = timezone.utc
    return _now().astimezone(tz).hour


def _iso_week_of(dt: datetime) -> str:
    y, w, _ = dt.isocalendar()
    return f"{y}-W{w:02d}"


async def _was_nudge_within_24h(user_id: str) -> tuple[bool, str | None]:
    """Was a proactive nudge (struggle or evening) sent to this user in the
    last 24h? Returns (yes, user's coaching_style at time of answer)."""
    cutoff = _now() - timedelta(hours=24)
    doc = await db.chat_messages.find_one(
        {
            "user_id": user_id, "role": "assistant",
            "kind": {"$in": list(PROACTIVE_KINDS)},
            "created_at": {"$gte": cutoff},
        },
        {"_id": 0, "created_at": 1},
        sort=[("created_at", -1)],
    )
    if not doc:
        return False, None
    prefs = await db.user_preferences.find_one(
        {"user_id": user_id}, {"_id": 0, "coaching_style": 1},
    )
    return True, (prefs or {}).get("coaching_style") or "balanced"


async def _user_model_on_task_completed(user_id: str, task: dict[str, Any]) -> None:
    """Called after any task.completed event (toggle or coach tool)."""
    try:
        model = await _get_user_model(user_id)
        hour = await _local_hour_now(user_id)
        hist = model["actual_completion_times"]["hourly_histogram"]
        hist[str(hour)] = int(hist.get(str(hour), 0)) + 1
        model["actual_completion_times"]["sample_size"] = (
            model["actual_completion_times"].get("sample_size", 0) + 1
        )

        # skip_patterns: this task was assigned + now completed (not skipped).
        kind = _infer_task_kind(task.get("title", ""))
        skips = model["skip_patterns"]["by_kind"].setdefault(
            kind, {"assigned": 0, "skipped": 0},
        )
        skips["assigned"] = int(skips.get("assigned", 0)) + 1
        model["skip_patterns"]["total_assigned"] = (
            model["skip_patterns"].get("total_assigned", 0) + 1
        )

        # response_to_tone: count this completion against the tone in use at
        # the time, only if a proactive nudge happened in the last 24h.
        nudged, tone = await _was_nudge_within_24h(user_id)
        if nudged and tone:
            rt = model["response_to_tone"].setdefault(
                tone, {"nudges_sent": 0, "completed_in_24h": 0},
            )
            rt["completed_in_24h"] = int(rt.get("completed_in_24h", 0)) + 1

        # fastest_progress_weeks: tally completions by ISO week for later.
        week = _iso_week_of(_now())
        fw = model["fastest_progress_weeks"].setdefault(
            week,
            {"completed": 0, "tone_counts": {}, "peak_hour_counts": {str(h): 0 for h in range(24)}},
        )
        fw["completed"] = int(fw.get("completed", 0)) + 1
        fw["peak_hour_counts"][str(hour)] = int(fw["peak_hour_counts"].get(str(hour), 0)) + 1
        if tone:
            fw["tone_counts"][tone] = int(fw["tone_counts"].get(tone, 0)) + 1

        model["events_observed"] = int(model.get("events_observed", 0)) + 1
        await _user_model_save(user_id, model)
        await _user_model_recompute_dropout_risk(user_id)
    except Exception:  # noqa: BLE001
        pass  # never let a profile update fail the user-facing operation


async def _user_model_on_task_skipped(user_id: str, task: dict[str, Any]) -> None:
    """Count a skip when struggle detection confirms a task has been ignored."""
    try:
        model = await _get_user_model(user_id)
        kind = _infer_task_kind(task.get("title", ""))
        skips = model["skip_patterns"]["by_kind"].setdefault(
            kind, {"assigned": 0, "skipped": 0},
        )
        skips["skipped"] = int(skips.get("skipped", 0)) + 1
        skips["assigned"] = max(skips["skipped"], int(skips.get("assigned", 0)) + 1)
        model["skip_patterns"]["total_skipped"] = (
            model["skip_patterns"].get("total_skipped", 0) + 1
        )
        await _user_model_save(user_id, model)
    except Exception:  # noqa: BLE001
        pass


async def _user_model_on_user_message(user_id: str, text: str) -> None:
    """User-turn hook: updates language_tone (rolling window of 30) and
    session timing samples (for average_session_length)."""
    try:
        model = await _get_user_model(user_id)
        # Language tone: append score, cap at last 30.
        score = _score_tone(text)
        window = list(model.get("language_tone_window", []))
        window.append({
            "a": round(score["analytical"], 4),
            "e": round(score["emotional"], 4),
            "o": round(score["action_oriented"], 4),
        })
        window = window[-LANGUAGE_TONE_WINDOW:]
        model["language_tone_window"] = window

        # Session samples: keep last 120 message timestamps.
        samples = list(model.get("session_samples", []))
        samples.append(_now().isoformat())
        samples = samples[-120:]
        model["session_samples"] = samples
        await _user_model_save(user_id, model)
    except Exception:  # noqa: BLE001
        pass


async def _user_model_on_nudge_sent(user_id: str, kind: str, tone: str | None) -> None:
    try:
        if not tone:
            return
        model = await _get_user_model(user_id)
        rt = model["response_to_tone"].setdefault(
            tone, {"nudges_sent": 0, "completed_in_24h": 0},
        )
        rt["nudges_sent"] = int(rt.get("nudges_sent", 0)) + 1
        await _user_model_save(user_id, model)
    except Exception:  # noqa: BLE001
        pass


def _detect_abandon_trigger(path_doc: dict[str, Any] | None) -> tuple[str, int]:
    """Return (trigger, phases_completed_count) inferred from the path state."""
    if not path_doc:
        return "mid_phase", 0
    phases = path_doc.get("phases", []) or []
    phases_fully_done: list[int] = []
    for idx, ph in enumerate(phases):
        all_done = True
        any_done = False
        for ms in ph.get("milestones", []) or []:
            for st in ms.get("steps", []) or []:
                for t in st.get("micro_tasks", []) or []:
                    if t.get("completed"):
                        any_done = True
                    else:
                        all_done = False
            if not all_done:
                break
        if all_done and any_done:
            phases_fully_done.append(idx)
    completed_count = len(phases_fully_done)
    # Trigger heuristic: if the user completed a phase fully but did ZERO
    # tasks in the next phase, it's a phase_transition drop-off.
    if completed_count > 0 and completed_count < len(phases):
        next_phase = phases[completed_count]
        next_any = any(
            t.get("completed")
            for ms in next_phase.get("milestones", [])
            for st in ms.get("steps", [])
            for t in st.get("micro_tasks", [])
        )
        if not next_any:
            return "phase_transition", completed_count
    # First-week drop-off: no phase completed and created < 7 days ago.
    created = path_doc.get("created_at")
    if completed_count == 0 and isinstance(created, datetime):
        age_days = (_now() - created).days
        if age_days <= 7:
            return "first_week", 0
    return "mid_phase", completed_count


async def _user_model_on_goal_status_change(
    user_id: str, goal_doc: dict[str, Any], new_status: str,
) -> None:
    try:
        if new_status not in ("archived", "completed"):
            return
        model = await _get_user_model(user_id)
        pattern = model["goal_completion_pattern"]
        if new_status == "completed":
            pattern["completed_goals"] = int(pattern.get("completed_goals", 0)) + 1
        else:
            pattern["abandoned_goals"] = int(pattern.get("abandoned_goals", 0)) + 1
            path_doc = None
            if goal_doc.get("path_id"):
                path_doc = await db.paths.find_one(
                    {"path_id": goal_doc["path_id"]}, {"_id": 0},
                )
            trigger, phases_done = _detect_abandon_trigger(path_doc)
            pattern["phases_completed_on_abandon"] = (
                list(pattern.get("phases_completed_on_abandon", [])) + [phases_done]
            )
            pattern["furthest_phase_reached"] = max(
                int(pattern.get("furthest_phase_reached", 0)), phases_done,
            )
            trigs = pattern.setdefault("abandonment_triggers", {})
            trigs[trigger] = int(trigs.get(trigger, 0)) + 1
        await _user_model_save(user_id, model)
    except Exception:  # noqa: BLE001
        pass


async def _user_model_recompute_dropout_risk(user_id: str) -> None:
    """Light formula — no ML. Factors: days since last activity, number of
    incomplete tasks open, mood trend over last 7 days."""
    try:
        model = await _get_user_model(user_id)
        last_evt = await db.activity_events.find_one(
            {"user_id": user_id}, {"_id": 0, "created_at": 1},
            sort=[("created_at", -1)],
        )
        days_since = 0.0
        if last_evt and isinstance(last_evt.get("created_at"), datetime):
            created = last_evt["created_at"]
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            days_since = max(0.0, (_now() - created).total_seconds() / 86400)

        # Incomplete open tasks across active goals.
        incomplete = 0
        async for goal in db.goals.find(
            {"user_id": user_id, "status": "active"}, {"_id": 0, "path_id": 1},
        ):
            pid = goal.get("path_id")
            if not pid:
                continue
            p = await db.paths.find_one({"path_id": pid}, {"_id": 0, "phases": 1})
            if not p:
                continue
            for ph in p.get("phases", []) or []:
                for ms in ph.get("milestones", []) or []:
                    for st in ms.get("steps", []) or []:
                        for t in st.get("micro_tasks", []) or []:
                            if not t.get("completed"):
                                incomplete += 1

        # Mood trend: moods over last 7 days stored on path tasks.
        moods_7d: list[str] = []
        async for p in db.paths.find({"user_id": user_id}, {"_id": 0, "phases": 1}):
            for ph in p.get("phases", []) or []:
                for ms in ph.get("milestones", []) or []:
                    for st in ms.get("steps", []) or []:
                        for t in st.get("micro_tasks", []) or []:
                            m = t.get("mood_today")
                            if m:
                                moods_7d.append(m)
        trend = "flat"
        if moods_7d:
            weights = {"great": 3, "good": 2, "ok": 1, "meh": 0, "hard": -1, "drained": -2, "stuck": -2}
            if len(moods_7d) >= 4:
                first = sum(weights.get(m, 0) for m in moods_7d[: len(moods_7d) // 2])
                second = sum(weights.get(m, 0) for m in moods_7d[len(moods_7d) // 2 :])
                if second > first + 1:
                    trend = "up"
                elif second < first - 1:
                    trend = "down"

        # Final score 0..1. Weight days heaviest.
        score = min(1.0, (days_since / 7.0) * 0.6 + min(incomplete, 20) / 20.0 * 0.25 + (0.15 if trend == "down" else 0.0))
        model["dropout_risk_score"] = {
            "value": round(score, 3),
            "last_active_days_ago": round(days_since, 2),
            "incomplete_open_tasks": incomplete,
            "mood_trend_7d": trend,
            "computed_at": _now(),
        }
        await _user_model_save(user_id, model)
    except Exception:  # noqa: BLE001
        pass


def _derive_profile_facts(model: dict[str, Any]) -> list[str]:
    """Reduce raw user_model into the tight natural-language bullets we
    inject into the system prompt. Only emit a line when the underlying
    field has n >= USER_MODEL_MIN_SIGNAL."""
    lines: list[str] = []

    # Peak hour
    ct = model.get("actual_completion_times", {}) or {}
    if int(ct.get("sample_size", 0)) >= USER_MODEL_MIN_SIGNAL:
        hist = {int(k): int(v) for k, v in (ct.get("hourly_histogram") or {}).items()}
        peak_hour, peak_count = max(hist.items(), key=lambda kv: kv[1])
        morning = sum(v for h, v in hist.items() if 5 <= h < 12)
        evening = sum(v for h, v in hist.items() if 18 <= h < 24)
        total = sum(hist.values()) or 1
        if peak_count > 0:
            ratio_desc = ""
            if morning / total >= 0.55:
                ratio_desc = f" (morning person, {round(morning/total*100)}% of completions 05–12)"
            elif evening / total >= 0.55:
                ratio_desc = f" (evening person, {round(evening/total*100)}% of completions 18–24)"
            lines.append(f"- Peaks at: {peak_hour:02d}:00 local{ratio_desc}")

    # Skip patterns
    sp = (model.get("skip_patterns") or {}).get("by_kind") or {}
    ranked = [
        (k, v) for k, v in sp.items()
        if int(v.get("assigned", 0)) >= USER_MODEL_MIN_SIGNAL
    ]
    if ranked:
        ranked.sort(
            key=lambda kv: (int(kv[1].get("skipped", 0)) / max(1, int(kv[1].get("assigned", 0)))),
            reverse=True,
        )
        top_kind, top_stats = ranked[0]
        top_rate = int(top_stats.get("skipped", 0)) / max(1, int(top_stats.get("assigned", 0)))
        if top_rate >= 0.4:
            lines.append(
                f"- Weakest task type: {top_kind} ({round(top_rate*100)}% skip rate) — avoid suggesting this unless critical"
            )

    # Response to tone
    rt = model.get("response_to_tone") or {}
    eligible = {k: v for k, v in rt.items() if int(v.get("nudges_sent", 0)) >= USER_MODEL_MIN_SIGNAL}
    if eligible:
        def rate(v: dict[str, Any]) -> float:
            # Cap at 1.0: the user can complete more than one task per nudge
            # window (nudges_sent) but the success rate can't exceed 100%.
            return min(1.0, int(v.get("completed_in_24h", 0)) / max(1, int(v.get("nudges_sent", 0))))
        best_tone, best_stats = max(eligible.items(), key=lambda kv: rate(kv[1]))
        lines.append(
            f"- Responds best to: {best_tone} tone ({round(rate(best_stats)*100)}% completion within 24h of that tone)"
        )

    # Language tone (window-capped at last 30 messages)
    window = list(model.get("language_tone_window") or [])
    if len(window) >= USER_MODEL_MIN_SIGNAL:
        avg = {
            "analytical": sum(x["a"] for x in window) / len(window),
            "emotional": sum(x["e"] for x in window) / len(window),
            "action_oriented": sum(x["o"] for x in window) / len(window),
        }
        dom, dom_val = max(avg.items(), key=lambda kv: kv[1])
        if dom_val >= 0.42:  # must actually dominate, not just barely lead
            tone_prose = {
                "analytical": "analytical-dominant — ground replies in metrics, frameworks, concrete steps",
                "emotional": "emotional-dominant — acknowledge feeling first, then redirect to action",
                "action_oriented": "action-oriented — skip preamble, go straight to what to do next",
            }[dom]
            lines.append(f"- Language style: {tone_prose} (last {len(window)} messages)")

    # Dropout risk
    dr = model.get("dropout_risk_score") or {}
    val = dr.get("value")
    if isinstance(val, (int, float)):
        level = "LOW"
        if val >= 0.66:
            level = "HIGH"
        elif val >= 0.33:
            level = "MEDIUM"
        days = dr.get("last_active_days_ago")
        days_txt = f"{days:.1f}" if isinstance(days, (int, float)) else "?"
        lines.append(
            f"- Risk level: {level} ({val:.2f}) — last active {days_txt} days ago"
        )

    # Fastest progress conditions
    weeks = model.get("fastest_progress_weeks") or {}
    if weeks:
        best_week, best_stats = max(
            weeks.items(), key=lambda kv: int(kv[1].get("completed", 0)),
        )
        best_count = int(best_stats.get("completed", 0))
        if best_count >= USER_MODEL_MIN_SIGNAL:
            # Dominant tone + peak hour of that week.
            tone_counts = best_stats.get("tone_counts") or {}
            dom_tone = max(tone_counts.items(), key=lambda kv: kv[1])[0] if tone_counts else None
            hc = best_stats.get("peak_hour_counts") or {}
            peak_h = max(hc.items(), key=lambda kv: int(kv[1]))[0] if hc else None
            parts = [f"{best_count} tasks completed"]
            if peak_h is not None:
                parts.append(f"mostly around {int(peak_h):02d}:00")
            if dom_tone:
                parts.append(f"{dom_tone}-tone coaching")
            lines.append(f"- Fastest progress pattern: {', '.join(parts)}")

    # Goal completion / abandonment pattern — the "danger zone" line.
    gcp = model.get("goal_completion_pattern") or {}
    trigs = gcp.get("abandonment_triggers") or {}
    total_abandoned = int(gcp.get("abandoned_goals", 0))
    if total_abandoned >= 1 and trigs:
        top_trig, top_count = max(trigs.items(), key=lambda kv: kv[1])
        if top_count >= 1 and top_count / total_abandoned >= 0.5:
            labels = {
                "phase_transition": "drops off at phase transitions — pre-empt with a bridging message before Phase {n} starts",
                "first_week": "drops off within the first 7 days — the first week is the danger zone, reinforce consistency over intensity",
                "mid_phase": "drops off mid-phase — attention flags mid-stream, suggest shorter bursts",
            }
            tmpl = labels.get(top_trig, "has a past drop-off pattern at this point")
            next_phase_n = int(gcp.get("furthest_phase_reached", 0)) + 1
            lines.append(f"- Danger zone: {tmpl.format(n=next_phase_n)}")

    return lines


async def _build_behavioral_profile_block(user_id: str) -> str:
    """Returns the multi-line block for the coach system prompt, or an
    empty string if there isn't enough signal yet."""
    model = await db.user_model.find_one({"user_id": user_id}, {"_id": 0})
    if not model:
        return ""
    facts = _derive_profile_facts(model)
    if not facts:
        return ""
    body = "\n".join(facts)
    return (
        "# USER BEHAVIORAL PROFILE (live data — reference naturally, never announce)\n"
        f"{body}\n"
    )


@app.get("/api/users/me/preferences", response_model=UserPreferences)
async def get_preferences(user: User = Depends(get_current_user)):
    return await _load_preferences(user)


@app.patch("/api/users/me/preferences", response_model=UserPreferences)
async def patch_preferences(
    body: UserPreferencesUpdate,
    user: User = Depends(get_current_user),
):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        return await _load_preferences(user)
    updates["updated_at"] = _now()
    await db.user_preferences.update_one(
        {"user_id": user.user_id},
        {"$set": updates, "$setOnInsert": {"user_id": user.user_id, "created_at": _now()}},
        upsert=True,
    )
    # If they changed their display name, mirror it to the user doc so
    # /api/auth/me also reflects the change.
    if "display_name" in updates:
        await db.users.update_one(
            {"user_id": user.user_id}, {"$set": {"name": updates["display_name"]}}
        )
    await _log_activity(
        user.user_id,
        "preferences.updated",
        "Updated coaching preferences",
        {"fields": list(updates.keys())},
    )
    return await _load_preferences(user)


# ------------------------------------------------------------------ goal context (for settings page)
@app.get("/api/users/me/goal-context")
async def get_goal_context(user: User = Depends(get_current_user)):
    """Read-only summary of what the coach knows about the user — their intake
    answers, goal by goal. Shown on the Settings page so users can verify the
    coach's understanding."""
    goals_cursor = (
        db.goals.find({"user_id": user.user_id}, {"_id": 0})
        .sort("created_at", 1)
    )
    goals = [g async for g in goals_cursor]

    result: list[dict[str, Any]] = []
    for goal in goals:
        msgs_cursor = (
            db.intake_messages.find(
                {"goal_id": goal["goal_id"], "user_id": user.user_id, "role": "user"},
                {"_id": 0, "content": 1, "created_at": 1},
            ).sort("created_at", 1)
        )
        user_answers = [
            {
                "content": m["content"],
                "created_at": (
                    m["created_at"].isoformat() if isinstance(m["created_at"], datetime)
                    else m["created_at"]
                ),
            }
            async for m in msgs_cursor
        ]
        result.append({
            "goal_id": goal["goal_id"],
            "title": goal["title"],
            "status": goal.get("status", "active"),
            "intake_status": goal.get("intake_status", "not_started"),
            "created_at": (
                goal["created_at"].isoformat() if isinstance(goal.get("created_at"), datetime)
                else goal.get("created_at")
            ),
            "user_answers": user_answers,
        })
    return {"goals": result}


# ------------------------------------------------------------------ delete account
@app.delete("/api/users/me")
async def delete_account(
    body: DeleteAccountRequest,
    response: Response,
    user: User = Depends(get_current_user),
):
    """Cascading, auditable account deletion. The client MUST send
    `{"confirmation": "DELETE"}` — any other value is rejected."""
    if body.confirmation != "DELETE":
        raise HTTPException(
            status_code=400,
            detail="Confirmation text must be exactly 'DELETE' (all caps).",
        )

    # Pre-compute counts so the audit log captures what we removed.
    counts = {
        "activity_events": await db.activity_events.count_documents({"user_id": user.user_id}),
        "notes": await db.notes.count_documents({"user_id": user.user_id}),
        "calendar_events": await db.calendar_events.count_documents({"user_id": user.user_id}),
        "paths": await db.paths.count_documents({"user_id": user.user_id}),
        "goals": await db.goals.count_documents({"user_id": user.user_id}),
        "intake_messages": await db.intake_messages.count_documents({"user_id": user.user_id}),
        "chat_messages": await db.chat_messages.count_documents({"user_id": user.user_id}),
    }

    # 1) Write the audit trail BEFORE touching anything. If the audit write
    #    fails, we abort — irreversible actions require a trail.
    audit_doc = {
        "audit_id": f"audit_{uuid.uuid4().hex[:12]}",
        "action": "account.deleted",
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "deleted_at": _now(),
        "counts": counts,
    }
    await db.account_deletion_audit.insert_one(audit_doc)

    # 2) Cascade delete in the exact order David asked for:
    #    activity_events → notes → calendar_events → paths → goals → user.
    #    (We also clean up derivative collections — intake_messages,
    #    chat_messages, user_state, user_preferences, user_sessions — before
    #    the user doc so no orphans remain.)
    await db.activity_events.delete_many({"user_id": user.user_id})
    await db.notes.delete_many({"user_id": user.user_id})
    await db.calendar_events.delete_many({"user_id": user.user_id})
    await db.paths.delete_many({"user_id": user.user_id})
    await db.goals.delete_many({"user_id": user.user_id})
    await db.intake_messages.delete_many({"user_id": user.user_id})
    await db.chat_messages.delete_many({"user_id": user.user_id})
    await db.user_state.delete_many({"user_id": user.user_id})
    await db.user_preferences.delete_many({"user_id": user.user_id})
    await db.user_sessions.delete_many({"user_id": user.user_id})
    await db.users.delete_one({"user_id": user.user_id})

    # 3) Clear the auth cookie so the client can't keep pretending to be
    #    signed in after their user row is gone.
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"ok": True, "audit_id": audit_doc["audit_id"], "deleted": counts}


# ------------------------------------------------------------------ goals
@app.get("/api/goals")
async def list_goals(user: User = Depends(get_current_user)):
    cursor = db.goals.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", 1)
    goals = [doc async for doc in cursor]
    return goals


@app.post("/api/goals")
async def create_goal(body: GoalCreate, user: User = Depends(get_current_user)):
    count = await db.goals.count_documents({"user_id": user.user_id})
    color = body.color or GOAL_COLORS[count % len(GOAL_COLORS)]
    goal_id = f"goal_{uuid.uuid4().hex[:12]}"
    goal = {
        "goal_id": goal_id,
        "user_id": user.user_id,
        "title": body.title,
        "description": body.description,
        "color": color,
        "status": "active",
        "progress": 0,
        "phases": _default_phases(),
        "current_phase": 1,
        "daily_tasks": _default_tasks(goal_id, body.title),
        "created_at": _now(),
    }
    await db.goals.insert_one(goal)
    await _log_activity(
        user.user_id,
        "goal.created",
        f"Created goal: {body.title}",
        {"goal_id": goal_id, "title": body.title},
    )
    return await db.goals.find_one({"goal_id": goal_id}, {"_id": 0})


@app.patch("/api/goals/{goal_id}")
async def update_goal(goal_id: str, body: GoalUpdate, user: User = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    before = await db.goals.find_one(
        {"goal_id": goal_id, "user_id": user.user_id}, {"_id": 0},
    )
    if not before:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.goals.update_one(
        {"goal_id": goal_id, "user_id": user.user_id},
        {"$set": updates},
    )
    await _log_activity(
        user.user_id,
        "goal.updated",
        f"Updated goal: {goal_id}",
        {"goal_id": goal_id, "updates": updates},
    )
    # User model: track archive/completion as an abandonment/completion event.
    new_status = updates.get("status")
    if new_status and new_status != before.get("status") and new_status in ("archived", "completed"):
        await _user_model_on_goal_status_change(user.user_id, before, new_status)
    return await db.goals.find_one({"goal_id": goal_id}, {"_id": 0})


@app.delete("/api/goals/{goal_id}")
async def delete_goal(goal_id: str, user: User = Depends(get_current_user)):
    before = await db.goals.find_one(
        {"goal_id": goal_id, "user_id": user.user_id}, {"_id": 0},
    )
    result = await db.goals.delete_one({"goal_id": goal_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    # Deletion while goal was active/paused counts as abandonment.
    if before and before.get("status") in ("active", "paused"):
        await _user_model_on_goal_status_change(user.user_id, before, "archived")
    await _log_activity(
        user.user_id, "goal.deleted", f"Deleted goal: {goal_id}", {"goal_id": goal_id}
    )
    return {"ok": True}


@app.post("/api/goals/{goal_id}/tasks/{task_id}/toggle")
async def toggle_task(goal_id: str, task_id: str, user: User = Depends(get_current_user)):
    goal = await db.goals.find_one({"goal_id": goal_id, "user_id": user.user_id}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    tasks = goal["daily_tasks"]
    toggled = None
    for task in tasks:
        if task["id"] == task_id:
            task["completed"] = not task["completed"]
            toggled = task
            break
    if toggled is None:
        raise HTTPException(status_code=404, detail="Task not found")

    completed_count = sum(1 for t in tasks if t["completed"])
    progress = round((completed_count / len(tasks)) * 100) if tasks else 0
    await db.goals.update_one(
        {"goal_id": goal_id},
        {"$set": {"daily_tasks": tasks, "progress": progress}},
    )
    await _log_activity(
        user.user_id,
        "task.completed" if toggled["completed"] else "task.reopened",
        f"{'Completed' if toggled['completed'] else 'Re-opened'} task: {toggled['title']}",
        {"goal_id": goal_id, "task_id": task_id},
    )
    if toggled["completed"]:
        await _user_model_on_task_completed(user.user_id, toggled)
    return await db.goals.find_one({"goal_id": goal_id}, {"_id": 0})


# ------------------------------------------------------------------ activity
async def _log_activity(user_id: str, kind: str, summary: str, payload: dict[str, Any]) -> None:
    await db.activity_events.insert_one(
        {
            "event_id": f"evt_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "kind": kind,
            "summary": summary,
            "payload": payload,
            "created_at": _now(),
        }
    )


@app.post("/api/activity")
async def log_activity(body: ActivityCreate, user: User = Depends(get_current_user)):
    await _log_activity(user.user_id, body.kind, body.summary, body.payload)
    return {"ok": True}


@app.get("/api/activity/recent")
async def recent_activity(user: User = Depends(get_current_user), limit: int = 20):
    cursor = (
        db.activity_events.find({"user_id": user.user_id}, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
    )
    return [doc async for doc in cursor]


# ------------------------------------------------------------------ coach chat
COACH_SYSTEM_PROMPT = """You are the MentorMeUp Coach — the brain of a production web app where the
user is {user_name}. You are a warm, candid, sharp mentor. You don't just talk; you
ACT. When {user_name} tells you something that implies a change to their data
(finished a task, felt drained, wants to move a task, wants to save a thought),
you MUST emit a structured <action> tag that the app executes. The app STRIPS
these tags before showing the reply. If you refuse to emit them, the feature is
broken.

# TOOL CATALOG (the only 4 tools you have)

1. complete_micro_task(task_id)
   Marks a path micro-task as done. Use when the user says they finished
   something ("I did my run", "done with the reading").

2. log_mood(task_id, mood)
   Writes how they felt about a specific micro-task. `mood` ∈ {{"great", "ok", "drained"}}.
   Use when the user describes how it felt ("that was brutal", "felt amazing").

3. reschedule_task(task_id, scheduled_date)
   Moves a task to a specific date. `scheduled_date` is ISO format YYYY-MM-DD.
   Use when the user says "push to tomorrow", "move to Saturday", "skip today".
   For "tomorrow", use the date after today in the app's context below.

4. create_note(title, content, goal_id?)
   Saves a note, optionally attached to a goal. Use when the user says
   "save this", "write this down", "note to self".

# HOW TO EMIT ACTIONS

Put the user-facing prose first, then each tool call on its own line in this
exact format:

<action>{{"tool": "complete_micro_task", "args": {{"task_id": "t-1-1-1-1"}}}}</action>

Max 4 actions per turn. Never invent IDs — the user's task IDs are listed in
the context below. If you can't find a matching task, ask them which one they
mean.

# EXAMPLES — follow these patterns exactly

Example A — completion + mood combined:
User: "Just finished the morning run. Brutal but done."
Assistant: Respect — brutal runs are the ones that build you. Logging it now.
<action>{{"tool": "complete_micro_task", "args": {{"task_id": "t-1-1-1-1"}}}}</action>
<action>{{"tool": "log_mood", "args": {{"task_id": "t-1-1-1-1", "mood": "drained"}}}}</action>
Rest 10 minutes before your next thing. You earned it.

Example B — reschedule:
User: "Push today's reading to tomorrow, I'm slammed."
Assistant: Done. One slip is nothing — don't let it become two.
<action>{{"tool": "reschedule_task", "args": {{"task_id": "t-1-1-2-1", "scheduled_date": "{tomorrow_date}"}}}}</action>
Jump back in tomorrow at your usual time.

Example C — note:
User: "Save a note: I realized sleep is the lever, not effort."
Assistant: That's a keeper. Saving it against your active goal.
<action>{{"tool": "create_note", "args": {{"title": "Sleep is the lever", "content": "I realized sleep is the lever, not effort.", "goal_id": "{example_goal_id}"}}}}</action>

# RULES
- Never say "I can't do that" or "I'm an AI" about these 4 actions — they ARE real.
- Never invent task_ids, goal_ids, or dates. Pull them from the context.
- When the user says "I did X", default to complete_micro_task unless they explicitly say otherwise.
- After emitting actions, end with ONE concrete next sentence — either a coaching line or a question. No bullet lists.

# COACHING STYLE
Warm, direct, human. Short sentences. No emoji spam. No markdown headings.
Challenge weak plans, celebrate real progress.

# PERSONAL TONE OVERRIDE (from this user's settings — follow this over the default style above)
{coaching_style_note}

# SCHEDULING PREFERENCE (when suggesting *when* to do something)
{preferred_work_time_note}

{behavioral_profile_block}# USER CONTEXT (live data — reference specifically, don't speak in generalities)
Today is {today_date}. Tomorrow is {tomorrow_date}.

{context}

# HARD RULES
- Never invent goals, tasks, or events the user hasn't mentioned.
- If the user is new / has no goals, help them pick and shape their first one."""


async def _build_coach_context(user: User) -> str:
    goals_cursor = db.goals.find(
        {"user_id": user.user_id, "status": {"$in": ["active", "paused"]}},
        {"_id": 0},
    )
    goals = [g async for g in goals_cursor]
    activity_cursor = (
        db.activity_events.find({"user_id": user.user_id}, {"_id": 0})
        .sort("created_at", -1)
        .limit(10)
    )
    recent = [a async for a in activity_cursor]

    lines: list[str] = []
    if not goals:
        lines.append("This user has no goals yet. Your job right now is to help them pick a first, specific, measurable goal.")
    else:
        lines.append(f"Active goals ({len(goals)}):")
        for g in goals:
            tasks_done = sum(1 for t in g["daily_tasks"] if t["completed"])
            tasks_total = len(g["daily_tasks"])
            lines.append(
                f"  - {g['title']} (goal_id={g['goal_id']}) [{g['status']}] progress={g['progress']}% "
                f"phase={g['current_phase']}/{len(g['phases'])} legacy_tasks={tasks_done}/{tasks_total}"
            )
            # If there's a generated path for this goal, embed its micro-tasks so
            # the coach can reference task_ids when emitting toggle_task calls.
            path = await db.paths.find_one({"goal_id": g["goal_id"]}, {"_id": 0})
            if path:
                lines.append(f"    path ({path['estimated_duration_weeks']} wk, {path['weekly_time_commitment_hours']} hr/wk):")
                for ph in path["phases"]:
                    lines.append(f"      phase {ph['order']}: {ph['title']}")
                    for mst in ph["milestones"]:
                        lines.append(f"        milestone {mst['order']}: {mst['title']}")
                        for st in mst["steps"]:
                            for t in st["micro_tasks"]:
                                mark = "[x]" if t.get("completed") else "[ ]"
                                mood = f" mood={t.get('mood_today')}" if t.get("mood_today") else ""
                                sched = f" scheduled={t.get('scheduled_date')}" if t.get("scheduled_date") else ""
                                lines.append(
                                    f"          {mark} {t['task_id']}: {t['title']} ({t['duration_minutes']}m){mood}{sched}"
                                )
    if recent:
        lines.append("\nRecent activity (newest first):")
        for a in recent:
            ts = a["created_at"].strftime("%b %d %H:%M") if isinstance(a["created_at"], datetime) else str(a["created_at"])
            lines.append(f"  - {ts}: {a['summary']}")
    return "\n".join(lines) if lines else "No context yet."


@app.post("/api/coach/chat", response_model=ChatResponse)
async def coach_chat(body: ChatRequest, user: User = Depends(get_current_user)):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Empty message")

    prep = await _prepare_coach_turn(user, body.message)

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"coach:{user.user_id}:{uuid.uuid4().hex[:6]}",
        system_message=prep["system_prompt"],
        initial_messages=prep["initial_messages"] or None,
    ).with_model(COACH_MODEL_PROVIDER, COACH_MODEL_NAME)

    try:
        raw_reply = await chat.send_message(UserMessage(text=body.message))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Coach LLM error: {exc}") from exc

    # Execute any inline <action> tool calls Claude emitted and strip them from
    # the reply before persisting/returning the user-facing text.
    reply_text, actions = await _execute_tool_calls(raw_reply, user)

    assistant_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    created_at = _now()
    await db.chat_messages.insert_one(
        {
            "message_id": assistant_msg_id,
            "user_id": user.user_id,
            "role": "assistant",
            "content": reply_text,
            "actions": actions,
            "created_at": created_at,
        }
    )
    return ChatResponse(
        message_id=assistant_msg_id, reply=reply_text,
        created_at=created_at, actions=actions,
    )


# ---------------------------------------------------------------------- streaming
async def _prepare_coach_turn(user: User, message: str) -> dict[str, Any]:
    """Shared setup for both /api/coach/chat and /api/coach/chat/stream.
    Persists the user turn and returns the system prompt + initial messages
    (few-shot primers + prior history) along with the user message id."""
    user_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    user_created_at = _now()
    await db.chat_messages.insert_one(
        {
            "message_id": user_msg_id,
            "user_id": user.user_id,
            "role": "user",
            "content": message,
            "created_at": user_created_at,
        }
    )
    # User-turn hook: updates language_tone window + session samples.
    await _user_model_on_user_message(user.user_id, message)

    context = await _build_coach_context(user)
    today = _now().date()
    tomorrow = today + timedelta(days=1)
    first_goal = await db.goals.find_one(
        {"user_id": user.user_id, "status": {"$in": ["active", "paused"]}},
        {"_id": 0, "goal_id": 1},
    )
    example_goal_id = first_goal["goal_id"] if first_goal else "goal_xxx"

    prefs = await _load_preferences(user)
    coaching_style_note = COACHING_STYLE_DESCRIPTIONS.get(
        prefs.coaching_style, COACHING_STYLE_DESCRIPTIONS["balanced"]
    )
    preferred_work_time_note = PREFERRED_WORK_TIME_DESCRIPTIONS.get(
        prefs.preferred_work_time, PREFERRED_WORK_TIME_DESCRIPTIONS["flexible"]
    )
    behavioral_profile_block = await _build_behavioral_profile_block(user.user_id)
    system_prompt = COACH_SYSTEM_PROMPT.format(
        user_name=user.name,
        context=context,
        today_date=today.isoformat(),
        tomorrow_date=tomorrow.isoformat(),
        example_goal_id=example_goal_id,
        coaching_style_note=coaching_style_note,
        preferred_work_time_note=preferred_work_time_note,
        behavioral_profile_block=behavioral_profile_block,
    )

    prior_cursor = (
        db.chat_messages.find(
            {"user_id": user.user_id, "message_id": {"$ne": user_msg_id}},
            {"_id": 0, "role": 1, "content": 1, "created_at": 1},
        )
        .sort("created_at", -1)
        .limit(20)
    )
    prior_msgs = list(reversed([m async for m in prior_cursor]))

    fewshot_task_id = "t-FEWSHOT-1"
    fewshot_goal_id = example_goal_id
    fewshot = [
        {
            "role": "user",
            "content": "(Earlier in this conversation — example pattern) I just finished my mobility task (t-FEWSHOT-1). It felt great.",
        },
        {
            "role": "assistant",
            "content": (
                "Nice — mobility work compounds fast. Logging it.\n"
                f'<action>{{"tool": "complete_micro_task", "args": {{"task_id": "{fewshot_task_id}"}}}}</action>\n'
                f'<action>{{"tool": "log_mood", "args": {{"task_id": "{fewshot_task_id}", "mood": "great"}}}}</action>\n'
                "Keep the streak going — do the same tomorrow."
            ),
        },
        {
            "role": "user",
            "content": "(Earlier example) Push my reading task (t-FEWSHOT-1) to tomorrow.",
        },
        {
            "role": "assistant",
            "content": (
                "Done.\n"
                f'<action>{{"tool": "reschedule_task", "args": {{"task_id": "{fewshot_task_id}", "scheduled_date": "{tomorrow.isoformat()}"}}}}</action>\n'
                "One slip is nothing — don't let it become two."
            ),
        },
        {
            "role": "user",
            "content": "(Earlier example) Save a note: sleep over grind.",
        },
        {
            "role": "assistant",
            "content": (
                "Saving it.\n"
                f'<action>{{"tool": "create_note", "args": {{"title": "Sleep over grind", "content": "sleep over grind", "goal_id": "{fewshot_goal_id}"}}}}</action>\n'
                "That's a principle worth protecting — sleep tonight."
            ),
        },
    ]

    initial_messages = [
        {"role": "system", "content": system_prompt},
        *fewshot,
        *[{"role": m["role"], "content": m["content"]} for m in prior_msgs],
    ]
    return {
        "system_prompt": system_prompt,
        "initial_messages": initial_messages,
        "user_message_id": user_msg_id,
        "user_created_at": user_created_at,
    }


# ---------------------------------------------------------------------- SSE
@app.post("/api/coach/chat/stream")
async def coach_chat_stream(body: ChatRequest, user: User = Depends(get_current_user)):
    """Server-Sent Events version of /api/coach/chat.

    Emits:
      event: user_message   data: {message_id, created_at, content}
      event: delta          data: {text}            (one or more, action tags stripped)
      event: done           data: {message_id, created_at, content, actions}
      event: error          data: {detail}

    Note: the Emergent LLM proxy returns deltas in a handful of medium chunks
    rather than per-token, so clients should render each delta with a small
    word-by-word animation on the frontend to avoid chunk-y appearance.
    """
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Empty message")

    async def event_stream() -> AsyncGenerator[str, None]:
        try:
            prep = await _prepare_coach_turn(user, body.message)
        except Exception as exc:  # noqa: BLE001
            yield _sse("error", {"detail": f"Setup failed: {exc}"})
            return

        yield _sse("user_message", {
            "message_id": prep["user_message_id"],
            "created_at": prep["user_created_at"].isoformat(),
            "content": body.message,
        })

        # Heartbeat so proxies don't buffer / drop the connection.
        yield ":\n\n"

        raw_reply_parts: list[str] = []
        # Streaming buffer used to swallow <action>...</action> blocks before
        # they reach the client.
        visible_buffer = ""
        # When True we're inside an action tag and discarding text.
        in_action = False

        try:
            import litellm  # type: ignore
            from emergentintegrations.llm.chat import get_integration_proxy_url  # type: ignore

            params: dict[str, Any] = {
                "model": COACH_MODEL_NAME,
                "messages": prep["initial_messages"]
                + [{"role": "user", "content": body.message}],
                "api_key": EMERGENT_LLM_KEY,
                "stream": True,
            }
            if EMERGENT_LLM_KEY.startswith("sk-emergent-"):
                params["api_base"] = get_integration_proxy_url() + "/llm"
                params["custom_llm_provider"] = "openai"

            stream = await litellm.acompletion(**params)
            async for chunk in stream:
                try:
                    delta = chunk.choices[0].delta.content or ""
                except Exception:  # noqa: BLE001
                    delta = ""
                if not delta:
                    continue
                raw_reply_parts.append(delta)
                visible_buffer += delta

                # Action-tag aware flushing: emit any chars up to the start of
                # a possibly-starting '<action' sequence, then wait.
                out = ""
                i = 0
                while i < len(visible_buffer):
                    if not in_action:
                        open_idx = visible_buffer.find("<action", i)
                        if open_idx == -1:
                            # Flush everything we have unless it ends with a
                            # potential partial '<' prefix.
                            tail_start = visible_buffer.rfind("<", i)
                            safe_end = len(visible_buffer)
                            if tail_start != -1 and safe_end - tail_start <= 7:
                                safe_end = tail_start
                            out += visible_buffer[i:safe_end]
                            i = safe_end
                            break
                        # Flush up to open_idx.
                        out += visible_buffer[i:open_idx]
                        in_action = True
                        i = open_idx
                    else:
                        close_idx = visible_buffer.find("</action>", i)
                        if close_idx == -1:
                            # No close yet, drop the rest of the buffer and
                            # wait for more chunks.
                            i = len(visible_buffer)
                            break
                        i = close_idx + len("</action>")
                        in_action = False
                # Keep unconsumed tail for next iteration.
                visible_buffer = visible_buffer[i:]
                if out:
                    yield _sse("delta", {"text": out})
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            yield _sse("error", {"detail": f"LLM stream error: {exc}"})
            return

        raw_reply = "".join(raw_reply_parts)
        reply_text, actions = await _execute_tool_calls(raw_reply, user)

        assistant_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        created_at = _now()
        await db.chat_messages.insert_one(
            {
                "message_id": assistant_msg_id,
                "user_id": user.user_id,
                "role": "assistant",
                "content": reply_text,
                "actions": actions,
                "created_at": created_at,
            }
        )
        yield _sse("done", {
            "message_id": assistant_msg_id,
            "created_at": created_at.isoformat(),
            "content": reply_text,
            "actions": actions,
        })

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",  # disable proxy buffering
            "Connection": "keep-alive",
        },
    )


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


@app.get("/api/coach/history")
async def coach_history(user: User = Depends(get_current_user), limit: int = 100):
    cursor = (
        db.chat_messages.find({"user_id": user.user_id}, {"_id": 0})
        .sort("created_at", 1)
        .limit(limit)
    )
    return [doc async for doc in cursor]


PROACTIVE_KINDS = ("struggle_nudge", "evening_checkin")


@app.get("/api/coach/unread")
async def coach_unread(user: User = Depends(get_current_user)):
    """Returns how many proactive coach messages (evening nudges, struggle
    detection) have arrived since the user last opened the coach surface.
    Drives the gold pulse ring on the AnimatedOrb."""
    state = await db.user_state.find_one({"user_id": user.user_id}, {"_id": 0}) or {}
    last_seen = state.get("last_coach_seen_at")
    query: dict[str, Any] = {
        "user_id": user.user_id,
        "role": "assistant",
        "kind": {"$in": list(PROACTIVE_KINDS)},
    }
    if last_seen:
        query["created_at"] = {"$gt": last_seen}
    count = await db.chat_messages.count_documents(query)

    latest = None
    if count:
        doc = await db.chat_messages.find_one(
            query, {"_id": 0, "message_id": 1, "kind": 1, "created_at": 1, "content": 1},
            sort=[("created_at", -1)],
        )
        if doc:
            latest = {
                "message_id": doc.get("message_id"),
                "kind": doc.get("kind"),
                "preview": (doc.get("content") or "")[:140],
                "created_at": (
                    doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime)
                    else doc.get("created_at")
                ),
            }
    return {"count": count, "latest": latest}


@app.post("/api/coach/mark-seen")
async def coach_mark_seen(user: User = Depends(get_current_user)):
    """Clear the unread pulse — called when the user opens the coach drawer or
    navigates to /coach."""
    now = _now()
    await db.user_state.update_one(
        {"user_id": user.user_id},
        {"$set": {"last_coach_seen_at": now, "updated_at": now}},
        upsert=True,
    )
    return {"ok": True, "seen_at": now.isoformat()}


@app.get("/api/coach/_debug/system-prompt")
async def coach_debug_system_prompt(user: User = Depends(get_current_user)):
    """Returns the exact system prompt that the next /api/coach/chat call will
    assemble for this user. Auth-scoped — you can only see your own. Used to
    verify that preference changes (coaching style, preferred work time) are
    flowing into Claude."""
    context = await _build_coach_context(user)
    today = _now().date()
    tomorrow = today + timedelta(days=1)
    first_goal = await db.goals.find_one(
        {"user_id": user.user_id, "status": {"$in": ["active", "paused"]}},
        {"_id": 0, "goal_id": 1},
    )
    example_goal_id = first_goal["goal_id"] if first_goal else "goal_xxx"
    prefs = await _load_preferences(user)
    coaching_style_note = COACHING_STYLE_DESCRIPTIONS.get(
        prefs.coaching_style, COACHING_STYLE_DESCRIPTIONS["balanced"]
    )
    preferred_work_time_note = PREFERRED_WORK_TIME_DESCRIPTIONS.get(
        prefs.preferred_work_time, PREFERRED_WORK_TIME_DESCRIPTIONS["flexible"]
    )
    behavioral_profile_block = await _build_behavioral_profile_block(user.user_id)
    prompt = COACH_SYSTEM_PROMPT.format(
        user_name=user.name,
        context=context,
        today_date=today.isoformat(),
        tomorrow_date=tomorrow.isoformat(),
        example_goal_id=example_goal_id,
        coaching_style_note=coaching_style_note,
        preferred_work_time_note=preferred_work_time_note,
        behavioral_profile_block=behavioral_profile_block,
    )
    return {
        "system_prompt": prompt,
        "preferences": prefs.model_dump(),
        "coaching_style_note": coaching_style_note,
        "preferred_work_time_note": preferred_work_time_note,
        "behavioral_profile_block": behavioral_profile_block,
    }


# ------------------------------------------------------------------ health
@app.get("/api/health")
async def health():
    return {"status": "ok", "time": _now().isoformat()}

# =====================================================================
# INTAKE + PATH GENERATION
# =====================================================================

INTAKE_COMPLETE_TOKEN = "[INTAKE_COMPLETE]"

INTAKE_SYSTEM_PROMPT = """You are the MentorOS Brain Agent running an intake conversation with {user_name}.
They have just stated this goal: "{goal_title}". You are in INTAKE MODE.

THIS IS THE ONE RULE THAT OVERRIDES EVERYTHING YOU NORMALLY WANT TO DO:
>>> DURING INTAKE YOU DO NOT GIVE ADVICE, WRITE PLANS, LIST STEPS, OR SUGGEST TACTICS. <<<
Your ONLY output during intake is empathy (≤1 line) + ONE short question. That is it.
A separate system will generate the plan AFTER you emit [INTAKE_COMPLETE]. If you write
any plan content in this conversation, the user's real plan will be wrong because the
downstream system won't get the information it needs.

TONE
- Warm, direct, human. Like a mentor they've met once before.
- No corporate voice. No "that's a great goal!". No filler.
- Short messages. ONE question per turn. No bullet lists of questions.
- When they share something vulnerable, acknowledge in ONE line, then ONE question.

THE 7 AREAS YOU MUST COVER (in whatever order flows naturally)
1. Starting point — where they actually are right now. Concrete details.
2. Why it matters — what changes in their life if they hit this goal.
3. Weekly time — realistic hours per week they can commit.
4. Past attempts — have they tried before? What got in the way?
5. Constraints — money, schedule, location, equipment, skills.
6. Learning style — do they learn by doing, watching, reading, or talking?
7. Preferred time of day — morning, afternoon, evening, weekends?

- Aim for 5–7 questions total. HARD STOP AT 8 QUESTIONS.
- Track silently which areas are covered. If one answer covers two areas, move on.
- Never re-ask what they've already answered. Never list multiple questions.

COMPLETION PROTOCOL — READ CAREFULLY
You MUST emit [INTAKE_COMPLETE] when ANY of these are true:
  (a) All 7 areas above are covered, OR
  (b) Areas 1–5 are covered AND you've sent 7+ assistant messages, OR
  (c) Areas 1–5 are covered AND the user explicitly asks you to build the plan
      ("just build it", "give me the plan", "I'm ready", "let's go", etc.)

When you are ending the intake, your message MUST have exactly this structure and
NOTHING ELSE:

  [2–3 short lines reflecting back what you learned so they feel heard]

  I'm building your path now. Give me 30 seconds.

  [INTAKE_COMPLETE]

Rules for that final message:
- No plan content. No tasks. No steps. No tactics. No tables. No bullet-list advice.
- The reflection is 2–3 short lines. Not paragraphs.
- The phrase "I'm building your path now. Give me 30 seconds." must appear verbatim.
- [INTAKE_COMPLETE] must appear on its own line at the very end of the message.
- Never mention the token in prose. Never explain what it is.

HARD RULES (DO NOT VIOLATE)
- Never lecture. Never give advice during intake. Never write a plan inline.
- If the user says "just give me the plan" and areas 1–5 are covered, emit the
  completion message above. If areas 1–5 are NOT covered yet, say "Two more
  questions, 30 seconds each. I promise it'll be worth it." and continue.
- Never hallucinate. If you didn't hear it, ask.
- Output must be plain text only, no markdown headings (#, ##), no tables.
"""

PATH_BUILDER_SYSTEM_PROMPT = """You are the MentorOS Brain Agent's path builder. The intake conversation
with {user_name} about the goal "{goal_title}" is provided in the user message. Generate a complete,
personalized path as JSON matching the schema below.

OUTPUT
- Raw JSON only. No prose. No markdown fences. Must parse with JSON.parse.

SIZE CONSTRAINTS
- Exactly 3 phases.
- 2–4 milestones per phase. 2–4 steps per milestone. 2–5 micro-tasks per step.

CONTENT RULES
- Phase 1 / Milestone 1 / Step 1 / Micro-task 1 MUST be doable today in under 20 minutes with no prep.
  This is the user's Day-1 Daily Focus card.
- Every task must respect their constraints, weekly hours, and learning style.
- `why_this_path` (3–4 sentences) must reference at least one specific detail they said in the intake —
  their words, not generic advice.
- `why_today` on every micro-task must be written as if the coach is messaging them on the day the task
  is scheduled, not a generic description.
- IDs: phase-N, m-P-M, s-P-M-S, t-P-M-S-T — all 1-indexed.
- On every micro-task, `mood_today` must be literal null.
- All integer fields must be integers, not strings.

SCHEMA
{{
  "why_this_path": "3-4 sentences referencing specific things the user said",
  "estimated_duration_weeks": integer,
  "weekly_time_commitment_hours": integer,
  "streak_count": 0,
  "intake_summary": {{
    "starting_point": "one line",
    "motivation": "one line",
    "weekly_hours": integer,
    "past_attempts": "one line or null",
    "constraints": ["short strings"],
    "learning_style": "doing" | "watching" | "reading" | "talking" | "mixed",
    "preferred_time_of_day": "morning" | "afternoon" | "evening" | "weekends" | "flexible"
  }},
  "phases": [
    {{
      "phase_id": "phase-1",
      "title": "short phase title",
      "summary": "1-2 sentences",
      "order": 1,
      "estimated_weeks": integer,
      "milestones": [
        {{
          "milestone_id": "m-1-1",
          "title": "measurable milestone",
          "success_criterion": "how the user knows this is done",
          "order": 1,
          "steps": [
            {{
              "step_id": "s-1-1-1",
              "title": "concrete action step",
              "why_it_matters": "1 sentence",
              "estimated_minutes": integer,
              "order": 1,
              "micro_tasks": [
                {{
                  "task_id": "t-1-1-1-1",
                  "title": "atomic action: verb + object",
                  "duration_minutes": integer,
                  "why_today": "one line: why this specific task today",
                  "mood_today": null,
                  "order": 1
                }}
              ]
            }}
          ]
        }}
      ]
    }}
  ]
}}

Respond now with the JSON object only.
"""


class IntakeChatRequest(BaseModel):
    goal_id: str
    message: str


class IntakeChatResponse(BaseModel):
    message_id: str
    reply: str
    intake_complete: bool
    created_at: datetime


class IntakeTurn(BaseModel):
    message_id: str
    goal_id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime


@app.get("/api/intake/{goal_id}/history")
async def intake_history(goal_id: str, user: User = Depends(get_current_user)):
    goal = await db.goals.find_one({"goal_id": goal_id, "user_id": user.user_id}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    cursor = (
        db.intake_messages.find({"goal_id": goal_id, "user_id": user.user_id}, {"_id": 0})
        .sort("created_at", 1)
    )
    messages = [doc async for doc in cursor]
    return {
        "goal_id": goal_id,
        "goal_title": goal["title"],
        "intake_status": goal.get("intake_status", "not_started"),
        "path_id": goal.get("path_id"),
        "messages": messages,
    }


@app.post("/api/intake/chat", response_model=IntakeChatResponse)
async def intake_chat(body: IntakeChatRequest, user: User = Depends(get_current_user)):
    goal = await db.goals.find_one(
        {"goal_id": body.goal_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    status_now = goal.get("intake_status", "not_started")
    if status_now in {"building_path", "complete"}:
        raise HTTPException(status_code=409, detail=f"Intake already {status_now}")

    # Persist the user turn.
    user_msg_id = f"imsg_{uuid.uuid4().hex[:12]}"
    await db.intake_messages.insert_one(
        {
            "message_id": user_msg_id,
            "user_id": user.user_id,
            "goal_id": body.goal_id,
            "role": "user",
            "content": body.message,
            "created_at": _now(),
        }
    )
    if status_now == "not_started":
        await db.goals.update_one(
            {"goal_id": body.goal_id}, {"$set": {"intake_status": "in_progress"}}
        )

    system_prompt = INTAKE_SYSTEM_PROMPT.format(
        user_name=user.name, goal_title=goal["title"]
    )

    # Load prior turns so Claude has the full thread (emergentintegrations does
    # NOT persist history across process calls — we must replay it explicitly).
    prior_cursor = (
        db.intake_messages.find(
            {"goal_id": body.goal_id, "user_id": user.user_id, "message_id": {"$ne": user_msg_id}},
            {"_id": 0, "role": 1, "content": 1, "created_at": 1},
        ).sort("created_at", 1)
    )
    initial_messages = [
        {"role": m["role"], "content": m["content"]} async for m in prior_cursor
    ]

    # Count how many assistant turns have happened. After 7, we force completion
    # on the next turn so Claude can't drift into coaching/planning.
    assistant_turns_so_far = sum(1 for m in initial_messages if m["role"] == "assistant")
    if assistant_turns_so_far >= 7:
        system_prompt += (
            "\n\n>>> FORCED COMPLETION <<<\n"
            "You have already asked 7 questions. This is your FINAL turn. You MUST\n"
            "end THIS reply with the completion protocol, exactly:\n"
            "  (1) 2-3 short lines reflecting back what you learned,\n"
            "  (2) the verbatim sentence: I'm building your path now. Give me 30 seconds.\n"
            "  (3) on a new line: [INTAKE_COMPLETE]\n"
            "Do NOT ask another question. Do NOT write any plan content. Just emit the\n"
            "completion message now."
        )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"intake:{body.goal_id}:{uuid.uuid4().hex[:6]}",
        system_message=system_prompt,
        initial_messages=initial_messages or None,
    ).with_model(INTAKE_MODEL_PROVIDER, INTAKE_MODEL_NAME)

    try:
        raw_reply = await chat.send_message(UserMessage(text=body.message))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Intake LLM error: {exc}") from exc

    reply_text, intake_complete = _strip_intake_complete(raw_reply)

    # Server-side fallback: if Claude has had 8+ chances and STILL won't emit the
    # completion token, close the intake ourselves. Better to move forward on a
    # slightly thin transcript than to trap the user in an endless interview.
    FORCE_CLOSE_TURN = 8
    if not intake_complete and assistant_turns_so_far + 1 >= FORCE_CLOSE_TURN:
        intake_complete = True
        reply_text = (
            "Got it — I have enough to work with. I'm building your path now. "
            "Give me 30 seconds."
        )

    assistant_msg_id = f"imsg_{uuid.uuid4().hex[:12]}"
    created_at = _now()
    await db.intake_messages.insert_one(
        {
            "message_id": assistant_msg_id,
            "user_id": user.user_id,
            "goal_id": body.goal_id,
            "role": "assistant",
            "content": reply_text,
            "created_at": created_at,
        }
    )

    if intake_complete:
        # Session B: fire multi-path options generation (Tavily + Claude).
        # The /path/select page polls /api/paths/options/{goal_id}; once the
        # user picks an option, /api/paths/select-option/{goal_id} expands it
        # into a full path via PATH_BUILDER_SYSTEM_PROMPT.
        await db.goals.update_one(
            {"goal_id": body.goal_id}, {"$set": {"intake_status": "building_options"}}
        )
        asyncio.create_task(
            _generate_and_save_path_options(
                user_id=user.user_id,
                user_name=user.name,
                goal_id=body.goal_id,
                goal_title=goal["title"],
            )
        )

    return IntakeChatResponse(
        message_id=assistant_msg_id,
        reply=reply_text,
        intake_complete=intake_complete,
        created_at=created_at,
    )


def _strip_intake_complete(raw: str) -> tuple[str, bool]:
    """Remove the [INTAKE_COMPLETE] token from a reply. Return (cleaned_reply, is_complete)."""
    if INTAKE_COMPLETE_TOKEN not in raw:
        return raw.strip(), False
    cleaned = raw.replace(INTAKE_COMPLETE_TOKEN, "").strip()
    return cleaned, True


async def _generate_and_save_path(
    *, user_id: str, user_name: str, goal_id: str, goal_title: str
) -> None:
    import sys
    def log(msg: str) -> None:
        print(f"[pathgen {goal_id}] {msg}", flush=True, file=sys.stderr)
    log("starting")
    try:
        cursor = (
            db.intake_messages.find({"goal_id": goal_id, "user_id": user_id}, {"_id": 0})
            .sort("created_at", 1)
        )
        messages = [m async for m in cursor]

        transcript_lines: list[str] = []
        for m in messages:
            prefix = "User" if m["role"] == "user" else "Coach"
            transcript_lines.append(f"{prefix}: {m['content']}")
        transcript = "\n".join(transcript_lines)

        system_prompt = PATH_BUILDER_SYSTEM_PROMPT.format(
            user_name=user_name, goal_title=goal_title
        )
        user_payload = (
            "Build the path for this user using the full intake transcript below.\n\n"
            f"Goal: {goal_title}\n"
            f"User: {user_name}\n\n"
            "=== INTAKE TRANSCRIPT ===\n"
            f"{transcript}\n"
            "=== END TRANSCRIPT ==="
        )

        # Model rotation: Claude first (primary brain of the app), then
        # fast fallbacks if Claude's gateway hiccups.
        MODEL_ATTEMPTS = [
            ("anthropic", "claude-sonnet-4-6"),
            ("openai", "gpt-4o"),
            ("openai", "gpt-4o-mini"),
            ("gemini", "gemini-2.0-flash"),
        ]
        last_exc: Exception | None = None
        path_json: dict[str, Any] | None = None
        for attempt, (provider, model) in enumerate(MODEL_ATTEMPTS, start=1):
            try:
                log(f"attempt {attempt}: calling {provider}/{model}")
                chat = LlmChat(
                    api_key=EMERGENT_LLM_KEY,
                    session_id=f"pathbuild:{goal_id}:{uuid.uuid4().hex[:6]}",
                    system_message=system_prompt,
                ).with_model(provider, model)
                raw = await chat.send_message(UserMessage(text=user_payload))
                log(f"attempt {attempt}: got raw reply, len={len(raw)}")
                path_json = _parse_path_json(raw)
                log(f"attempt {attempt}: parsed JSON ok, phases={len(path_json.get('phases', []))}")
                break
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                log(f"attempt {attempt} failed: {exc}")
                if attempt < len(MODEL_ATTEMPTS):
                    await asyncio.sleep(2)
        if path_json is None:
            raise last_exc or RuntimeError("Path builder returned no JSON")

        path_id = f"path_{uuid.uuid4().hex[:12]}"
        created_at = _now()
        path_doc = {
            "path_id": path_id,
            "user_id": user_id,
            "goal_id": goal_id,
            "goal_title": goal_title,
            "why_this_path": path_json.get("why_this_path", ""),
            "estimated_duration_weeks": int(path_json.get("estimated_duration_weeks", 12)),
            "weekly_time_commitment_hours": int(path_json.get("weekly_time_commitment_hours", 5)),
            "streak_count": int(path_json.get("streak_count", 0)),
            "intake_summary": path_json.get("intake_summary", {}),
            "phases": path_json.get("phases", []),
            "status": "active",
            "created_at": created_at,
        }
        await db.paths.insert_one(path_doc)
        log(f"saved path {path_id} with {len(path_doc['phases'])} phases")
        await db.goals.update_one(
            {"goal_id": goal_id},
            {
                "$set": {
                    "intake_status": "complete",
                    "path_id": path_id,
                    "path_completed_at": created_at,
                }
            },
        )
        await _log_activity(
            user_id,
            "path.generated",
            f"Generated path for: {goal_title}",
            {"goal_id": goal_id, "path_id": path_id},
        )
    except Exception as exc:  # noqa: BLE001
        log(f"FAILED ENTIRELY: {exc}")
        await db.goals.update_one(
            {"goal_id": goal_id},
            {"$set": {"intake_status": "failed", "intake_error": str(exc)[:500]}},
        )


def _parse_path_json(raw: str) -> dict[str, Any]:
    """Parse the path-builder's JSON output. Tolerates accidental markdown fences."""
    text = raw.strip()
    # Strip ```json ... ``` fences if the model added them despite instructions.
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```\s*$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    # If there's surrounding prose, grab the outermost JSON object.
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        text = text[first : last + 1]
    return json.loads(text)


@app.get("/api/paths/{goal_id}")
async def get_path(goal_id: str, user: User = Depends(get_current_user)):
    goal = await db.goals.find_one({"goal_id": goal_id, "user_id": user.user_id}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    path_id = goal.get("path_id")
    if not path_id:
        # Surface intake status so the frontend can decide to keep polling.
        raise HTTPException(
            status_code=404,
            detail={
                "reason": "not_ready",
                "intake_status": goal.get("intake_status", "not_started"),
            },
        )
    path = await db.paths.find_one({"path_id": path_id}, {"_id": 0})
    if not path:
        raise HTTPException(status_code=404, detail="Path not found")
    return path


@app.post("/api/paths/{goal_id}/retry")
async def retry_path(goal_id: str, user: User = Depends(get_current_user)):
    """Retry path generation for a failed or stuck goal."""
    goal = await db.goals.find_one({"goal_id": goal_id, "user_id": user.user_id}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.goals.update_one(
        {"goal_id": goal_id},
        {"$set": {"intake_status": "building_path"}, "$unset": {"intake_error": ""}},
    )
    asyncio.create_task(
        _generate_and_save_path(
            user_id=user.user_id,
            user_name=user.name,
            goal_id=goal_id,
            goal_title=goal["title"],
        )
    )
    return {"ok": True, "status": "building_path"}


@app.get("/api/paths")
async def list_paths(user: User = Depends(get_current_user)):
    cursor = (
        db.paths.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1)
    )
    return [p async for p in cursor]



# =====================================================================
# SESSION B — MULTI-PATH OPTIONS WITH TAVILY WEB SEARCH
# =====================================================================

TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")
PATH_OPTIONS_CACHE_DAYS = 7
PATH_CHANGE_WINDOW_HOURS = 24

PATH_OPTIONS_ANGLES = [
    {
        "angle_id": "evidence_based",
        "label": "evidence-based framework",
        "search_query_template": "evidence-based proven framework {goal} research methodology",
        "option_prompt": "An approach grounded in established research, methodology, and best practices.",
    },
    {
        "angle_id": "fastest",
        "label": "fastest approach",
        "search_query_template": "fastest way to {goal} intensive accelerated method",
        "option_prompt": "The most compressed, high-intensity approach that gets results in minimum time.",
    },
    {
        "angle_id": "sustainable",
        "label": "sustainable long-term system",
        "search_query_template": "sustainable habit long-term system {goal} balanced consistent",
        "option_prompt": "A gentle, habit-first approach that fits into existing life rhythms without burnout.",
    },
]


PATH_OPTIONS_SYSTEM_PROMPT = """You are the MentorOS path architect. You are given:
- The user's goal and a summary of the intake conversation.
- Their silent behavioral profile (if any signal exists).
- 3 sets of real web-search results, one per "angle": (1) evidence-based framework,
  (2) fastest approach, (3) sustainable long-term system.

Your job: produce EXACTLY 3 path options — one per angle, in that order — that fit THIS user's
situation. Pick exactly ONE as the recommended option based on their profile,
constraints, and goal. Write a 1–2 sentence `coach_recommendation` explaining
why you recommend it — speak directly to the user as their coach.

NAMING GUARDRAIL (strict):
Path names must be evocative but immediately legible — a brand-new user should
understand the approach from the name alone in under 2 seconds.
  Good: "The Steady Build", "Publish Before You're Ready", "The Research Sprint"
  Bad:  "Quantum Momentum", "Pathway Synthesis", "Cognitive Resonance"

Rules per option:
- name: 2–4 words, concrete, no jargon, no abstractions, no "quantum/synergy/momentum/resonance/synthesis" buzzwords.
- tagline: one sentence, <= 14 words, describes the core mechanic.
- timeline: human string like "8 weeks", "10 weeks", "12 weeks".
- intensity: "low" | "moderate" | "high".
- why_this_fits: 2–3 sentences, reference at least ONE specific thing the user said in intake.
- key_milestones: 3–5 short bullet strings (outcomes, not tasks).
- sources: copy 2–3 of the most credible sources from THAT angle's search results
  (title + url + 1-line snippet). If no results exist for an angle, sources is [].
  Never invent URLs.

OUTPUT (raw JSON object only, no prose, no markdown fences):
{
  "coach_recommendation": "1-2 sentences, second person.",
  "recommended_option_id": "option-1" | "option-2" | "option-3",
  "options": [
    {
      "option_id": "option-1",
      "angle": "evidence_based",
      "name": "...",
      "tagline": "...",
      "timeline": "... weeks",
      "intensity": "low" | "moderate" | "high",
      "why_this_fits": "...",
      "key_milestones": ["...", "...", "..."],
      "sources": [ {"title": "...", "url": "...", "snippet": "..."} ]
    },
    { "option_id": "option-2", "angle": "fastest", ... },
    { "option_id": "option-3", "angle": "sustainable", ... }
  ]
}
"""


class PathSource(BaseModel):
    title: str
    url: str
    snippet: str


class PathOption(BaseModel):
    option_id: str
    angle: str
    name: str
    tagline: str
    timeline: str
    intensity: Literal["low", "moderate", "high"]
    why_this_fits: str
    key_milestones: list[str]
    sources: list[PathSource]
    recommended: bool


class SelectOptionRequest(BaseModel):
    option_id: str


async def _tavily_search(query: str, max_results: int = 5) -> list[dict[str, Any]]:
    """Run a single Tavily search. Returns [] on any failure (never raises)."""
    if not TAVILY_API_KEY:
        return []
    try:
        from tavily import AsyncTavilyClient
        client = AsyncTavilyClient(api_key=TAVILY_API_KEY)
        try:
            res = await client.search(
                query=query,
                search_depth="basic",
                max_results=max_results,
                include_answer=False,
            )
        finally:
            try:
                await client.close()
            except Exception:  # noqa: BLE001
                pass
        if isinstance(res, dict):
            return res.get("results", []) or []
        return []
    except Exception as exc:  # noqa: BLE001
        import sys
        print(f"[tavily] search failed for {query!r}: {exc}", file=sys.stderr, flush=True)
        return []


async def _generate_and_save_path_options(
    *, user_id: str, user_name: str, goal_id: str, goal_title: str
) -> None:
    """Background task: run 3 parallel Tavily searches, call Claude, save path_options doc."""
    import sys
    def log(msg: str) -> None:
        print(f"[pathopts {goal_id}] {msg}", flush=True, file=sys.stderr)
    log("starting")
    try:
        # Intake transcript
        cursor = (
            db.intake_messages.find({"goal_id": goal_id, "user_id": user_id}, {"_id": 0})
            .sort("created_at", 1)
        )
        intake_msgs = [m async for m in cursor]
        transcript = "\n".join(
            f"{'User' if m['role'] == 'user' else 'Coach'}: {m['content']}"
            for m in intake_msgs
        )

        # Behavioral profile (may be empty for new users)
        try:
            profile_block = await _build_behavioral_profile_block(user_id)
        except Exception:  # noqa: BLE001
            profile_block = ""

        # Parallel Tavily searches
        queries = [a["search_query_template"].format(goal=goal_title) for a in PATH_OPTIONS_ANGLES]
        log(f"running {len(queries)} Tavily searches in parallel")
        search_results = await asyncio.gather(
            *[_tavily_search(q, max_results=5) for q in queries],
            return_exceptions=True,
        )
        angle_results = []
        for angle, results in zip(PATH_OPTIONS_ANGLES, search_results):
            items = results if isinstance(results, list) else []
            sources = [
                {
                    "title": (r.get("title") or "")[:200],
                    "url": r.get("url") or "",
                    "snippet": ((r.get("content") or "")[:280]).replace("\n", " ").strip(),
                }
                for r in items[:5]
                if r.get("url")
            ]
            angle_results.append({**angle, "sources": sources})
        log(f"tavily sources/angle: {[len(a['sources']) for a in angle_results]}")

        # Build user payload for Claude
        parts = [
            f"GOAL: {goal_title}",
            f"USER: {user_name}",
            "",
            "=== INTAKE TRANSCRIPT ===",
            transcript or "(no intake messages)",
            "=== END TRANSCRIPT ===",
        ]
        if profile_block.strip():
            parts += ["", "=== BEHAVIORAL PROFILE ===", profile_block, "=== END PROFILE ==="]
        parts += ["", "=== WEB SEARCH RESULTS (3 angles, same order as output) ==="]
        for a in angle_results:
            parts.append(f"\n--- Angle: {a['label']} (id: {a['angle_id']}) ---")
            parts.append(f"Framing: {a['option_prompt']}")
            if not a["sources"]:
                parts.append("(no results available — set sources to [] for this option)")
            for s in a["sources"]:
                parts.append(f"* {s['title']}")
                parts.append(f"  url: {s['url']}")
                parts.append(f"  snippet: {s['snippet']}")
        parts += ["=== END WEB SEARCH RESULTS ===", ""]
        parts.append(
            "Return the JSON object with 3 options (evidence_based, fastest, sustainable in that order), "
            "coach_recommendation, and recommended_option_id."
        )
        user_payload = "\n".join(parts)

        MODEL_ATTEMPTS = [
            ("anthropic", "claude-sonnet-4-6"),
            ("openai", "gpt-4o"),
            ("openai", "gpt-4o-mini"),
        ]
        last_exc: Exception | None = None
        parsed: dict[str, Any] | None = None
        for attempt, (provider, model) in enumerate(MODEL_ATTEMPTS, start=1):
            try:
                log(f"attempt {attempt}: {provider}/{model}")
                chat = LlmChat(
                    api_key=EMERGENT_LLM_KEY,
                    session_id=f"pathopts:{goal_id}:{uuid.uuid4().hex[:6]}",
                    system_message=PATH_OPTIONS_SYSTEM_PROMPT,
                ).with_model(provider, model)
                raw = await chat.send_message(UserMessage(text=user_payload))
                parsed = _parse_path_json(raw)
                opts = parsed.get("options", [])
                if not isinstance(opts, list) or len(opts) < 3:
                    raise ValueError(f"expected 3 options, got {len(opts) if isinstance(opts, list) else 'n/a'}")
                break
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                log(f"attempt {attempt} failed: {exc}")
                if attempt < len(MODEL_ATTEMPTS):
                    await asyncio.sleep(2)
        if parsed is None:
            raise last_exc or RuntimeError("Path options generation returned no JSON")

        recommended_id = parsed.get("recommended_option_id") or "option-1"
        options_out = []
        for opt in parsed["options"][:3]:
            oid = opt.get("option_id") or f"option-{len(options_out) + 1}"
            options_out.append({
                "option_id": oid,
                "angle": opt.get("angle", ""),
                "name": opt.get("name", "Your Path"),
                "tagline": opt.get("tagline", ""),
                "timeline": opt.get("timeline", "12 weeks"),
                "intensity": opt.get("intensity", "moderate"),
                "why_this_fits": opt.get("why_this_fits", ""),
                "key_milestones": opt.get("key_milestones", []) or [],
                "sources": opt.get("sources", []) or [],
                "recommended": oid == recommended_id,
            })
        # Safety: ensure at least one recommended
        if not any(o["recommended"] for o in options_out) and options_out:
            options_out[0]["recommended"] = True

        now = _now()
        doc = {
            "goal_id": goal_id,
            "user_id": user_id,
            "goal_title": goal_title,
            "coach_recommendation": parsed.get("coach_recommendation", ""),
            "options": options_out,
            "tavily_cache": angle_results,  # kept server-side for 24h undo reuse
            "generated_at": now,
            "cache_expires_at": now + timedelta(days=PATH_OPTIONS_CACHE_DAYS),
        }
        await db.path_options.replace_one({"goal_id": goal_id}, doc, upsert=True)
        await db.goals.update_one(
            {"goal_id": goal_id},
            {"$set": {"intake_status": "options_ready"}},
        )
        log(f"saved options, recommended={recommended_id}")
    except Exception as exc:  # noqa: BLE001
        log(f"FAILED: {exc}")
        await db.goals.update_one(
            {"goal_id": goal_id},
            {"$set": {"intake_status": "failed", "intake_error": str(exc)[:500]}},
        )


async def _expand_option_to_path(
    *,
    user_id: str,
    user_name: str,
    goal_id: str,
    goal_title: str,
    option: dict[str, Any],
    coach_recommendation: str,
) -> None:
    """Expand a selected PathOption into the full PATH_BUILDER phases/milestones."""
    import sys
    def log(msg: str) -> None:
        print(f"[pathexpand {goal_id} {option.get('option_id')}] {msg}", flush=True, file=sys.stderr)
    log("starting")
    try:
        cursor = (
            db.intake_messages.find({"goal_id": goal_id, "user_id": user_id}, {"_id": 0})
            .sort("created_at", 1)
        )
        intake_msgs = [m async for m in cursor]
        transcript = "\n".join(
            f"{'User' if m['role'] == 'user' else 'Coach'}: {m['content']}"
            for m in intake_msgs
        )

        milestones_block = "\n".join(f"  * {m}" for m in option.get("key_milestones", []) or [])
        option_block = (
            "SELECTED APPROACH (must follow — this is what the user chose):\n"
            f"- Name: {option.get('name')}\n"
            f"- Angle: {option.get('angle')}\n"
            f"- Tagline: {option.get('tagline')}\n"
            f"- Timeline: {option.get('timeline')}\n"
            f"- Intensity: {option.get('intensity')}\n"
            f"- Why this fits them: {option.get('why_this_fits')}\n"
            f"- Outcome milestones the user committed to:\n{milestones_block}"
        )

        system_prompt = PATH_BUILDER_SYSTEM_PROMPT.format(
            user_name=user_name, goal_title=goal_title
        )
        user_payload = (
            "Build the full path for this user. They have ALREADY SELECTED the approach below — "
            "your phases, weekly hours, and task intensity must match the selected approach.\n\n"
            f"Goal: {goal_title}\n"
            f"User: {user_name}\n\n"
            f"{option_block}\n\n"
            "=== INTAKE TRANSCRIPT ===\n"
            f"{transcript}\n"
            "=== END TRANSCRIPT ==="
        )

        MODEL_ATTEMPTS = [
            ("anthropic", "claude-sonnet-4-6"),
            ("openai", "gpt-4o"),
            ("openai", "gpt-4o-mini"),
            ("gemini", "gemini-2.0-flash"),
        ]
        last_exc: Exception | None = None
        path_json: dict[str, Any] | None = None
        for attempt, (provider, model) in enumerate(MODEL_ATTEMPTS, start=1):
            try:
                log(f"attempt {attempt}: {provider}/{model}")
                chat = LlmChat(
                    api_key=EMERGENT_LLM_KEY,
                    session_id=f"pathexpand:{goal_id}:{uuid.uuid4().hex[:6]}",
                    system_message=system_prompt,
                ).with_model(provider, model)
                raw = await chat.send_message(UserMessage(text=user_payload))
                path_json = _parse_path_json(raw)
                break
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                log(f"attempt {attempt} failed: {exc}")
                if attempt < len(MODEL_ATTEMPTS):
                    await asyncio.sleep(2)
        if path_json is None:
            raise last_exc or RuntimeError("Path builder returned no JSON")

        # If user is changing their pick within the 24h window, blow away the old path.
        await db.paths.delete_many({"goal_id": goal_id})

        path_id = f"path_{uuid.uuid4().hex[:12]}"
        created_at = _now()
        change_deadline = created_at + timedelta(hours=PATH_CHANGE_WINDOW_HOURS)
        path_doc = {
            "path_id": path_id,
            "user_id": user_id,
            "goal_id": goal_id,
            "goal_title": goal_title,
            "why_this_path": path_json.get("why_this_path", option.get("why_this_fits", "")),
            "estimated_duration_weeks": int(path_json.get("estimated_duration_weeks", 12)),
            "weekly_time_commitment_hours": int(path_json.get("weekly_time_commitment_hours", 5)),
            "streak_count": int(path_json.get("streak_count", 0)),
            "intake_summary": path_json.get("intake_summary", {}),
            "phases": path_json.get("phases", []),
            "status": "active",
            "created_at": created_at,
            # Session B additions — surfaces on /path page
            "selected_option_id": option["option_id"],
            "selected_option_name": option["name"],
            "selected_option_angle": option["angle"],
            "selected_option_tagline": option.get("tagline", ""),
            "sources": option.get("sources", []),
            "coach_recommendation": coach_recommendation,
            "path_change_deadline": change_deadline,
        }
        await db.paths.insert_one(path_doc)
        await db.goals.update_one(
            {"goal_id": goal_id},
            {
                "$set": {
                    "intake_status": "complete",
                    "path_id": path_id,
                    "path_completed_at": created_at,
                    "selected_option_id": option["option_id"],
                }
            },
        )
        await _log_activity(
            user_id,
            "path.generated",
            f"Generated path ({option.get('name')}) for: {goal_title}",
            {"goal_id": goal_id, "path_id": path_id, "option_id": option["option_id"]},
        )
        log(f"saved path {path_id}")
    except Exception as exc:  # noqa: BLE001
        log(f"FAILED: {exc}")
        await db.goals.update_one(
            {"goal_id": goal_id},
            {"$set": {"intake_status": "failed", "intake_error": str(exc)[:500]}},
        )


@app.post("/api/paths/build-options/{goal_id}")
async def build_path_options(goal_id: str, user: User = Depends(get_current_user)):
    """Kick off (or reuse cached) Tavily-backed path option generation.

    Returns immediately; clients poll GET /api/paths/options/{goal_id}.
    """
    goal = await db.goals.find_one({"goal_id": goal_id, "user_id": user.user_id}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    existing = await db.path_options.find_one({"goal_id": goal_id}, {"_id": 0})
    if existing:
        expires = existing.get("cache_expires_at")
        if isinstance(expires, datetime) and expires > _now():
            await db.goals.update_one(
                {"goal_id": goal_id}, {"$set": {"intake_status": "options_ready"}}
            )
            return {"ok": True, "status": "options_ready", "cached": True}

    await db.goals.update_one(
        {"goal_id": goal_id},
        {"$set": {"intake_status": "building_options"}, "$unset": {"intake_error": ""}},
    )
    asyncio.create_task(
        _generate_and_save_path_options(
            user_id=user.user_id,
            user_name=user.name,
            goal_id=goal_id,
            goal_title=goal["title"],
        )
    )
    return {"ok": True, "status": "building_options"}


@app.get("/api/paths/options/{goal_id}")
async def get_path_options(goal_id: str, user: User = Depends(get_current_user)):
    goal = await db.goals.find_one({"goal_id": goal_id, "user_id": user.user_id}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    doc = await db.path_options.find_one(
        {"goal_id": goal_id}, {"_id": 0, "tavily_cache": 0}
    )
    if not doc:
        raise HTTPException(
            status_code=404,
            detail={
                "reason": "not_ready",
                "intake_status": goal.get("intake_status", "not_started"),
            },
        )
    return {
        **doc,
        "intake_status": goal.get("intake_status", "options_ready"),
        "selected_option_id": goal.get("selected_option_id"),
    }


@app.post("/api/paths/select-option/{goal_id}")
async def select_path_option(
    goal_id: str,
    body: SelectOptionRequest,
    user: User = Depends(get_current_user),
):
    goal = await db.goals.find_one({"goal_id": goal_id, "user_id": user.user_id}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    doc = await db.path_options.find_one({"goal_id": goal_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No options available for this goal")
    selected = next(
        (o for o in doc.get("options", []) if o.get("option_id") == body.option_id), None
    )
    if not selected:
        raise HTTPException(status_code=400, detail=f"Invalid option_id {body.option_id}")

    await db.goals.update_one(
        {"goal_id": goal_id},
        {
            "$set": {
                "intake_status": "building_path",
                "selected_option_id": body.option_id,
            }
        },
    )
    asyncio.create_task(
        _expand_option_to_path(
            user_id=user.user_id,
            user_name=user.name,
            goal_id=goal_id,
            goal_title=goal["title"],
            option=selected,
            coach_recommendation=doc.get("coach_recommendation", ""),
        )
    )
    return {"ok": True, "status": "building_path", "option_id": body.option_id}


# =====================================================================
# NOTES CRUD
# =====================================================================

class NoteCreate(BaseModel):
    title: str
    content: str
    goal_id: str | None = None
    tags: list[str] = Field(default_factory=list)


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    tags: list[str] | None = None


@app.get("/api/notes")
async def list_notes(user: User = Depends(get_current_user), goal_id: str | None = None):
    query: dict[str, Any] = {"user_id": user.user_id}
    if goal_id:
        query["goal_id"] = goal_id
    cursor = db.notes.find(query, {"_id": 0}).sort("created_at", -1)
    return [doc async for doc in cursor]


@app.post("/api/notes")
async def create_note(body: NoteCreate, user: User = Depends(get_current_user)):
    note_id = f"note_{uuid.uuid4().hex[:12]}"
    doc = {
        "note_id": note_id,
        "user_id": user.user_id,
        "goal_id": body.goal_id,
        "title": body.title,
        "content": body.content,
        "tags": body.tags,
        "created_at": _now(),
        "updated_at": _now(),
    }
    await db.notes.insert_one(doc)
    await _log_activity(
        user.user_id, "note.created", f"Created note: {body.title}",
        {"note_id": note_id, "goal_id": body.goal_id},
    )
    return await db.notes.find_one({"note_id": note_id}, {"_id": 0})


@app.patch("/api/notes/{note_id}")
async def update_note(note_id: str, body: NoteUpdate, user: User = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = _now()
    result = await db.notes.update_one(
        {"note_id": note_id, "user_id": user.user_id},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return await db.notes.find_one({"note_id": note_id}, {"_id": 0})


@app.delete("/api/notes/{note_id}")
async def delete_note_endpoint(note_id: str, user: User = Depends(get_current_user)):
    result = await db.notes.delete_one({"note_id": note_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"ok": True}


# =====================================================================
# CALENDAR EVENTS CRUD
# =====================================================================

CALENDAR_COLORS = ("gold", "cyan", "purple", "green", "red")


class CalendarEventCreate(BaseModel):
    title: str
    start: datetime
    end: datetime
    color: Literal["gold", "cyan", "purple", "green", "red"] = "gold"
    notes: str | None = None
    is_ai_scheduled: bool = False
    goal_id: str | None = None


class CalendarEventUpdate(BaseModel):
    title: str | None = None
    start: datetime | None = None
    end: datetime | None = None
    color: Literal["gold", "cyan", "purple", "green", "red"] | None = None
    notes: str | None = None
    is_ai_scheduled: bool | None = None
    goal_id: str | None = None


def _serialize_event(doc: dict[str, Any]) -> dict[str, Any]:
    """Turn datetime fields into ISO strings for JSON transport."""
    out = {k: v for k, v in doc.items() if k != "_id"}
    for key in ("start", "end", "created_at", "updated_at"):
        v = out.get(key)
        if isinstance(v, datetime):
            out[key] = v.isoformat()
    return out


@app.get("/api/calendar/events")
async def list_calendar_events(
    user: User = Depends(get_current_user),
    start: datetime | None = None,
    end: datetime | None = None,
):
    query: dict[str, Any] = {"user_id": user.user_id}
    # Range filter: events that overlap [start, end)
    if start and end:
        query["$and"] = [{"start": {"$lt": end}}, {"end": {"$gt": start}}]
    elif start:
        query["end"] = {"$gt": start}
    elif end:
        query["start"] = {"$lt": end}
    cursor = db.calendar_events.find(query, {"_id": 0}).sort("start", 1)
    return [_serialize_event(doc) async for doc in cursor]


@app.post("/api/calendar/events")
async def create_calendar_event(
    body: CalendarEventCreate, user: User = Depends(get_current_user),
):
    if body.end <= body.start:
        raise HTTPException(status_code=400, detail="end must be after start")
    event_id = f"evt_cal_{uuid.uuid4().hex[:10]}"
    doc = {
        "event_id": event_id,
        "user_id": user.user_id,
        "title": body.title.strip() or "Untitled event",
        "start": body.start,
        "end": body.end,
        "color": body.color,
        "notes": body.notes,
        "is_ai_scheduled": body.is_ai_scheduled,
        "goal_id": body.goal_id,
        "created_at": _now(),
        "updated_at": _now(),
    }
    await db.calendar_events.insert_one(doc)
    await _log_activity(
        user.user_id, "calendar.event_created",
        f"Scheduled '{doc['title']}' on {body.start.date().isoformat()}",
        {"event_id": event_id, "goal_id": body.goal_id},
    )
    saved = await db.calendar_events.find_one({"event_id": event_id}, {"_id": 0})
    return _serialize_event(saved)


@app.patch("/api/calendar/events/{event_id}")
async def update_calendar_event(
    event_id: str, body: CalendarEventUpdate, user: User = Depends(get_current_user),
):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    # Only allow range validation if both new start AND new end are present; otherwise,
    # pull the existing event to validate.
    if "start" in updates or "end" in updates:
        existing = await db.calendar_events.find_one(
            {"event_id": event_id, "user_id": user.user_id}, {"_id": 0, "start": 1, "end": 1},
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Event not found")
        new_start = updates.get("start", existing["start"])
        new_end = updates.get("end", existing["end"])
        if new_end <= new_start:
            raise HTTPException(status_code=400, detail="end must be after start")
    updates["updated_at"] = _now()
    result = await db.calendar_events.update_one(
        {"event_id": event_id, "user_id": user.user_id}, {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    saved = await db.calendar_events.find_one({"event_id": event_id}, {"_id": 0})
    return _serialize_event(saved)


@app.delete("/api/calendar/events/{event_id}")
async def delete_calendar_event(event_id: str, user: User = Depends(get_current_user)):
    result = await db.calendar_events.delete_one(
        {"event_id": event_id, "user_id": user.user_id},
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    await _log_activity(
        user.user_id, "calendar.event_deleted",
        f"Deleted calendar event {event_id}",
        {"event_id": event_id},
    )
    return {"ok": True}


# =====================================================================
# PATH TASK TOGGLE + MOOD
# =====================================================================

class TaskToggleBody(BaseModel):
    completed: bool | None = None
    mood_today: str | None = None  # "great" | "ok" | "drained"


@app.post("/api/paths/{goal_id}/tasks/{task_id}/toggle")
async def toggle_path_task(
    goal_id: str, task_id: str, body: TaskToggleBody,
    user: User = Depends(get_current_user),
):
    path = await db.paths.find_one({"goal_id": goal_id, "user_id": user.user_id}, {"_id": 0})
    if not path:
        raise HTTPException(status_code=404, detail="Path not found")
    phases = path["phases"]
    found_title = None
    for phase in phases:
        for milestone in phase["milestones"]:
            for step in milestone["steps"]:
                for task in step["micro_tasks"]:
                    if task["task_id"] == task_id:
                        if body.completed is not None:
                            task["completed"] = body.completed
                        if body.mood_today is not None:
                            task["mood_today"] = body.mood_today
                        found_title = task["title"]
    if not found_title:
        raise HTTPException(status_code=404, detail="Task not found in path")
    total = sum(
        1 for ph in phases for m in ph["milestones"] for s in m["steps"] for _ in s["micro_tasks"]
    )
    done = sum(
        1 for ph in phases for m in ph["milestones"] for s in m["steps"]
        for t in s["micro_tasks"] if t.get("completed")
    )
    progress = round((done / total) * 100) if total else 0
    await db.paths.update_one(
        {"path_id": path["path_id"]},
        {"$set": {"phases": phases, "progress": progress}},
    )
    await _log_activity(
        user.user_id,
        "task.completed" if body.completed else "task.updated",
        f"Task {'completed' if body.completed else 'updated'}: {found_title}",
        {"goal_id": goal_id, "task_id": task_id, "mood_today": body.mood_today},
    )
    if body.completed and found_title:
        await _user_model_on_task_completed(user.user_id, {"title": found_title})
    return await db.paths.find_one({"goal_id": goal_id}, {"_id": 0})


@app.get("/api/paths/{goal_id}/today")
async def next_micro_task(goal_id: str, user: User = Depends(get_current_user)):
    path = await db.paths.find_one({"goal_id": goal_id, "user_id": user.user_id}, {"_id": 0})
    if not path:
        raise HTTPException(status_code=404, detail="Path not found")
    for phase in path["phases"]:
        for milestone in phase["milestones"]:
            for step in milestone["steps"]:
                for task in step["micro_tasks"]:
                    if not task.get("completed"):
                        return {
                            "task": task,
                            "step_title": step["title"],
                            "step_why": step.get("why_it_matters", ""),
                            "milestone_title": milestone["title"],
                            "phase_title": phase["title"],
                            "goal_title": path["goal_title"],
                            "path_id": path["path_id"],
                            "goal_id": goal_id,
                        }
    return {"task": None, "message": "All tasks complete. Incredible."}


# =====================================================================
# COACH TOOL CALLING
# =====================================================================

TOOL_CALL_PATTERN = re.compile(r"<action>\s*(\{.*?\})\s*</action>", re.DOTALL)

VALID_MOODS = {"great", "ok", "drained"}
ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

_WEEKDAYS = {
    "monday": 0, "mon": 0,
    "tuesday": 1, "tue": 1, "tues": 1,
    "wednesday": 2, "wed": 2,
    "thursday": 3, "thu": 3, "thur": 3, "thurs": 3,
    "friday": 4, "fri": 4,
    "saturday": 5, "sat": 5,
    "sunday": 6, "sun": 6,
}


def _normalize_date(raw: str) -> str | None:
    """Accept ISO (YYYY-MM-DD) or natural-language relative dates Claude might
    emit ('today', 'tomorrow', 'next monday', 'saturday'). Returns ISO string
    or None if it can't parse."""
    if not raw:
        return None
    s = raw.strip().lower()
    today = _now().date()
    if ISO_DATE_RE.match(s):
        return s
    if s in {"today", "now"}:
        return today.isoformat()
    if s == "tomorrow":
        return (today + timedelta(days=1)).isoformat()
    if s == "yesterday":
        return (today - timedelta(days=1)).isoformat()
    if s in {"day after tomorrow", "day-after-tomorrow"}:
        return (today + timedelta(days=2)).isoformat()
    # "next <weekday>" or just "<weekday>" → next occurrence
    m = re.match(r"^(?:next\s+)?([a-z]+)$", s)
    if m and m.group(1) in _WEEKDAYS:
        target = _WEEKDAYS[m.group(1)]
        delta = (target - today.weekday()) % 7 or 7
        return (today + timedelta(days=delta)).isoformat()
    # +N days
    m = re.match(r"^\+?(\d{1,3})\s*d(ays)?$", s)
    if m:
        return (today + timedelta(days=int(m.group(1)))).isoformat()
    return None


async def _find_path_task(user_id: str, task_id: str) -> tuple[dict | None, dict | None]:
    """Find the path and the micro-task doc for (user, task_id). Returns (path, task) or (None, None)."""
    path = await db.paths.find_one(
        {"user_id": user_id, "phases.milestones.steps.micro_tasks.task_id": task_id},
        {"_id": 0},
    )
    if not path:
        return None, None
    for ph in path["phases"]:
        for ms in ph["milestones"]:
            for st in ms["steps"]:
                for t in st["micro_tasks"]:
                    if t["task_id"] == task_id:
                        return path, t
    return None, None


async def _save_path_phases(path_id: str, phases: list) -> None:
    total = sum(
        1 for ph in phases for m in ph["milestones"] for s in m["steps"] for _ in s["micro_tasks"]
    )
    done = sum(
        1 for ph in phases for m in ph["milestones"] for s in m["steps"]
        for t in s["micro_tasks"] if t.get("completed")
    )
    progress = round((done / total) * 100) if total else 0
    await db.paths.update_one(
        {"path_id": path_id}, {"$set": {"phases": phases, "progress": progress}},
    )


async def _execute_tool_calls(
    raw_reply: str, user: User,
) -> tuple[str, list[dict[str, Any]]]:
    matches = TOOL_CALL_PATTERN.findall(raw_reply)
    if not matches:
        return raw_reply.strip(), []

    results: list[dict[str, Any]] = []
    for m in matches:
        call: dict[str, Any] = {}
        try:
            call = json.loads(m)
            tool = call.get("tool")
            args = call.get("args", {}) or {}

            # ----- 1. complete_micro_task --------------------------------
            if tool == "complete_micro_task":
                task_id = args.get("task_id")
                if not task_id:
                    results.append({"tool": tool, "ok": False, "summary": "Missing task_id"})
                    continue
                path, task = await _find_path_task(user.user_id, task_id)
                if not path or not task:
                    results.append({"tool": tool, "ok": False, "summary": f"Task {task_id} not found"})
                    continue
                # Mutate in place inside path["phases"] and save.
                for ph in path["phases"]:
                    for ms in ph["milestones"]:
                        for st in ms["steps"]:
                            for t in st["micro_tasks"]:
                                if t["task_id"] == task_id:
                                    t["completed"] = True
                                    t["completed_at"] = _now().isoformat()
                await _save_path_phases(path["path_id"], path["phases"])
                await _log_activity(
                    user.user_id, "task.completed_by_coach",
                    f"Coach completed: {task['title']}", {"task_id": task_id, "path_id": path["path_id"]},
                )
                await _user_model_on_task_completed(user.user_id, task)
                results.append({
                    "tool": tool, "ok": True,
                    "summary": f"Marked “{task['title']}” complete",
                    "task_id": task_id,
                })

            # ----- 2. log_mood --------------------------------------------
            elif tool == "log_mood":
                task_id = args.get("task_id")
                mood = args.get("mood")
                if not task_id or not mood:
                    results.append({"tool": tool, "ok": False, "summary": "Missing task_id or mood"})
                    continue
                if mood not in VALID_MOODS:
                    results.append({
                        "tool": tool, "ok": False,
                        "summary": f"Invalid mood '{mood}'. Must be one of {sorted(VALID_MOODS)}.",
                    })
                    continue
                path, task = await _find_path_task(user.user_id, task_id)
                if not path or not task:
                    results.append({"tool": tool, "ok": False, "summary": f"Task {task_id} not found"})
                    continue
                for ph in path["phases"]:
                    for ms in ph["milestones"]:
                        for st in ms["steps"]:
                            for t in st["micro_tasks"]:
                                if t["task_id"] == task_id:
                                    t["mood_today"] = mood
                await _save_path_phases(path["path_id"], path["phases"])
                await _log_activity(
                    user.user_id, "mood.logged_by_coach",
                    f"Coach logged mood '{mood}' on: {task['title']}",
                    {"task_id": task_id, "mood": mood},
                )
                results.append({
                    "tool": tool, "ok": True,
                    "summary": f"Logged mood “{mood}” on “{task['title']}”",
                    "task_id": task_id, "mood": mood,
                })

            # ----- 3. reschedule_task -------------------------------------
            elif tool == "reschedule_task":
                task_id = args.get("task_id")
                scheduled_date_raw = args.get("scheduled_date")
                if not task_id or not scheduled_date_raw:
                    results.append({
                        "tool": tool, "ok": False,
                        "summary": "Missing task_id or scheduled_date (YYYY-MM-DD)",
                    })
                    continue
                scheduled_date = _normalize_date(str(scheduled_date_raw))
                if not scheduled_date:
                    results.append({
                        "tool": tool, "ok": False,
                        "summary": f"Couldn't parse date '{scheduled_date_raw}'. Use YYYY-MM-DD.",
                    })
                    continue
                path, task = await _find_path_task(user.user_id, task_id)
                if not path or not task:
                    results.append({"tool": tool, "ok": False, "summary": f"Task {task_id} not found"})
                    continue
                for ph in path["phases"]:
                    for ms in ph["milestones"]:
                        for st in ms["steps"]:
                            for t in st["micro_tasks"]:
                                if t["task_id"] == task_id:
                                    t["scheduled_date"] = scheduled_date
                await _save_path_phases(path["path_id"], path["phases"])
                await _log_activity(
                    user.user_id, "task.rescheduled_by_coach",
                    f"Coach rescheduled '{task['title']}' to {scheduled_date}",
                    {"task_id": task_id, "scheduled_date": scheduled_date},
                )
                results.append({
                    "tool": tool, "ok": True,
                    "summary": f"Moved “{task['title']}” to {scheduled_date}",
                    "task_id": task_id, "scheduled_date": scheduled_date,
                })

            # ----- 4. create_note -----------------------------------------
            elif tool == "create_note":
                title = args.get("title") or "Untitled"
                content = args.get("content") or ""
                goal_id = args.get("goal_id")
                if goal_id:
                    # Validate goal belongs to user; if not, drop the link.
                    goal_doc = await db.goals.find_one(
                        {"goal_id": goal_id, "user_id": user.user_id}, {"_id": 0, "goal_id": 1},
                    )
                    if not goal_doc:
                        goal_id = None
                note_id = f"note_{uuid.uuid4().hex[:12]}"
                await db.notes.insert_one({
                    "note_id": note_id, "user_id": user.user_id,
                    "goal_id": goal_id,
                    "title": title, "content": content,
                    "tags": ["from-coach"],
                    "created_at": _now(), "updated_at": _now(),
                })
                await _log_activity(
                    user.user_id, "note.created_by_coach",
                    f"Coach created note: {title}",
                    {"note_id": note_id, "goal_id": goal_id},
                )
                results.append({
                    "tool": tool, "ok": True,
                    "summary": f"Saved note “{title}”",
                    "note_id": note_id,
                })

            else:
                results.append({
                    "tool": tool or "?", "ok": False,
                    "summary": f"Unknown tool: {tool}",
                })
        except Exception as exc:  # noqa: BLE001
            results.append({
                "tool": call.get("tool") if isinstance(call, dict) else "?",
                "ok": False, "summary": str(exc)[:150],
            })

    clean = TOOL_CALL_PATTERN.sub("", raw_reply).strip()
    clean = re.sub(r"\n{3,}", "\n\n", clean)
    return clean, results


# =====================================================================
# EVENING CHECK-IN (proactive coaching)
# =====================================================================
#
# Every day between 20:00–21:00 UTC, for every user with an active path
# whose Day-1/today micro-task is still incomplete, Claude generates a
# short 2–3 sentence nudge and persists it as an assistant chat_message.
# Idempotency is per-user-per-date via the `user_state` collection.

EVENING_CHECKIN_PROMPT = """You are the MentorMeUp Coach sending an end-of-day check-in to {user_name}.
The user hasn't completed today's task yet. It's evening. Send ONE message: 2–3
short, warm, direct sentences. No action tags today — this is a nudge, not a
command. Reference the specific task title and, if possible, their why_today
line. End with a concrete next sentence (either an encouragement to do it now,
or an offer to reschedule to tomorrow morning).

Today's task: {task_title} ({task_duration} min)
Why today: {task_why}
Their goal: {goal_title}
Their path context: {context}

Rules:
- Max 3 sentences. No bullet lists. No markdown headings. No emoji spam.
- Do not pretend to mark things done. Never emit <action> tags.
- Sound like a friend who remembers what they're training for.

Write the nudge now."""


async def _generate_evening_nudge(user_doc: dict[str, Any], path_doc: dict[str, Any], task_doc: dict[str, Any]) -> str | None:
    """Call Claude to write the evening nudge. Returns the text or None on failure."""
    try:
        context_parts = []
        summary = path_doc.get("intake_summary", {})
        if summary.get("motivation"):
            context_parts.append(f"Motivation: {summary['motivation']}")
        if summary.get("preferred_time_of_day"):
            context_parts.append(f"Preferred time of day: {summary['preferred_time_of_day']}")
        context_parts.append(f"Progress: {path_doc.get('progress', 0)}%")
        context = " · ".join(context_parts) or "No extra context."

        prompt = EVENING_CHECKIN_PROMPT.format(
            user_name=user_doc.get("name", "there"),
            task_title=task_doc.get("title", "your task"),
            task_duration=task_doc.get("duration_minutes", 10),
            task_why=task_doc.get("why_today", ""),
            goal_title=path_doc.get("goal_title", "your goal"),
            context=context,
        )
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"evening:{user_doc['user_id']}:{uuid.uuid4().hex[:6]}",
            system_message=prompt,
        ).with_model(COACH_MODEL_PROVIDER, COACH_MODEL_NAME)
        reply = await chat.send_message(UserMessage(text="Send the nudge."))
        return reply.strip() if reply else None
    except Exception:  # noqa: BLE001
        return None


async def _process_evening_checkin_for_user(user_doc: dict[str, Any]) -> bool:
    """Run the evening check-in for one user. Returns True if a nudge was sent.

    Timezone-aware: we fire only when the user's LOCAL clock is between 20:00
    and 21:00. The user's tz lives in user_preferences.timezone (IANA name,
    defaults to UTC). Idempotency is stamped by the user's LOCAL date, not
    UTC — otherwise a single evening could fire twice for users near the date
    boundary."""
    user_id = user_doc["user_id"]

    # Load the user's preferences (timezone, plus the proactive toggle).
    prefs_doc = await db.user_preferences.find_one({"user_id": user_id}, {"_id": 0}) or {}
    if prefs_doc.get("proactive_checkins") is False:
        return False
    tz_name = prefs_doc.get("timezone") or "UTC"
    try:
        tz = ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        tz = timezone.utc

    local_now = _now().astimezone(tz)
    if not (CHECKIN_WINDOW_START_HOUR <= local_now.hour < CHECKIN_WINDOW_END_HOUR):
        return False

    local_today = local_now.date().isoformat()
    state = await db.user_state.find_one({"user_id": user_id}, {"_id": 0}) or {}
    if state.get("last_evening_checkin_local_date") == local_today:
        return False
    # Back-compat: if the old UTC-date field matches today's local date
    # (rare, only when tz = UTC), also skip so we don't double-fire during
    # the one-time migration.
    if state.get("last_evening_checkin_date") == local_today and tz_name in ("UTC", "Etc/UTC"):
        return False

    # Find the user's active goal + path.
    goal = await db.goals.find_one(
        {"user_id": user_id, "status": "active"}, {"_id": 0},
    )
    if not goal or not goal.get("path_id"):
        return False
    path = await db.paths.find_one({"path_id": goal["path_id"]}, {"_id": 0})
    if not path:
        return False

    # Find today's incomplete task (same logic as /today endpoint).
    today_task: dict[str, Any] | None = None
    for ph in path["phases"]:
        for ms in ph["milestones"]:
            for st in ms["steps"]:
                for t in st["micro_tasks"]:
                    if not t.get("completed"):
                        today_task = t
                        break
                if today_task:
                    break
            if today_task:
                break
        if today_task:
            break
    if not today_task:
        return False  # Nothing to nudge about.

    nudge = await _generate_evening_nudge(user_doc, path, today_task)
    if not nudge:
        return False

    msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    await db.chat_messages.insert_one({
        "message_id": msg_id,
        "user_id": user_id,
        "role": "assistant",
        "content": nudge,
        "actions": [],
        "kind": "evening_checkin",
        "created_at": _now(),
    })
    # User model: count this evening nudge against the current coaching tone.
    await _user_model_on_nudge_sent(
        user_id, "evening_checkin", prefs_doc.get("coaching_style") or "balanced",
    )
    await db.user_state.update_one(
        {"user_id": user_id},
        {"$set": {
            "last_evening_checkin_local_date": local_today,
            "last_evening_checkin_timezone": tz_name,
            "updated_at": _now(),
        }},
        upsert=True,
    )
    await _log_activity(
        user_id, "coach.evening_checkin",
        f"Evening nudge sent for '{today_task['title']}' ({tz_name} {local_now:%H:%M})",
        {
            "task_id": today_task.get("task_id"),
            "message_id": msg_id,
            "local_time": local_now.isoformat(),
            "timezone": tz_name,
        },
    )
    return True


async def run_evening_checkins() -> dict[str, int]:
    """Scan all users and send the evening check-in where due. Returns counts."""
    cursor = db.users.find({}, {"_id": 0})
    sent = 0
    scanned = 0
    async for user_doc in cursor:
        scanned += 1
        try:
            if await _process_evening_checkin_for_user(user_doc):
                sent += 1
        except Exception:  # noqa: BLE001
            continue
    return {"scanned": scanned, "sent": sent}


@app.post("/api/coach/evening-checkin/run")
async def trigger_evening_checkin(user: User = Depends(get_current_user)):
    """Manual trigger for dev/testing. Runs the check-in for all users right now.

    In production the background loop handles this automatically at 20:00 UTC.
    """
    result = await run_evening_checkins()
    return {"ok": True, **result}


# =====================================================================
# STRUGGLE DETECTION (proactive coaching)
# =====================================================================
#
# The product promise is "AI that gets you there" — that means noticing when
# you're stuck before you say it. Every time the user opens /daily, the
# frontend emits a `task.viewed` activity event with the current incomplete
# task's id. If that task has been viewed 3+ times in the last 24h without a
# matching `task.completed`, the coach reaches out with a soft, specific
# question about what's actually getting in the way.
#
# Guards:
#   • Honors `user_preferences.proactive_checkins` (skip when off).
#   • Idempotent per-user-per-task-per-day: we stamp user_state.struggle_nudges
#     so the user doesn't get nudged twice for the same stuck task.
#
STRUGGLE_THRESHOLD = 3
STRUGGLE_WINDOW = timedelta(hours=24)

STRUGGLE_NUDGE_PROMPT = """You are the MentorMeUp Coach. {user_name} has opened this task {view_count} times in the last 24 hours without completing it. That's avoidance — not laziness. Something about this task is harder than it looks, or something else in their life is in the way.

Send ONE short message (2–3 sentences max):
1. Name what you've noticed — specifically, by task title and the count.
2. Ask ONE open, non-judgmental question about what's actually blocking them. Don't list options; let them tell you.
3. Do NOT reschedule, complete, or offer a new task yet — you need their answer first.

No markdown headings. No bullet lists. No emoji spam. No action tags. Sound like a friend who's been paying attention.

Task: {task_title} ({task_duration} min)
Why it matters today: {task_why}
Goal: {goal_title}

Write the message now."""


async def _generate_struggle_nudge(
    user_doc: dict[str, Any],
    path_doc: dict[str, Any],
    task_doc: dict[str, Any],
    view_count: int,
) -> str | None:
    try:
        prompt = STRUGGLE_NUDGE_PROMPT.format(
            user_name=user_doc.get("name", "there"),
            view_count=view_count,
            task_title=task_doc.get("title", "your task"),
            task_duration=task_doc.get("duration_minutes", 10),
            task_why=task_doc.get("why_today", ""),
            goal_title=path_doc.get("goal_title", "your goal"),
        )
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"struggle:{user_doc['user_id']}:{uuid.uuid4().hex[:6]}",
            system_message=prompt,
        ).with_model(COACH_MODEL_PROVIDER, COACH_MODEL_NAME)
        reply = await chat.send_message(UserMessage(text="Send the nudge."))
        return reply.strip() if reply else None
    except Exception:  # noqa: BLE001
        return None


async def _process_struggle_for_user(user_doc: dict[str, Any]) -> dict[str, Any] | None:
    """Scan one user's activity. Returns a debug dict if a nudge was sent,
    None if nothing to do."""
    user_id = user_doc["user_id"]

    # Respect the user's proactive-checkins preference.
    prefs_doc = await db.user_preferences.find_one(
        {"user_id": user_id}, {"_id": 0, "proactive_checkins": 1}
    )
    if prefs_doc is not None and prefs_doc.get("proactive_checkins") is False:
        return None

    # Find the active goal + path (same rule as evening-checkin).
    goal = await db.goals.find_one(
        {"user_id": user_id, "status": "active"}, {"_id": 0}
    )
    if not goal or not goal.get("path_id"):
        return None
    path = await db.paths.find_one({"path_id": goal["path_id"]}, {"_id": 0})
    if not path:
        return None

    # Walk the tree to find the next incomplete task.
    stuck_task: dict[str, Any] | None = None
    for ph in path["phases"]:
        for ms in ph["milestones"]:
            for st in ms["steps"]:
                for t in st["micro_tasks"]:
                    if not t.get("completed"):
                        stuck_task = t
                        break
                if stuck_task:
                    break
            if stuck_task:
                break
        if stuck_task:
            break
    if not stuck_task:
        return None

    task_id = stuck_task.get("task_id")
    if not task_id:
        return None

    window_start = _now() - STRUGGLE_WINDOW

    # If we've already nudged for this task in the last window, skip.
    state = await db.user_state.find_one({"user_id": user_id}, {"_id": 0}) or {}
    last_nudges: dict[str, str] = state.get("struggle_nudges", {}) or {}
    last_iso = last_nudges.get(task_id)
    if last_iso:
        try:
            last_dt = datetime.fromisoformat(last_iso)
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            if last_dt >= window_start:
                return None
        except ValueError:
            pass

    # If the task was completed in the window, nothing to do (shouldn't happen
    # since we only get here when task is incomplete, but defensive).
    completed_in_window = await db.activity_events.count_documents({
        "user_id": user_id,
        "kind": "task.completed",
        "payload.task_id": task_id,
        "created_at": {"$gte": window_start},
    })
    if completed_in_window:
        return None

    # Count views of this task in the window.
    view_count = await db.activity_events.count_documents({
        "user_id": user_id,
        "kind": "task.viewed",
        "payload.task_id": task_id,
        "created_at": {"$gte": window_start},
    })
    if view_count < STRUGGLE_THRESHOLD:
        return None

    nudge = await _generate_struggle_nudge(user_doc, path, stuck_task, view_count)
    if not nudge:
        return None

    msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    await db.chat_messages.insert_one({
        "message_id": msg_id,
        "user_id": user_id,
        "role": "assistant",
        "content": nudge,
        "actions": [],
        "kind": "struggle_nudge",
        "created_at": _now(),
    })
    # User model: count this nudge against the current coaching tone +
    # register a "skip" against this task's kind (the user is avoiding it).
    prefs_for_tone = await db.user_preferences.find_one(
        {"user_id": user_id}, {"_id": 0, "coaching_style": 1},
    )
    await _user_model_on_nudge_sent(
        user_id, "struggle_nudge",
        (prefs_for_tone or {}).get("coaching_style") or "balanced",
    )
    await _user_model_on_task_skipped(user_id, stuck_task)
    # Stamp so we don't nudge again for this task in the same window.
    last_nudges[task_id] = _now().isoformat()
    await db.user_state.update_one(
        {"user_id": user_id},
        {"$set": {"struggle_nudges": last_nudges, "updated_at": _now()}},
        upsert=True,
    )
    await _log_activity(
        user_id,
        "coach.struggle_nudge",
        f"Struggle nudge sent for '{stuck_task['title']}' ({view_count} views)",
        {"task_id": task_id, "view_count": view_count, "message_id": msg_id},
    )
    return {
        "task_id": task_id,
        "task_title": stuck_task["title"],
        "view_count": view_count,
        "message_id": msg_id,
    }


async def run_struggle_detection() -> dict[str, int]:
    cursor = db.users.find({}, {"_id": 0})
    scanned = 0
    nudged = 0
    async for user_doc in cursor:
        scanned += 1
        try:
            if await _process_struggle_for_user(user_doc):
                nudged += 1
        except Exception:  # noqa: BLE001
            continue
    return {"scanned": scanned, "nudged": nudged}


@app.post("/api/coach/struggle-detection/run")
async def trigger_struggle_detection(user: User = Depends(get_current_user)):
    """Manual trigger for dev/testing. In production, the background loop
    runs this every 15 minutes."""
    result = await run_struggle_detection()
    return {"ok": True, **result}


# ----- Background scheduler -------------------------------------------------

CHECKIN_LOOP_INTERVAL_SECONDS = 300  # 5 minutes
CHECKIN_WINDOW_START_HOUR = 20  # 20:00 UTC
CHECKIN_WINDOW_END_HOUR = 21  # up to 21:00 UTC

STRUGGLE_LOOP_INTERVAL_SECONDS = 900  # 15 minutes


async def _evening_checkin_loop() -> None:
    import sys
    # The per-user timezone check lives inside run_evening_checkins, so we
    # fire the scan on every tick. Only users whose local time is in
    # [20:00, 21:00) and haven't been nudged today (local-date-stamped) get
    # a message.
    while True:
        try:
            result = await run_evening_checkins()
            if result.get("sent"):
                print(f"[evening_checkin] {result}", file=sys.stderr, flush=True)
        except Exception as exc:  # noqa: BLE001
            print(f"[evening_checkin] error: {exc}", file=sys.stderr, flush=True)
        await asyncio.sleep(CHECKIN_LOOP_INTERVAL_SECONDS)


async def _struggle_detection_loop() -> None:
    import sys
    # Small initial delay so we don't pile on at startup.
    await asyncio.sleep(60)
    while True:
        try:
            result = await run_struggle_detection()
            if result["nudged"]:
                print(f"[struggle_detection] {result}", file=sys.stderr, flush=True)
        except Exception as exc:  # noqa: BLE001
            print(f"[struggle_detection] error: {exc}", file=sys.stderr, flush=True)
        await asyncio.sleep(STRUGGLE_LOOP_INTERVAL_SECONDS)


@app.on_event("startup")
async def _start_background_tasks() -> None:
    asyncio.create_task(_evening_checkin_loop())
    asyncio.create_task(_struggle_detection_loop())
