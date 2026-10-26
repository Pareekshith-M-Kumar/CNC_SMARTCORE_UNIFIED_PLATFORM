import React from "react";
import { cn } from "@/lib/utils";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 border border-dashed border-border-strong rounded-md bg-raised/30",
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-raised border border-border flex items-center justify-center text-text-muted mb-3">
        {icon || <FolderOpen className="w-5 h-5" />}
      </div>
      <h3 className="text-sm font-semibold text-text tracking-wide mb-1">{title}</h3>
      <p className="text-xs text-text-muted max-w-sm mb-4 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg font-medium rounded-md transition-colors shadow-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
