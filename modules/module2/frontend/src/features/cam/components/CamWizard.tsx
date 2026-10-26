import React, { useState, useEffect, useCallback } from 'react';
import {
  MachineProfile,
  CuttingTool,
  CamJob,
  ToolpathOperation,
  CamEstimates,
} from '../types';
import { Material } from '@/features/materials/types';
import { CadVersion } from '@/features/design/types';
import { camApi } from '../api';
import { WorkflowStepper, WorkflowStep } from '@/components/domain/WorkflowStepper';
import { MachineSelector } from './MachineSelector';
import { StockSizingPanel } from './StockSizingPanel';
import { OperationConfigTable } from './OperationConfigTable';
import { EstimatesCard } from './EstimatesCard';
import { LabelChip } from '@/components/domain/LabelChip';
import { ArrowLeft, ArrowRight, Save, Layers, CheckCircle2, AlertTriangle, Box } from 'lucide-react';

interface CamWizardProps {
  job: CamJob;
  version: CadVersion;
  material?: Material | null;
  machines: MachineProfile[];
  tools: CuttingTool[];
  onSaved: (updatedJob: CamJob) => void;
  onCancel: () => void;
}

export const CamWizard: React.FC<CamWizardProps> = ({
  job,
  version,
  material,
  machines,
  tools,
  onSaved,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedMachineId, setSelectedMachineId] = useState<string>(job.machineId || machines[0]?.id || '');
  const [stockAllowanceMm, setStockAllowanceMm] = useState<number>(job.stockAllowanceMm || 2.0);
  const [setupTimeMin, setSetupTimeMin] = useState<number>(job.setupTimeMin || 15.0);
  const [operations, setOperations] = useState<ToolpathOperation[]>(job.operations || []);
  const [estimates, setEstimates] = useState<CamEstimates | null>(job.estimates || null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];

  const partX = version.bboxXMm || 50;
  const partY = version.bboxYMm || 50;
  const partZ = version.bboxZMm || 25;
  const partVol = version.volumeMm3 || 45000;

  // 6 Steps definition
  const steps: WorkflowStep[] = [
    { id: '1', label: 'Part & Material', status: currentStep > 1 ? 'complete' : currentStep === 1 ? 'active' : 'blocked' },
    { id: '2', label: 'Machine Profile', status: currentStep > 2 ? 'complete' : currentStep === 2 ? 'active' : 'blocked' },
    { id: '3', label: 'Stock Sizing', status: currentStep > 3 ? 'complete' : currentStep === 3 ? 'active' : 'blocked' },
    { id: '4', label: 'Operations & Tools', status: currentStep > 4 ? 'complete' : currentStep === 4 ? 'active' : 'blocked' },
    { id: '5', label: 'Speeds & Feeds', status: currentStep > 5 ? 'complete' : currentStep === 5 ? 'active' : 'blocked' },
    { id: '6', label: 'Review Estimates', status: currentStep === 6 ? 'active' : 'blocked' },
  ];

  // Live recalculate estimates whenever stock allowance, setup time, or operations change
  const refreshEstimates = useCallback(async () => {
    if (!job.id || operations.length === 0) return;
    setIsCalculating(true);
    try {
      const res = await camApi.calculateSandbox(job.id, {
        stockAllowanceMm,
        setupTimeMin,
        operations: operations.map((op) => ({
          seq: op.seq,
          opType: op.opType,
          toolId: op.toolId,
          spindleRpm: op.spindleRpm,
          feedMmMin: op.feedMmMin,
          plungeFeedMmMin: op.plungeFeedMmMin,
          apMm: op.apMm,
          aeMm: op.aeMm,
          finishAllowanceMm: op.finishAllowanceMm,
          parametersSource: op.parametersSource,
        })),
      });
      setEstimates(res);
    } catch {
      // Fallback local calculation
      computeLocalEstimates();
    } finally {
      setIsCalculating(false);
    }
  }, [job.id, stockAllowanceMm, setupTimeMin, operations]);

  const computeLocalEstimates = () => {
    const stockX = partX + 2 * stockAllowanceMm;
    const stockY = partY + 2 * stockAllowanceMm;
    const stockZ = partZ + stockAllowanceMm;
    const stockVol = stockX * stockY * stockZ;
    const removedVol = Math.max(100, stockVol - partVol);

    let totalMrr = 0;
    for (const op of operations) {
      totalMrr += op.apMm * op.aeMm * op.feedMmMin;
    }
    const avgMrr = operations.length > 0 ? totalMrr / operations.length : 12000;
    const cuttingMin = Math.round((removedVol / Math.max(500, avgMrr)) * 100) / 100;
    const rapidMin = Math.round(cuttingMin * 0.12 * 100) / 100;
    const toolChangeMin = Math.round((operations.length * (selectedMachine?.toolChangeS || 6.0) / 60) * 100) / 100;
    const totalMachiningMin = cuttingMin + rapidMin + toolChangeMin;

    const energyKwh = Math.round(((1.2 / 0.9 * cuttingMin * 60 + 0.8 * (totalMachiningMin - cuttingMin) * 60) / 3600) * 1000) / 1000;
    const machineCost = (selectedMachine?.machineRatePerHr || 600) * (totalMachiningMin / 60);
    const materialCost = (stockVol / 1000 * ((material?.densityKgM3 || 2700) / 1000) / 1000) * (material?.costPerKg || 350);
    const toolingCost = operations.length * 12.5;
    const setupCost = (selectedMachine?.machineRatePerHr || 600) * (setupTimeMin / 60);
    const energyCost = energyKwh * 8.5;
    const total = machineCost + materialCost + toolingCost + setupCost + energyCost;

    setEstimates({
      label: 'Estimate',
      inputs: { removedVolumeMm3: removedVol, stockVolumeMm3: stockVol, mrrMm3PerMin: avgMrr },
      time: { cuttingMin, rapidMin, toolChangeMin, setupMin: setupTimeMin, totalMachiningMin },
      energyKwh,
      cost: {
        machine: Math.round(machineCost * 100) / 100,
        material: Math.round(materialCost * 100) / 100,
        tooling: Math.round(toolingCost * 100) / 100,
        setup: Math.round(setupCost * 100) / 100,
        energy: Math.round(energyCost * 100) / 100,
        total: Math.round(total * 100) / 100,
        currency: 'INR',
      },
      warnings: [],
      calculatedAt: new Date().toISOString(),
    });
  };

  useEffect(() => {
    refreshEstimates();
  }, [stockAllowanceMm, setupTimeMin, operations.length]);

  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await camApi.configureCamJob(job.id, {
        stockAllowanceMm,
        setupTimeMin,
        operations: operations.map((op) => ({
          seq: op.seq,
          opType: op.opType,
          toolId: op.toolId,
          spindleRpm: op.spindleRpm,
          feedMmMin: op.feedMmMin,
          plungeFeedMmMin: op.plungeFeedMmMin,
          apMm: op.apMm,
          aeMm: op.aeMm,
          finishAllowanceMm: op.finishAllowanceMm,
          parametersSource: op.parametersSource,
        })),
      });
      onSaved(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save CAM configuration.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Check if machine travel allows part + stock
  const stockX = partX + 2 * stockAllowanceMm;
  const stockY = partY + 2 * stockAllowanceMm;
  const stockZ = partZ + stockAllowanceMm;
  const isOversized =
    selectedMachine &&
    (stockX > selectedMachine.travelXMm ||
      stockY > selectedMachine.travelYMm ||
      stockZ > selectedMachine.travelZMm);

  return (
    <div className="space-y-6">
      {/* Wizard Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-text">CAM Setup Wizard — {job.name}</h2>
            <LabelChip type="rule-based" />
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Configure machine kinematics, tool parameters, stock allowances, and cycle estimates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-mono text-text-muted hover:text-text hover:bg-surface-2 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving || isOversized}
            onClick={handleSaveConfiguration}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-accent-fg text-xs font-mono font-bold rounded-md shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Stepper */}
      <WorkflowStepper steps={steps} currentStepId={String(currentStep)} />

      {error && (
        <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs rounded-md font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Content */}
      <div className="p-5 rounded-lg border border-border bg-surface-base min-h-[360px]">
        {/* Step 1: Part & Material Overview */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="text-xs font-mono uppercase text-text-muted tracking-wider">
              Step 1: CAD Part Geometry & Material Verification
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-surface-1 border border-border space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <Box className="w-4 h-4 text-accent" />
                  <span>CAD Model Extents (Bounding Box)</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="p-2 rounded bg-surface-base border border-border">
                    <span className="text-[10px] text-text-muted block">X (Width)</span>
                    <span className="font-bold text-text">{partX.toFixed(1)} mm</span>
                  </div>
                  <div className="p-2 rounded bg-surface-base border border-border">
                    <span className="text-[10px] text-text-muted block">Y (Depth)</span>
                    <span className="font-bold text-text">{partY.toFixed(1)} mm</span>
                  </div>
                  <div className="p-2 rounded bg-surface-base border border-border">
                    <span className="text-[10px] text-text-muted block">Z (Height)</span>
                    <span className="font-bold text-text">{partZ.toFixed(1)} mm</span>
                  </div>
                </div>
                <div className="pt-2 text-text-muted text-[11px]">
                  Mesh Volume: <span className="text-text font-semibold">{(partVol / 1000).toFixed(1)} cm³</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-surface-1 border border-border space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-text font-bold text-sm">
                  <Layers className="w-4 h-4 text-accent" />
                  <span>Selected Material Alloy</span>
                </div>
                {material ? (
                  <div className="space-y-2 pt-1">
                    <div className="text-sm font-bold text-accent">{material.code} — {material.name}</div>
                    <div className="text-[11px] text-text-muted">
                      Density: <span className="text-text">{material.densityKgM3} kg/m³</span> |
                      kc: <span className="text-text">{material.kcNPerMm2} N/mm²</span> |
                      Cost: <span className="text-text">₹{material.costPerKg}/kg</span>
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Carbide Cutting Speed (Vc): <span className="text-text">{material.vcMinMPerMin}–{material.vcMaxMPerMin} m/min</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-warning border border-warning/30 rounded bg-warning/5 text-xs">
                    No material specified. Defaulting to Aluminium 6061-T6 parameters.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Machine Selection */}
        {currentStep === 2 && (
          <MachineSelector
            machines={machines}
            selectedMachineId={selectedMachineId}
            onSelectMachine={setSelectedMachineId}
            partX={partX}
            partY={partY}
            partZ={partZ}
            allowanceMm={stockAllowanceMm}
          />
        )}

        {/* Step 3: Stock Sizing & Datum */}
        {currentStep === 3 && (
          <StockSizingPanel
            partX={partX}
            partY={partY}
            partZ={partZ}
            partVolumeMm3={partVol}
            allowanceMm={stockAllowanceMm}
            setupTimeMin={setupTimeMin}
            onAllowanceChange={setStockAllowanceMm}
            onSetupTimeChange={setSetupTimeMin}
          />
        )}

        {/* Step 4 & 5: Operations & Speeds/Feeds */}
        {(currentStep === 4 || currentStep === 5) && (
          <div className="space-y-4">
            <OperationConfigTable
              operations={operations}
              tools={tools}
              ratedPowerKw={selectedMachine?.ratedPowerKw || 15.0}
              spindleEfficiency={selectedMachine?.spindleEfficiency || 0.8}
              materialKc={material?.kcNPerMm2 || 700.0}
              onChangeOperations={setOperations}
            />
          </div>
        )}

        {/* Step 6: Review Estimates */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <div className="text-xs font-mono uppercase text-text-muted tracking-wider">
              Step 6: Engineering Estimates & Process Feasibility Review
            </div>
            <EstimatesCard estimates={estimates} isLoading={isCalculating} />
          </div>
        )}
      </div>

      {/* Wizard Footer Step Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          disabled={currentStep === 1}
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-mono text-text hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous Step</span>
        </button>

        <div className="text-xs font-mono text-text-muted">
          Step {currentStep} of {steps.length}
        </div>

        {currentStep < 6 ? (
          <button
            type="button"
            disabled={currentStep === 2 && isOversized}
            onClick={() => setCurrentStep((prev) => Math.min(6, prev + 1))}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-accent hover:bg-accent-hover disabled:opacity-40 text-accent-fg text-xs font-mono font-bold shadow-xs transition-colors"
          >
            <span>Next Step</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveConfiguration}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-success hover:bg-success/90 disabled:opacity-40 text-white text-xs font-mono font-bold shadow-xs transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Complete & Save CAM Job</span>
          </button>
        )}
      </div>
    </div>
  );
};
