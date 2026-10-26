import React from "react";
import { cn } from "@/lib/utils";

interface ChipProps {
  children: React.ReactNode;
  className?: string;
  variant?: "neutral" | "accent" | "mono";
}

export const Chip: React.FC<ChipProps> = ({ children, className, variant = "neutral" }) => {
  const variantStyles = {
    neutral: "bg-surface border-border-strong text-text-2",
    accent: "bg-accent/15 border-accent/40 text-accent font-medium",
    mono: "bg-viewport border-border text-text font-mono",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-[2px] border text-xs font-condensed tracking-wide select-none",
        variantStyles,
        className
      )}
    >
      {children}
    </span>
  );
};
