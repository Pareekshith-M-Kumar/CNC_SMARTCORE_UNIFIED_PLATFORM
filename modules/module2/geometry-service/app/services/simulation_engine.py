import math
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.services.toolpath_engine import ToolpathPoint, OperationResult, ToolpathGenerationResponse, distance_3d

class SimulationFinding(BaseModel):
    ruleCode: str
    severity: str = Field(description="INFO, WARN, FAIL")
    message: str
    moveIndex: Optional[int] = None
    xMm: Optional[float] = None
    yMm: Optional[float] = None
    zMm: Optional[float] = None

class SimulationStats(BaseModel):
    totalCycleTimeS: float
    totalPathLengthMm: float
    totalCuttingLengthMm: float
    totalRapidLengthMm: float
    totalMoves: int
    maxDepthEngagedMm: float
    maxPowerKw: float
    powerUtilizationPct: float
    findingCounts: Dict[str, int]

class SimulationAnalysisRequest(BaseModel):
    camJobId: str
    toolpath: ToolpathGenerationResponse
    travelXMm: float = 762.0
    travelYMm: float = 508.0
    travelZMm: float = 508.0
    maxRpm: float = 8100.0
    ratedPowerKw: float = 22.4
    stockX: float
    stockY: float
    stockZ: float
    materialKcNMm2: float = 700.0
    rulesetVersion: str = "sim-1.0"

class SimulationAnalysisResponse(BaseModel):
    camJobId: str
    status: str = "COMPLETED"
    overallResult: str = Field(description="PASS, WARN, FAIL")
    rulesetVersion: str = "sim-1.0"
    stats: SimulationStats
    findings: List[SimulationFinding]

