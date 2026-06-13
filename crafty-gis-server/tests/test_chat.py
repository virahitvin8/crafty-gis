"""Tests for the Chat API."""
import pytest


@pytest.mark.anyio
async def test_chat_health(client):
    response = await client.get("/api/chat/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "active_sessions" in data


@pytest.mark.anyio
async def test_create_session(client):
    response = await client.post("/api/chat/session", json={"project_id": "test-project"})
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["status"] == "active"
    assert data["messages"] == []


@pytest.mark.anyio
async def test_get_session(client):
    # Create a session first
    create_resp = await client.post("/api/chat/session", json={})
    session_id = create_resp.json()["session_id"]

    # Retrieve it
    response = await client.get(f"/api/chat/session/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == session_id


@pytest.mark.anyio
async def test_get_session_not_found(client):
    response = await client.get("/api/chat/session/nonexistent")
    assert response.status_code == 404


@pytest.mark.anyio
async def test_send_message_creates_session(client):
    """Sending a message without session_id should auto-create a session."""
    response = await client.post("/api/chat/message", json={
        "message": "I want to analyze vegetation in my area"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"]
    assert data["reply"]
    assert isinstance(data["suggestions"], list)


@pytest.mark.anyio
async def test_send_message_with_session(client):
    # Create session
    create_resp = await client.post("/api/chat/session", json={})
    session_id = create_resp.json()["session_id"]

    # Send message
    response = await client.post("/api/chat/message", json={
        "session_id": session_id,
        "message": "Show me NDVI for Delhi"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == session_id
    assert data["reply"]
