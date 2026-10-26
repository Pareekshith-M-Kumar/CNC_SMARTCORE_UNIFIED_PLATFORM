import React from 'react';
import { CamEstimates } from '../types';
import { LabelChip } from '@/components/domain/LabelChip';
import { Clock, Zap, DollarSign, AlertTriangle, Layers, Cpu, Wrench } from 'lucide-react';

interface EstimatesCardProps {
  estimates?: CamEstimates | null;
  isLoading?: boolean;
}

export const EstimatesCard: React.FC<EstimatesCardProps> = ({
  estimates,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="p-6 rounded-lg bg-surface-1 border border-border text-center font-mono text-xs text-text-muted animate-pulse">
        Computing engineering estimates (cycle time, energy, cost breakdown)...
      </div>
    );
  }

  if (!estimates) {
    return (
      <div className="p-6 rounded-lg bg-surface-1 border border-dashed border-border text-center font-mono text-xs text-text-muted">
        Configure operations to compute time, energy, and cost estimates.
      </div>
    );
  }

  const { time, cost, energyKwh, warnings } = estimates;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-surface-1 border border-border">
        <div className="flex items-center gap-2">
          <LabelChip type="estimate" />
          <span className="text-xs font-mono text-text-muted">
            Physics-based empirical estimation model
          </span>
        </div>
        <div className="text-[10px] font-mono text-text-muted">
          Updated: {new Date(estimates.calculatedAt).toLocaleTimeString()}
        </div>
      </div>

      {/* 3 Metric Header Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Machining Cycle Time */}
        <div className="p-3.5 rounded-lg bg-surface-1 border border-border space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-text-muted">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-info" />
              Total Cycle Time
            </span>
            <LabelChip type="estimate" />
          </div>
          <div className="font-mono text-2xl font-black text-text">
            {time.totalMachiningMin.toFixed(1)} <span className="text-xs font-normal text-text-muted">min</span>
          </div>
          <div className="text-[10px] font-mono text-text-muted">
            Cutting: {time.cuttingMin}m | Rapid: {time.rapidMin}m | Setup: {time.setupMin}m
          </div>
        </div>

        {/* Spindle Energy */}
        <div className="p-3.5 rounded-lg bg-surface-1 border border-border space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-text-muted">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-warning" />
              Electrical Energy
            </span>
            <LabelChip type="estimate" />
          </div>
          <div className="font-mono text-2xl font-black text-text">
            {energyKwh.toFixed(3)} <span className="text-xs font-normal text-text-muted">kWh</span>
          </div>
          <div className="text-[10px] font-mono text-text-muted">
            Active spindle drive + idle power
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="p-3.5 rounded-lg bg-surface-1 border border-border space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-text-muted">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-success" />
              Estimated Cost
            </span>
            <LabelChip type="estimate" />
          </div>
          <div className="font-mono text-2xl font-black text-accent">
            ₹ {cost.total.toFixed(2)}
          </div>
          <div className="text-[10px] font-mono text-text-muted">
            Machine + Billet + Tooling + Energy
          </div>
        </div>
      </div>

      {/* Cost Breakdown Details */}
      <div className="p-4 rounded-lg bg-surface-1 border border-border space-y-3 font-mono text-xs">
        <div className="text-xs uppercase tracking-wider text-text-muted font-bold flex items-center justify-between">
          <span>Manufacturing Cost Breakdown</span>
          <span className="text-[10px] font-normal text-text-muted">INR (₹)</span>
        </div>

        <div className="space-y-1.5 divide-y divide-border/60">
          <div className="flex items-center justify-between pt-1">
            <span className="text-text-muted flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-info" /> Machine Hourly Usage
            </span>
            <span className="text-text font-semibold">₹ {cost.machine.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between pt-1.5">
            <span className="text-text-muted flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-accent" /> Raw Billet Stock Material
            </span>
            <span className="text-text font-semibold">₹ {cost.material.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between pt-1.5">
            <span className="text-text-muted flex items-center gap-1.5">
              <Wrench className="w-3 h-3 text-warning" /> Cutting Tooling Wear
            </span>
            <span className="text-text font-semibold">₹ {cost.tooling.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between pt-1.5">
            <span className="text-text-muted flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-text-muted" /> Operator & Fixture Setup
            </span>
            <span className="text-text font-semibold">₹ {cost.setup.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between pt-1.5">
            <span className="text-text-muted flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-warning" /> Electrical Energy Tariff
            </span>
            <span className="text-text font-semibold">₹ {cost.energy.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border font-bold text-sm">
            <span className="text-text">Total Manufacturing Estimate</span>
            <span className="text-accent">₹ {cost.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Warnings List */}
      {warnings && warnings.length > 0 && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-warning">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Process Feasibility Cautions</span>
          </div>
          {warnings.map((w, idx) => (
            <div key={idx} className="text-[11px] font-mono text-warning/90 pl-5">
              • {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
