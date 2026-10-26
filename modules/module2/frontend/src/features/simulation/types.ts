export type Severity = "INFO" | "WARN" | "FAIL";
export type SimulationResult = "PASS" | "WARN" | "FAIL";

export interface SimulationFinding {
  id: string;
  ruleCode: string;
  severity: Severity;
  message: string;
  moveIndex?: number;
  xMm?: number;
  yMm?: number;
  zMm?: number;
}

export interface SimulationStats {
  totalCycleTimeS: number;
  totalPathLengthMm: number;
  totalCuttingLengthMm: number;
  totalRapidLengthMm: number;
  totalMoves: number;
  maxDepthEngagedMm: number;
  maxPowerKw: number;
  powerUtilizationPct: number;
  findingCounts: Record<string, number>;
}

export interface SimulationResponse {
  id: string;
  camJobId: string;
  status: string;
  overallResult: SimulationResult;
  rulesetVersion: string;
  stats?: SimulationStats;
  runBy: string;
  createdAt: string;
  findings: SimulationFinding[];
}
