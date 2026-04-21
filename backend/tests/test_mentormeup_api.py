"""
MentorMeUp Backend API Tests
Tests: Health, Auth, Goals CRUD, Tasks, Activity, Coach Chat
"""
import os
import pytest
import requests
import time

BASE_URL = (os.environ.get('NEXT_PUBLIC_BACKEND_URL') or os.environ.get('REACT_APP_BACKEND_URL') or 'https://mentormeup.preview.emergentagent.com').rstrip('/')
TEST_TOKEN = "test_session_1776631129183"

# Fixtures
@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def auth_client(api_client):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {TEST_TOKEN}"})
    return api_client


# ============ Health Check ============
class TestHealth:
    """Health endpoint tests"""
    
    def test_health_returns_200(self, api_client):
        """GET /api/health returns 200 with status ok"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "time" in data


# ============ Auth Tests ============
class TestAuth:
    """Authentication endpoint tests"""
    
    def test_auth_me_without_token_returns_401(self, api_client):
        """GET /api/auth/me without auth returns 401"""
        # Remove auth header if present
        headers = {"Content-Type": "application/json"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_auth_me_with_valid_token(self, auth_client):
        """GET /api/auth/me with valid token returns user"""
        response = auth_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        assert data["name"] == "Alex"
        # Verify _id is NOT in response
        assert "_id" not in data


# ============ Goals CRUD Tests ============
class TestGoalsCRUD:
    """Goals CRUD endpoint tests"""
    
    created_goal_id = None
    
    def test_list_goals_empty_or_existing(self, auth_client):
        """GET /api/goals returns list"""
        response = auth_client.get(f"{BASE_URL}/api/goals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify no _id in any goal
        for goal in data:
            assert "_id" not in goal
    
    def test_create_goal_with_default_phases_and_tasks(self, auth_client):
        """POST /api/goals creates goal with 3 phases and 2 daily tasks"""
        payload = {
            "title": "TEST_Learn Python",
            "description": "Master Python programming",
            "color": "cyan"
        }
        response = auth_client.post(f"{BASE_URL}/api/goals", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify goal structure
        assert "goal_id" in data
        assert data["title"] == "TEST_Learn Python"
        assert data["description"] == "Master Python programming"
        assert data["color"] == "cyan"
        assert data["status"] == "active"
        assert data["progress"] == 0
        
        # Verify 3 phases
        assert "phases" in data
        assert len(data["phases"]) == 3
        
        # Verify 2 daily tasks
        assert "daily_tasks" in data
        assert len(data["daily_tasks"]) == 2
        
        # Verify _id is NOT in response
        assert "_id" not in data
        
        # Store for later tests
        TestGoalsCRUD.created_goal_id = data["goal_id"]
    
    def test_get_goals_includes_created_goal(self, auth_client):
        """GET /api/goals includes the newly created goal"""
        response = auth_client.get(f"{BASE_URL}/api/goals")
        assert response.status_code == 200
        data = response.json()
        
        goal_ids = [g["goal_id"] for g in data]
        assert TestGoalsCRUD.created_goal_id in goal_ids
    
    def test_update_goal(self, auth_client):
        """PATCH /api/goals/{id} updates goal"""
        goal_id = TestGoalsCRUD.created_goal_id
        assert goal_id is not None, "Goal must be created first"
        
        payload = {"title": "TEST_Learn Python Advanced", "progress": 25}
        response = auth_client.patch(f"{BASE_URL}/api/goals/{goal_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["title"] == "TEST_Learn Python Advanced"
        assert data["progress"] == 25
        assert "_id" not in data
    
    def test_delete_goal(self, auth_client):
        """DELETE /api/goals/{id} removes goal"""
        goal_id = TestGoalsCRUD.created_goal_id
        assert goal_id is not None, "Goal must be created first"
        
        response = auth_client.delete(f"{BASE_URL}/api/goals/{goal_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        
        # Verify goal is gone
        response = auth_client.get(f"{BASE_URL}/api/goals")
        goal_ids = [g["goal_id"] for g in response.json()]
        assert goal_id not in goal_ids


# ============ Task Toggle Tests ============
class TestTaskToggle:
    """Task toggle endpoint tests"""
    
    goal_id = None
    task_id = None
    
    def test_create_goal_for_task_test(self, auth_client):
        """Create a goal to test task toggle"""
        payload = {"title": "TEST_Task Toggle Goal", "color": "purple"}
        response = auth_client.post(f"{BASE_URL}/api/goals", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        TestTaskToggle.goal_id = data["goal_id"]
        TestTaskToggle.task_id = data["daily_tasks"][0]["id"]
        
        # Verify task is not completed initially
        assert data["daily_tasks"][0]["completed"] == False
        assert data["progress"] == 0
    
    def test_toggle_task_completes_it(self, auth_client):
        """POST /api/goals/{goal_id}/tasks/{task_id}/toggle flips completed flag"""
        goal_id = TestTaskToggle.goal_id
        task_id = TestTaskToggle.task_id
        
        response = auth_client.post(f"{BASE_URL}/api/goals/{goal_id}/tasks/{task_id}/toggle")
        assert response.status_code == 200
        data = response.json()
        
        # Find the toggled task
        task = next(t for t in data["daily_tasks"] if t["id"] == task_id)
        assert task["completed"] == True
        
        # Progress should be 50% (1 of 2 tasks)
        assert data["progress"] == 50
        assert "_id" not in data
    
    def test_toggle_task_uncompletes_it(self, auth_client):
        """Toggle again to uncomplete"""
        goal_id = TestTaskToggle.goal_id
        task_id = TestTaskToggle.task_id
        
        response = auth_client.post(f"{BASE_URL}/api/goals/{goal_id}/tasks/{task_id}/toggle")
        assert response.status_code == 200
        data = response.json()
        
        task = next(t for t in data["daily_tasks"] if t["id"] == task_id)
        assert task["completed"] == False
        assert data["progress"] == 0
    
    def test_cleanup_task_test_goal(self, auth_client):
        """Cleanup: delete the test goal"""
        goal_id = TestTaskToggle.goal_id
        response = auth_client.delete(f"{BASE_URL}/api/goals/{goal_id}")
        assert response.status_code == 200


# ============ Activity Tests ============
class TestActivity:
    """Activity endpoint tests"""
    
    def test_post_custom_activity(self, auth_client):
        """POST /api/activity records a custom event"""
        payload = {
            "kind": "test.event",
            "summary": "TEST_Custom activity event",
            "payload": {"test_key": "test_value"}
        }
        response = auth_client.post(f"{BASE_URL}/api/activity", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
    
    def test_get_recent_activity(self, auth_client):
        """GET /api/activity/recent returns recent events"""
        response = auth_client.get(f"{BASE_URL}/api/activity/recent")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # Should have at least the custom event we just created
        assert len(data) > 0
        
        # Verify structure
        for event in data:
            assert "event_id" in event
            assert "kind" in event
            assert "summary" in event
            assert "_id" not in event


# ============ Coach Chat Tests ============
class TestCoachChat:
    """Coach chat endpoint tests - uses real Claude Sonnet 4.6"""
    
    def test_create_goal_for_coach_context(self, auth_client):
        """Create a goal so coach has context"""
        payload = {"title": "TEST_Run a marathon", "color": "green"}
        response = auth_client.post(f"{BASE_URL}/api/goals", json=payload)
        assert response.status_code == 200
    
    def test_coach_chat_returns_real_reply(self, auth_client):
        """POST /api/coach/chat returns real Claude reply within 15s"""
        payload = {"message": "Hi coach, what should I focus on today?"}
        
        start = time.time()
        response = auth_client.post(f"{BASE_URL}/api/coach/chat", json=payload, timeout=20)
        elapsed = time.time() - start
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message_id" in data
        assert "reply" in data
        assert "created_at" in data
        
        # Verify reply is non-empty
        assert len(data["reply"]) > 0, "Reply should not be empty"
        
        # Verify response time
        assert elapsed < 15, f"Response took {elapsed}s, expected < 15s"
        
        print(f"Coach reply ({elapsed:.1f}s): {data['reply'][:200]}...")
    
    def test_coach_history_returns_messages(self, auth_client):
        """GET /api/coach/history returns user+assistant turns"""
        response = auth_client.get(f"{BASE_URL}/api/coach/history")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # Should have at least the user message and assistant reply
        assert len(data) >= 2
        
        # Verify structure and roles
        roles = [m["role"] for m in data]
        assert "user" in roles
        assert "assistant" in roles
        
        for msg in data:
            assert "message_id" in msg
            assert "content" in msg
            assert "created_at" in msg
            assert "_id" not in msg
    
    def test_cleanup_coach_test_goal(self, auth_client):
        """Cleanup: delete test goals"""
        response = auth_client.get(f"{BASE_URL}/api/goals")
        goals = response.json()
        for goal in goals:
            if goal["title"].startswith("TEST_"):
                auth_client.delete(f"{BASE_URL}/api/goals/{goal['goal_id']}")


# ============ Logout Test ============
class TestLogout:
    """Logout endpoint test - run last"""
    
    def test_logout_endpoint_exists(self):
        """POST /api/auth/logout endpoint exists and returns expected structure"""
        # NOTE: We do NOT actually logout the main test token to avoid breaking other tests
        # Just verify the endpoint exists and returns expected structure with a dummy request
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Test logout endpoint exists (without valid token - should still return ok)
        response = session.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
