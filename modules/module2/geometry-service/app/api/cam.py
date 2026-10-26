from fastapi import APIRouter, HTTPException, status
from app.services.toolpath_engine import (
    ToolpathGenerationRequest,
    ToolpathGenerationResponse,
    generate_toolpaths,
)
from app.services.gcode_generator import (
    GCodeGenerationRequest,
    GCodeValidationResult,
    generate_gcode,
    validate_gcode,
)

router = APIRouter(prefix="/internal/v1/cam")

@router.post(
    "/toolpath",
    response_model=ToolpathGenerationResponse,
    summary="Generate 2.5D toolpath polyline geometry for CAM job operations"
)
async def generate_cam_toolpath(request: ToolpathGenerationRequest):
    try:
        response = generate_toolpaths(request)
        return response
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate toolpath: {str(ex)}"
        )

@router.post(
    "/gcode/validate",
    response_model=GCodeValidationResult,
    summary="Post-process toolpath into dialect G-code and perform whitelist safety validation"
)
async def postprocess_and_validate_gcode(request: GCodeGenerationRequest):
    try:
        raw_gcode = generate_gcode(request)
        result = validate_gcode(raw_gcode, request)
        return result
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to post-process G-code: {str(ex)}"
        )
