import os

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)
AUTH_HEADERS = {"X-Internal-Key": settings.INTERNAL_API_KEY}

FIXTURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../fixtures"))


def test_process_cube_10mm_stl():
    cube_path = os.path.join(FIXTURES_DIR, "cube_10mm.stl")
    assert os.path.exists(cube_path), f"Fixture missing: {cube_path}"

    with open(cube_path, "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/internal/v1/cad/process",
        headers=AUTH_HEADERS,
        files={"file": ("cube_10mm.stl", file_bytes, "model/stl")},
        data={"format": "STL", "units": "mm"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["previewStatus"] == "READY"
    assert data["isWatertight"] is True
    assert data["previewGlbBase64"] is not None
    # 10mm cube volume = 1000 mm3 (+- 5% tolerance)
    assert 950.0 <= data["volumeMm3"] <= 1050.0
    # Bounding box should be ~10mm along each axis
    assert 9.0 <= data["bboxXMm"] <= 11.0
    assert 9.0 <= data["bboxYMm"] <= 11.0
    assert 9.0 <= data["bboxZMm"] <= 11.0
    # AI assessment
    assert "aiMachinability" in data
    assert data["aiMachinability"]["risk_level"] in ("LOW", "MEDIUM", "HIGH")


def test_process_malformed_stl():
    bad_path = os.path.join(FIXTURES_DIR, "bad.stl")
    with open(bad_path, "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/internal/v1/cad/process",
        headers=AUTH_HEADERS,
        files={"file": ("bad.stl", file_bytes, "model/stl")},
        data={"format": "STL", "units": "mm"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["previewStatus"] == "FAILED"
    assert data["previewError"] is not None


def test_process_step_fallback():
    step_path = os.path.join(FIXTURES_DIR, "bracket.step")
    with open(step_path, "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/internal/v1/cad/process",
        headers=AUTH_HEADERS,
        files={"file": ("bracket.step", file_bytes, "application/step")},
        data={"format": "STEP", "units": "mm"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["previewStatus"] == "UNSUPPORTED"
    assert "OpenCASCADE" in data["previewError"]
    assert data["sha256"] is not None


def test_ai_machining_recommendations():
    response = client.get(
        "/internal/v1/ai/recommendations",
        headers=AUTH_HEADERS,
        params={"material": "AL6061-T6", "tool_diameter_mm": 10.0}
    )

    assert response.status_code == 200
    data = response.json()
    assert "recommended_rpm" in data
    assert data["recommended_rpm"] > 0
    assert "recommended_feed_mm_min" in data
    assert "benchmark_source" in data
    assert "Kaggle" in data["benchmark_source"]
