from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.services.prediction_service import PredictionService
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


class ToolWearInput(BaseModel):
    spindleSpeed: float = Field(..., ge=0)
    feedRate: float = Field(..., ge=0)
    cuttingDepth: Optional[float] = Field(None, ge=0)
    cuttingForce: Optional[float] = Field(None, ge=0)
    vibration: float = Field(..., ge=0)
    temperature: float = Field(..., ge=0)
    materialHardness: Optional[float] = Field(None, description="Brinell hardness number", ge=0)
    toolMaterial: Optional[str] = Field(None, description="e.g. Carbide, HSS, Ceramic")
    operatingHours: Optional[float] = Field(None, description="Hours since last tool change", ge=0)


class ToolWearResponse(BaseModel):
    machineId: str
    estimatedWear: float          # 0-100 %
    remainingLife: float          # estimated hours
    replacementUrgency: str       # NORMAL / SOON / IMMEDIATE
    confidence: float
    wearRate: float               # % per hour
    recommendations: list[str]


@router.post("/tool-wear/{machine_id}", response_model=ToolWearResponse)
async def predict_tool_wear(machine_id: str, tool_data: ToolWearInput):
    """
    Estimate current tool wear and remaining tool life.
    """
    logger.info(f"Tool wear prediction for machine {machine_id}")
    try:
        result = PredictionService.predict_tool_wear(machine_id, tool_data.model_dump())
        return result
    except Exception as e:
        logger.error(f"Tool wear error for {machine_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
