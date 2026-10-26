import React from "react";
import { cn } from "@/lib/utils";

export type StatusType =
  // Preview
  | "PENDING"
  | "READY"
  | "FAILED"
  | "UNSUPPORTED"
  // CAM Job
  | "DRAFT"
  | "CONFIGURED"
  | "TOOLPATH_GENERATING"
  | "TOOLPATH_READY"
  | "TOOLPATH_FAILED"
  | "SIMULATED"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "STALE"
  // Simulation
  | "PASS"
  | "WARN"
  | "FAIL"
  // Finding
  | "INFO"
  // Integrity
  | "VERIFIED"
  | "MISMATCH";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  customLabel?: string;
}

interface StatusConfig {
  label: string;
  variant: "info" | "success" | "warning" | "danger" | "neutral";
  pulse?: boolean;
}

const statusMap: Record<StatusType, StatusConfig> = {
  // Preview
  PENDING: { label: "Processing", variant: "info", pulse: true },
  READY: { label: "Preview ready", variant: "success" },
  FAILED: { label: "Conversion failed", variant: "danger" },
  UNSUPPORTED: { label: "Preview unavailable", variant: "warning" },

  // CAM Job
  DRAFT: { label: "Draft", variant: "neutral" },
  CONFIGURED: { label: "Configured", variant: "info" },
  TOOLPATH_GENERATING: { label: "Generating", variant: "info", pulse: true },
  TOOLPATH_READY: { label: "Toolpath ready", variant: "info" },
  TOOLPATH_FAILED: { label: "Toolpath failed", variant: "danger" },
  SIMULATED: { label: "Simulated", variant: "info" },
  SUBMITTED: { label: "Awaiting approval", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
  STALE: { label: "Outdated (CAD changed)", variant: "warning" },

  // Simulation & Findings
  PASS: { label: "Pass", variant: "success" },
  WARN: { label: "Warnings", variant: "warning" },
  FAIL: { label: "Fail", variant: "danger" },
  INFO: { label: "Info", variant: "info" },

  // Integrity
  VERIFIED: { label: "SHA-256 verified", variant: "success" },
  MISMATCH: { label: "Integrity failure", variant: "danger" },
};

const variantStyles: Record<StatusConfig["variant"], { bg: string; dot: string; text: string }> = {
  info: {
    bg: "bg-info/10 border-info/30 text-info",
    dot: "bg-info",
    text: "text-info",
  },
  success: {
    bg: "bg-success/10 border-success/30 text-success",
    dot: "bg-success",
    text: "text-success",
  },
  warning: {
    bg: "bg-warning/10 border-warning/30 text-warning",
    dot: "bg-warning",
    text: "text-warning",
  },
  danger: {
    bg: "bg-danger/10 border-danger/30 text-danger",
    dot: "bg-danger",
    text: "text-danger",
  },
  neutral: {
    bg: "bg-text-muted/10 border-border-strong text-text-2",
    dot: "bg-text-muted",
    text: "text-text-2",
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, customLabel }) => {
  const cfg = statusMap[status] || { label: status, variant: "neutral" };
  const styles = variantStyles[cfg.variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] border text-[11px] font-condensed font-medium tracking-wide uppercase select-none",
        styles.bg,
        className
      )}
      role="status"
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          styles.dot,
          cfg.pulse && "animate-pulse"
        )}
        aria-hidden="true"
      />
      <span>{customLabel || cfg.label}</span>
    </span>
  );
};
