"""
Session B (Multi-path selector with Tavily) — Backend tests.

Endpoints under test:
  POST /api/paths/build-options/{goal_id}
  GET  /api/paths/options/{goal_id}
  POST /api/paths/select-option/{goal_id}
  GET  /api/paths/{goal_id}          (full path after select)

Uses the pre-seeded Session-B goal (options ready, path already built) and a
fresh seeded goal (intake done, NO options yet) to exercise all branches.

NOTE: Options generation takes 10-25s; path expansion takes 30-90s. Timeouts
generous. No mocking — real Tavily + Claude.
"""
import os
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests

BASE_URL = (
    os.environ.get("NEXT_PUBLIC_BACKEND_URL")
    or os.environ.get("REACT_APP_BACKEND_URL")
    or "https://mentormeup.preview.emergentagent.com"
).rstrip("/")

# Pre-seeded Session-B user (options + path already built)
SEEDED_TOKEN = "tok_e37755bfce254fa3a9b145924a874adf"
SEEDED_GOAL = "goal_98615525"

# Forbidden jargon for path-name guardrail
JARGON = ["quantum", "synergy", "momentum", "resonance", "synthesis"]


def _auth(token: str) -> requests.Session:
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    return s


def _seed_fresh_user_with_completed_intake() -> tuple[str, str, str]:
    """Directly seed a user, session, goal, and intake transcript via Mongo."""
    import asyncio
    from dotenv import load_dotenv
    from motor.motor_asyncio import AsyncIOMotorClient

    load_dotenv("/app/backend/.env")

    async def go():
        db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
        now = datetime.now(timezone.utc)
        user_id = f"user_{uuid.uuid4().hex[:8]}"
        token = f"tok_{uuid.uuid4().hex}"
        goal_id = f"goal_{uuid.uuid4().hex[:8]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": f"{user_id}@test.local",
            "name": "TEST_SessionB",
            "picture": None,
            "created_at": now,
        })
        await db.user_sessions.insert_one({
            "session_token": token,
            "user_id": user_id,
            "created_at": now,
            "expires_at": now + timedelta(days=7),
        })
        await db.goals.insert_one({
            "goal_id": goal_id,
            "user_id": user_id,
            "title": "TEST_Learn Spanish conversational",
            "status": "active",
            "intake_status": "complete",
            "created_at": now,
        })
        msgs = [
            ("user", "I want to learn Spanish to conversational level."),
            ("assistant", "What's your starting point?"),
            ("user", "50 words from Duolingo."),
            ("assistant", "Why now?"),
            ("user", "Partner's family speaks Spanish."),
            ("assistant", "How many hours/week?"),
            ("user", "4-5 hours, full-time job."),
            ("assistant", "Tried before?"),
            ("user", "Duolingo twice, bored without real humans."),
            ("assistant", "Constraints?"),
            ("user", "$30/mo, Austin, early mornings."),
            ("assistant", "Learning style?"),
            ("user", "Talking. I retain nothing from video."),
        ]
        for i, (role, content) in enumerate(msgs):
            await db.intake_messages.insert_one({
                "message_id": f"imsg_{i}_{uuid.uuid4().hex[:6]}",
                "user_id": user_id,
                "goal_id": goal_id,
                "role": role,
                "content": content,
                "created_at": now + timedelta(seconds=i),
            })
        return token, goal_id, user_id

    return asyncio.run(go())


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def seeded_client():
    return _auth(SEEDED_TOKEN)


@pytest.fixture(scope="module")
def fresh():
    token, goal_id, user_id = _seed_fresh_user_with_completed_intake()
    return {"token": token, "goal_id": goal_id, "user_id": user_id, "client": _auth(token)}


# ================== Auth enforcement ==================
class TestAuthEnforcement:
    def test_build_options_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/paths/build-options/{SEEDED_GOAL}")
        assert r.status_code == 401

    def test_get_options_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/paths/options/{SEEDED_GOAL}")
        assert r.status_code == 401

    def test_select_option_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/paths/select-option/{SEEDED_GOAL}",
            json={"option_id": "option-1"},
        )
        assert r.status_code == 401

    def test_other_users_goal_returns_404(self, fresh):
        # fresh user token tries to read seeded user's options — must be 404
        r = fresh["client"].get(f"{BASE_URL}/api/paths/options/{SEEDED_GOAL}")
        assert r.status_code == 404


