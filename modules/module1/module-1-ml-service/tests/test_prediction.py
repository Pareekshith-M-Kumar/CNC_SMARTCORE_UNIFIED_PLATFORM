"""
Basic tests for the prediction service.
Run with: pytest tests/
"""
import pytest
from app.services.model_loader import ModelLoader
from app.services.prediction_service import PredictionService


@pytest.fixture(scope="module", autouse=True)
def load_models():
    ModelLoader.load_all()


NORMAL_SENSOR = {
    "spindleSpeed": 3000,
    "feedRate": 500,
    "temperature": 65,
    "vibration": 2.0,
    "toolWear": 40,
}

CRITICAL_SENSOR = {
    "spindleSpeed": 4500,
    "feedRate": 700,
    "temperature": 90,
    "vibration": 8.5,
    "toolWear": 92,
}


def test_failure_prediction_returns_required_fields():
    result = PredictionService.predict_failure("M001", NORMAL_SENSOR)
    assert "failureProbability" in result
    assert "riskLevel" in result
    assert "recommendations" in result
    assert 0.0 <= result["failureProbability"] <= 1.0


def test_critical_sensor_gives_high_risk():
    result = PredictionService.predict_failure("M002", CRITICAL_SENSOR)
    assert result["riskLevel"] in ("HIGH", "CRITICAL")
    assert result["failureProbability"] >= 0.5


def test_health_score_in_range():
    score = PredictionService.get_health_score("M003")
    assert 0.0 <= score <= 100.0


def test_tool_wear_prediction():
    tool_data = {**NORMAL_SENSOR, "operatingHours": 10}
    result = PredictionService.predict_tool_wear("M001", tool_data)
    assert "estimatedWear" in result
    assert "replacementUrgency" in result
    assert result["replacementUrgency"] in ("NORMAL", "SOON", "IMMEDIATE")


def test_tool_wear_urgency_high_when_worn():
    tool_data = {**CRITICAL_SENSOR, "operatingHours": 20}
    result = PredictionService.predict_tool_wear("M002", tool_data)
    assert result["estimatedWear"] >= 50  # Should be high for these inputs
