import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.simulation_engine import (
    SimulationAnalysisRequest,
    analyze_simulation,
)
from app.services.toolpath_engine import (
    ToolpathGenerationResponse,
    OperationResult,
    ToolpathPoint,
)

client = TestClient(app)

def create_sample_toolpath(
    ap: float = 2.0,
    ae: float = 5.0,
    feed: float = 800.0,
    rpm: float = 3000.0,
    points: list = None,
    op_type: str = "POCKET_ROUGH",
    flute_len: float = 25.0,
    tool_d: float = 10.0,
) -> ToolpathGenerationResponse:
    if points is None:
        points = [
            ToolpathPoint(x=10.0, y=10.0, z=5.0, moveType="RAPID", f=12000.0, s=rpm),
            ToolpathPoint(x=10.0, y=10.0, z=-2.0, moveType="FEED", f=feed, s=rpm),
            ToolpathPoint(x=50.0, y=10.0, z=-2.0, moveType="FEED", f=feed, s=rpm),
            ToolpathPoint(x=50.0, y=50.0, z=-2.0, moveType="FEED", f=feed, s=rpm),
            ToolpathPoint(x=10.0, y=50.0, z=-2.0, moveType="FEED", f=feed, s=rpm),
            ToolpathPoint(x=10.0, y=10.0, z=5.0, moveType="RAPID", f=12000.0, s=rpm),
        ]
    op = OperationResult(
        seq=1,
        opType=op_type,
        toolId="T1",
        toolDiameterMm=tool_d,
        toolFluteLengthMm=flute_len,
        spindleRpm=rpm,
        feedMmMin=feed,
        plungeFeedMmMin=feed / 2,
        apMm=ap,
        aeMm=ae,
        pathLengthMm=175.0,
        cuttingLengthMm=150.0,
        rapidLengthMm=25.0,
        moveCount=len(points),
        estTimeS=45.0,
        points=points,
    )
    return ToolpathGenerationResponse(
        camJobId="job-test-sim",
        stock={"xMm": 100.0, "yMm": 100.0, "zMm": 25.0, "origin": "G54"},
        operations=[op],
        totalPathLengthMm=175.0,
        totalCuttingLengthMm=150.0,
        totalRapidLengthMm=25.0,
        totalMoves=len(points),
        totalCycleTimeS=45.0,
    )

def test_simulation_pass():
    tp = create_sample_toolpath()
    req = SimulationAnalysisRequest(
        camJobId="job-test-sim",
        toolpath=tp,
        travelXMm=500.0,
        travelYMm=400.0,
        travelZMm=300.0,
        maxRpm=8000.0,
        ratedPowerKw=15.0,
        stockX=100.0,
        stockY=100.0,
        stockZ=25.0,
        materialKcNMm2=700.0,
    )
    resp = analyze_simulation(req)
    assert resp.overallResult == "PASS"
    assert resp.status == "COMPLETED"
    assert len(resp.findings) == 0
    assert resp.stats.maxPowerKw > 0
    assert resp.stats.totalMoves == 6

def test_simulation_out_of_travel_fail():
    points = [
        ToolpathPoint(x=10.0, y=10.0, z=5.0, moveType="RAPID", f=12000.0, s=3000.0),
        ToolpathPoint(x=600.0, y=10.0, z=-2.0, moveType="FEED", f=800.0, s=3000.0), # exceeds 500 travelX
    ]
    tp = create_sample_toolpath(points=points)
    req = SimulationAnalysisRequest(
        camJobId="job-test-sim",
        toolpath=tp,
        travelXMm=500.0,
        travelYMm=400.0,
        travelZMm=300.0,
        stockX=100.0,
        stockY=100.0,
        stockZ=25.0,
    )
    resp = analyze_simulation(req)
    assert resp.overallResult == "FAIL"
    codes = [f.ruleCode for f in resp.findings]
    assert "OUT_OF_TRAVEL" in codes

def test_simulation_rapid_into_stock_fail():
    points = [
        ToolpathPoint(x=10.0, y=10.0, z=5.0, moveType="RAPID", f=12000.0, s=3000.0),
        ToolpathPoint(x=20.0, y=20.0, z=-5.0, moveType="RAPID", f=12000.0, s=3000.0), # RAPID inside stock (0..100) and Z < 0
    ]
    tp = create_sample_toolpath(points=points)
    req = SimulationAnalysisRequest(
        camJobId="job-test-sim",
        toolpath=tp,
        stockX=100.0,
        stockY=100.0,
        stockZ=25.0,
    )
    resp = analyze_simulation(req)
    assert resp.overallResult == "FAIL"
    codes = [f.ruleCode for f in resp.findings]
    assert "RAPID_INTO_STOCK" in codes