# ================== GET options — seeded happy path ==================
class TestOptionsShapeValidation:
    """Validate the /api/paths/options/{goal_id} response shape rigorously."""

    def test_seeded_options_returns_200_with_full_shape(self, seeded_client):
        r = seeded_client.get(f"{BASE_URL}/api/paths/options/{SEEDED_GOAL}")
        assert r.status_code == 200, r.text
        data = r.json()

        # Top-level fields
        for k in ("goal_id", "goal_title", "coach_recommendation", "options",
                  "generated_at", "cache_expires_at", "intake_status"):
            assert k in data, f"missing field {k}"
        assert data["goal_id"] == SEEDED_GOAL
        assert "_id" not in data

        # 3 options in strict angle order
        opts = data["options"]
        assert len(opts) == 3, f"expected 3 options, got {len(opts)}"
        expected_angles = ["evidence_based", "fastest", "sustainable"]
        assert [o["angle"] for o in opts] == expected_angles

        # Exactly one recommended
        rec_count = sum(1 for o in opts if o.get("recommended") is True)
        assert rec_count == 1, f"expected exactly 1 recommended option, got {rec_count}"

        for o in opts:
            for k in ("option_id", "angle", "name", "tagline", "timeline",
                      "intensity", "why_this_fits", "key_milestones", "sources"):
                assert k in o, f"option missing {k}"
            assert o["intensity"] in {"low", "moderate", "high"}, o["intensity"]
            # 3-5 milestones
            assert 3 <= len(o["key_milestones"]) <= 5, f"milestones count {len(o['key_milestones'])}"
            for m in o["key_milestones"]:
                assert isinstance(m, str) and len(m) > 0
            # sources shape
            assert isinstance(o["sources"], list) and len(o["sources"]) > 0
            for s in o["sources"]:
                assert "title" in s and "url" in s and "snippet" in s
                assert s["url"].startswith("http"), s["url"]

    def test_path_name_guardrail_no_jargon(self, seeded_client):
        r = seeded_client.get(f"{BASE_URL}/api/paths/options/{SEEDED_GOAL}")
        assert r.status_code == 200
        for o in r.json()["options"]:
            name_l = o["name"].lower()
            for j in JARGON:
                assert j not in name_l, f"path name '{o['name']}' contains jargon '{j}'"
            # 2-4 words, concrete
            words = o["name"].replace("-", " ").split()
            # Allow 2-6 tokens (articles like 'The' inflate count); tolerate.
            assert 2 <= len(words) <= 6, f"path name '{o['name']}' has {len(words)} words"


