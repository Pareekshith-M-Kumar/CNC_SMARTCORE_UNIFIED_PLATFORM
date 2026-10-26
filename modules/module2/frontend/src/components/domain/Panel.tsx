import React from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  title?: React.ReactNode;
  subtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  hasTicks?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  headerActions,
  children,
  className,
  bodyClassName,
  hasTicks = false,
}) => {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-md overflow-hidden",
        hasTicks && "corner-ticks",
        className
      )}
    >
      {(title || headerActions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-raised/40">
          <div>
            {typeof title === "string" ? (
              <h3 className="text-sm font-semibold text-text tracking-wide">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </div>
  );
};
