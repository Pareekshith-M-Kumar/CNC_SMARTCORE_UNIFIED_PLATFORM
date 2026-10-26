import React from "react";
import { Check } from "lucide-react";

export interface LifecycleStep {
  id: string;
  label: string;
  status: "complete" | "current" | "upcoming" | "failed";
}

const DEFAULT_STEPS: LifecycleStep[] = [
  { id: "design", label: "Design", status: "complete" },
  { id: "material", label: "Material", status: "complete" },
  { id: "cam", label: "CAM", status: "complete" },
  { id: "simulation", label: "Simulation", status: "complete" },
  { id: "approval", label: "Approval", status: "complete" },
  { id: "order", label: "Order", status: "current" },
  { id: "shipment", label: "Shipment", status: "upcoming" },
  { id: "delivered", label: "Delivered", status: "upcoming" },
  { id: "registered", label: "Registered", status: "upcoming" },
  { id: "monitored", label: "Monitored", status: "upcoming" },
];

export const LifecycleStepper: React.FC<{ steps?: LifecycleStep[] }> = ({ steps = DEFAULT_STEPS }) => {
  return (
    <div className="w-full bg-surface border border-border rounded-md p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 border-b border-border pb-2.5">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold">
            Digital-to-Physical Thread
          </span>
          <span className="text-xs text-text-muted">· 10-Step Traceability Lifecycle</span>
        </div>
        <span className="text-[10px] font-mono text-text-muted bg-canvas px-2 py-0.5 rounded border border-border">
          SHA-256 PINNED
        </span>
      </div>

      {/* Responsive Horizontal Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        {steps.map((step, idx) => {
          const isComplete = step.status === "complete";
          const isCurrent = step.status === "current";
          const isFailed = step.status === "failed";

          return (
            <div
              key={step.id}
              className={`flex flex-col p-2.5 rounded border transition-all ${
                isCurrent
                  ? "bg-accent/10 border-accent text-accent shadow-sm ring-1 ring-accent/30"
                  : isComplete
                  ? "bg-canvas border-border text-text"
                  : isFailed
                  ? "bg-danger/10 border-danger text-danger"
                  : "bg-canvas/50 border-border/50 text-text-muted"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono opacity-70">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                {isComplete && <Check className="w-3.5 h-3.5 text-success" />}
                {isCurrent && <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />}
              </div>

              <span className="text-xs font-medium tracking-tight truncate">
                {step.label}
              </span>

              <span className="text-[9px] font-mono uppercase mt-1 opacity-70">
                {step.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
