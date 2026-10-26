import math
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ToolpathPoint(BaseModel):
    x: float
    y: float
    z: float
    moveType: str = Field(description="RAPID, FEED, PLUNGE, ARC")
    f: float = Field(description="Feed rate mm/min")
    s: float = Field(description="Spindle RPM")

class OperationRequest(BaseModel):
    seq: int
    opType: str = Field(description="FACE, ROUGH_POCKET, CONTOUR, DRILL")
    toolId: str
    toolDiameterMm: float = 10.0
    toolFluteLengthMm: float = 25.0
    spindleRpm: float = 8000.0
    feedMmMin: float = 700.0
    plungeFeedMmMin: Optional[float] = 250.0
    apMm: float = 1.5
    aeMm: float = 6.0
    finishAllowanceMm: float = 0.0

class ToolpathGenerationRequest(BaseModel):
    camJobId: str
    partBboxX: float
    partBboxY: float
    partBboxZ: float
    stockX: float
    stockY: float
    stockZ: float
    safeHeightZ: float = 5.0
    rapidFeedMmMin: float = 15000.0
    operations: List[OperationRequest]

class OperationResult(BaseModel):
    seq: int
    opType: str
    toolId: str
    toolDiameterMm: float
    toolFluteLengthMm: float = 25.0
    spindleRpm: float
    feedMmMin: float
    plungeFeedMmMin: float
    apMm: float
    aeMm: float
    pathLengthMm: float
    cuttingLengthMm: float
    rapidLengthMm: float
    moveCount: int
    estTimeS: float
    points: List[ToolpathPoint]

class ToolpathGenerationResponse(BaseModel):
    camJobId: str
    stock: Dict[str, Any]
    operations: List[OperationResult]
    totalPathLengthMm: float
    totalCuttingLengthMm: float
    totalRapidLengthMm: float
    totalMoves: int
    totalCycleTimeS: float

def distance_3d(p1: ToolpathPoint, p2: ToolpathPoint) -> float:
    return math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2 + (p2.z - p1.z)**2)