def test_simulation_plunge_exceeds_flute_fail():
    tp = create_sample_toolpath(ap=30.0, flute_len=20.0)
    req = SimulationAnalysisRequest(
        camJobId="job-test-sim",
        toolpath=tp,
        stockX=100.0,
        stockY=100.0,
        stockZ=50.0,
    )
    resp = analyze_simulation(req)
    assert resp.overallResult == "FAIL"
    codes = [f.ruleCode for f in resp.findings]
    assert "PLUNGE_EXCEEDS_FLUTE" in codes

def test_simulation_rpm_exceeded_fail():
    tp = create_sample_toolpath(rpm=9500.0)
    req = SimulationAnalysisRequest(
        camJobId="job-test-sim",
        toolpath=tp,
        maxRpm=8000.0,
        stockX=100.0,
        stockY=100.0,
        stockZ=25.0,
    )
    resp = analyze_simulation(req)
    assert resp.overallResult == "FAIL"
    codes = [f.ruleCode for f in resp.findings]
    assert "RPM_EXCEEDED" in codes

def test_simulation_power_exceeded_fail():
    # Large MRR: ap=15, ae=20, feed=3000 -> MRR = 900,000 mm3/min
    # Kc = 2200 (hardened steel) -> Pc = (2200 * 900000)/(60e6 * 0.82) = 40.24 kW > 10 kW rated
    tp = create_sample_toolpath(ap=15.0, ae=20.0, feed=3000.0)
    req = SimulationAnalysisRequest(
        camJobId="job-test-sim",
        toolpath=tp,
        ratedPowerKw=10.0,
        materialKcNMm2=2200.0,
        stockX=100.0,
        stockY=100.0,
        stockZ=50.0,
    )
    resp = analyze_simulation(req)
    assert resp.overallResult == "FAIL"
    codes = [f.ruleCode for f in resp.findings]
    assert "POWER_EXCEEDED" in codes

def test_simulation_gouge_risk_warn():
    points = [
        ToolpathPoint(x=10.0, y=10.0, z=5.0, moveType="RAPID", f=12000.0, s=3000.0),
        ToolpathPoint(x=10.0, y=10.0, z=-35.0, moveType="FEED", f=800.0, s=3000.0), # stockZ is 25, so -35 penetrates floor
    ]
    tp = create_sample_toolpath(points=points)
    req = SimulationAnalysisRequest(
        camJobId="job-test-sim",
        toolpath=tp,
        stockX=100.0,
        stockY=100.0,
        stockZ=25.0,
    )
    resp = analyze_simulation(req)
    assert resp.overallResult == "WARN"
    codes = [f.ruleCode for f in resp.findings]
    assert "GOUGE_RISK" in codes

def test_simulation_tiny_segment_info():
    points = [
        ToolpathPoint(x=10.0, y=10.0, z=5.0, moveType="RAPID", f=12000.0, s=3000.0),
        ToolpathPoint(x=10.005, y=10.0, z=5.0, moveType="FEED", f=800.0, s=3000.0), # distance = 0.005 < 0.01
    ]
    tp = create_sample_toolpath(points=points)
    req = SimulationAnalysisRequest(
        camJobId="job-test-sim",
        toolpath=tp,
        stockX=100.0,
        stockY=100.0,
        stockZ=25.0,
    )
    resp = analyze_simulation(req)
    codes = [f.ruleCode for f in resp.findings]
    assert "TINY_SEGMENT" in codes

def test_simulation_api_endpoint():
    tp = create_sample_toolpath()
    payload = {
        "camJobId": "cam-101",
        "toolpath": tp.model_dump(),
        "travelXMm": 762.0,
        "travelYMm": 508.0,
        "travelZMm": 508.0,
        "maxRpm": 8100.0,
        "ratedPowerKw": 22.4,
        "stockX": 100.0,
        "stockY": 100.0,
        "stockZ": 25.0,
        "materialKcNMm2": 700.0,
    }
    response = client.post("/internal/v1/simulation/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["camJobId"] == "cam-101"
    assert data["status"] == "COMPLETED"
    assert "findings" in data
    assert "stats" in data
