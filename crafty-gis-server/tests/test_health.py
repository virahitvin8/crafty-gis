"""Tests for health and root endpoints."""
import pytest


@pytest.mark.anyio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "CRAFTY GIS"


@pytest.mark.anyio
async def test_api_docs_accessible(client):
    """OpenAPI docs should be accessible."""
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert "paths" in data
    assert "/health" in data["paths"]
