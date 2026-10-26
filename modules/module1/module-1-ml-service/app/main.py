import os
import asyncio
import json
import random
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.routes import failure_prediction, tool_wear
from app.utils.logger import get_logger
from app.services.model_loader import ModelLoader

load_dotenv()
logger = get_logger(__name__)

# ── Startup / shutdown ────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting CNC ML Service...")
    ModelLoader.load_all()
    logger.info("All models loaded successfully.")
    yield
    logger.info("Shutting down CNC ML Service...")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CNC ML Prediction Service",
    description="Real-time failure prediction and tool wear estimation for CNC machines",
    version="1.0.0",
    lifespan=lifespan,
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(failure_prediction.router, prefix="/api/predict", tags=["Failure Prediction"])
app.include_router(tool_wear.router, prefix="/api/predict", tags=["Tool Wear"])

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "cnc-ml-service"}

# ── Machine data endpoints (mocked — replace with DB/OPC-UA later) ────────────
MACHINES = {
    f"M00{i}": {
        "id": f"M00{i}",
        "name": f"CNC-0{i}",
        "type": ["3-Axis Milling", "5-Axis CNC", "Turning Center", "EDM Machine"][i % 4],
        "status": ["running", "idle", "warning", "error", "running", "running"][i - 1],
        "health": [88, 95, 100, 62, 90, 30][i - 1],
        "utilization": [92, 75, 0, 60, 88, 0][i - 1],
        "spindleSpeed": [3200, 2800, 0, 1500, 3500, 0][i - 1],
        "feedRate": [520, 450, 0, 300, 600, 0][i - 1],
        "temperature": [68, 62, 24, 78, 71, 25][i - 1],
        "vibration": [2.1, 1.8, 0, 7.2, 2.5, 0][i - 1],
        "toolWear": [45, 30, 10, 80, 55, 92][i - 1],
        "currentJob": ["JOB-001", "JOB-002", None, None, "JOB-003", None][i - 1],
    }
    for i in range(1, 7)
}

@app.get("/api/machines")
async def get_machines():
    return list(MACHINES.values())

@app.get("/api/machines/{machine_id}")
async def get_machine(machine_id: str):
    return MACHINES.get(machine_id, {})

@app.get("/api/machines/{machine_id}/metrics")
async def get_machine_metrics(machine_id: str):
    m = MACHINES.get(machine_id, {})
    return {
        "machineId": machine_id,
        "spindleSpeed": m.get("spindleSpeed", 0) + random.randint(-50, 50),
        "feedRate": m.get("feedRate", 0) + random.randint(-20, 20),
        "temperature": round(m.get("temperature", 25) + random.uniform(-1, 1), 1),
        "vibration": round(m.get("vibration", 0) + random.uniform(-0.2, 0.2), 2),
        "utilization": m.get("utilization", 0),
        "toolWear": m.get("toolWear", 0),
    }

@app.get("/api/machines/{machine_id}/health")
async def get_machine_health(machine_id: str):
    m = MACHINES.get(machine_id, {})
    return {"machineId": machine_id, "health": m.get("health", 100)}

# Job endpoints
JOBS = [
    {"id": "JOB-001", "name": "Bracket Type-A", "machine": "CNC-01", "priority": "high", "status": "running", "progress": 68, "estimatedTime": "45 min", "material": "Aluminum"},
    {"id": "JOB-002", "name": "Shaft Coupling", "machine": "CNC-02", "priority": "medium", "status": "running", "progress": 32, "estimatedTime": "1h 20min", "material": "Steel"},
    {"id": "JOB-003", "name": "Housing Cover", "machine": "CNC-05", "priority": "high", "status": "running", "progress": 88, "estimatedTime": "12 min", "material": "Aluminum"},
    {"id": "JOB-004", "name": "Gear Assembly", "machine": "Pending", "priority": "medium", "status": "queued", "progress": 0, "estimatedTime": "2h 10min", "material": "Steel"},
]

@app.get("/api/jobs")
async def get_jobs():
    return JOBS

@app.get("/api/jobs/queue")
async def get_job_queue():
    return JOBS

@app.post("/api/jobs/schedule")
async def schedule_jobs(body: dict):
    return {"status": "ok", "algorithm": body.get("algorithm"), "scheduledJobs": len(JOBS)}

# Alerts
@app.get("/api/alerts/active")
async def get_active_alerts():
    return [
        {"id": "A001", "machineId": "CNC-04", "type": "warning", "message": "High vibration detected — 7.2 mm/s", "time": "2 min ago", "acknowledged": False},
        {"id": "A002", "machineId": "CNC-06", "type": "error", "message": "Machine health critical — 30%", "time": "15 min ago", "acknowledged": False},
    ]

@app.get("/api/alerts/history")
async def get_alert_history():
    return [
        {"id": "H001", "machineId": "CNC-03", "type": "error", "message": "Spindle overspeed shutdown", "resolvedAt": "2 days ago", "duration": "3 min"},
    ]

@app.post("/api/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    return {"status": "acknowledged", "alertId": alert_id}

@app.post("/api/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    return {"status": "resolved", "alertId": alert_id}

# Analytics
@app.get("/api/analytics/utilization")
async def get_utilization():
    return {"data": "utilization data"}

@app.get("/api/analytics/failures")
async def get_failures():
    return {"data": "failure data"}

# ── WebSocket for real-time metrics ──────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, data: dict):
        for ws in self.active[:]:
            try:
                await ws.send_json(data)
            except Exception:
                self.active.remove(ws)

manager = ConnectionManager()

@app.websocket("/ws/metrics")
async def ws_metrics(websocket: WebSocket):
    await manager.connect(websocket)
    logger.info(f"WebSocket connected: {websocket.client}")
    try:
        while True:
            metrics = {
                "type": "metrics",
                "spindleSpeed": random.randint(2800, 3600),
                "temperature": round(random.uniform(60, 80), 1),
                "vibration": round(random.uniform(1.5, 4.0), 2),
                "feedRate": random.randint(400, 650),
            }
            await websocket.send_json(metrics)
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket disconnected")

@app.websocket("/ws/machines/{machine_id}")
async def ws_machine(websocket: WebSocket, machine_id: str):
    await manager.connect(websocket)
    try:
        while True:
            base = MACHINES.get(machine_id, {})
            await websocket.send_json({
                "type": "metrics",
                "machineId": machine_id,
                "spindleSpeed": (base.get("spindleSpeed", 3000)) + random.randint(-100, 100),
                "temperature": round(base.get("temperature", 65) + random.uniform(-1, 1), 1),
                "vibration": round(base.get("vibration", 2.0) + random.uniform(-0.3, 0.3), 2),
                "feedRate": (base.get("feedRate", 500)) + random.randint(-30, 30),
            })
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
