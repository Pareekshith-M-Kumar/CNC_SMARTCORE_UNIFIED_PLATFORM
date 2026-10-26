import React, { useState, useMemo } from "react";
import {
  Code2,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Download,
  Sparkles,
  FileCode,
  ShieldCheck,
  Cpu,
  ArrowRight,
} from "lucide-react";

interface GCodeError {
  line: number;
  type: "CRITICAL" | "WARNING" | "INFO";
  code: string;
  message: string;
  remediation: string;
}

interface MachineProfile {
  id: string;
  name: string;
  maxRpm: number;
  travelX: number;
  travelY: number;
  travelZ: number;
  maxFeed: number;
}

const MACHINES: MachineProfile[] = [
  {
    id: "haas-vf2",
    name: "Haas VF-2 (3-Axis VMC)",
    maxRpm: 12000,
    travelX: 762,
    travelY: 406,
    travelZ: 508,
    maxFeed: 16500,
  },
  {
    id: "dmg-dmu50",
    name: "DMG MORI DMU 50 (5-Axis)",
    maxRpm: 20000,
    travelX: 500,
    travelY: 450,
    travelZ: 400,
    maxFeed: 24000,
  },
  {
    id: "bridgeport-gx",
    name: "Bridgeport GX 1000",
    maxRpm: 10000,
    travelX: 1020,
    travelY: 540,
    travelZ: 540,
    maxFeed: 15000,
  },
];

// Presets for CAM Designers
const TEMPLATES: Record<string, { name: string; description: string; code: string }> = {
  facing: {
    name: "Facing Routine (Planar Surface)",
    description: "Standard face milling pass across raw stock top with safe clearance",
    code: `%
(JOB: PLANAR FACING 80x40 MM)
(MACHINE: HAAS VF-2 - PROTOTYPE PROGRAM)
G21 G17 G90 G94 G54 G40 G49
T1 M06 (D50 FACE MILL)
S6000 M03 (SPINDLE ON CLOCKWISE)
G00 Z25.000 (SAFE RETRACT)
G00 X-10.000 Y-5.000
G01 Z0.000 F300.0 (PLUNGE TO FACE)
G01 X90.000 F1200.0 (CUTTING PASS 1)
G00 Z5.000
G00 Y20.000
G01 Z0.000 F300.0
G01 X-10.000 F1200.0 (CUTTING PASS 2)
G00 Z25.000 (CLEARANCE RETRACT)
M05 (SPINDLE STOP)
G00 X0.000 Y0.000
M30
%`,
  },
  pocket: {
    name: "Pocketing Routine (Z-Level Stepdown)",
    description: "Rectangular pocket clearance with safe stepdown passes",
    code: `%
(JOB: RECTANGULAR POCKET 40x30 MM DEPTH 5MM)
G21 G17 G90 G94 G54
T2 M06 (D10 4-FLUTE FLAT ENDMILL)
S7500 M03
G00 Z10.000
G00 X10.000 Y10.000
(STEPDOWN LEVEL 1: Z -2.5 MM)
G01 Z-2.500 F250.0
G01 X50.000 F850.0
G01 Y40.000 F850.0
G01 X10.000 F850.0
G01 Y10.000 F850.0
(STEPDOWN LEVEL 2: Z -5.0 MM)
G01 Z-5.000 F250.0
G01 X50.000 F850.0
G01 Y40.000 F850.0
G01 X10.000 F850.0
G01 Y10.000 F850.0
G00 Z20.000
M05
M30
%`,
  },
  contour: {
    name: "Contour Finishing (Climb Milling)",
    description: "Profile finishing with climb milling direction and smooth lead-in",
    code: `%
(JOB: PERIMETER CONTOUR FINISH)
G21 G17 G90 G94 G54
T3 M06 (D12 FLAT ENDMILL - FINISHING)
S8000 M03
G00 Z15.000
G00 X-5.000 Y-5.000
G01 Z-10.000 F200.0
G01 X80.000 F900.0 (BOTTOM EDGE)
G01 Y40.000 F900.0 (RIGHT EDGE)
G01 X0.000 F900.0  (TOP EDGE)
G01 Y-5.000 F900.0 (LEFT EDGE EXIT)
G00 Z25.000
M05
M30
%`,
  },
  invalid_test: {
    name: "Test Case: Intentional CAM Errors",
    description: "Sample with intentional errors to test validator detection",
    code: `%
(PROGRAM WITH DELIBERATE VIOLATIONS TO DEMO VALIDATOR)
G21 G90
T1 M06
S18500 M03 (ERROR: Spindle speed 18500 exceeds Haas max 12000 RPM)
G00 Z10.000
G10 L2 P1 X0 Y0 (ERROR: Forbidden parameter overwrite G10)
G01 X50.000 Y50.000 (ERROR: Feed move without feedrate F specified)
M05 (Spindle turned OFF)
G01 Z-5.000 F500.0 (ERROR: Cutting move with spindle stopped)
G00 X950.000 (ERROR: Coordinate 950mm exceeds Haas X travel limit of 762mm)
M98 P1002 (ERROR: Forbidden macro/subprogram call M98)
(Missing M30 program termination)
%`,
  },
};

