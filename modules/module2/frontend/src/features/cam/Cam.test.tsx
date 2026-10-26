import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MachineSelector } from './components/MachineSelector';
import { StockSizingPanel } from './components/StockSizingPanel';
import { OperationConfigTable } from './components/OperationConfigTable';
import { EstimatesCard } from './components/EstimatesCard';
import { CamWizard } from './components/CamWizard';
import { ToolpathViewer } from './components/ToolpathViewer';
import { GCodePreviewModal } from './components/GCodePreviewModal';
import {
  MachineProfile,
  CuttingTool,
  ToolpathOperation,
  CamEstimates,
  CamJob,
  ToolpathGeometry,
} from './types';
import { CadVersion } from '@/features/design/types';
import { Material } from '@/features/materials/types';

// Mock data fixtures
const mockMachines: MachineProfile[] = [
  {
    id: 'm1',
    name: 'Haas VF-2',
    controllerDialect: 'HAAS',
    travelXMm: 762,
    travelYMm: 508,
    travelZMm: 508,
    maxRpm: 8100,
    ratedPowerKw: 22.4,
    spindleEfficiency: 0.85,
    rapidFeedMmMin: 25400,
    maxFeedMmMin: 16500,
    toolChangeS: 2.8,
    machineRatePerHr: 2200,
    idlePowerKw: 1.2,
    isSampleData: true,
    isActive: true,
  },
  {
    id: 'm2',
    name: 'Benchtop Router Mini',
    controllerDialect: 'GRBL',
    travelXMm: 40, // 40mm travel < 54mm stock envelope -> triggers kinematic limit warning
    travelYMm: 40,
    travelZMm: 20,
    maxRpm: 10000,
    ratedPowerKw: 0.8,
    spindleEfficiency: 0.7,
    rapidFeedMmMin: 2000,
    maxFeedMmMin: 1000,
    toolChangeS: 30,
    machineRatePerHr: 450,
    idlePowerKw: 0.1,
    isSampleData: true,
    isActive: true,
  },
];

const mockTools: CuttingTool[] = [
  {
    id: 't1',
    name: '10mm 3-Flute Carbide Flat End Mill',
    toolType: 'FLAT_END_MILL',
    diameterMm: 10.0,
    fluteCount: 3,
    fluteLengthMm: 25.0,
    overallLengthMm: 75.0,
    toolMaterial: 'CARBIDE',
    centerCutting: true,
    price: 1850,
    expectedLifeMin: 120,
    isSampleData: true,
    isActive: true,
  },
];

const mockOperations: ToolpathOperation[] = [
  {
    seq: 1,
    opType: 'FACE',
    toolId: 't1',
    spindleRpm: 7958,
    feedMmMin: 716,
    plungeFeedMmMin: 238,
    apMm: 1.0,
    aeMm: 8.0,
    finishAllowanceMm: 0.0,
    parametersSource: 'CALCULATED',
    estTimeS: 65,
    estPowerKw: 0.08,
  },
];

const mockEstimates: CamEstimates = {
  label: 'Estimate',
  inputs: {},
  time: {
    cuttingMin: 6.9,
    rapidMin: 0.8,
    toolChangeMin: 0.5,
    setupMin: 15.0,
    totalMachiningMin: 23.2,
  },
  energyKwh: 0.043,
  cost: {
    machine: 297.0,
    material: 120.0,
    tooling: 35.5,
    setup: 110.0,
    energy: 4.5,
    total: 567.0,
    currency: 'INR',
  },
  warnings: [],
  calculatedAt: new Date().toISOString(),
};

const mockVersion: CadVersion = {
  id: 'v1',
  versionNumber: 1,
  originalFilename: 'bracket.step',
  format: 'STEP',
  fileSizeBytes: 1024 * 1024,
  sha256Hash: 'a1b2c3d4e5f6',
  units: 'mm',
  storagePath: '',
  previewStatus: 'READY',
  bboxXMm: 50.0,
  bboxYMm: 50.0,
  bboxZMm: 25.0,
  volumeMm3: 45000.0,
  createdAt: new Date().toISOString(),
};

