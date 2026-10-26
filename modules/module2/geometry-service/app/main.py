from fastapi import FastAPI

from app.api.cad import router as cad_router
from app.api.health import router as health_router
from app.api.cam import router as cam_router
from app.api.simulation import router as simulation_router

app = FastAPI(
    title="CNC SmartCore Geometry Service",
    description="Stateless geometry conversion, 2.5D slicing, toolpaths, G-code validation, and simulation risk checks.",
    version="1.0.0"
)

# Mount routes
app.include_router(health_router, tags=["Health"])
app.include_router(cad_router, tags=["CAD Processing & AI Advisor"])
app.include_router(cam_router, tags=["CAM Toolpaths & G-Code"])
app.include_router(simulation_router, tags=["Simulation & Risk Analysis"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
