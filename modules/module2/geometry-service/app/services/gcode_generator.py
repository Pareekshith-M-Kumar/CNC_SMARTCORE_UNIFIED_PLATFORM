import re
from typing import List, Dict, Any, Tuple
from pydantic import BaseModel, Field
from app.services.toolpath_engine import ToolpathGenerationResponse

class GCodeGenerationRequest(BaseModel):
    camJobId: str
    jobName: str = "CAM Part Program"
    machineName: str = "Haas VF-2"
    controllerDialect: str = Field(default="HAAS", description="HAAS, FANUC, SIEMENS, GRBL")
    maxRpm: float = 8100.0
    travelXMm: float = 762.0
    travelYMm: float = 508.0
    travelZMm: float = 508.0
    toolpath: ToolpathGenerationResponse

class GCodeValidationResult(BaseModel):
    valid: bool
    dialect: str
    linesValidated: int
    errors: List[str]
    warnings: List[str]
    gcodeText: str

# Whitelist of permissible G and M codes
ALLOWED_G_CODES = {
    "G00", "G0", "G01", "G1", "G02", "G2", "G03", "G3",
    "G17", "G18", "G19",
    "G20", "G21",
    "G40", "G41", "G42", "G43", "G49",
    "G54", "G55", "G56", "G57", "G58", "G59",
    "G80", "G81", "G82", "G83",
    "G90", "G91", "G94"
}

FORBIDDEN_CODES = {
    "G10": "Forbidden parameter write / system variable override (G10)",
    "M98": "Forbidden subprogram execution (M98)",
    "M99": "Forbidden subprogram return outside macro (M99)",
    "G28": "Forbidden raw home return without safety clearance (G28)",
    "G53": "Forbidden machine coordinate system override (G53)",
}

ALLOWED_M_CODES = {
    "M00", "M0", "M01", "M1", "M02", "M2",
    "M03", "M3", "M04", "M4", "M05", "M5",
    "M06", "M6",
    "M08", "M8", "M09", "M9",
    "M30"
}

def generate_gcode(req: GCodeGenerationRequest) -> str:
    lines: List[str] = []
    
    # Mandatory Safety Watermark Header
    lines.append("%")
    lines.append(f"O0100 ({req.jobName.upper()[:20]})")
    lines.append("(--------------------------------------------------)")
    lines.append("( CNC SMARTCORE MODULE 2 - CAM POST-PROCESSOR      )")
    lines.append("( PROTOTYPE OUTPUT - NOT CERTIFIED PRODUCTION CODE  )")
    lines.append(f"( MACHINE: {req.machineName} [DIALECT: {req.controllerDialect}] )")
    lines.append(f"( STOCK: {req.toolpath.stock.get('xMm', 50)}x{req.toolpath.stock.get('yMm', 50)}x{req.toolpath.stock.get('zMm', 25)} MM )")
    lines.append("(--------------------------------------------------)")
    
    # Machine Safety Preamble
    lines.append("G21 (Metric units)")
    lines.append("G90 (Absolute coordinates)")
    lines.append("G17 (XY plane)")
    lines.append("G40 (Cutter compensation cancel)")
    lines.append("G49 (Tool length offset cancel)")
    lines.append("G80 (Cancel canned cycle)")
    lines.append("G54 (Work coordinate system 1)")
    lines.append("")

    tool_number = 1
    for op in req.toolpath.operations:
        lines.append(f"(=== OP {op.seq}: {op.opType} — Ø{op.toolDiameterMm}mm Tool ===)")
        lines.append(f"T{tool_number:02d} M06")
        lines.append(f"S{int(op.spindleRpm)} M03")
        lines.append(f"G43 H{tool_number:02d} Z15.000")
        lines.append("M08 (Coolant ON)")
        
        last_move_type = ""
        for p in op.points:
            x_str = f"X{p.x:.3f}"
            y_str = f"Y{p.y:.3f}"
            z_str = f"Z{p.z:.3f}"

            if p.moveType == 'RAPID':
                if last_move_type != 'RAPID':
                    lines.append(f"G00 {x_str} {y_str} {z_str}")
                else:
                    lines.append(f"G00 {x_str} {y_str} {z_str}")
            elif p.moveType in ('FEED', 'PLUNGE'):
                f_str = f"F{p.f:.1f}"
                lines.append(f"G01 {x_str} {y_str} {z_str} {f_str}")
            elif p.moveType == 'ARC':
                lines.append(f"G02 {x_str} {y_str} {z_str} F{p.f:.1f}")

            last_move_type = p.moveType

        lines.append("M09 (Coolant OFF)")
        lines.append("M05 (Spindle STOP)")
        lines.append("G00 Z25.000 (Safe clearance retract)")
        lines.append("")
        tool_number += 1

    # End of Program
    lines.append("(=== PROGRAM END ===)")
    lines.append("M05")
    lines.append("G00 Z50.000")
    lines.append("G00 X0.000 Y0.000")
    lines.append("M30")
    lines.append("%")

    return "\n".join(lines)

