from typing import Any

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.security import verify_internal_key
from app.services.ai_estimator import ai_machining_advisor
from app.services.cad_processor import process_cad

router = APIRouter(prefix="/internal/v1", dependencies=[Depends(verify_internal_key)])


@router.post("/cad/process", summary="Process uploaded CAD geometry")
async def process_cad_endpoint(
    file: UploadFile = File(...),  # noqa: B008
    format: str = Form("STL"),
    units: str = Form("mm")
) -> dict[str, Any]:
    content = await file.read()
    filename = file.filename or "model.stl"
    return process_cad(content, filename, format, units)


@router.get("/ai/recommendations", summary="Query AI machining parameter recommendations")
async def get_ai_recommendations(
    material: str = "AL6061-T6",
    tool_diameter_mm: float = 10.0,
    max_rpm: int = 10000
) -> dict[str, Any]:
    return ai_machining_advisor.predict_optimal_parameters(
        material_code=material,
        tool_diameter_mm=tool_diameter_mm,
        max_machine_rpm=max_rpm
    )