# ================== Build options — cache hit on seeded ==================
class TestBuildOptionsCacheHit:
    def test_build_options_returns_cached_when_fresh(self, seeded_client):
        r = seeded_client.post(f"{BASE_URL}/api/paths/build-options/{SEEDED_GOAL}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("status") == "options_ready"
        assert data.get("cached") is True


# ================== Fresh goal: build options from scratch ==================
class TestBuildOptionsFromScratch:
    """End-to-end: fresh goal → build options → poll → select-option → poll path."""

    def test_options_not_ready_initially(self, fresh):
        # Before build call: GET options should 404 with reason:not_ready
        r = fresh["client"].get(f"{BASE_URL}/api/paths/options/{fresh['goal_id']}")
        assert r.status_code == 404
        detail = r.json().get("detail")
        if isinstance(detail, dict):
            assert detail.get("reason") == "not_ready"

    def test_build_options_kicks_off_generation(self, fresh):
        r = fresh["client"].post(
            f"{BASE_URL}/api/paths/build-options/{fresh['goal_id']}"
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] in {"building_options", "options_ready"}

    def test_poll_until_options_ready(self, fresh):
        """Poll GET /api/paths/options until 200. Timeout 60s."""
        deadline = time.time() + 60
        last_status = None
        while time.time() < deadline:
            r = fresh["client"].get(
                f"{BASE_URL}/api/paths/options/{fresh['goal_id']}"
            )
            last_status = r.status_code
            if r.status_code == 200:
                data = r.json()
                # Full shape assertions
                assert len(data["options"]) == 3
                assert [o["angle"] for o in data["options"]] == [
                    "evidence_based", "fastest", "sustainable",
                ]
                assert sum(1 for o in data["options"] if o.get("recommended")) == 1
                # Jargon guardrail
                for o in data["options"]:
                    for j in JARGON:
                        assert j not in o["name"].lower(), f"jargon in {o['name']}"
                fresh["options"] = data
                return
            time.sleep(3)
        pytest.fail(f"Options never became ready (last status={last_status})")

    def test_select_invalid_option_returns_400(self, fresh):
        r = fresh["client"].post(
            f"{BASE_URL}/api/paths/select-option/{fresh['goal_id']}",
            json={"option_id": "option-99-bogus"},
        )
        assert r.status_code == 400

    def test_select_first_option_kicks_off_path_build(self, fresh):
        assert "options" in fresh, "options_ready test must run first"
        first_opt = fresh["options"]["options"][0]
        fresh["first_option"] = first_opt
        r = fresh["client"].post(
            f"{BASE_URL}/api/paths/select-option/{fresh['goal_id']}",
            json={"option_id": first_opt["option_id"]},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "building_path"
        assert data["option_id"] == first_opt["option_id"]

    def test_poll_until_path_built(self, fresh):
        """Poll GET /api/paths/{goal_id} until path exists (up to 120s)."""
        deadline = time.time() + 120
        last = None
        while time.time() < deadline:
            r = fresh["client"].get(f"{BASE_URL}/api/paths/{fresh['goal_id']}")
            last = r.status_code
            if r.status_code == 200:
                data = r.json()
                # Must have the Session B fields
                assert "selected_option_id" in data
                assert data["selected_option_id"] == fresh["first_option"]["option_id"]
                assert "selected_option_name" in data
                assert data["selected_option_name"] == fresh["first_option"]["name"]
                assert "selected_option_angle" in data
                assert data["selected_option_angle"] == fresh["first_option"]["angle"]
                assert "sources" in data and isinstance(data["sources"], list)
                assert len(data["sources"]) > 0
                assert "path_change_deadline" in data
                # Deadline ~now+24h, ensure ISO-parseable and in future
                dl = data["path_change_deadline"]
                # datetime or ISO string accepted
                if isinstance(dl, str):
                    parsed = datetime.fromisoformat(dl.replace("Z", "+00:00"))
                else:
                    parsed = dl
                assert parsed > datetime.now(timezone.utc)
                # phases should exist
                assert "phases" in data and len(data["phases"]) >= 1
                fresh["path"] = data
                return
            time.sleep(5)
        pytest.fail(f"Path never built (last status={last})")

    def test_change_path_within_24h_reuses_tavily(self, fresh):
        """Pick a DIFFERENT option. Must rebuild path; Tavily cache untouched."""
        opts = fresh["options"]["options"]
        first_id = fresh["first_option"]["option_id"]
        second = next(o for o in opts if o["option_id"] != first_id)

        # Swap
        r = fresh["client"].post(
            f"{BASE_URL}/api/paths/select-option/{fresh['goal_id']}",
            json={"option_id": second["option_id"]},
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "building_path"

        # Tavily cache (options doc) must still be there with same generated_at
        r2 = fresh["client"].get(f"{BASE_URL}/api/paths/options/{fresh['goal_id']}")
        assert r2.status_code == 200
        assert r2.json()["generated_at"] == fresh["options"]["generated_at"], \
            "Tavily cache regenerated on path swap (expensive!)"

        # Poll for rebuilt path (up to 120s)
        deadline = time.time() + 120
        while time.time() < deadline:
            rp = fresh["client"].get(f"{BASE_URL}/api/paths/{fresh['goal_id']}")
            if rp.status_code == 200 and rp.json().get("selected_option_id") == second["option_id"]:
                data = rp.json()
                assert data["selected_option_name"] == second["name"]
                assert data["selected_option_angle"] == second["angle"]
                # Sources change to match new option
                new_urls = {s["url"] for s in data["sources"]}
                old_urls = {s["url"] for s in fresh["first_option"]["sources"]}
                assert new_urls != old_urls or new_urls == {s["url"] for s in second["sources"]}
                return
            time.sleep(5)
        pytest.fail("Path did not swap to new option within 120s")


# ================== Regression smoke: older endpoints still work ==================
class TestRegressionSmoke:
    def test_goals_list(self, seeded_client):
        r = seeded_client.get(f"{BASE_URL}/api/goals")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_path_today(self, seeded_client):
        # Seeded goal has a full path
        r = seeded_client.get(f"{BASE_URL}/api/paths/{SEEDED_GOAL}/today")
        # Endpoint may 200 or 404 if no today task — just assert no 5xx
        assert r.status_code < 500, r.text


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
