export interface MachineProfile {
  id: string;
  name: string;
  controllerDialect: string;
  travelXMm: number;
  travelYMm: number;
  travelZMm: number;
  maxRpm: number;
  ratedPowerKw: number;
  spindleEfficiency: number;
  rapidFeedMmMin: number;
  maxFeedMmMin: number;
  toolChangeS: number;
  machineRatePerHr: number;
  idlePowerKw: number;
  isSampleData: boolean;
  isActive: boolean;
}

export interface CuttingTool {
  id: string;
  name: string;
  toolType: 'FLAT_END_MILL' | 'BALL_END_MILL' | 'FACE_MILL' | 'DRILL' | string;
  diameterMm: number;
  fluteCount: number;
  fluteLengthMm: number;
  overallLengthMm: number;
  toolMaterial: 'CARBIDE' | 'HSS' | string;
  centerCutting: boolean;
  price: number;
  expectedLifeMin: number;
  isSampleData: boolean;
  isActive: boolean;
}

export interface ToolpathOperation {
  id?: string;
  seq: number;
  opType: 'FACE' | 'ROUGH_POCKET' | 'CONTOUR' | 'DRILL' | string;
  toolId: string;
  spindleRpm: number;
  feedMmMin: number;
  plungeFeedMmMin: number;
  apMm: number;
  aeMm: number;
  finishAllowanceMm: number;
  parametersSource: 'CALCULATED' | 'EDITED' | string;
  pathLengthMm?: number | null;
  cuttingLengthMm?: number | null;
  rapidLengthMm?: number | null;
  moveCount?: number | null;
  estTimeS?: number | null;
  estPowerKw?: number | null;
}

export interface CamEstimates {
  label: string; // 'Estimate'
  inputs: Record<string, unknown>;
  time: {
    cuttingMin: number;
    rapidMin: number;
    toolChangeMin: number;
    setupMin: number;
    totalMachiningMin: number;
  };
  energyKwh: number;
  cost: {
    machine: number;
    material: number;
    tooling: number;
    setup: number;
    energy: number;
    total: number;
    currency: string;
  };
  warnings: string[];
  calculatedAt: string;
}

import { StatusType } from '@/components/domain/StatusBadge';

export interface CamJob {
  id: string;
  cadVersionId: string;
  materialId?: string | null;
  machineId: string;
  createdBy: string;
  name: string;
  status: StatusType;
  stockAllowanceMm: number;
  stockXMm?: number | null;
  stockYMm?: number | null;
  stockZMm?: number | null;
  setupTimeMin: number;
  estimates?: CamEstimates | null;
  configHash?: string | null;
  generationAttempts: number;
  lastError?: string | null;
  rowVersion: number;
  operations: ToolpathOperation[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCamJobRequest {
  cadVersionId: string;
  name: string;
  materialId?: string | null;
  machineId: string;
}

export interface OperationConfigRequest {
  seq: number;
  opType: string;
  toolId: string;
  spindleRpm: number;
  feedMmMin: number;
  plungeFeedMmMin?: number;
  apMm: number;
  aeMm: number;
  finishAllowanceMm?: number;
  parametersSource?: string;
}

export interface ConfigureCamJobRequest {
  stockAllowanceMm: number;
  setupTimeMin: number;
  operations: OperationConfigRequest[];
}

export interface ToolpathPoint {
  x: number;
  y: number;
  z: number;
  moveType: 'RAPID' | 'FEED' | 'PLUNGE' | 'ARC' | string;
  f: number;
  s: number;
}

export interface OperationResult {
  seq: number;
  opType: string;
  toolId: string;
  toolDiameterMm: number;
  spindleRpm: number;
  feedMmMin: number;
  plungeFeedMmMin: number;
  apMm: number;
  aeMm: number;
  pathLengthMm: number;
  cuttingLengthMm: number;
  rapidLengthMm: number;
  moveCount: number;
  estTimeS: number;
  points: ToolpathPoint[];
}

export interface ToolpathGeometry {
  camJobId: string;
  stock: {
    x: number;
    y: number;
    z: number;
    safeZ?: number;
  };
  operations: OperationResult[];
  totalPathLengthMm: number;
  totalCuttingLengthMm: number;
  totalRapidLengthMm: number;
  totalMoves: number;
  totalCycleTimeS: number;
}

