import React from "react";
import { cn } from "@/lib/utils";

export type HonestyLabelType =
  | "estimate"
  | "rule-based"
  | "prototype-output"
  | "sample-data"
  | "risk-indicator";

interface LabelChipProps {
  type: HonestyLabelType;
  className?: string;
  tooltip?: string;
}

const labelConfigs: Record<HonestyLabelType, { label: string; style: string }> = {
  estimate: {
    label: "Estimate",
    style: "bg-info/10 text-info border-info/30",
  },
  "rule-based": {
    label: "Rule-based recommendation",
    style: "bg-accent/10 text-accent border-accent/30",
  },
  "prototype-output": {
    label: "Prototype output — not for production",
    style: "bg-warning/10 text-warning border-warning/30",
  },
  "sample-data": {
    label: "Sample data",
    style: "bg-text-muted/15 text-text-2 border-border-strong",
  },
  "risk-indicator": {
    label: "Risk indicator — not collision guarantee",
    style: "bg-danger/10 text-danger border-danger/30",
  },
};

export const LabelChip: React.FC<LabelChipProps> = ({ type, className, tooltip }) => {
  const cfg = labelConfigs[type];

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-[2px] border text-[10px] font-condensed font-semibold uppercase tracking-wider select-none",
        cfg.style,
        className
      )}
      title={tooltip || cfg.label}
    >
      {cfg.label}
    </span>
  );
};
