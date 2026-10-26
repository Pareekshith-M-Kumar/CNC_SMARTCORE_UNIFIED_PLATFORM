from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)

def test_public_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert data["service"] == "geometry-service"

def test_internal_health_check_without_key():
    response = client.get("/internal/health")
    assert response.status_code == 403

def test_internal_health_check_with_valid_key():
    response = client.get(
        "/internal/health",
        headers={"X-Internal-Key": settings.INTERNAL_API_KEY}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "UP"
