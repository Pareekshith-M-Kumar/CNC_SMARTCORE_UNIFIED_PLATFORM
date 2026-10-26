import React from 'react';
import { Box, Layers, Crosshair, ArrowUpDown } from 'lucide-react';

interface StockSizingPanelProps {
  partX?: number | null;
  partY?: number | null;
  partZ?: number | null;
  partVolumeMm3?: number | null;
  allowanceMm: number;
  setupTimeMin: number;
  onAllowanceChange: (val: number) => void;
  onSetupTimeChange: (val: number) => void;
}

export const StockSizingPanel: React.FC<StockSizingPanelProps> = ({
  partX = 50,
  partY = 50,
  partZ = 25,
  partVolumeMm3 = 45000,
  allowanceMm,
  setupTimeMin,
  onAllowanceChange,
  onSetupTimeChange,
}) => {
  const pX = partX || 50;
  const pY = partY || 50;
  const pZ = partZ || 25;

  const stockX = pX + 2 * allowanceMm;
  const stockY = pY + 2 * allowanceMm;
  const stockZ = pZ + allowanceMm;

  const stockVolMm3 = stockX * stockY * stockZ;
  const pVolMm3 = partVolumeMm3 && partVolumeMm3 > 0 ? partVolumeMm3 : stockVolMm3 * 0.45;
  const removedVolMm3 = Math.max(0, stockVolMm3 - pVolMm3);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Input Controls */}
        <div className="p-4 rounded-lg bg-surface-1 border border-border space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium text-text uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-accent" />
                Uniform Stock Allowance (XY & Top)
              </span>
              <span className="text-accent font-bold font-mono">+{allowanceMm} mm</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="10.0"
              step="0.5"
              value={allowanceMm}
              onChange={(e) => onAllowanceChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-surface-base rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <div className="flex justify-between text-[10px] font-mono text-text-muted mt-1">
              <span>0.5 mm (Tight)</span>
              <span>2.0 mm (Standard)</span>
              <span>10.0 mm (Heavy Billet)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-text uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
                Fixturing & Setup Time
              </span>
              <span className="font-mono font-semibold text-text">{setupTimeMin} min</span>
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={setupTimeMin}
              onChange={(e) => onSetupTimeChange(Math.max(1, parseFloat(e.target.value) || 15))}
              className="w-full px-3 py-1.5 text-xs font-mono bg-surface-base border border-border rounded-md text-text focus:outline-none focus:border-accent"
            />
          </div>

          {/* WCS Zero Datum Info */}
          <div className="p-2.5 rounded bg-surface-base border border-border text-[11px] font-mono space-y-1">
            <div className="flex items-center gap-1.5 text-accent font-bold">
              <Crosshair className="w-3.5 h-3.5" />
              <span>WCS Work Coordinate System (G54)</span>
            </div>
            <div className="text-text-muted">
              X0 / Y0: Stock Top Minimum Corner | Z0: Stock Top Surface (Cutting Z &lt; 0)
            </div>
            <div className="text-text-muted">
              Safe Traverse Height: <span className="text-text font-semibold">Z = +5.0 mm</span>
            </div>
          </div>
        </div>

        {/* Right: Derived Bounding Box & Volumes */}
        <div className="p-4 rounded-lg bg-surface-1 border border-border space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-text-muted">
            Derived Raw Stock Dimensions
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded bg-surface-base border border-border text-center font-mono">
              <span className="text-[10px] text-text-muted block">Stock Width (X)</span>
              <span className="text-xs font-bold text-text">{stockX.toFixed(1)} mm</span>
              <span className="text-[9px] text-text-muted block">(+{2 * allowanceMm} mm)</span>
            </div>
            <div className="p-2 rounded bg-surface-base border border-border text-center font-mono">
              <span className="text-[10px] text-text-muted block">Stock Depth (Y)</span>
              <span className="text-xs font-bold text-text">{stockY.toFixed(1)} mm</span>
              <span className="text-[9px] text-text-muted block">(+{2 * allowanceMm} mm)</span>
            </div>
            <div className="p-2 rounded bg-surface-base border border-border text-center font-mono">
              <span className="text-[10px] text-text-muted block">Stock Height (Z)</span>
              <span className="text-xs font-bold text-text">{stockZ.toFixed(1)} mm</span>
              <span className="text-[9px] text-text-muted block">(+{allowanceMm} mm)</span>
            </div>
          </div>

          {/* Volumes Breakdown */}
          <div className="p-2.5 rounded bg-surface-base border border-border space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Raw Billet Volume:</span>
              <span className="font-semibold text-text">{(stockVolMm3 / 1000).toFixed(1)} cm³</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Finished Part Volume:</span>
              <span className="font-semibold text-text">{(pVolMm3 / 1000).toFixed(1)} cm³</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-border/60">
              <span className="text-accent font-semibold flex items-center gap-1">
                <Layers className="w-3 h-3" /> Material to Remove:
              </span>
              <span className="font-bold text-accent">{(removedVolMm3 / 1000).toFixed(1)} cm³</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
