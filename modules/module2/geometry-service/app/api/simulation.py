from fastapi import APIRouter, HTTPException, status
from app.services.simulation_engine import (
    SimulationAnalysisRequest,
    SimulationAnalysisResponse,
    analyze_simulation,
)

router = APIRouter(prefix="/internal/v1/simulation")

@router.post(
    "/analyze",
    response_model=SimulationAnalysisResponse,
    summary="Run immutable rule-based simulation risk checks against toolpath"
)
async def run_simulation_analysis(request: SimulationAnalysisRequest):
    try:
        response = analyze_simulation(request)
        return response
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation analysis failed: {str(ex)}"
        )
