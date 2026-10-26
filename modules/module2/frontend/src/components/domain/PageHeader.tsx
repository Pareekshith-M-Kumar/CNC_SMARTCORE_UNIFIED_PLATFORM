import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  category?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  category,
  description,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border mb-6",
        className
      )}
    >
      <div>
        {category && (
          <div className="text-[11px] uppercase font-condensed tracking-wider text-text-muted mb-0.5">
            {category}
          </div>
        )}
        <h1 className="text-xl md:text-2xl font-condensed font-semibold text-text tracking-wide">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-text-2 mt-1 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
};
