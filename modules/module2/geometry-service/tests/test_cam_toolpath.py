import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.toolpath_engine import ToolpathGenerationRequest, OperationRequest, generate_toolpaths
from app.services.gcode_generator import GCodeGenerationRequest, generate_gcode, validate_gcode

client = TestClient(app)

@pytest.fixture
def sample_toolpath_req():
    return ToolpathGenerationRequest(
        camJobId="job-test-1",
        partBboxX=50.0,
        partBboxY=50.0,
        partBboxZ=25.0,
        stockX=54.0,
        stockY=54.0,
        stockZ=27.0,
        safeHeightZ=5.0,
        rapidFeedMmMin=15000.0,
        operations=[
            OperationRequest(
                seq=1,
                opType="FACE",
                toolId="tool-1",
                toolDiameterMm=10.0,
                spindleRpm=8000.0,
                feedMmMin=700.0,
                apMm=1.0,
                aeMm=7.0
            ),
            OperationRequest(
                seq=2,
                opType="ROUGH_POCKET",
                toolId="tool-1",
                toolDiameterMm=10.0,
                spindleRpm=8000.0,
                feedMmMin=600.0,
                apMm=2.0,
                aeMm=5.0
            ),
            OperationRequest(
                seq=3,
                opType="CONTOUR",
                toolId="tool-1",
                toolDiameterMm=10.0,
                spindleRpm=8000.0,
                feedMmMin=800.0,
                apMm=5.0,
                aeMm=2.0
            ),
            OperationRequest(
                seq=4,
                opType="DRILL",
                toolId="tool-drill",
                toolDiameterMm=6.0,
                spindleRpm=3000.0,
                feedMmMin=200.0,
                apMm=15.0,
                aeMm=6.0
            )
        ]
    )

def test_generate_toolpaths_engine(sample_toolpath_req):
    res = generate_toolpaths(sample_toolpath_req)
    assert res.camJobId == "job-test-1"
    assert len(res.operations) == 4
    assert res.totalPathLengthMm > 0
    assert res.totalCuttingLengthMm > 0
    assert res.totalMoves > 10

    # Test coordinate boundaries
    for op in res.operations:
        assert len(op.points) > 0
        for p in op.points:
            # X and Y should not wildly exceed stock
            assert -20.0 <= p.x <= sample_toolpath_req.stockX + 20.0
            assert -20.0 <= p.y <= sample_toolpath_req.stockY + 20.0
            # Z should never plunge below -partBboxZ - 5
            assert p.z >= -sample_toolpath_req.partBboxZ - 5.0
            assert p.z <= sample_toolpath_req.stockZ + 10.0

def test_gcode_generator_and_validator(sample_toolpath_req):
    toolpath_res = generate_toolpaths(sample_toolpath_req)
    gcode_req = GCodeGenerationRequest(
        camJobId="job-test-1",
        jobName="Bracket Rough & Finish",
        machineName="Haas VF-2",
        controllerDialect="HAAS",
        maxRpm=8100.0,
        travelXMm=762.0,
        travelYMm=508.0,
        travelZMm=508.0,
        toolpath=toolpath_res
    )

    gcode_text = generate_gcode(gcode_req)
    # Check watermark
    assert "PROTOTYPE OUTPUT - NOT CERTIFIED PRODUCTION CODE" in gcode_text
    assert "G21" in gcode_text
    assert "G90" in gcode_text
    assert "M30" in gcode_text

    # Validate output
    val_res = validate_gcode(gcode_text, gcode_req)
    assert val_res.valid is True
    assert len(val_res.errors) == 0
    assert val_res.linesValidated > 20

def test_gcode_validator_rejects_forbidden_codes(sample_toolpath_req):
    toolpath_res = generate_toolpaths(sample_toolpath_req)
    gcode_req = GCodeGenerationRequest(
        camJobId="job-test-1",
        toolpath=toolpath_res
    )
    bad_gcode = "G21\nG90\nG10 L2 P1 X10 (Tampering)\nM98 P1000\nM30"
    val_res = validate_gcode(bad_gcode, gcode_req)
    assert val_res.valid is False
    assert any("G10" in err for err in val_res.errors)
    assert any("M98" in err for err in val_res.errors)

def test_gcode_validator_rejects_rpm_over_limit(sample_toolpath_req):
    toolpath_res = generate_toolpaths(sample_toolpath_req)
    gcode_req = GCodeGenerationRequest(
        camJobId="job-test-1",
        maxRpm=8100.0,
        toolpath=toolpath_res
    )
    bad_gcode = "G21\nG90\nS15000 M03\nM30"
    val_res = validate_gcode(bad_gcode, gcode_req)
    assert val_res.valid is False
    assert any("exceeds machine max limit" in err for err in val_res.errors)

def test_fastapi_cam_endpoints(sample_toolpath_req):
    # Test POST /internal/v1/cam/toolpath
    tp_resp = client.post("/internal/v1/cam/toolpath", json=sample_toolpath_req.model_dump())
    assert tp_resp.status_code == 200
    tp_data = tp_resp.json()
    assert tp_data["camJobId"] == "job-test-1"
    assert len(tp_data["operations"]) == 4

    # Test POST /internal/v1/cam/gcode/validate
    gc_payload = {
        "camJobId": "job-test-1",
        "jobName": "Test Part",
        "machineName": "Haas VF-2",
        "controllerDialect": "HAAS",
        "maxRpm": 8100.0,
        "travelXMm": 762.0,
        "travelYMm": 508.0,
        "travelZMm": 508.0,
        "toolpath": tp_data
    }
    gc_resp = client.post("/internal/v1/cam/gcode/validate", json=gc_payload)
    assert gc_resp.status_code == 200
    gc_data = gc_resp.json()
    assert gc_data["valid"] is True
    assert "PROTOTYPE OUTPUT" in gc_data["gcodeText"]
