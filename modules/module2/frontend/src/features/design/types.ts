export interface CadVersion {
  id: string;
  versionNumber: number;
  originalFilename: string;
  format: 'STEP' | 'STL' | 'IGES';
  fileSizeBytes: number;
  sha256Hash: string;
  units: string;
  storagePath: string;
  previewGlbPath?: string | null;
  previewStatus: 'PENDING' | 'READY' | 'FAILED';
  previewError?: string | null;
  bboxXMm?: number | null;
  bboxYMm?: number | null;
  bboxZMm?: number | null;
  volumeMm3?: number | null;
  surfaceAreaMm2?: number | null;
  triangleCount?: number | null;
  isWatertight?: boolean | null;
  selectedMaterialId?: string | null;
  warningsJson?: string | null;
  aiMachinabilityJson?: string | null;
  createdBy?: string;
  createdAt: string;
}

export interface CadAsset {
  id: string;
  name: string;
  description?: string | null;
  currentVersionId?: string | null;
  currentVersion?: CadVersion | null;
  versions?: CadVersion[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiMachinabilityData {
  riskScore: number;
  riskCategory: 'LOW' | 'MODERATE' | 'HIGH';
  geometryFlags?: {
    thinWallRisk?: boolean;
    aspectRatioRisk?: boolean;
    extremeVolumeRisk?: boolean;
    nonWatertightMesh?: boolean;
  };
  recommendedParameters?: {
    datasetSource?: string;
    benchmarkMaterial?: string;
    recommendedRpm?: number;
    recommendedFeedMmpm?: number;
    cuttingSpeedVcMMin?: number;
    feedPerToothFzMm?: number;
    apDepthMm?: number;
    aeWidthMm?: number;
    mrrCm3Min?: number;
    estimatedCuttingForceN?: number;
    estimatedSpindlePowerKw?: number;
    estimatedToolLifeMin?: number;
    expectedRoughnessRaUm?: number;
    datasetHardnessHb?: number;
  };
  warnings?: string[];
}
