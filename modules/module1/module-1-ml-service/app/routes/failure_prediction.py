from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.services.prediction_service import PredictionService
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


class SensorInput(BaseModel):
    """Sensor readings from a CNC machine."""
    spindleSpeed: float = Field(..., description="Spindle speed in RPM", ge=0, le=20000)
    feedRate: float = Field(..., description="Feed rate in mm/min", ge=0)
    temperature: float = Field(..., description="Machine temperature in Celsius", ge=0)
    vibration: float = Field(..., description="Vibration level in mm/s", ge=0)
    toolWear: float = Field(..., description="Tool wear percentage (0-100)", ge=0, le=100)
    utilization: Optional[float] = Field(None, description="Machine utilization %", ge=0, le=100)
    cuttingForce: Optional[float] = Field(None, description="Cutting force in N", ge=0)
    coolantPressure: Optional[float] = Field(None, description="Coolant pressure in bar", ge=0)


class FailurePredictionResponse(BaseModel):
    machineId: str
    failureProbability: float
    riskLevel: str          # LOW / MEDIUM / HIGH / CRITICAL
    predictedTimeToFailure: Optional[float]  # hours
    confidence: float
    failureTypes: list[dict]
    recommendations: list[str]


@router.post("/failure/{machine_id}", response_model=FailurePredictionResponse)
async def predict_failure(machine_id: str, sensor_data: SensorInput):
    """
    Predict failure probability for a given machine based on sensor readings.
    """
    logger.info(f"Failure prediction request for machine {machine_id}")
    try:
        result = PredictionService.predict_failure(machine_id, sensor_data.model_dump())
        return result
    except Exception as e:
        logger.error(f"Prediction error for {machine_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health/{machine_id}")
async def get_health_score(machine_id: str):
    """Return overall health score for a machine."""
    try:
        score = PredictionService.get_health_score(machine_id)
        return {"machineId": machine_id, "healthScore": score}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
