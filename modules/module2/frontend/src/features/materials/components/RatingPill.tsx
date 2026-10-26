import React from 'react';

interface RatingPillProps {
  value: number; // 1 to 5
  max?: number;
  label?: string;
  inverted?: boolean; // If true, lower is better (e.g., cost level)
}

export const RatingPill: React.FC<RatingPillProps> = ({
  value,
  max = 5,
  label,
  inverted = false,
}) => {
  const normalized = Math.max(1, Math.min(max, value));
  
  // For standard ratings: 5 is best (green), 1 is lowest (neutral/red)
  // For inverted ratings: 1 is best (cheapest)
  const getDotColor = (index: number) => {
    if (index >= normalized) return 'bg-border';
    if (inverted) {
      if (normalized <= 2) return 'bg-emerald-400';
      if (normalized === 3) return 'bg-amber-400';
      return 'bg-rose-400';
    } else {
      if (normalized >= 4) return 'bg-emerald-400';
      if (normalized === 3) return 'bg-amber-400';
      return 'bg-zinc-400';
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 font-mono text-xs" title={`${label ? label + ': ' : ''}${value}/${max}`}>
      {label && <span className="text-[10px] uppercase text-text-muted mr-0.5">{label}</span>}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-3 rounded-xs transition-colors ${getDotColor(i)}`}
          />
        ))}
      </div>
      <span className="text-[11px] font-semibold text-text ml-0.5">{value}</span>
    </div>
  );
};
