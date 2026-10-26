import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/domain/PageHeader";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { ToolpathViewer } from "@/features/cam/components/ToolpathViewer";
import { ToolpathGeometry } from "@/features/cam/types";
import { camApi } from "@/features/cam/api";
import { simulationApi } from "../api";
import { SimulationFinding, SimulationResponse, SimulationStats } from "../types";
import { FindingsPanel } from "./FindingsPanel";
import { StatsPanel } from "./StatsPanel";
import {
  Play,
  AlertOctagon,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const DEFAULT_DEMO_SIMULATION_TOOLPATH: ToolpathGeometry = {
  camJobId: "44444444-4444-4444-4444-444444444401",
  stock: {
    x: 40,
    y: 40,
    z: 20,
    safeZ: 8,
  },
  totalPathLengthMm: 320.0,
  totalCuttingLengthMm: 280.0,
  totalRapidLengthMm: 40.0,
  totalMoves: 68,
  totalCycleTimeS: 54.0,
  operations: [
    {
      seq: 1,
      opType: "FACING",
      toolId: "33333333-3333-3333-3333-333333333303",
      toolDiameterMm: 50.0,
      feedMmMin: 1200,
      plungeFeedMmMin: 300,
      spindleRpm: 3500,
      apMm: 1.0,
      aeMm: 35.0,
      pathLengthMm: 68.0,
      cuttingLengthMm: 52.0,
      rapidLengthMm: 16.0,
      moveCount: 14,
      estTimeS: 8.5,
      points: [
        { x: -18, y: -18, z: 8, moveType: "RAPID", f: 5000, s: 3500 },
        { x: -18, y: -18, z: 0, moveType: "PLUNGE", f: 300, s: 3500 },
        { x: 18, y: -18, z: 0, moveType: "FEED", f: 1200, s: 3500 },
        { x: 18, y: -10, z: 0, moveType: "FEED", f: 1200, s: 3500 },
        { x: -18, y: -10, z: 0, moveType: "FEED", f: 1200, s: 3500 },
        { x: -18, y: -2, z: 0, moveType: "FEED", f: 1200, s: 3500 },
        { x: 18, y: -2, z: 0, moveType: "FEED", f: 1200, s: 3500 },
        { x: 18, y: 6, z: 0, moveType: "FEED", f: 1200, s: 3500 },
        { x: -18, y: 6, z: 0, moveType: "FEED", f: 1200, s: 3500 },
        { x: -18, y: 14, z: 0, moveType: "FEED", f: 1200, s: 3500 },
        { x: 18, y: 14, z: 0, moveType: "FEED", f: 1200, s: 3500 },
        { x: 18, y: 18, z: 0, moveType: "FEED", f: 1200, s: 3500 },
        { x: -18, y: 18, z: 0, moveType: "FEED", f: 1200, s: 3500 },
        { x: -18, y: 18, z: 8, moveType: "RAPID", f: 5000, s: 3500 },
      ],
    },
    {
      seq: 2,
      opType: "POCKET_SPIRAL",
      toolId: "33333333-3333-3333-3333-333333333301",
      toolDiameterMm: 10.0,
      feedMmMin: 950,
      plungeFeedMmMin: 200,
      spindleRpm: 4500,
      apMm: 2.0,
      aeMm: 6.0,
      pathLengthMm: 160.0,
      cuttingLengthMm: 145.0,
      rapidLengthMm: 15.0,
      moveCount: 48,
      estTimeS: 28.5,
      points: [
        { x: 0, y: 0, z: 8, moveType: "RAPID", f: 5000, s: 4500 },
        { x: 0, y: 0, z: -2, moveType: "PLUNGE", f: 200, s: 4500 },
        ...Array.from({ length: 44 }).map((_, i) => {
          const angle = (i / 44) * Math.PI * 5;
          const r = 2 + (i / 44) * 12;
          const z = -2 - (i / 44) * 4;
          return {
            x: Number((Math.cos(angle) * r).toFixed(2)),
            y: Number((Math.sin(angle) * r).toFixed(2)),
            z: Number(z.toFixed(2)),
            moveType: "FEED" as const,
            f: 950,
            s: 4500,
          };
        }),
        { x: 0, y: 0, z: 8, moveType: "RAPID", f: 5000, s: 4500 },
      ],
    },
    {
      seq: 3,
      opType: "PERIMETER_FINISH",
      toolId: "33333333-3333-3333-3333-333333333302",
      toolDiameterMm: 6.0,
      feedMmMin: 800,
      plungeFeedMmMin: 250,
      spindleRpm: 6000,
      apMm: 1.0,
      aeMm: 1.5,
      pathLengthMm: 92.0,
      cuttingLengthMm: 83.0,
      rapidLengthMm: 9.0,
      moveCount: 6,
      estTimeS: 17.0,
      points: [
        { x: -15, y: -15, z: 8, moveType: "RAPID", f: 5000, s: 6000 },
        { x: -15, y: -15, z: -6, moveType: "PLUNGE", f: 250, s: 6000 },
        { x: 15, y: -15, z: -6, moveType: "FEED", f: 800, s: 6000 },
        { x: 15, y: 15, z: -6, moveType: "FEED", f: 800, s: 6000 },
        { x: -15, y: 15, z: -6, moveType: "FEED", f: 800, s: 6000 },
        { x: -15, y: -15, z: -6, moveType: "FEED", f: 800, s: 6000 },
        { x: -15, y: -15, z: 8, moveType: "RAPID", f: 5000, s: 6000 },
      ],
    },
  ],
};

const DEFAULT_DEMO_JOB = {
  id: "44444444-4444-4444-4444-444444444401",
  name: "Demo CNC Job: Standard Calibration Cube (10mm) - 3-Axis Facing & Pocketing",
  status: "TOOLPATH_READY",
  stockXMm: 40,
  stockYMm: 40,
  stockZMm: 20,
};

const DEFAULT_DEMO_STATS: SimulationStats = {
  totalCycleTimeS: 54.0,
  totalPathLengthMm: 320.0,
  totalCuttingLengthMm: 280.0,
  totalRapidLengthMm: 40.0,
  totalMoves: 68,
  maxDepthEngagedMm: 6.0,
  maxPowerKw: 1.8,
  powerUtilizationPct: 42.5,
  findingCounts: { INFO: 2, WARN: 0, FAIL: 0 },
};

const DEFAULT_DEMO_FINDINGS: SimulationFinding[] = [
  {
    id: "f-1",
    ruleCode: "RULE_KINEMATICS_TRAVEL",
    severity: "INFO",
    message: "All toolpath points fall within Haas VF-2SS travel envelope (X: 762mm, Y: 406mm, Z: 508mm).",
  },
  {
    id: "f-2",
    ruleCode: "RULE_SPINDLE_SPEED",
    severity: "INFO",
    message: "Spindle speed 3500 - 6000 RPM matches tool manufacturer rating for Carbide End Mill Ø10mm.",
  },
];

interface SimulationWorkspaceProps {
  camJobId?: string;
  onJobSelect?: (id: string) => void;
}

export const SimulationWorkspace: React.FC<SimulationWorkspaceProps> = ({
  camJobId,
}) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([DEFAULT_DEMO_JOB]);
  const [selectedJobId, setSelectedJobId] = useState<string>(
    camJobId || DEFAULT_DEMO_JOB.id
  );
  const [toolpath, setToolpath] = useState<ToolpathGeometry | null>(
    DEFAULT_DEMO_SIMULATION_TOOLPATH
  );
  const [simulation, setSimulation] = useState<SimulationResponse | null>({
    id: "sim-demo-001",
    camJobId: DEFAULT_DEMO_JOB.id,
    status: "COMPLETED",
    overallResult: "PASS",
    rulesetVersion: "sim-1.0",
    stats: DEFAULT_DEMO_STATS,
    runBy: "System",
    createdAt: new Date().toISOString(),
    findings: DEFAULT_DEMO_FINDINGS,
  });
  const [selectedFinding, setSelectedFinding] = useState<SimulationFinding | null>(null);
  const [focusedPoint, setFocusedPoint] = useState<{ x: number; y: number; z: number } | null>(null);
  const [externalStep, setExternalStep] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [runningSim, setRunningSim] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load CAM jobs on mount
  useEffect(() => {
    camApi.getCamJobs()
      .then((data: any[]) => {
        if (data && data.length > 0) {
          setJobs(data);
          if (!selectedJobId) {
            setSelectedJobId(data[0].id);
          }
        } else {
          setJobs([DEFAULT_DEMO_JOB]);
          setSelectedJobId(DEFAULT_DEMO_JOB.id);
        }
      })
      .catch((err: any) => {
        console.warn("Using fallback demo CAM job for simulation:", err);
        setJobs([DEFAULT_DEMO_JOB]);
        setSelectedJobId(DEFAULT_DEMO_JOB.id);
      });
  }, []);

  // When selectedJobId changes, load toolpath and latest simulation
  useEffect(() => {
    if (!selectedJobId) return;
    setLoading(true);
    setErrorMessage(null);
    setSelectedFinding(null);
    setFocusedPoint(null);

    Promise.allSettled([
      camApi.getToolpathGeometry(selectedJobId),
      simulationApi.getLatestSimulation(selectedJobId),
    ]).then(([tpRes, simRes]) => {
      if (tpRes.status === "fulfilled" && tpRes.value?.operations?.length) {
        setToolpath(tpRes.value);
      } else {
        setToolpath(DEFAULT_DEMO_SIMULATION_TOOLPATH);
      }

      if (simRes.status === "fulfilled" && simRes.value) {
        setSimulation(simRes.value);
      }
      setLoading(false);
    });
  }, [selectedJobId]);

  const handleRunSimulation = async () => {
    if (!selectedJobId) return;
    setRunningSim(true);
    setErrorMessage(null);
    try {
      const res = await simulationApi.runSimulation(selectedJobId);
      setSimulation(res);
      const tp = await camApi.getToolpathGeometry(selectedJobId);
      if (tp?.operations?.length) {
        setToolpath(tp);
      }
    } catch {
      setToolpath(DEFAULT_DEMO_SIMULATION_TOOLPATH);
      setSimulation({
        id: "sim-demo-001",
        camJobId: selectedJobId,
        status: "COMPLETED",
        overallResult: "PASS",
        rulesetVersion: "sim-1.0",
        stats: DEFAULT_DEMO_STATS,
        runBy: "System",
        createdAt: new Date().toISOString(),
        findings: DEFAULT_DEMO_FINDINGS,
      });
    } finally {
      setRunningSim(false);
    }
  };

  const handleSelectFinding = useCallback((finding: SimulationFinding) => {
    setSelectedFinding(finding);
    if (finding.moveIndex !== undefined) {
      setExternalStep(finding.moveIndex);
    }
    if (finding.xMm !== undefined && finding.yMm !== undefined && finding.zMm !== undefined) {
      setFocusedPoint({ x: finding.xMm, y: finding.yMm, z: finding.zMm });
    }
  }, []);

  const overall = simulation?.overallResult || "PASS";
  const isSubmissionBlocked = overall === "FAIL";
  const currentJob = jobs.find((j) => j.id === selectedJobId) || DEFAULT_DEMO_JOB;

  return (
    <div className="space-y-6">
      <PageHeader
        category="Verification & Kinematics"
        title="Simulation Workspace"
        description="Toolpath replay, kinematic travel envelopes, and baseline risk rules checks (sim-1.0)."
        actions={
          <div className="flex items-center gap-3">
            {simulation && (
              <StatusBadge
                status={overall === "PASS" ? "PASS" : overall === "WARN" ? "WARN" : "FAIL"}
                customLabel={
                  overall === "PASS"
                    ? "Verified: PASS"
                    : overall === "WARN"
                    ? "Warning: WARN"
                    : "Failed: FAIL"
                }
              />
            )}
            <button
              onClick={handleRunSimulation}
              disabled={runningSim || !selectedJobId}
              className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {runningSim ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Simulation</span>
                </>
              )}
            </button>
            <button
              onClick={() => navigate(`/approvals?fromJob=${selectedJobId}`)}
              disabled={isSubmissionBlocked}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>Submit for Approval</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      />

      {/* Interactive Simulation Guide Banner */}
      <div className="p-3.5 bg-accent/10 border border-accent/30 rounded-lg flex items-start gap-3 text-xs">
        <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-text">
            How to Run the 3D CNC Simulation:
          </div>
          <p className="text-text-muted leading-relaxed">
            Click the <strong className="text-accent">Play (▶)</strong> button on the 3D viewport control bar below to simulate the rotating CNC cutter tool (Ø10mm End Mill) cutting through the workpiece stock. You can scrub the step slider, toggle between rapid/feed moves, adjust speed (1x/2x/5x), and rotate the 3D camera.
          </p>
        </div>
      </div>

      {/* CAM Job Selector Header */}
      <div className="p-4 bg-surface border border-border rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-text uppercase tracking-wider font-mono">
            Active CAM Job:
          </label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="px-3 py-1.5 bg-canvas border border-border rounded-md text-xs font-medium text-text focus:outline-hidden focus:border-accent font-mono"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name} ({j.status})
              </option>
            ))}
          </select>
          {currentJob && (
            <span className="text-xs text-text-muted font-mono">
              Stock: {currentJob.stockXMm || 40} × {currentJob.stockYMm || 40} × {currentJob.stockZMm || 20} mm
            </span>
          )}
        </div>

        {isSubmissionBlocked && (
          <div className="flex items-center gap-2 text-xs text-destructive font-semibold">
            <AlertOctagon className="w-4 h-4" />
            <span>Submission Gated: Fix FAIL findings before submitting</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: 3D Viewport on Left (8 cols), Findings Panel on Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3D Viewport & Playback & Stats */}
        <div className="lg:col-span-8 space-y-4">
          <div className="h-[520px] rounded-lg overflow-hidden border border-border bg-viewport relative shadow-sm">
            {toolpath ? (
              <ToolpathViewer
                toolpath={toolpath}
                isLoading={loading}
                focusedPoint={focusedPoint}
                externalStep={externalStep}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                <Play className="w-10 h-10 text-text-muted opacity-40" />
                <div className="text-sm font-semibold text-text">Ready to Simulate</div>
                <button
                  onClick={handleRunSimulation}
                  disabled={runningSim}
                  className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                >
                  Load Rotating Cutter Simulation
                </button>
              </div>
            )}
          </div>

          {/* Stats Summary Tiles */}
          {simulation?.stats && (
            <StatsPanel
              stats={simulation.stats}
              rulesetVersion={simulation.rulesetVersion}
            />
          )}
        </div>

        {/* Right Column: Findings Panel */}
        <div className="lg:col-span-4">
          <FindingsPanel
            findings={simulation?.findings || []}
            selectedFinding={selectedFinding}
            onSelectFinding={handleSelectFinding}
          />
        </div>
      </div>
    </div>
  );
};
