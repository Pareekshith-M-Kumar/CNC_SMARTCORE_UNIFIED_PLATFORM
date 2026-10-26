from fastapi import APIRouter, Depends

from app.core.security import verify_internal_key

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "UP", "service": "geometry-service"}

@router.get("/internal/health")
def internal_health_check(_: str = Depends(verify_internal_key)):
    return {"status": "UP", "service": "geometry-service", "internal": True}
