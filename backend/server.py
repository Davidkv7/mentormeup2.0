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
from typing import Any, Literal

import httpx
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from fastapi import Cookie, Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
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

COACH_MODEL_PROVIDER = "openai"
COACH_MODEL_NAME = "gpt-4o"
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
    result = await db.goals.update_one(
        {"goal_id": goal_id, "user_id": user.user_id},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    await _log_activity(
        user.user_id,
        "goal.updated",
        f"Updated goal: {goal_id}",
        {"goal_id": goal_id, "updates": updates},
    )
    return await db.goals.find_one({"goal_id": goal_id}, {"_id": 0})


@app.delete("/api/goals/{goal_id}")
async def delete_goal(goal_id: str, user: User = Depends(get_current_user)):
    result = await db.goals.delete_one({"goal_id": goal_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
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
COACH_SYSTEM_PROMPT = """You are the MentorMeUp Coach assistant running inside a production web app.
The user is {user_name}. When {user_name} asks you to do something actionable (mark a task
complete, save a note, log mood) you MUST emit a structured <action> tag that the app's
backend executes. The app STRIPS these tags before showing the reply to the user — they are
the protocol, not pretend. If you refuse to emit the tags, the feature is broken.

# EXAMPLE — follow this exact pattern

User: "I just finished my morning run, mark the first micro-task done and save a note that says 'legs feel great'."

Correct assistant reply:
Done — logging that now.
<action>{{"tool": "toggle_task", "args": {{"task_id": "t-1-1-1-1", "completed": true, "mood_today": "great"}}}}</action>
<action>{{"tool": "create_note", "args": {{"title": "Morning run", "content": "Legs feel great.", "goal_id": "goal_abc"}}}}</action>
One small thing: tomorrow add a 5-min warmup before you start.

# TOOL CATALOG
- create_note(title, content, goal_id?)  — save a note, optionally linked to a goal.
- toggle_task(task_id, completed?, mood_today?)  — flip a path micro-task. mood_today must be
  "great", "ok", or "drained". Task IDs appear in the context below. NEVER invent an ID — if
  you don't see it, ask the user what they mean.

RULES
- Max 3 <action> calls per turn.
- Never say "I can't do that" or "I'm an AI" about these actions — they ARE real.
- If the user says "I did X", default to marking it done unless they explicitly say otherwise.

# COACHING STYLE
You are warm, candid, and sharp — a mentor who challenges weak plans and celebrates real
progress. Short human sentences. No bullet lists unless the user asks. No emoji spam. No
markdown headings. End every reply with a single concrete next action (verb + object +
timeframe) UNLESS you're just confirming a tool call.

# USER CONTEXT (live data — reference specifically, don't speak in generalities)
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
                                lines.append(
                                    f"          {mark} {t['task_id']}: {t['title']} ({t['duration_minutes']}m){mood}"
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

    # Persist user message first so it's visible in history even if LLM fails.
    user_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    await db.chat_messages.insert_one(
        {
            "message_id": user_msg_id,
            "user_id": user.user_id,
            "role": "user",
            "content": body.message,
            "created_at": _now(),
        }
    )

    # Rebuild short-term context for Claude: last 20 messages, oldest first.
    history_cursor = (
        db.chat_messages.find({"user_id": user.user_id}, {"_id": 0})
        .sort("created_at", -1)
        .limit(20)
    )
    history = list(reversed([m async for m in history_cursor]))

    context = await _build_coach_context(user)
    system_prompt = COACH_SYSTEM_PROMPT.format(user_name=user.name, context=context)

    # Load prior turns so Claude has the full thread.
    prior_cursor = (
        db.chat_messages.find(
            {"user_id": user.user_id, "message_id": {"$ne": user_msg_id}},
            {"_id": 0, "role": 1, "content": 1, "created_at": 1},
        )
        .sort("created_at", -1)
        .limit(20)
    )
    prior_msgs = list(reversed([m async for m in prior_cursor]))
    initial_messages = [
        {"role": m["role"], "content": m["content"]} for m in prior_msgs
    ]

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"coach:{user.user_id}:{uuid.uuid4().hex[:6]}",
        system_message=system_prompt,
        initial_messages=initial_messages or None,
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


@app.get("/api/coach/history")
async def coach_history(user: User = Depends(get_current_user), limit: int = 100):
    cursor = (
        db.chat_messages.find({"user_id": user.user_id}, {"_id": 0})
        .sort("created_at", 1)
        .limit(limit)
    )
    return [doc async for doc in cursor]


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
        await db.goals.update_one(
            {"goal_id": body.goal_id}, {"$set": {"intake_status": "building_path"}}
        )
        # Fire-and-forget: generate the path in the background.
        asyncio.create_task(
            _generate_and_save_path(
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

        # Model rotation: try a diverse set so provider-specific outages don't
        # block us. Fast JSON generators first; heavier reasoners as fallback.
        MODEL_ATTEMPTS = [
            ("openai", "gpt-4o-mini"),
            ("gemini", "gemini-2.0-flash"),
            ("openai", "gpt-4o"),
            ("anthropic", "claude-sonnet-4-6"),
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

TOOL_SYSTEM_PROMPT_SUFFIX = """

AVAILABLE TOOLS
You can take real actions by emitting tool calls inline. Use tools ONLY when the
user explicitly asks for something actionable. After any user-facing prose, emit
each tool call on its own line:

<action>{"tool": "create_note", "args": {"title": "...", "content": "...", "goal_id": "goal_xxx"}}</action>
<action>{"tool": "toggle_task", "args": {"task_id": "t-1-1-1-1", "completed": true, "mood_today": "great"}}</action>

The user never sees the <action> blocks (stripped server-side). They DO see a
small confirmation chip like "✓ Created note 'Workout log'" so they know what
happened. Confirm intent in prose first, THEN emit the call.

TOOL CATALOG
- create_note(title, content, goal_id?) — saves a note; attach to a goal when relevant.
- toggle_task(task_id, completed?, mood_today?) — marks a path micro-task complete;
  optional mood_today one of: "great", "ok", "drained". Task IDs appear in the
  user context below. Never invent IDs.

RULES
- Never fabricate IDs. If unsure, ask the user what they meant.
- Don't emit more than 3 tool calls per turn.
- Don't use tools speculatively — only when the user has clearly asked for them.
"""


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
            if tool == "create_note":
                note_id = f"note_{uuid.uuid4().hex[:12]}"
                await db.notes.insert_one({
                    "note_id": note_id, "user_id": user.user_id,
                    "goal_id": args.get("goal_id"),
                    "title": args.get("title", "Untitled"),
                    "content": args.get("content", ""),
                    "tags": ["from-coach"],
                    "created_at": _now(), "updated_at": _now(),
                })
                await _log_activity(
                    user.user_id, "note.created_by_coach",
                    f"Coach created note: {args.get('title', 'Untitled')}",
                    {"note_id": note_id, "goal_id": args.get("goal_id")},
                )
                results.append({
                    "tool": tool, "ok": True,
                    "summary": f"Created note “{args.get('title', 'Untitled')}”",
                    "note_id": note_id,
                })
            elif tool == "toggle_task":
                task_id = args.get("task_id")
                if not task_id:
                    results.append({"tool": tool, "ok": False, "summary": "Missing task_id"})
                    continue
                path = await db.paths.find_one(
                    {"user_id": user.user_id, "phases.milestones.steps.micro_tasks.task_id": task_id},
                    {"_id": 0},
                )
                if not path:
                    results.append({"tool": tool, "ok": False, "summary": f"Task {task_id} not found"})
                    continue
                phases = path["phases"]
                hit_title = None
                for ph in phases:
                    for m2 in ph["milestones"]:
                        for s in m2["steps"]:
                            for t in s["micro_tasks"]:
                                if t["task_id"] == task_id:
                                    if "completed" in args:
                                        t["completed"] = bool(args["completed"])
                                    if "mood_today" in args:
                                        t["mood_today"] = args["mood_today"]
                                    hit_title = t["title"]
                await db.paths.update_one(
                    {"path_id": path["path_id"]}, {"$set": {"phases": phases}},
                )
                await _log_activity(
                    user.user_id, "task.toggled_by_coach",
                    f"Coach toggled: {hit_title}", {"task_id": task_id},
                )
                results.append({"tool": tool, "ok": True, "summary": f"Marked “{hit_title}” done"})
            else:
                results.append({"tool": tool or "?", "ok": False, "summary": f"Unknown tool: {tool}"})
        except Exception as exc:  # noqa: BLE001
            results.append({
                "tool": call.get("tool") if isinstance(call, dict) else "?",
                "ok": False, "summary": str(exc)[:150],
            })

    clean = TOOL_CALL_PATTERN.sub("", raw_reply).strip()
    clean = re.sub(r"\n{3,}", "\n\n", clean)
    return clean, results
