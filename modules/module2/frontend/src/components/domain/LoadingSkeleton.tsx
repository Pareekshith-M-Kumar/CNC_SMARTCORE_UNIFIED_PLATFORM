import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn("animate-pulse bg-raised rounded-[2px]", className)}
      aria-hidden="true"
    />
  );
};

export const LoadingSkeleton: React.FC<{ variant?: "card" | "table" | "panel" | "tile" }> = ({
  variant = "card",
}) => {
  if (variant === "tile") {
    return (
      <div className="bg-surface border border-border p-4 rounded-md space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="bg-surface border border-border rounded-md p-4 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-border">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-24" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-4 items-center py-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-md p-6 space-y-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="pt-2 flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
};
