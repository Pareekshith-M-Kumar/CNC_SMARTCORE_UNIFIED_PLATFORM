from fastapi import HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader

from app.core.config import settings

api_key_header = APIKeyHeader(name="X-Internal-Key", auto_error=False)

def verify_internal_key(key: str = Security(api_key_header)) -> str:
    if not key or key != settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Invalid or missing internal service API key"}
        )
    return key
