"""Tests for the Analysis API."""
import pytest


@pytest.mark.anyio
async def test_get_analysis_types(client):
    response = await client.get("/api/analysis/types")
    assert response.status_code == 200
    data = response.json()
    assert "analysis_types" in data
    types = data["analysis_types"]
    assert len(types) >= 5
    type_ids = {t["id"] for t in types}
    assert "ndvi" in type_ids
    assert "mndwi" in type_ids
    assert "lulc" in type_ids


@pytest.mark.anyio
async def test_analysis_type_has_required_fields(client):
    response = await client.get("/api/analysis/types")
    types = response.json()["analysis_types"]
    for t in types:
        assert "id" in t
        assert "name" in t
        assert "description" in t
        assert "parameters" in t


@pytest.mark.anyio
async def test_run_analysis_invalid_type(client):
    response = await client.post("/api/analysis/run", json={
        "analysis_type": "nonexistent_type",
        "parameters": {}
    })
    assert response.status_code == 400
    assert "Unsupported analysis type" in response.json()["detail"]


@pytest.mark.anyio
async def test_get_analysis_result_not_found(client):
    response = await client.get("/api/analysis/result/nonexistent-id")
    assert response.status_code == 404
    assert "Analysis not found" in response.json()["detail"]


@pytest.mark.anyio
async def test_run_analysis_ndvi(client):
    """Run NDVI analysis (uses dummy data internally)."""
    response = await client.post("/api/analysis/run", json={
        "analysis_type": "ndvi",
        "parameters": {"nir_band": 8, "red_band": 4}
    })
    assert response.status_code == 200
    data = response.json()
    assert data["analysis_type"] == "ndvi"
    assert data["id"]
    # Status should be completed or failed (depends on rasterio availability)
    assert data["status"] in ("completed", "failed")


@pytest.mark.anyio
async def test_run_and_retrieve_analysis(client):
    """Run an analysis then retrieve it by ID."""
    run_resp = await client.post("/api/analysis/run", json={
        "analysis_type": "ndvi",
        "parameters": {}
    })
    assert run_resp.status_code == 200
    analysis_id = run_resp.json()["id"]

    get_resp = await client.get(f"/api/analysis/result/{analysis_id}")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["id"] == analysis_id
    assert data["analysis_type"] == "ndvi"