def generate_toolpaths(req: ToolpathGenerationRequest) -> ToolpathGenerationResponse:
    results: List[OperationResult] = []
    total_path = 0.0
    total_cutting = 0.0
    total_rapid = 0.0
    total_moves = 0
    total_time = 0.0

    stock_x = req.stockX
    stock_y = req.stockY
    stock_z = req.stockZ
    safe_z = req.safeHeightZ

    for op in req.operations:
        points: List[ToolpathPoint] = []
        op_cutting_len = 0.0
        op_rapid_len = 0.0
        r = op.toolDiameterMm / 2.0
        plunge_f = op.plungeFeedMmMin or (op.feedMmMin * 0.35)

        # 1. FACING OPERATION: Zigzag raster across top surface (Z = stockZ down to partBboxZ)
        if op.opType == 'FACE':
            face_depth = max(0.5, stock_z - req.partBboxZ)
            z_levels = []
            curr_z = stock_z
            while curr_z > req.partBboxZ:
                curr_z = max(req.partBboxZ, curr_z - op.apMm)
                z_levels.append(curr_z)

            # Start above stock at safe height
            start_x, start_y = -r, -r
            points.append(ToolpathPoint(x=start_x, y=start_y, z=safe_z, moveType='RAPID', f=req.rapidFeedMmMin, s=op.spindleRpm))

            stepover = min(op.aeMm, op.toolDiameterMm * 0.75)
            y_steps = max(1, math.ceil((stock_y + 2 * r) / stepover))
            actual_step = (stock_y + 2 * r) / y_steps

            for z in z_levels:
                # Plunge to cutting depth
                points.append(ToolpathPoint(x=start_x, y=start_y, z=z, moveType='PLUNGE', f=plunge_f, s=op.spindleRpm))
                
                direction = 1 # 1 = moving +X, -1 = moving -X
                for i in range(y_steps + 1):
                    y_pos = -r + i * actual_step
                    x_target = (stock_x + r) if direction == 1 else -r
                    
                    # Feed across
                    points.append(ToolpathPoint(x=x_target, y=y_pos, z=z, moveType='FEED', f=op.feedMmMin, s=op.spindleRpm))
                    
                    # Stepover move if not last line
                    if i < y_steps:
                        next_y = -r + (i + 1) * actual_step
                        points.append(ToolpathPoint(x=x_target, y=next_y, z=z, moveType='FEED', f=op.feedMmMin, s=op.spindleRpm))
                        direction *= -1

                # Retract to safe Z between levels
                last_p = points[-1]
                points.append(ToolpathPoint(x=last_p.x, y=last_p.y, z=safe_z, moveType='RAPID', f=req.rapidFeedMmMin, s=op.spindleRpm))

        # 2. ROUGH POCKET: Rectangular pocket excavation
        elif op.opType == 'ROUGH_POCKET':
            pocket_min_x = r + 2.0
            pocket_max_x = max(pocket_min_x + 10.0, req.partBboxX - r - 2.0)
            pocket_min_y = r + 2.0
            pocket_max_y = max(pocket_min_y + 10.0, req.partBboxY - r - 2.0)
            target_depth = max(2.0, req.partBboxZ * 0.5)

            curr_depth = 0.0
            z_passes = []
            while curr_depth < target_depth:
                curr_depth = min(target_depth, curr_depth + op.apMm)
                z_passes.append(-curr_depth)

            # Center position
            cx = (pocket_min_x + pocket_max_x) / 2.0
            cy = (pocket_min_y + pocket_max_y) / 2.0

            # Initial rapid move
            points.append(ToolpathPoint(x=cx, y=cy, z=safe_z, moveType='RAPID', f=req.rapidFeedMmMin, s=op.spindleRpm))

            for z in z_passes:
                # Helical/vertical plunge to depth
                points.append(ToolpathPoint(x=cx, y=cy, z=z, moveType='PLUNGE', f=plunge_f, s=op.spindleRpm))
                
                # Concentric rectangular clearance passes
                w = pocket_max_x - pocket_min_x
                h = pocket_max_y - pocket_min_y
                passes = max(1, math.ceil(min(w, h) / (2 * op.aeMm)))
                
                for p in range(1, passes + 1):
                    frac = p / float(passes)
                    half_w = (w / 2.0) * frac
                    half_h = (h / 2.0) * frac
                    
                    x0, x1 = cx - half_w, cx + half_w
                    y0, y1 = cy - half_h, cy + half_h

                    points.append(ToolpathPoint(x=x0, y=y0, z=z, moveType='FEED', f=op.feedMmMin, s=op.spindleRpm))
                    points.append(ToolpathPoint(x=x1, y=y0, z=z, moveType='FEED', f=op.feedMmMin, s=op.spindleRpm))
                    points.append(ToolpathPoint(x=x1, y=y1, z=z, moveType='FEED', f=op.feedMmMin, s=op.spindleRpm))
                    points.append(ToolpathPoint(x=x0, y=y1, z=z, moveType='FEED', f=op.feedMmMin, s=op.spindleRpm))
                    points.append(ToolpathPoint(x=x0, y=y0, z=z, moveType='FEED', f=op.feedMmMin, s=op.spindleRpm))

                # Retract to safe Z
                last_p = points[-1]
                points.append(ToolpathPoint(x=last_p.x, y=last_p.y, z=safe_z, moveType='RAPID', f=req.rapidFeedMmMin, s=op.spindleRpm))

        # 3. CONTOUR / PROFILE: Outer perimeter finishing pass
        elif op.opType == 'CONTOUR':
            offset = r + op.finishAllowanceMm
            x0 = -offset
            y0 = -offset
            x1 = req.partBboxX + offset
            y1 = req.partBboxY + offset
            target_depth = req.partBboxZ

            curr_depth = 0.0
            z_levels = []
            while curr_depth < target_depth:
                curr_depth = min(target_depth, curr_depth + op.apMm)
                z_levels.append(-curr_depth)

            # Rapid to lead-in position
            lead_in_x = x0 - 5.0
            lead_in_y = y0
            points.append(ToolpathPoint(x=lead_in_x, y=lead_in_y, z=safe_z, moveType='RAPID', f=req.rapidFeedMmMin, s=op.spindleRpm))

            for z in z_levels:
                # Plunge down
                points.append(ToolpathPoint(x=lead_in_x, y=lead_in_y, z=z, moveType='PLUNGE', f=plunge_f, s=op.spindleRpm))
                # Lead in to contour corner
                points.append(ToolpathPoint(x=x0, y=y0, z=z, moveType='FEED', f=op.feedMmMin, s=op.spindleRpm))
                # Clockwise contour
                points.append(ToolpathPoint(x=x1, y=y0, z=z, moveType='FEED', f=op.feedMmMin, s=op.spindleRpm))
                points.append(ToolpathPoint(x=x1, y=y1, z=z, moveType='FEED', f=op.feedMmMin, s=op.spindleRpm))
                points.append(ToolpathPoint(x=x0, y=y1, z=z, moveType='FEED', f=op.feedMmMin, s=op.spindleRpm))
                points.append(ToolpathPoint(x=x0, y=y0, z=z, moveType='FEED', f=op.feedMmMin, s=op.spindleRpm))
                # Lead out
                points.append(ToolpathPoint(x=lead_in_x, y=lead_in_y, z=z, moveType='FEED', f=op.feedMmMin, s=op.spindleRpm))
                # Safe retract
                points.append(ToolpathPoint(x=lead_in_x, y=lead_in_y, z=safe_z, moveType='RAPID', f=req.rapidFeedMmMin, s=op.spindleRpm))

        # 4. DRILL OPERATION
        elif op.opType == 'DRILL':
            # 4 Corner mounting holes as sample fixture
            hole_coords = [
                (r + 5.0, r + 5.0),
                (req.partBboxX - r - 5.0, r + 5.0),
                (req.partBboxX - r - 5.0, req.partBboxY - r - 5.0),
                (r + 5.0, req.partBboxY - r - 5.0)
            ]
            drill_depth = min(15.0, req.partBboxZ)

            for hx, hy in hole_coords:
                points.append(ToolpathPoint(x=hx, y=hy, z=safe_z, moveType='RAPID', f=req.rapidFeedMmMin, s=op.spindleRpm))
                points.append(ToolpathPoint(x=hx, y=hy, z=-drill_depth, moveType='PLUNGE', f=plunge_f, s=op.spindleRpm))
                points.append(ToolpathPoint(x=hx, y=hy, z=safe_z, moveType='RAPID', f=req.rapidFeedMmMin, s=op.spindleRpm))

        # Calculate distances & times for this operation
        op_time_s = 0.0
        for idx in range(len(points) - 1):
            p_curr = points[idx]
            p_next = points[idx + 1]
            dist = distance_3d(p_curr, p_next)

            if p_next.moveType == 'RAPID':
                op_rapid_len += dist
                op_time_s += (dist / (req.rapidFeedMmMin / 60.0))
            else:
                op_cutting_len += dist
                feed = p_next.f if p_next.f > 0 else op.feedMmMin
                op_time_s += (dist / (feed / 60.0))

        op_path_len = op_cutting_len + op_rapid_len
        total_path += op_path_len
        total_cutting += op_cutting_len
        total_rapid += op_rapid_len
        total_moves += len(points)
        total_time += op_time_s

        results.append(OperationResult(
            seq=op.seq,
            opType=op.opType,
            toolId=op.toolId,
            toolDiameterMm=op.toolDiameterMm,
            toolFluteLengthMm=op.toolFluteLengthMm,
            spindleRpm=op.spindleRpm,
            feedMmMin=op.feedMmMin,
            plungeFeedMmMin=plunge_f,
            apMm=op.apMm,
            aeMm=op.aeMm,
            pathLengthMm=round(op_path_len, 2),
            cuttingLengthMm=round(op_cutting_len, 2),
            rapidLengthMm=round(op_rapid_len, 2),
            moveCount=len(points),
            estTimeS=round(op_time_s, 2),
            points=points
        ))

    return ToolpathGenerationResponse(
        camJobId=req.camJobId,
        stock={
            "xMm": req.stockX,
            "yMm": req.stockY,
            "zMm": req.stockZ,
            "origin": "G54"
        },
        operations=results,
        totalPathLengthMm=round(total_path, 2),
        totalCuttingLengthMm=round(total_cutting, 2),
        totalRapidLengthMm=round(total_rapid, 2),
        totalMoves=total_moves,
        totalCycleTimeS=round(total_time, 2)
    )
