#!/usr/bin/env python3
"""End-to-end intake + path generation test."""
import json
import subprocess
import sys
import time
import urllib.request
import uuid

BASE = "https://a0364a8f-3654-4c6f-a5ea-4b264d1b18e2.preview.emergentagent.com"


def seed_user() -> tuple[str, str]:
    token = f"test_e2e_{uuid.uuid4().hex[:10]}"
    uid = f"e2e-{uuid.uuid4().hex[:10]}"
    script = f"""
use('mentormeup_db');
db.users.insertOne({{user_id: '{uid}', email: '{uid}@e.com', name: 'Jamie', picture: null, created_at: new Date()}});
db.user_sessions.insertOne({{user_id: '{uid}', session_token: '{token}', expires_at: new Date(Date.now()+7*24*60*60*1000), created_at: new Date()}});
"""
    subprocess.run(["mongosh", "--quiet", "--eval", script], check=True, capture_output=True)
    return uid, token


def api(method: str, path: str, token: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (e2e-test)",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()[:300]}")
        raise


USER_MESSAGES = [
    "Hey",
    "92kg at 175cm, desk job, sedentary. I travel Mon-Wed for work, home Thu-Sun.",
    "My sister gets married in September - I want to feel confident in the photos, not hide.",
    "4-5 hours weekly, about 45 minutes a day. Mornings before 8am work best.",
    "Tried twice before. Start strong, work gets busy, stress eat at night. Never made past week 3.",
    "Tight budget, no gym. Just resistance bands at home and a park nearby.",
    "I learn by doing. Videos and articles put me to sleep. Hands on only.",
    "Mornings for sure - before 8am every day.",
]


def main() -> None:
    uid, token = seed_user()
    print(f"User seeded: {uid}\nToken: {token}\n")

    goal = api("POST", "/api/goals", token, {"title": "Lose 15 kg", "color": "cyan"})
    goal_id = goal["goal_id"]
    print(f"Goal created: {goal_id}\n")

    for idx, msg in enumerate(USER_MESSAGES, start=1):
        print(f"=== Turn {idx} | USER: {msg[:80]} ===")
        r = api("POST", "/api/intake/chat", token, {"goal_id": goal_id, "message": msg})
        print(f"COACH: {r['reply'][:300]}")
        print(f"COMPLETE: {r['intake_complete']}")
        print()
        if r["intake_complete"]:
            break
        time.sleep(0.8)

    # Poll for the path.
    print("--- Polling /api/paths/{goal_id} for path build ---")
    for attempt in range(90):
        try:
            path = api("GET", f"/api/paths/{goal_id}", token)
            print(f"\n✅ Path ready after {attempt+1} poll(s).\n")
            print(json.dumps(path, indent=2, default=str)[:6000])
            return
        except urllib.error.HTTPError as e:
            if e.code in (404, 502):
                print(f"  [{attempt+1}] still building (status {e.code})...")
                time.sleep(3)
            else:
                raise
    print("❌ Path never built.")


if __name__ == "__main__":
    main()
