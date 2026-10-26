import React from "react";
import { SimulationStats } from "../types";
import { Zap, Clock, Compass, Layers } from "lucide-react";

interface StatsPanelProps {
  stats?: SimulationStats;
  rulesetVersion?: string;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  stats,
  rulesetVersion = "sim-1.0",
}) => {
  if (!stats) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}m ${rem}s`;
  };

  const powerColor =
    stats.powerUtilizationPct > 100
      ? "bg-destructive text-destructive"
      : stats.powerUtilizationPct > 80
      ? "bg-warning text-warning"
      : "bg-emerald-500 text-emerald-400";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* 1. Cycle Time */}
      <div className="bg-raised border border-border rounded-lg p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <Clock className="w-3.5 h-3.5 text-accent" />
          <span>Total Cycle Time</span>
        </div>
        <div className="text-base font-bold font-mono text-text">
          {formatTime(stats.totalCycleTimeS)}
        </div>
        <div className="text-[10px] text-text-muted">
          {stats.totalMoves} programmed blocks
        </div>
      </div>

      {/* 2. Spindle Power */}
      <div className="bg-raised border border-border rounded-lg p-3 space-y-1">
        <div className="flex items-center justify-between text-[11px] text-text-muted">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Spindle Power</span>
          </div>
          <span className="font-mono text-[10px] font-semibold">{stats.powerUtilizationPct}%</span>
        </div>
        <div className="text-base font-bold font-mono text-text">
          {stats.maxPowerKw.toFixed(2)} <span className="text-xs font-normal text-text-muted">kW</span>
        </div>
        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full ${powerColor.split(" ")[0]} transition-all`}
            style={{ width: `${Math.min(100, stats.powerUtilizationPct)}%` }}
          />
        </div>
      </div>

      {/* 3. Distance Breakdown */}
      <div className="bg-raised border border-border rounded-lg p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <Compass className="w-3.5 h-3.5 text-teal-400" />
          <span>Path Breakdown</span>
        </div>
        <div className="text-base font-bold font-mono text-text">
          {(stats.totalPathLengthMm / 1000).toFixed(2)}{" "}
          <span className="text-xs font-normal text-text-muted">m</span>
        </div>
        <div className="text-[10px] text-text-muted flex items-center gap-1.5 font-mono">
          <span className="text-teal-400">Cut: {(stats.totalCuttingLengthMm / 1000).toFixed(1)}m</span>
          <span>•</span>
          <span className="text-amber-400">Rapid: {(stats.totalRapidLengthMm / 1000).toFixed(1)}m</span>
        </div>
      </div>

      {/* 4. Maximum Depth */}
      <div className="bg-raised border border-border rounded-lg p-3 space-y-1">
        <div className="flex items-center justify-between text-[11px] text-text-muted">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Max Depth (Z)</span>
          </div>
          <span className="text-[9px] font-mono bg-surface border border-border px-1 py-0.2 rounded text-text-muted">
            {rulesetVersion}
          </span>
        </div>
        <div className="text-base font-bold font-mono text-text">
          -{stats.maxDepthEngagedMm.toFixed(2)}{" "}
          <span className="text-xs font-normal text-text-muted">mm</span>
        </div>
        <div className="text-[10px] text-text-muted">Floor margin safely checked</div>
      </div>
    </div>
  );
};
