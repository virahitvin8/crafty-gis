"""Tests for the Projects API."""
import pytest


@pytest.mark.anyio
async def test_create_project(client):
    response = await client.post("/api/projects", json={
        "name": "Test Project",
        "description": "A test project",
        "location": "Delhi, India",
        "tags": ["test", "ndvi"]
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["description"] == "A test project"
    assert data["location"] == "Delhi, India"
    assert data["status"] == "active"
    assert "test" in data["tags"]
    assert data["id"]


@pytest.mark.anyio
async def test_list_projects(client):
    # Create a project first
    await client.post("/api/projects", json={"name": "List Test"})

    response = await client.get("/api/projects")
    assert response.status_code == 200
    data = response.json()
    assert "projects" in data
    assert data["total"] >= 1


@pytest.mark.anyio
async def test_list_projects_search(client):
    await client.post("/api/projects", json={"name": "Satellite Analysis"})
    await client.post("/api/projects", json={"name": "Urban Study"})

    response = await client.get("/api/projects", params={"search": "Satellite"})
    assert response.status_code == 200
    data = response.json()
    assert any("Satellite" in p["name"] for p in data["projects"])


@pytest.mark.anyio
async def test_get_project(client):
    create_resp = await client.post("/api/projects", json={"name": "Get Test"})
    project_id = create_resp.json()["id"]

    response = await client.get(f"/api/projects/{project_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == project_id
    assert data["name"] == "Get Test"


@pytest.mark.anyio
async def test_get_project_not_found(client):
    response = await client.get("/api/projects/nonexistent")
    assert response.status_code == 404


@pytest.mark.anyio
async def test_update_project(client):
    create_resp = await client.post("/api/projects", json={"name": "Original"})
    project_id = create_resp.json()["id"]

    response = await client.put(f"/api/projects/{project_id}", json={
        "name": "Updated Name",
        "description": "Updated description"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["description"] == "Updated description"


@pytest.mark.anyio
async def test_delete_project(client):
    create_resp = await client.post("/api/projects", json={"name": "Delete Me"})
    project_id = create_resp.json()["id"]

    response = await client.delete(f"/api/projects/{project_id}")
    assert response.status_code == 204

    # Verify deleted
    get_resp = await client.get(f"/api/projects/{project_id}")
    assert get_resp.status_code == 404


@pytest.mark.anyio
async def test_add_analysis_to_project(client):
    create_resp = await client.post("/api/projects", json={"name": "Analysis Test"})
    project_id = create_resp.json()["id"]

    response = await client.post(f"/api/projects/{project_id}/analyses", json={
        "type": "ndvi",
        "status": "completed"
    })
    assert response.status_code == 200
    data = response.json()
    assert "analysis" in data
    assert data["analysis"]["type"] == "ndvi"


@pytest.mark.anyio
async def test_get_project_analyses(client):
    create_resp = await client.post("/api/projects", json={"name": "Analyses Test"})
    project_id = create_resp.json()["id"]

    response = await client.get(f"/api/projects/{project_id}/analyses")
    assert response.status_code == 200
    assert "analyses" in response.json()


@pytest.mark.anyio
async def test_get_project_outputs(client):
    create_resp = await client.post("/api/projects", json={"name": "Outputs Test"})
    project_id = create_resp.json()["id"]

    response = await client.get(f"/api/projects/{project_id}/outputs")
    assert response.status_code == 200
    assert "outputs" in response.json()