def analyze_simulation(req: SimulationAnalysisRequest) -> SimulationAnalysisResponse:
    findings: List[SimulationFinding] = []
    
    total_moves = 0
    max_depth_engaged = 0.0
    max_power_kw = 0.0
    move_global_idx = 0
    
    stock_top_z = 0.0 # Coordinate datum: top of finished part is Z=0, stock allowance may be above
    # Or in our toolpath engine datum, safe retract height is +5.0 mm, cutting passes step Z <= 0.0
    
    # 1. Travel check margins
    # The part and stock are centered or aligned within [0, travelX], [0, travelY], [-travelZ, safeRetract]
    # Check if any toolpath point exceeds kinematic bounds
    
    for op in req.toolpath.operations:
        flute_len = op.fluteLengthMm if hasattr(op, 'fluteLengthMm') else 25.0
        tool_d = op.toolDiameterMm if hasattr(op, 'toolDiameterMm') else 10.0
        ap = op.apMm
        ae = op.aeMm
        feed = op.feedMmMin
        rpm = op.spindleRpm
        
        # Rule 4: RPM_EXCEEDED (FAIL)
        if rpm > req.maxRpm:
            findings.append(SimulationFinding(
                ruleCode="RPM_EXCEEDED",
                severity="FAIL",
                message=f"Op #{op.seq} spindle speed ({rpm:.0f} RPM) exceeds machine max rated limit ({req.maxRpm:.0f} RPM)",
                moveIndex=move_global_idx,
            ))
            
        # Rule 3: PLUNGE_EXCEEDS_FLUTE (FAIL)
        if ap > flute_len:
            findings.append(SimulationFinding(
                ruleCode="PLUNGE_EXCEEDS_FLUTE",
                severity="FAIL",
                message=f"Op #{op.seq} axial depth of cut ap ({ap:.2f} mm) exceeds tool flute length ({flute_len:.2f} mm)",
                moveIndex=move_global_idx,
            ))
            
        # Rule 6: DOC_EXCEEDS_RECOMMENDED (WARN)
        # For roughing or standard milling, ap > 0.5 * D is aggressive
        if ap > (0.6 * tool_d) and "ROUGH" in op.opType.upper():
            findings.append(SimulationFinding(
                ruleCode="DOC_EXCEEDS_RECOMMENDED",
                severity="WARN",
                message=f"Op #{op.seq} axial depth ap ({ap:.2f} mm) > 0.6x tool diameter ({tool_d:.1f} mm). Heavy tool deflection risk.",
                moveIndex=move_global_idx,
            ))
            
        # Rule 5: POWER_EXCEEDED / POWER_HIGH
        # Pc = (kc * MRR) / (60 * 10^6 * eta)
        # MRR = ap * ae * feed (mm^3/min)
        mrr = ap * ae * feed
        spindle_eff = 0.82
        pc_kw = (req.materialKcNMm2 * mrr) / (60.0 * 1000000.0 * spindle_eff)
        if pc_kw > max_power_kw:
            max_power_kw = pc_kw
            
        if req.ratedPowerKw > 0:
            power_ratio = pc_kw / req.ratedPowerKw
            if power_ratio > 1.0:
                findings.append(SimulationFinding(
                    ruleCode="POWER_EXCEEDED",
                    severity="FAIL",
                    message=f"Op #{op.seq} estimated cutting power ({pc_kw:.2f} kW) exceeds machine continuous rating ({req.ratedPowerKw:.2f} kW)",
                    moveIndex=move_global_idx,
                ))
            elif power_ratio > 0.80:
                findings.append(SimulationFinding(
                    ruleCode="POWER_HIGH",
                    severity="WARN",
                    message=f"Op #{op.seq} estimated power demand ({pc_kw:.2f} kW) is {power_ratio*100:.1f}% of rated capacity (> 80%)",
                    moveIndex=move_global_idx,
                ))
                
        # Rule 7: TOOL_TOO_LARGE_FOR_FEATURE (WARN)
        # Check if tool diameter exceeds feature/pocket bounds
        if "POCKET" in op.opType.upper() and tool_d > 0.7 * min(req.stockX, req.stockY):
            findings.append(SimulationFinding(
                ruleCode="TOOL_TOO_LARGE_FOR_FEATURE",
                severity="WARN",
                message=f"Op #{op.seq} tool diameter ({tool_d:.1f} mm) is over 70% of workpiece pocket span, risking corner unmachined stock",
                moveIndex=move_global_idx,
            ))

        # Iterate over points in the operation
        prev_pt = None
        for pt in op.points:
            total_moves += 1
            move_global_idx += 1
            
            # Rule 1: OUT_OF_TRAVEL (FAIL)
            # Machine kinematic travel envelopes:
            # X must be within [ -travelX/2, travelX ]
            # Z cannot exceed travelZ downward
            if abs(pt.x) > req.travelXMm or abs(pt.y) > req.travelYMm or abs(pt.z) > req.travelZMm:
                findings.append(SimulationFinding(
                    ruleCode="OUT_OF_TRAVEL",
                    severity="FAIL",
                    message=f"Point ({pt.x:.2f}, {pt.y:.2f}, {pt.z:.2f}) exceeds machine travel envelope ({req.travelXMm:.0f}x{req.travelYMm:.0f}x{req.travelZMm:.0f} mm)",
                    moveIndex=move_global_idx,
                    xMm=pt.x,
                    yMm=pt.y,
                    zMm=pt.z,
                ))
                
            # Rule 2: RAPID_INTO_STOCK (FAIL)
            # G0 (RAPID) move inside stock XY boundary with Z below stock top (0.0 mm)
            if pt.moveType == "RAPID":
                # Check if XY is inside stock footprint
                is_inside_stock_xy = (0.0 <= pt.x <= req.stockX) and (0.0 <= pt.y <= req.stockY)
                if is_inside_stock_xy and pt.z < 0.0:
                    findings.append(SimulationFinding(
                        ruleCode="RAPID_INTO_STOCK",
                        severity="FAIL",
                        message=f"Rapid move into raw stock at Z={pt.z:.2f} mm inside stock boundary. Severe tool collision risk.",
                        moveIndex=move_global_idx,
                        xMm=pt.x,
                        yMm=pt.y,
                        zMm=pt.z,
                    ))

            # Track maximum depth engaged
            if pt.z < 0 and abs(pt.z) > max_depth_engaged:
                max_depth_engaged = abs(pt.z)
                
            # Rule 8: GOUGE_RISK (WARN)
            # Z deeper than stock height plus allowance
            if pt.z < -req.stockZ:
                findings.append(SimulationFinding(
                    ruleCode="GOUGE_RISK",
                    severity="WARN",
                    message=f"Toolpath depth Z={pt.z:.2f} mm penetrates below workpiece floor Z={-req.stockZ:.2f} mm",
                    moveIndex=move_global_idx,
                    xMm=pt.x,
                    yMm=pt.y,
                    zMm=pt.z,
                ))

            # Rule 9: TINY_SEGMENT (INFO)
            if prev_pt is not None:
                dist = distance_3d(prev_pt, pt)
                if dist < 0.01:
                    findings.append(SimulationFinding(
                        ruleCode="TINY_SEGMENT",
                        severity="INFO",
                        message=f"Micro-segment length ({dist*1000:.1f} um) detected at move #{move_global_idx}. Redundant block.",
                        moveIndex=move_global_idx,
                        xMm=pt.x,
                        yMm=pt.y,
                        zMm=pt.z,
                    ))

            prev_pt = pt

    # Determine Overall Result
    has_fail = any(f.severity == "FAIL" for f in findings)
    has_warn = any(f.severity == "WARN" for f in findings)
    overall = "FAIL" if has_fail else ("WARN" if has_warn else "PASS")
    
    # Calculate stats
    power_pct = (max_power_kw / req.ratedPowerKw * 100.0) if req.ratedPowerKw > 0 else 0.0
    
    counts: Dict[str, int] = {"FAIL": 0, "WARN": 0, "INFO": 0}
    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1
        
    stats = SimulationStats(
        totalCycleTimeS=req.toolpath.totalCycleTimeS,
        totalPathLengthMm=req.toolpath.totalPathLengthMm,
        totalCuttingLengthMm=req.toolpath.totalCuttingLengthMm,
        totalRapidLengthMm=req.toolpath.totalRapidLengthMm,
        totalMoves=total_moves,
        maxDepthEngagedMm=max_depth_engaged,
        maxPowerKw=round(max_power_kw, 2),
        powerUtilizationPct=round(power_pct, 1),
        findingCounts=counts,
    )
    
    return SimulationAnalysisResponse(
        camJobId=req.camJobId,
        status="COMPLETED",
        overallResult=overall,
        rulesetVersion=req.rulesetVersion,
        stats=stats,
        findings=findings,
    )
