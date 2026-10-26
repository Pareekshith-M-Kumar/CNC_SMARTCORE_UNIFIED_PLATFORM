"""
ModelLoader — loads pre-trained .pkl models or trains placeholder models
if the .pkl files don't yet exist (useful for first-time setup / dev).
"""
import os
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from app.utils.logger import get_logger

logger = get_logger(__name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
FAILURE_MODEL_PATH = os.path.join(MODEL_DIR, "failure_model.pkl")
HEALTH_MODEL_PATH  = os.path.join(MODEL_DIR, "health_model.pkl")
TOOL_WEAR_PATH     = os.path.join(MODEL_DIR, "tool_wear_model.pkl")

# Feature names expected by each model
FAILURE_FEATURES = ["spindleSpeed", "feedRate", "temperature", "vibration", "toolWear"]
HEALTH_FEATURES  = ["spindleSpeed", "feedRate", "temperature", "vibration", "toolWear"]
WEAR_FEATURES    = ["spindleSpeed", "feedRate", "vibration", "temperature"]

# Singleton store
_models: dict = {}


def _train_stub_failure_model() -> Pipeline:
    """Train a small placeholder RandomForest classifier."""
    np.random.seed(42)
    n = 500
    X = np.column_stack([
        np.random.uniform(1000, 5000, n),   # spindleSpeed
        np.random.uniform(100, 800, n),     # feedRate
        np.random.uniform(20, 100, n),      # temperature
        np.random.uniform(0, 10, n),        # vibration
        np.random.uniform(0, 100, n),       # toolWear
    ])
    # Label: failure if temp > 80 OR vibration > 7 OR toolWear > 85
    y = ((X[:, 2] > 80) | (X[:, 3] > 7) | (X[:, 4] > 85)).astype(int)
    model = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(n_estimators=50, max_depth=6, random_state=42)),
    ])
    model.fit(X, y)
    return model


def _train_stub_health_model() -> Pipeline:
    """Train a placeholder regressor for health score (0-100)."""
    np.random.seed(0)
    n = 500
    X = np.column_stack([
        np.random.uniform(1000, 5000, n),
        np.random.uniform(100, 800, n),
        np.random.uniform(20, 100, n),
        np.random.uniform(0, 10, n),
        np.random.uniform(0, 100, n),
    ])
    # Simple formula: health decreases with high temp, vibration, wear
    y = np.clip(
        100 - (X[:, 2] - 20) * 0.3 - X[:, 3] * 5 - X[:, 4] * 0.4 + np.random.normal(0, 3, n),
        0, 100
    )
    model = Pipeline([
        ("scaler", StandardScaler()),
        ("reg", RandomForestRegressor(n_estimators=50, max_depth=6, random_state=0)),
    ])
    model.fit(X, y)
    return model


def _train_stub_wear_model() -> Pipeline:
    """Train a placeholder regressor for tool wear %."""
    np.random.seed(7)
    n = 500
    X = np.column_stack([
        np.random.uniform(1000, 5000, n),
        np.random.uniform(100, 800, n),
        np.random.uniform(0, 10, n),
        np.random.uniform(20, 100, n),
    ])
    y = np.clip(
        X[:, 3] * 0.3 + X[:, 2] * 3 + X[:, 0] / 200 + np.random.normal(0, 5, n),
        0, 100
    )
    model = Pipeline([
        ("scaler", StandardScaler()),
        ("reg", RandomForestRegressor(n_estimators=50, max_depth=5, random_state=7)),
    ])
    model.fit(X, y)
    return model


class ModelLoader:
    @classmethod
    def load_all(cls):
        os.makedirs(MODEL_DIR, exist_ok=True)

        for name, path, trainer in [
            ("failure", FAILURE_MODEL_PATH, _train_stub_failure_model),
            ("health",  HEALTH_MODEL_PATH,  _train_stub_health_model),
            ("tool_wear", TOOL_WEAR_PATH,   _train_stub_wear_model),
        ]:
            if os.path.exists(path):
                logger.info(f"Loading {name} model from {path}")
                _models[name] = joblib.load(path)
            else:
                logger.warning(f"{name} model not found at {path}. Training placeholder model.")
                model = trainer()
                joblib.dump(model, path)
                _models[name] = model
                logger.info(f"Placeholder {name} model saved to {path}")

    @classmethod
    def get(cls, name: str):
        if name not in _models:
            raise RuntimeError(f"Model '{name}' is not loaded. Call ModelLoader.load_all() first.")
        return _models[name]
