export interface Material {
  id: string;
  code: string;
  name: string;
  category: 'ALUMINIUM' | 'STEEL' | 'STAINLESS' | 'TITANIUM' | 'PLASTIC' | 'BRASS' | string;
  densityKgM3: number;
  kcNPerMm2: number;
  vcMinMPerMin: number;
  vcMaxMPerMin: number;
  feedPerToothMm: number;
  strengthRating: number; // 1-5
  lightnessRating: number; // 1-5
  corrosionRating: number; // 1-5
  machinabilityRating: number; // 1-5
  costLevel: number; // 1-5
  costPerKg: number;
  suitableApplications?: string;
  description?: string;
  isActive: boolean;
}

export type Priority = 'BALANCED' | 'STRENGTH' | 'WEIGHT' | 'COST' | 'CORROSION' | 'MACHINABILITY';
export type Environment = 'INDOOR' | 'OUTDOOR' | 'MARINE' | 'CHEMICAL' | 'HIGH_TEMP';
export type ApplicationType = 'STRUCTURAL' | 'HOUSING' | 'FIXTURE' | 'PRECISION' | 'PROTOTYPE' | 'GENERAL';

export interface MaterialRecommendationRequest {
  priority: Priority;
  environment: Environment;
  applicationType: ApplicationType;
  maxBudgetPerKg?: number | null;
}

export interface RankedMaterialResult {
  rank: number;
  materialId: string;
  code: string;
  name: string;
  category: string;
  score: number;
  strengthRating: number;
  lightnessRating: number;
  corrosionRating: number;
  machinabilityRating: number;
  costLevel: number;
  costPerKg: number;
  reasons: string[];
  warnings: string[];
}

export interface MaterialRecommendationResponse {
  id: string;
  cadVersionId: string;
  algorithmVersion: string;
  label: string;
  inputs: MaterialRecommendationRequest;
  results: RankedMaterialResult[];
  createdAt: string;
}