def validate_gcode(gcode: str, req: GCodeGenerationRequest) -> GCodeValidationResult:
    errors: List[str] = []
    warnings: List[str] = []
    lines = gcode.splitlines()

    g_pattern = re.compile(r'\b(G\d+)\b', re.IGNORECASE)
    m_pattern = re.compile(r'\b(M\d+)\b', re.IGNORECASE)
    s_pattern = re.compile(r'\bS(\d+)\b', re.IGNORECASE)
    coord_pattern = re.compile(r'([XYZ])(-?\d+\.?\d*)', re.IGNORECASE)

    for idx, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        # Skip comment lines and empty lines
        if not line or line.startswith('(') or line.startswith('%'):
            continue

        # Strip inline comments e.g. G00 Z5 (Safe)
        line_code = re.sub(r'\(.*?\)', '', line).strip()

        # 1. Check for forbidden codes
        for code, reason in FORBIDDEN_CODES.items():
            if re.search(r'\b' + re.escape(code) + r'\b', line_code, re.IGNORECASE):
                errors.append(f"Line {idx}: {reason}")

        # 2. Check G-codes against whitelist
        g_matches = g_pattern.findall(line_code)
        for g in g_matches:
            g_upper = g.upper()
            if g_upper not in ALLOWED_G_CODES:
                errors.append(f"Line {idx}: Disallowed or unrecognized G-code: {g_upper}")

        # 3. Check M-codes against whitelist
        m_matches = m_pattern.findall(line_code)
        for m in m_matches:
            m_upper = m.upper()
            if m_upper not in ALLOWED_M_CODES:
                errors.append(f"Line {idx}: Disallowed or unrecognized M-code: {m_upper}")

        # 4. Spindle RPM clamp check
        s_matches = s_pattern.findall(line_code)
        for s in s_matches:
            rpm = float(s)
            if rpm > req.maxRpm:
                errors.append(f"Line {idx}: Spindle speed {rpm} RPM exceeds machine max limit ({req.maxRpm} RPM)")

        # 5. Kinematic envelope coordinate check
        coords = coord_pattern.findall(line_code)
        for axis, val_str in coords:
            val = float(val_str)
            axis_upper = axis.upper()
            if axis_upper == 'X' and (val < -50.0 or val > req.travelXMm):
                errors.append(f"Line {idx}: X coordinate {val:.3f} mm exceeds machine travel limit [0, {req.travelXMm}]")
            elif axis_upper == 'Y' and (val < -50.0 or val > req.travelYMm):
                errors.append(f"Line {idx}: Y coordinate {val:.3f} mm exceeds machine travel limit [0, {req.travelYMm}]")
            elif axis_upper == 'Z' and (val > req.travelZMm or val < -100.0):
                errors.append(f"Line {idx}: Z coordinate {val:.3f} mm violates travel limit [0, {req.travelZMm}]")

    is_valid = len(errors) == 0

    return GCodeValidationResult(
        valid=is_valid,
        dialect=req.controllerDialect,
        linesValidated=len(lines),
        errors=errors,
        warnings=warnings,
        gcodeText=gcode
    )
