export type FeatureType =
  | 'block'
  | 'cylinder'
  | 'pocket'
  | 'bore'
  | 'slot'
  | 'cnc_envelope';

export interface CadFeature {
  id: string;
  name: string;
  type: FeatureType;
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: {
    width: number; // X in mm
    length: number; // Y in mm
    height: number; // Z in mm
    diameter?: number;
    radius?: number;
  };
  isCut: boolean; // True if cavity/pocket/hole
  visible: boolean;
  color?: string;
}

export interface MaterialDensity {
  id: string;
  name: string;
  densityGPerCm3: number;
  hardnessHb: number;
}

export const MATERIAL_PRESETS: MaterialDensity[] = [
  { id: 'AL6061-T6', name: 'Aluminum 6061-T6 (Aerospace Billet)', densityGPerCm3: 2.70, hardnessHb: 95 },
  { id: 'STEEL-1018', name: 'Mild Steel 1018 (Cold Rolled)', densityGPerCm3: 7.85, hardnessHb: 130 },
  { id: 'STEEL-4140', name: 'Alloy Steel 4140 (Pre-hardened)', densityGPerCm3: 7.85, hardnessHb: 280 },
  { id: 'SS-304', name: 'Stainless Steel 304 (Austenitic)', densityGPerCm3: 8.00, hardnessHb: 180 },
  { id: 'DELRIN', name: 'Acetal / Delrin (Engineering Plastic)', densityGPerCm3: 1.41, hardnessHb: 85 },
  { id: 'BRASS-360', name: 'Free-Machining Brass 360', densityGPerCm3: 8.50, hardnessHb: 120 },
  { id: 'TITANIUM-TI6AL4V', name: 'Titanium Grade 5 (Ti-6Al-4V)', densityGPerCm3: 4.43, hardnessHb: 330 },
];