// Whitelist and rules
const ALLOWED_G_CODES = new Set([
  "G00", "G0", "G01", "G1", "G02", "G2", "G03", "G3",
  "G17", "G18", "G19", "G20", "G21", "G40", "G41", "G42", "G43", "G49",
  "G54", "G55", "G56", "G57", "G58", "G59",
  "G80", "G81", "G82", "G83", "G90", "G91", "G94",
]);

const FORBIDDEN_CODES: Record<string, string> = {
  G10: "Forbidden parameter / work offset system overwrite (G10)",
  M98: "Forbidden external subprogram execution call (M98)",
  M99: "Forbidden subprogram return outside certified macro (M99)",
  G28: "Uncontrolled raw machine home return without clearance (G28)",
  G53: "Bypassing active workpiece coordinate system (G53)",
};

const ALLOWED_M_CODES = new Set([
  "M00", "M0", "M01", "M1", "M02", "M2", "M03", "M3",
  "M04", "M4", "M05", "M5", "M06", "M6", "M08", "M8", "M09", "M9", "M30",
]);

export const GCodeStudio: React.FC = () => {
  const [selectedMachineId, setSelectedMachineId] = useState<string>("haas-vf2");
  const [gcode, setGcode] = useState<string>(TEMPLATES.facing.code);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

  const activeMachine = useMemo(
    () => MACHINES.find((m) => m.id === selectedMachineId) || MACHINES[0],
    [selectedMachineId]
  );

  // Parse & Validate G-code in real-time
  const validation = useMemo(() => {
    const lines = gcode.split("\n");
    const errors: GCodeError[] = [];
    let spindleOn = false;
    let currentFeed = 0;
    let hasProgramEnd = false;

    let minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0;
    let rapidMoves = 0;
    let cuttingMoves = 0;
    let totalCuttingDist = 0;
    let totalRapidDist = 0;
    let lastX = 0, lastY = 0, lastZ = 0;

    const gRegex = /\b(G\d+)\b/gi;
    const mRegex = /\b(M\d+)\b/gi;
    const sRegex = /\bS(\d+)\b/i;
    const fRegex = /\bF(\d+\.?\d*)\b/i;
    const xRegex = /\bX(-?\d+\.?\d*)\b/i;
    const yRegex = /\bY(-?\d+\.?\d*)\b/i;
    const zRegex = /\bZ(-?\d+\.?\d*)\b/i;

    lines.forEach((rawLine, idx) => {
      const lineNum = idx + 1;
      const trimmed = rawLine.trim();

      // Skip empty or pure comments
      if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith("%")) {
        return;
      }

      // Strip inline comments
      const codeOnly = trimmed.replace(/\(.*?\)/g, "").trim();

      // Check forbidden codes
      for (const [forbidden, reason] of Object.entries(FORBIDDEN_CODES)) {
        const regex = new RegExp(`\\b${forbidden}\\b`, "i");
        if (regex.test(codeOnly)) {
          errors.push({
            line: lineNum,
            type: "CRITICAL",
            code: forbidden,
            message: reason,
            remediation: `Remove ${forbidden}. Use standard workpiece datums (G54-G59) configured in machine controller setup.`,
          });
        }
      }

      // Check G codes against whitelist
      const gMatches = codeOnly.match(gRegex) || [];
      for (const g of gMatches) {
        const gUpper = g.toUpperCase();
        if (!ALLOWED_G_CODES.has(gUpper)) {
          errors.push({
            line: lineNum,
            type: "CRITICAL",
            code: gUpper,
            message: `Disallowed or unverified G-code: ${gUpper}`,
            remediation: "Replace with supported ISO 6983 linear/arc interpolation or canned cycles (G0, G1, G2, G3, G81, G83).",
          });
        }
      }

      // Check M codes
      const mMatches = codeOnly.match(mRegex) || [];
      for (const m of mMatches) {
        const mUpper = m.toUpperCase();
        if (!ALLOWED_M_CODES.has(mUpper)) {
          errors.push({
            line: lineNum,
            type: "CRITICAL",
            code: mUpper,
            message: `Disallowed or unrecognized M-code: ${mUpper}`,
            remediation: "Ensure only approved spindle (M3/M5), toolchange (M6), coolant (M8/M9), or program termination (M30) codes are used.",
          });
        }
        if (mUpper === "M03" || mUpper === "M3" || mUpper === "M04" || mUpper === "M4") {
          spindleOn = true;
        }
        if (mUpper === "M05" || mUpper === "M5") {
          spindleOn = false;
        }
        if (mUpper === "M30" || mUpper === "M02" || mUpper === "M2") {
          hasProgramEnd = true;
        }
      }

      // Spindle RPM limits
      const sMatch = codeOnly.match(sRegex);
      if (sMatch) {
        const rpm = parseInt(sMatch[1], 10);
        if (rpm > activeMachine.maxRpm) {
          errors.push({
            line: lineNum,
            type: "CRITICAL",
            code: `S${rpm}`,
            message: `Spindle speed ${rpm} RPM exceeds machine limit (${activeMachine.maxRpm} RPM on ${activeMachine.name})`,
            remediation: `Clamp spindle speed to ≤ ${activeMachine.maxRpm} RPM to prevent motor overload or spindle bearing damage.`,
          });
        }
      }

      // Feed rate tracking
      const fMatch = codeOnly.match(fRegex);
      if (fMatch) {
        currentFeed = parseFloat(fMatch[1]);
        if (currentFeed > activeMachine.maxFeed) {
          errors.push({
            line: lineNum,
            type: "WARNING",
            code: `F${currentFeed}`,
            message: `Feedrate ${currentFeed} mm/min exceeds maximum cutting feed (${activeMachine.maxFeed} mm/min)`,
            remediation: `Reduce feedrate to within rated machine parameters.`,
          });
        }
      }

      // Coordinate tracking & travel envelope
      let isG1 = /\b(G01|G1)\b/i.test(codeOnly);
      let isG0 = /\b(G00|G0)\b/i.test(codeOnly);
      let isG2G3 = /\b(G02|G2|G03|G3)\b/i.test(codeOnly);

      const xMatch = codeOnly.match(xRegex);
      const yMatch = codeOnly.match(yRegex);
      const zMatch = codeOnly.match(zRegex);

      let targetX = xMatch ? parseFloat(xMatch[1]) : lastX;
      let targetY = yMatch ? parseFloat(yMatch[1]) : lastY;
      let targetZ = zMatch ? parseFloat(zMatch[1]) : lastZ;

      // Kinematic travel checks
      if (xMatch) {
        if (targetX < -20 || targetX > activeMachine.travelX) {
          errors.push({
            line: lineNum,
            type: "CRITICAL",
            code: `X${targetX}`,
            message: `X coordinate ${targetX.toFixed(2)} mm violates machine travel limits [0, ${activeMachine.travelX} mm]`,
            remediation: `Reposition workpiece datum or split operation to keep coordinates inside machine envelope.`,
          });
        }
        minX = Math.min(minX, targetX);
        maxX = Math.max(maxX, targetX);
      }

      if (yMatch) {
        if (targetY < -20 || targetY > activeMachine.travelY) {
          errors.push({
            line: lineNum,
            type: "CRITICAL",
            code: `Y${targetY}`,
            message: `Y coordinate ${targetY.toFixed(2)} mm violates machine travel limits [0, ${activeMachine.travelY} mm]`,
            remediation: `Check workpiece fixture alignment. Maximum Y travel is ${activeMachine.travelY} mm.`,
          });
        }
        minY = Math.min(minY, targetY);
        maxY = Math.max(maxY, targetY);
      }

      if (zMatch) {
        if (targetZ < -activeMachine.travelZ || targetZ > 200) {
          errors.push({
            line: lineNum,
            type: "CRITICAL",
            code: `Z${targetZ}`,
            message: `Z depth ${targetZ.toFixed(2)} mm exceeds safe travel envelope [-${activeMachine.travelZ}, +200 mm]`,
            remediation: "Verify clearance plane and Z zero touch-off to prevent machine table collision.",
          });
        }
        minZ = Math.min(minZ, targetZ);
        maxZ = Math.max(maxZ, targetZ);
      }

      // Cutting move safety rules:
      if (isG1 || isG2G3) {
        cuttingMoves++;
        const dist = Math.sqrt(
          Math.pow(targetX - lastX, 2) +
          Math.pow(targetY - lastY, 2) +
          Math.pow(targetZ - lastZ, 2)
        );
        totalCuttingDist += dist;

        if (!spindleOn) {
          errors.push({
            line: lineNum,
            type: "CRITICAL",
            code: "M05/G01",
            message: "Cutting move (G01/G02/G03) commanded while spindle is stopped (M05)",
            remediation: "Start the spindle (M03 S<rpm>) before commanding material-removing feed moves.",
          });
        }

        if (currentFeed <= 0) {
          errors.push({
            line: lineNum,
            type: "CRITICAL",
            code: "F0",
            message: "Linear cutting move (G01) executed without a valid feedrate (F)",
            remediation: "Specify a positive feedrate (e.g. F500.0) before or on the cutting block.",
          });
        }
      }

      if (isG0) {
        rapidMoves++;
        const dist = Math.sqrt(
          Math.pow(targetX - lastX, 2) +
          Math.pow(targetY - lastY, 2) +
          Math.pow(targetZ - lastZ, 2)
        );
        totalRapidDist += dist;

        if (targetZ < 0 && lastZ < 0) {
          errors.push({
            line: lineNum,
            type: "WARNING",
            code: `G00 Z${targetZ}`,
            message: "Rapid move (G00) executed at or below Z=0 raw stock datum",
            remediation: "Ensure rapid transit occurs at safe clearance plane (Z ≥ 5.0 mm) to avoid crashing into workpiece.",
          });
        }
      }

      lastX = targetX;
      lastY = targetY;
      lastZ = targetZ;
    });

    if (!hasProgramEnd && lines.length > 5) {
      errors.push({
        line: lines.length,
        type: "WARNING",
        code: "EOF",
        message: "Missing standard M30 program rewind/end code at end of file",
        remediation: "Append M30 and % at the end of the G-code program.",
      });
    }

    const criticalCount = errors.filter((e) => e.type === "CRITICAL").length;
    const warningCount = errors.filter((e) => e.type === "WARNING").length;

    const estTimeMin = (totalCuttingDist / (currentFeed || 500)) + (totalRapidDist / 10000);

    return {
      isValid: criticalCount === 0,
      criticalCount,
      warningCount,
      errors,
      stats: {
        totalLines: lines.length,
        rapidMoves,
        cuttingMoves,
        totalCuttingDist: Math.round(totalCuttingDist),
        totalRapidDist: Math.round(totalRapidDist),
        envelope: {
          x: [Math.round(minX), Math.round(maxX)],
          y: [Math.round(minY), Math.round(maxY)],
          z: [Math.round(minZ), Math.round(maxZ)],
        },
        estTimeMin: estTimeMin.toFixed(2),
      },
    };
  }, [gcode, activeMachine]);

  const handleDownload = () => {
    if (!validation.isValid) return;
    const blob = new Blob([gcode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `program-${activeMachine.id}.nc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const lineNumbers = useMemo(() => {
    return gcode.split("\n").map((_, i) => i + 1);
  }, [gcode]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold flex items-center gap-1.5">
              <Code2 className="w-4 h-4" />
              CAM Engineering Station
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent/15 text-accent border border-accent/30 font-semibold">
              Live Validator (sim-1.0)
            </span>
          </div>
          <h1 className="text-xl font-bold text-text">CAM G-Code Studio & Safety Diagnostics</h1>
          <p className="text-xs text-text-muted">
            Interactive workspace for CAM engineers to author, inspect, and validate CNC part programs against machine kinematics and safety whitelists.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMachineId}
            onChange={(e) => setSelectedMachineId(e.target.value)}
            className="px-3 py-1.5 bg-surface border border-border text-xs font-mono text-text rounded-md focus:outline-none focus:border-accent"
          >
            {MACHINES.map((m) => (
              <option key={m.id} value={m.id}>
                Target: {m.name} ({m.maxRpm} RPM)
              </option>
            ))}
          </select>

          <button
            onClick={handleDownload}
            disabled={!validation.isValid}
            title={
              validation.isValid
                ? "Download verified .nc file"
                : "Resolve critical validation errors before downloading G-code"
            }
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .NC</span>
          </button>
        </div>
      </div>

      {/* Template Quick Selectors */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-surface border border-border rounded-lg text-xs">
        <span className="text-text-muted font-mono text-[11px] flex items-center gap-1 font-semibold pr-2 border-r border-border">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          Load Template:
        </span>
        {Object.entries(TEMPLATES).map(([key, t]) => (
          <button
            key={key}
            onClick={() => {
              setGcode(t.code);
              setHighlightedLine(null);
            }}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
              key === "invalid_test"
                ? "bg-danger/10 border-danger/30 text-danger hover:bg-danger/20"
                : "bg-raised border-border text-text hover:bg-hover hover:border-accent/50"
            }`}
            title={t.description}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Main Dual-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Code Editor (7 cols) */}
        <div className="lg:col-span-7 bg-raised border border-border rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border text-xs">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-accent" />
              <span className="font-mono font-semibold text-text">program.nc</span>
              <span className="text-[11px] text-text-muted font-mono">
                ({validation.stats.totalLines} lines, ISO Dialect)
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-text-muted">
                Cursor: {highlightedLine ? `Line ${highlightedLine}` : "Ready"}
              </span>
              <button
                onClick={() => setGcode("")}
                className="text-text-muted hover:text-danger transition-colors"
                title="Clear editor"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Editor Body with Line Numbers */}
          <div className="flex bg-[#0f141c] text-[#e2e8f0] font-mono text-xs overflow-x-auto min-h-[460px] max-h-[620px]">
            {/* Gutter */}
            <div className="select-none py-3 px-2 bg-[#090d13] text-[#4b5563] text-right border-r border-[#1e293b] shrink-0 min-w-[42px] space-y-[2px]">
              {lineNumbers.map((num) => {
                const lineErr = validation.errors.find((e) => e.line === num);
                const isSelected = highlightedLine === num;
                return (
                  <div
                    key={num}
                    onClick={() => setHighlightedLine(num)}
                    className={`cursor-pointer px-1 text-[11px] leading-[20px] flex items-center justify-end gap-1 ${
                      isSelected
                        ? "bg-accent/30 text-accent font-bold"
                        : lineErr?.type === "CRITICAL"
                        ? "text-danger font-bold"
                        : lineErr?.type === "WARNING"
                        ? "text-warning"
                        : "hover:text-[#94a3b8]"
                    }`}
                  >
                    {lineErr?.type === "CRITICAL" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                    )}
                    {lineErr?.type === "WARNING" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                    )}
                    <span>{num}</span>
                  </div>
                );
              })}
            </div>

            {/* Code Input Area */}
            <textarea
              value={gcode}
              onChange={(e) => setGcode(e.target.value)}
              spellCheck={false}
              className="flex-1 bg-transparent text-[#e2e8f0] p-3 leading-[20px] resize-none focus:outline-none min-h-[460px] font-mono text-xs whitespace-pre tab-4"
              placeholder="Paste or write CNC G-code program here..."
              style={{ tabSize: 4 }}
            />
          </div>

          <div className="px-4 py-2 bg-surface border-t border-border flex items-center justify-between text-[11px] font-mono text-text-muted">
            <span>Encoding: UTF-8 / Standard ASCII ISO 6983</span>
            <span>Target Axis: X/Y/Z (Climb & Conventional)</span>
          </div>
        </div>

        {/* Right Pane: Diagnostics & Telemetry (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Validation Status Card */}
          <div
            className={`p-4 rounded-lg border shadow-xs transition-colors space-y-2 ${
              validation.isValid
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-danger/10 border-danger/30 text-danger"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs">
                {validation.isValid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>VALIDATION PASSED (0 ERRORS)</span>
                  </>
                ) : (
                  <>
                    <AlertOctagon className="w-4 h-4 text-danger" />
                    <span>
                      {validation.criticalCount} CRITICAL ERROR
                      {validation.criticalCount > 1 ? "S" : ""} DETECTED
                    </span>
                  </>
                )}
              </div>
              {validation.warningCount > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  {validation.warningCount} Warning{validation.warningCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <p className="text-[11px] text-text-2">
              {validation.isValid
                ? `Program conforms to ${activeMachine.name} safety rules and spindle/feed limits. Ready for toolpath download.`
                : "All critical errors must be resolved to unlock G-code download and shop-floor execution."}
            </p>
          </div>

          {/* Kinematic Telemetry Card */}
          <div className="bg-raised border border-border rounded-lg p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-xs font-semibold text-text flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-accent" />
                Kinematic Telemetry & Extents
              </span>
              <span className="text-[11px] font-mono text-text-muted">
                Est. Time: ~{validation.stats.estTimeMin} min
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-surface border border-border rounded space-y-0.5">
                <span className="text-[10px] text-text-muted block">FEED CUTTING MOVES</span>
                <span className="text-sm font-bold text-cyan-400">
                  {validation.stats.cuttingMoves} moves
                </span>
                <span className="text-[10px] text-text-muted block">
                  ({validation.stats.totalCuttingDist} mm total)
                </span>
              </div>

              <div className="p-2.5 bg-surface border border-border rounded space-y-0.5">
                <span className="text-[10px] text-text-muted block">RAPID TRANSIT (G00)</span>
                <span className="text-sm font-bold text-amber-400">
                  {validation.stats.rapidMoves} moves
                </span>
                <span className="text-[10px] text-text-muted block">
                  ({validation.stats.totalRapidDist} mm total)
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-surface border border-border rounded text-xs font-mono space-y-1">
              <span className="text-[10px] text-text-muted block">BOUNDING COORDINATE ENVELOPE</span>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text">
                  X: [{validation.stats.envelope.x[0]}, {validation.stats.envelope.x[1]}] mm
                </span>
                <span className="text-text">
                  Y: [{validation.stats.envelope.y[0]}, {validation.stats.envelope.y[1]}] mm
                </span>
                <span className="text-text">
                  Z: [{validation.stats.envelope.z[0]}, {validation.stats.envelope.z[1]}] mm
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostic Issues List */}
          <div className="bg-raised border border-border rounded-lg p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-xs font-semibold text-text flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                Diagnostic Findings ({validation.errors.length})
              </span>
              <span className="text-[10px] text-text-muted">Click finding to locate line</span>
            </div>

            {validation.errors.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-muted space-y-1">
                <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto" />
                <div className="font-semibold text-text">No Errors Found</div>
                <p className="text-[11px]">All blocks pass safety and dialect validation checks.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {validation.errors.map((err, i) => (
                  <div
                    key={i}
                    onClick={() => setHighlightedLine(err.line)}
                    className={`p-2.5 rounded border text-xs cursor-pointer transition-colors space-y-1 ${
                      highlightedLine === err.line
                        ? "ring-2 ring-accent"
                        : ""
                    } ${
                      err.type === "CRITICAL"
                        ? "bg-danger/10 border-danger/30 hover:bg-danger/15"
                        : "bg-warning/10 border-warning/30 hover:bg-warning/15"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          err.type === "CRITICAL"
                            ? "bg-danger text-white"
                            : "bg-warning text-black"
                        }`}
                      >
                        {err.type} • Line {err.line}
                      </span>
                      <span className="font-mono text-[10px] text-text-muted">
                        Token: {err.code}
                      </span>
                    </div>

                    <div className="font-semibold text-text text-[11px]">{err.message}</div>
                    <div className="text-[10px] text-text-muted font-sans flex items-start gap-1">
                      <ArrowRight className="w-3 h-3 text-accent shrink-0 mt-0.5" />
                      <span>{err.remediation}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
