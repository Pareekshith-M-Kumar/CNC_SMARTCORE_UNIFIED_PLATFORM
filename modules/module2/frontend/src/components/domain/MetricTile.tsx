import React from "react";
import { cn } from "@/lib/utils";
import { LabelChip } from "./LabelChip";

interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  isEstimate?: boolean;
  hint?: string;
  className?: string;
  icon?: React.ReactNode;
}

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  unit,
  isEstimate = false,
  hint,
  className,
  icon,
}) => {
  return (
    <div
      className={cn(
        "bg-surface border border-border p-4 rounded-md corner-ticks flex flex-col justify-between transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-condensed font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        {isEstimate && <LabelChip type="estimate" />}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-mono font-medium text-text tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-mono text-text-2 uppercase">
            {unit}
          </span>
        )}
      </div>

      {hint && (
        <div className="text-[11px] text-text-muted mt-1.5 truncate" title={hint}>
          {hint}
        </div>
      )}
    </div>
  );
};
