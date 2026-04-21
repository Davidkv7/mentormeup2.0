# Test Credentials for MentorMeUp

## Programmatic seeding (no real login required)
The app uses Emergent-managed Google OAuth, so a real UI login is not possible
from headless tests. Instead, seed a user + session token directly into
MongoDB and pass the token as `Authorization: Bearer <token>`.

## Script
`/tmp/seed_test.py` — creates a fresh test user, session, goal, and a full
intake transcript (Learn Spanish, conversational). Prints:
```
TOKEN=tok_xxxxxxxxxxxxxxxx
GOAL_ID=goal_xxxxxxxx
USER_ID=user_xxxxxxxx
```

Run with: `python3 /tmp/seed_test.py`

## Currently seeded test user (Session B)
TOKEN=tok_e37755bfce254fa3a9b145924a874adf
GOAL_ID=goal_98615525
USER_ID=user_8723665f
- Goal: "Learn Spanish to conversational level"
- `intake_status`: complete
- path_options generated + option-1 selected → full path at path_78df87b4d495

## Session B endpoints
- `POST /api/paths/build-options/{goal_id}` → kicks off Tavily+Claude
- `GET  /api/paths/options/{goal_id}` → returns 3 options + coach_recommendation
- `POST /api/paths/select-option/{goal_id}` body `{"option_id":"option-N"}` → builds full path

## Frontend auth
localStorage key: `mentormeup.auth.token`
Inject via:
```js
window.localStorage.setItem('mentormeup.auth.token', '<token>')
```
before navigating.