const mockMaterial: Material = {
  id: 'mat1',
  code: 'AL6061-T6',
  name: 'Aluminium 6061-T6',
  category: 'Aluminium',
  densityGPerCm3: 2.7,
  densityKgM3: 2700,
  costPerKg: 320,
  costPerKgInr: 320,
  kcNPerMm2: 700,
  vcMinMPerMin: 180,
  vcMaxMPerMin: 350,
  fzFactor: 0.04,
  hardnessHb: 95,
  yieldStrengthMpa: 276,
  thermalConductivity: 167,
  isSampleData: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockJob: CamJob = {
  id: 'j1',
  cadVersionId: 'v1',
  machineId: 'm1',
  createdBy: 'engineer',
  name: 'Job: Bracket Rough & Finish',
  status: 'CONFIGURED',
  stockAllowanceMm: 2.0,
  stockXMm: 54.0,
  stockYMm: 54.0,
  stockZMm: 27.0,
  setupTimeMin: 15.0,
  estimates: mockEstimates,
  configHash: 'b4a8e631...f89a',
  generationAttempts: 1,
  rowVersion: 1,
  operations: mockOperations,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('CAM Feature Components', () => {
  describe('MachineSelector', () => {
    it('renders machine profiles and calls onSelectMachine when clicked', () => {
      const handleSelect = vi.fn();
      render(
        <MachineSelector
          machines={mockMachines}
          selectedMachineId="m1"
          partX={50}
          partY={50}
          partZ={25}
          allowanceMm={2.0}
          onSelectMachine={handleSelect}
        />
      );

      expect(screen.getByText('Haas VF-2')).toBeInTheDocument();
      expect(screen.getByText('Benchtop Router Mini')).toBeInTheDocument();

      // Click on Haas VF-2
      fireEvent.click(screen.getByText('Haas VF-2'));
      expect(handleSelect).toHaveBeenCalledWith('m1');
    });

    it('identifies oversized parts and shows kinematic envelope violation', () => {
      render(
        <MachineSelector
          machines={mockMachines}
          selectedMachineId="m2"
          partX={50} // 50 + 4 = 54 > 40mm travel
          partY={50}
          partZ={25}
          allowanceMm={2.0}
          onSelectMachine={vi.fn()}
        />
      );

      expect(screen.getByText(/exceeds machine travel/i)).toBeInTheDocument();
    });
  });

  describe('StockSizingPanel', () => {
    it('calculates stock dimensions, volume, and allowance changes', () => {
      const handleAllowanceChange = vi.fn();
      const handleSetupTimeChange = vi.fn();

      render(
        <StockSizingPanel
          partX={50}
          partY={50}
          partZ={25}
          partVolumeMm3={45000}
          allowanceMm={2.0}
          setupTimeMin={15.0}
          onAllowanceChange={handleAllowanceChange}
          onSetupTimeChange={handleSetupTimeChange}
        />
      );

      // Computed stock dimensions (50+4=54, 50+4=54, 25+2=27)
      expect(screen.getAllByText('54.0 mm').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('27.0 mm')).toBeInTheDocument();
      expect(screen.getByText(/Raw Billet Volume:/i)).toBeInTheDocument();
      expect(screen.getByText(/Material to Remove:/i)).toBeInTheDocument();

      // Sliders & inputs
      const allowanceInput = screen.getByDisplayValue('2');
      fireEvent.change(allowanceInput, { target: { value: '3.5' } });
      expect(handleAllowanceChange).toHaveBeenCalledWith(3.5);

      const setupInput = screen.getByDisplayValue('15');
      fireEvent.change(setupInput, { target: { value: '20' } });
      expect(handleSetupTimeChange).toHaveBeenCalledWith(20);
    });
  });

  describe('OperationConfigTable', () => {
    it('renders operations with speeds, feeds, and estimated power gauge', () => {
      const handleChangeOps = vi.fn();

      render(
        <OperationConfigTable
          operations={mockOperations}
          tools={mockTools}
          ratedPowerKw={22.4}
          spindleEfficiency={0.85}
          materialKc={700}
          onChangeOperations={handleChangeOps}
        />
      );

      expect(screen.getByText(/Face Milling/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('7958')).toBeInTheDocument(); // spindle RPM
      expect(screen.getByDisplayValue('716')).toBeInTheDocument(); // feed mm/min
      expect(screen.getByText(/0\.08\s*kW/)).toBeInTheDocument(); // calculated cutting power
    });
  });

  describe('EstimatesCard', () => {
    it('renders machining time, energy, and cost breakdown with honesty chip', () => {
      render(<EstimatesCard estimates={mockEstimates} />);

      // Machining time
      expect(screen.getByText('23.2')).toBeInTheDocument();
      // Energy
      expect(screen.getByText('0.043')).toBeInTheDocument();
      // Cost
      expect(screen.getAllByText(/567\.00/).length).toBeGreaterThanOrEqual(1);

      // Cost breakdown labels
      expect(screen.getByText(/Machine Hourly Usage/i)).toBeInTheDocument();
      expect(screen.getByText(/Raw Billet Stock Material/i)).toBeInTheDocument();
      expect(screen.getByText(/Cutting Tooling Wear/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Manufacturing Estimate/i)).toBeInTheDocument();

      // Honesty badge
      expect(screen.getAllByText(/Estimate/i).length).toBeGreaterThan(0);
      expect(
        screen.getByText(/Physics-based empirical estimation model/i)
      ).toBeInTheDocument();
    });
  });

  describe('CamWizard', () => {
    it('renders initial step and allows navigating through setup steps', () => {
      const handleSaved = vi.fn();
      const handleCancel = vi.fn();

      render(
        <CamWizard
          job={mockJob}
          version={mockVersion}
          material={mockMaterial}
          machines={mockMachines}
          tools={mockTools}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      );

      // Step 1: Part & Material
      expect(screen.getByText(/Step 1: CAD Part Geometry & Material Verification/i)).toBeInTheDocument();
      expect(screen.getByText(/CAD Model Extents/i)).toBeInTheDocument();
      expect(screen.getByText(/Aluminium 6061-T6/i)).toBeInTheDocument();

      // Click "Next Step" to advance to Step 2: Machine Profile
      const nextBtn = screen.getByRole('button', { name: /Next Step/i });
      fireEvent.click(nextBtn);

      expect(screen.getByText('Haas VF-2')).toBeInTheDocument();
      expect(screen.getByText('Benchtop Router Mini')).toBeInTheDocument();
    });
  });

  describe('Milestone 7 — ToolpathViewer & GCodePreviewModal (AC-23, AC-24)', () => {
    const mockToolpathGeometry: ToolpathGeometry = {
      camJobId: 'job-123',
      stock: { x: 54, y: 54, z: 27, safeZ: 5 },
      totalPathLengthMm: 350.5,
      totalCuttingLengthMm: 280.0,
      totalRapidLengthMm: 70.5,
      totalMoves: 3,
      totalCycleTimeS: 45.0,
      operations: [
        {
          seq: 1,
          opType: 'FACE',
          toolId: 't1',
          toolDiameterMm: 10,
          spindleRpm: 8000,
          feedMmMin: 700,
          plungeFeedMmMin: 200,
          apMm: 1.5,
          aeMm: 6,
          pathLengthMm: 350.5,
          cuttingLengthMm: 280,
          rapidLengthMm: 70.5,
          moveCount: 3,
          estTimeS: 45,
          points: [
            { x: 0, y: 0, z: 5, moveType: 'RAPID', f: 15000, s: 8000 },
            { x: 0, y: 0, z: 0, moveType: 'PLUNGE', f: 200, s: 8000 },
            { x: 50, y: 0, z: 0, moveType: 'FEED', f: 700, s: 8000 },
          ],
        },
      ],
    };

    it('renders ToolpathViewer with telemetry, legend, and scrub controls', () => {
      render(<ToolpathViewer toolpath={mockToolpathGeometry} />);

      // Playback controls
      expect(screen.getByRole('button', { name: /Play/i })).toBeInTheDocument();
      expect(screen.getAllByText(/Rapid/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Feed/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Plunge/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Arc/i).length).toBeGreaterThanOrEqual(1);

      // Aggregate Path stats
      expect(screen.getByText('350.5')).toBeInTheDocument();
      expect(screen.getByText('280.0')).toBeInTheDocument();
    });

    it('renders GCodePreviewModal with safety watermark and disables download when job is not ready (AC-23)', () => {
      const handleDownload = vi.fn();
      const handleClose = vi.fn();

      const draftJob: CamJob = {
        ...mockJob,
        status: 'DRAFT',
      };

      const sampleGCode =
        '%\nO0100 (BRACKET SETUP 1)\n(PROTOTYPE OUTPUT - NOT CERTIFIED PRODUCTION CODE)\nG90 G54 G17 G21\nM30\n%';

      render(
        <GCodePreviewModal
          isOpen={true}
          onClose={handleClose}
          camJob={draftJob}
          gcodeText={sampleGCode}
          onDownload={handleDownload}
        />
      );

      // Mandatory Prototype Watermark
      expect(screen.getByText(/SAFETY NOTICE:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/PROTOTYPE OUTPUT - NOT CERTIFIED PRODUCTION CODE/i).length).toBeGreaterThanOrEqual(1);

      // Code text is rendered
      expect(screen.getByText(/G90 G54 G17 G21/i)).toBeInTheDocument();

      // Download button is DISABLED because status is DRAFT (AC-23)
      const downloadBtn = screen.getByRole('button', { name: /Download \.NC File/i });
      expect(downloadBtn).toBeDisabled();
      expect(screen.getByText(/Download is disabled until toolpath passes validation \(AC-23\)/i)).toBeInTheDocument();

      fireEvent.click(downloadBtn);
      expect(handleDownload).not.toHaveBeenCalled();
    });

    it('enables G-Code download when job is TOOLPATH_READY (AC-24)', () => {
      const handleDownload = vi.fn();
      const handleClose = vi.fn();

      const readyJob: CamJob = {
        ...mockJob,
        status: 'TOOLPATH_READY',
      };

      const sampleGCode =
        '%\nO0100 (BRACKET SETUP 1)\n(PROTOTYPE OUTPUT - NOT CERTIFIED PRODUCTION CODE)\nG90 G54 G17 G21\nM30\n%';

      render(
        <GCodePreviewModal
          isOpen={true}
          onClose={handleClose}
          camJob={readyJob}
          gcodeText={sampleGCode}
          onDownload={handleDownload}
        />
      );

      // Download button is ENABLED because status is TOOLPATH_READY (AC-24)
      const downloadBtn = screen.getByRole('button', { name: /Download \.NC File/i });
      expect(downloadBtn).not.toBeDisabled();

      fireEvent.click(downloadBtn);
      expect(handleDownload).toHaveBeenCalledTimes(1);
    });
  });
});
