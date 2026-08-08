"""Tests for the Data API."""
import pytest


@pytest.mark.anyio
async def test_get_data_sources(client):
    response = await client.get("/api/data/sources")
    assert response.status_code == 200
    data = response.json()
    assert "sources" in data
    sources = data["sources"]
    assert len(sources) >= 8

    source_ids = {s["id"] for s in sources}
    assert "sentinel-2" in source_ids
    assert "sentinel-1" in source_ids
    assert "landsat" in source_ids
    assert "srtm" in source_ids
    assert "openstreetmap" in source_ids


@pytest.mark.anyio
async def test_data_source_has_required_fields(client):
    response = await client.get("/api/data/sources")
    sources = response.json()["sources"]
    for s in sources:
        assert "id" in s
        assert "name" in s
        assert "description" in s
        assert "type" in s
        assert "free_access" in s
        assert "url" in s


@pytest.mark.anyio
async def test_explore_source(client):
    response = await client.get("/api/data/explore/sentinel-2")
    assert response.status_code == 200
    data = response.json()
    assert data["source"]["id"] == "sentinel-2"
    assert "bands" in data["source"]


@pytest.mark.anyio
async def test_explore_source_not_found(client):
    response = await client.get("/api/data/explore/nonexistent-source")
    assert response.status_code == 404
