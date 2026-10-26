"""
PredictionService — orchestrates model inference for failure prediction,
health scoring, and tool wear estimation.
"""
import numpy as np
from app.services.model_loader import ModelLoader
from app.services.data_processor import DataProcessor
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _risk_level(prob: float) -> str:
    if prob < 0.25:
        return "LOW"
    elif prob < 0.55:
        return "MEDIUM"
    elif prob < 0.80:
        return "HIGH"
    return "CRITICAL"


def _failure_types(sensor_data: dict) -> list[dict]:
    """Heuristic breakdown of most likely failure modes."""
    types = []
    temp = sensor_data.get("temperature", 0)
    vib  = sensor_data.get("vibration", 0)
    wear = sensor_data.get("toolWear", 0)

    if temp > 75:
        types.append({"type": "Overheating", "probability": round(min((temp - 75) / 25, 1.0), 2)})
    if vib > 5:
        types.append({"type": "Excessive Vibration", "probability": round(min((vib - 5) / 5, 1.0), 2)})
    if wear > 70:
        types.append({"type": "Tool Wear", "probability": round(min((wear - 70) / 30, 1.0), 2)})
    if not types:
        types.append({"type": "General Wear", "probability": 0.05})

    return sorted(types, key=lambda x: -x["probability"])


def _failure_recommendations(risk: str, sensor_data: dict) -> list[str]:
    recs = []
    if risk in ("HIGH", "CRITICAL"):
        recs.append("Schedule immediate inspection of the machine.")
    if sensor_data.get("temperature", 0) > 75:
        recs.append("Check coolant system and cooling fans.")
    if sensor_data.get("vibration", 0) > 5:
        recs.append("Inspect spindle bearings and tool holder for looseness.")
    if sensor_data.get("toolWear", 0) > 70:
        recs.append("Replace cutting tool before the next job.")
    if not recs:
        recs.append("Continue normal operation. Schedule routine maintenance.")
    return recs


def _wear_urgency(wear: float) -> str:
    if wear < 60:
        return "NORMAL"
    elif wear < 80:
        return "SOON"
    return "IMMEDIATE"


class PredictionService:

    @staticmethod
    def predict_failure(machine_id: str, sensor_data: dict) -> dict:
        model = ModelLoader.get("failure")
        X = DataProcessor.prepare_failure_features(sensor_data)

        proba = model.predict_proba(X)[0]
        fail_prob = float(proba[1]) if len(proba) > 1 else float(proba[0])
        fail_prob = DataProcessor.clamp(fail_prob, 0.0, 1.0)

        risk = _risk_level(fail_prob)
        ttf = None
        if fail_prob > 0.3:
            # Rough heuristic: higher probability → fewer hours
            ttf = round(max(1.0, (1.0 - fail_prob) * 48), 1)

        logger.info(f"[{machine_id}] failure_prob={fail_prob:.3f} risk={risk}")

        return {
            "machineId": machine_id,
            "failureProbability": round(fail_prob, 4),
            "riskLevel": risk,
            "predictedTimeToFailure": ttf,
            "confidence": 0.82,  # placeholder — replace with calibration
            "failureTypes": _failure_types(sensor_data),
            "recommendations": _failure_recommendations(risk, sensor_data),
        }

    @staticmethod
    def get_health_score(machine_id: str) -> float:
        """Returns a health score 0-100 using the health model with default sensor values."""
        model = ModelLoader.get("health")
        # Use neutral defaults when no live sensor data is provided
        X = DataProcessor.prepare_health_features({
            "spindleSpeed": 3000, "feedRate": 500,
            "temperature": 65, "vibration": 2.5, "toolWear": 50,
        })
        score = float(model.predict(X)[0])
        return round(DataProcessor.clamp(score, 0.0, 100.0), 1)

    @staticmethod
    def predict_tool_wear(machine_id: str, tool_data: dict) -> dict:
        model = ModelLoader.get("tool_wear")
        X = DataProcessor.prepare_wear_features(tool_data)

        estimated_wear = float(model.predict(X)[0])
        estimated_wear = DataProcessor.clamp(estimated_wear, 0.0, 100.0)

        wear_rate = estimated_wear / max(tool_data.get("operatingHours", 10), 1)
        remaining_pct = 100.0 - estimated_wear
        remaining_life = remaining_pct / max(wear_rate, 0.01)

        urgency = _wear_urgency(estimated_wear)

        recs = []
        if urgency == "IMMEDIATE":
            recs.append("Replace tool immediately before the next machining operation.")
        elif urgency == "SOON":
            recs.append("Plan a tool change within the next 2 hours of operation.")
        else:
            recs.append("Tool in acceptable condition. Monitor wear rate.")

        if tool_data.get("vibration", 0) > 4:
            recs.append("High vibration is accelerating tool wear. Check workholding setup.")

        logger.info(f"[{machine_id}] tool_wear={estimated_wear:.1f}% urgency={urgency}")

        return {
            "machineId": machine_id,
            "estimatedWear": round(estimated_wear, 1),
            "remainingLife": round(min(remaining_life, 500), 1),
            "replacementUrgency": urgency,
            "confidence": 0.78,
            "wearRate": round(wear_rate, 3),
            "recommendations": recs,
        }
