"""
DataProcessor — cleans and transforms raw sensor dictionaries into
numpy arrays ready for model inference.
"""
import numpy as np
from typing import Any


FAILURE_FEATURE_ORDER = ["spindleSpeed", "feedRate", "temperature", "vibration", "toolWear"]
HEALTH_FEATURE_ORDER  = ["spindleSpeed", "feedRate", "temperature", "vibration", "toolWear"]
WEAR_FEATURE_ORDER    = ["spindleSpeed", "feedRate", "vibration", "temperature"]


class DataProcessor:

    @staticmethod
    def _safe_float(value: Any, default: float = 0.0) -> float:
        try:
            return float(value) if value is not None else default
        except (TypeError, ValueError):
            return default

    @classmethod
    def prepare_failure_features(cls, sensor_data: dict) -> np.ndarray:
        """Extract and order features for the failure prediction model."""
        row = [cls._safe_float(sensor_data.get(f), 0.0) for f in FAILURE_FEATURE_ORDER]
        return np.array(row).reshape(1, -1)

    @classmethod
    def prepare_health_features(cls, sensor_data: dict) -> np.ndarray:
        row = [cls._safe_float(sensor_data.get(f), 0.0) for f in HEALTH_FEATURE_ORDER]
        return np.array(row).reshape(1, -1)

    @classmethod
    def prepare_wear_features(cls, sensor_data: dict) -> np.ndarray:
        row = [cls._safe_float(sensor_data.get(f), 0.0) for f in WEAR_FEATURE_ORDER]
        return np.array(row).reshape(1, -1)

    @staticmethod
    def clamp(value: float, lo: float, hi: float) -> float:
        return max(lo, min(hi, value))
