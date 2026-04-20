# MentorMeUp Test Credentials

## Auth Model
Emergent-managed Google OAuth. No password-based app accounts; sign-in flow:
1. `/login` → click "Continue with Google" → redirects to `auth.emergentagent.com`
2. Google OAuth → returns to `/#session_id=<session_id>`
3. `OAuthCallbackHandler` (mounted in root layout) exchanges `session_id` at
   `POST /api/auth/session` → backend sets httpOnly cookie `session_token`
4. Subsequent calls carry the cookie via `credentials: 'include'`

## Active Test Identities (seeded directly in MongoDB for agent testing)

| Purpose            | user_id                     | email                                       | session_token                    | name | Notes                                                            |
|--------------------|-----------------------------|----------------------------------------------|----------------------------------|------|------------------------------------------------------------------|
| E2E coach/chat     | test-user-1776631129183     | test.1776631129183@example.com              | test_session_1776631129183       | Alex | Has 1 goal: "Run a half marathon" (goal_26b83f2e6f28) + seeded path with micro-tasks t-1-1-1-1, t-1-1-1-2, t-1-1-2-1 |

> These tokens are long-lived (7 days). If they expire, re-seed with the
> snippet in `/app/auth_testing.md`.

## How the testing agent should authenticate
Use the session token as an `Authorization: Bearer <session_token>` header,
OR set the cookie named `session_token` with the same value.

### Backend curl example
```
curl -s https://<host>/api/auth/me \
  -H "Authorization: Bearer test_session_1776631129183"
```

### Playwright cookie example
```python
await page.context.add_cookies([{
    "name": "session_token",
    "value": "test_session_1776631129183",
    "domain": "<preview-host>",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None",
}])
```

## Real Google sign-in
Cannot be automated here — the Emergent hosted page requires an actual Google
account consent. Use the seeded session above for all automated / E2E tests.

## Cleanup
```
mongosh --eval "
use('mentormeup_db');
db.users.deleteMany({email: /test\./});
db.user_sessions.deleteMany({session_token: /test_session/});
"
```
