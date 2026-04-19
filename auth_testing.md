# Auth Testing Playbook (for testing agents)

This app uses **Emergent-managed Google OAuth**. The real Google consent flow
cannot be automated, so for testing agents we seed a user + session directly in
MongoDB and use the resulting `session_token` as an `Authorization: Bearer`
header or as a `session_token` cookie.

## Step 1 — Seed a test user & session
```bash
mongosh --eval "
use('mentormeup_db');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Alex',
  picture: null,
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('USER_ID=' + userId);
print('TOKEN=' + sessionToken);
"
```

## Step 2 — Test backend API
```bash
TOKEN=<paste>
BASE=<preview url, no trailing slash>

curl -s "$BASE/api/auth/me" -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/api/goals" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "$BASE/api/goals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Write a novel","color":"cyan"}'
curl -s -X POST "$BASE/api/coach/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"Coach, where should I start?"}'
```

Expected: `/api/coach/chat` returns `{"message_id": ..., "reply": ..., "created_at": ...}`
within ~5s. Reply should reference the seeded goals by title.

## Step 3 — Browser testing (Playwright)
```python
await page.context.add_cookies([{
    "name": "session_token",
    "value": "<TOKEN>",
    "domain": "<preview host without scheme>",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None",
}])
await page.goto("https://<preview>/")
# orb: [data-testid=coach-orb]
# drawer: [data-testid=coach-drawer]
# input:  [data-testid=coach-input]
# send:   [data-testid=coach-send]
# last assistant reply: [data-testid=coach-msg-assistant] (last one)
```

## Checklist
- [ ] `/api/auth/me` returns 200 with the seeded user
- [ ] `/api/goals` GET returns the goals list
- [ ] `/api/goals` POST creates a goal and `_id` never leaks
- [ ] `/api/coach/chat` returns a real (non-empty) Claude Sonnet 4.6 reply
- [ ] `/api/coach/history` shows the user + assistant turns
- [ ] Root `/` redirects to `/login` when unauthenticated
- [ ] Root `/` renders MentorMeUp home + coach orb when authenticated
- [ ] Clicking orb opens drawer; sending a message returns a reply within 10s

## Cleanup
```
mongosh --eval "
use('mentormeup_db');
db.users.deleteMany({email: /test\./});
db.user_sessions.deleteMany({session_token: /test_session/});
db.chat_messages.deleteMany({user_id: /^test-user-/});
db.goals.deleteMany({user_id: /^test-user-/});
db.activity_events.deleteMany({user_id: /^test-user-/});
"
```
