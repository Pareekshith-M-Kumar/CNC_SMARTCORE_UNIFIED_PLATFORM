import React from "react";
import { cn } from "@/lib/utils";
import { Check, Lock } from "lucide-react";

export interface WorkflowStep {
  id: string;
  label: string;
  status: "complete" | "active" | "blocked" | "error";
  blockedReason?: string;
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  currentStepId?: string;
  onStepClick?: (stepId: string) => void;
  className?: string;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  steps,
  currentStepId,
  onStepClick,
  className,
}) => {
  return (
    <nav
      aria-label="Workflow progress"
      className={cn("w-full bg-surface border border-border rounded-md p-3", className)}
    >
      <ol className="flex items-center justify-between gap-2 overflow-x-auto">
        {steps.map((step, idx) => {
          const isCurrent = step.id === currentStepId || step.status === "active";
          const isComplete = step.status === "complete";
          const isBlocked = step.status === "blocked";
          const isError = step.status === "error";

          return (
            <li
              key={step.id}
              className="flex items-center gap-2 shrink-0 group relative"
            >
              <button
                type="button"
                onClick={() => !isBlocked && onStepClick?.(step.id)}
                disabled={isBlocked}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-condensed tracking-wide transition-all border",
                  isCurrent && "border-accent/40 bg-accent/10 text-accent font-semibold shadow-sm",
                  isComplete && "border-success/30 bg-success/10 text-success hover:bg-success/15",
                  isBlocked && "border-border text-text-muted cursor-not-allowed opacity-60",
                  isError && "border-danger/40 bg-danger/10 text-danger",
                  !isCurrent && !isComplete && !isBlocked && !isError && "border-border text-text-2 hover:bg-raised"
                )}
                title={isBlocked ? step.blockedReason || "Step is locked" : undefined}
                aria-current={isCurrent ? "step" : undefined}
              >
                {/* Step indicator icon or number */}
                <span
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0",
                    isCurrent && "bg-accent text-accent-fg font-bold",
                    isComplete && "bg-success text-white font-bold",
                    isBlocked && "bg-raised border border-border text-text-muted",
                    isError && "bg-danger text-white",
                    !isCurrent && !isComplete && !isBlocked && !isError && "bg-raised text-text-2"
                  )}
                >
                  {isComplete ? (
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  ) : isBlocked ? (
                    <Lock className="w-2.5 h-2.5" />
                  ) : (
                    idx + 1
                  )}
                </span>

                <span className="uppercase">{step.label}</span>
              </button>

              {/* Connecting line */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "w-4 h-[1px]",
                    isComplete ? "bg-success/40" : "bg-border-strong"
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
