import React from 'react';
import { CuttingTool, ToolpathOperation } from '../types';
import { Plus, Trash2, Zap, Wrench } from 'lucide-react';
import { Chip } from '@/components/domain/Chip';

interface OperationConfigTableProps {
  operations: ToolpathOperation[];
  tools: CuttingTool[];
  ratedPowerKw?: number;
  spindleEfficiency?: number;
  materialKc?: number;
  onChangeOperations: (updated: ToolpathOperation[]) => void;
}

const OP_TYPES = [
  { id: 'FACE', label: 'Face Milling' },
  { id: 'ROUGH_POCKET', label: 'Rough Pocket / Cavity' },
  { id: 'CONTOUR', label: 'Profile / Contour Finish' },
  { id: 'DRILL', label: 'Hole Drilling' },
];

export const OperationConfigTable: React.FC<OperationConfigTableProps> = ({
  operations,
  tools,
  ratedPowerKw = 15.0,
  spindleEfficiency = 0.80,
  materialKc = 700.0,
  onChangeOperations,
}) => {
  const handleUpdateOp = (index: number, field: keyof ToolpathOperation, value: unknown) => {
    const updated = [...operations];
    updated[index] = {
      ...updated[index],
      [field]: value,
      parametersSource: 'EDITED',
    };
    onChangeOperations(updated);
  };

  const handleAddOp = () => {
    const defaultTool = tools[0] || { id: 'default', diameterMm: 10 };
    const newSeq = operations.length + 1;
    const newOp: ToolpathOperation = {
      seq: newSeq,
      opType: 'ROUGH_POCKET',
      toolId: defaultTool.id,
      spindleRpm: 8000,
      feedMmMin: 700,
      plungeFeedMmMin: 210,
      apMm: 4.0,
      aeMm: 4.0,
      finishAllowanceMm: 0.3,
      parametersSource: 'EDITED',
    };
    onChangeOperations([...operations, newOp]);
  };

  const handleDeleteOp = (index: number) => {
    const filtered = operations.filter((_, i) => i !== index);
    // Re-sequence
    const resequenced = filtered.map((op, i) => ({ ...op, seq: i + 1 }));
    onChangeOperations(resequenced);
  };

  // Helper to compute local operation cutting power
  const computeOpPower = (ap: number, ae: number, vf: number) => {
    const power = (ap * ae * vf * materialKc) / (60 * 1_000_000 * spindleEfficiency);
    return Math.round(power * 100) / 100;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-accent" />
          <span>Sequential Machining Operations ({operations.length})</span>
        </div>
        <button
          type="button"
          onClick={handleAddOp}
          className="flex items-center gap-1 px-2.5 py-1 bg-surface-2 hover:bg-surface-3 border border-border text-xs font-mono text-text rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Operation</span>
        </button>
      </div>

      <div className="overflow-x-auto border border-border rounded-lg bg-surface-base">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-1 text-text-muted font-mono uppercase text-[10px] tracking-wider">
              <th className="py-2 px-2.5 text-center">#</th>
              <th className="py-2 px-2.5">Operation</th>
              <th className="py-2 px-2.5">Tool</th>
              <th className="py-2 px-2 text-right">RPM</th>
              <th className="py-2 px-2 text-right">Feed (mm/min)</th>
              <th className="py-2 px-2 text-right">Plunge</th>
              <th className="py-2 px-2 text-right">ap (mm)</th>
              <th className="py-2 px-2 text-right">ae (mm)</th>
              <th className="py-2 px-2.5 text-center">Spindle Load</th>
              <th className="py-2 px-2 text-center">Source</th>
              <th className="py-2 px-2 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {operations.map((op, idx) => {
              const powerKw = computeOpPower(op.apMm, op.aeMm, op.feedMmMin);
              const loadPercent = Math.round((powerKw / ratedPowerKw) * 100);
              const isOverload = loadPercent > 100;
              const isHighLoad = loadPercent > 80;

              return (
                <tr key={idx} className="hover:bg-surface-1 transition-colors">
                  <td className="py-2 px-2.5 text-center font-mono font-bold text-text-muted">
                    {op.seq}
                  </td>

                  {/* Op Type */}
                  <td className="py-2 px-2.5">
                    <select
                      value={op.opType}
                      onChange={(e) => handleUpdateOp(idx, 'opType', e.target.value)}
                      className="py-1 px-2 text-xs font-mono bg-surface-1 border border-border rounded text-text focus:outline-none focus:border-accent"
                    >
                      {OP_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Tool Selection */}
                  <td className="py-2 px-2.5">
                    <select
                      value={op.toolId}
                      onChange={(e) => handleUpdateOp(idx, 'toolId', e.target.value)}
                      className="py-1 px-2 text-xs font-mono bg-surface-1 border border-border rounded text-text max-w-[170px] truncate focus:outline-none focus:border-accent"
                    >
                      {tools.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (Ø{t.diameterMm}mm)
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* RPM */}
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min="100"
                      max="30000"
                      step="100"
                      value={op.spindleRpm}
                      onChange={(e) => handleUpdateOp(idx, 'spindleRpm', parseInt(e.target.value) || 100)}
                      className="w-16 py-1 px-1.5 text-xs text-right font-mono bg-surface-1 border border-border rounded text-text focus:outline-none focus:border-accent"
                    />
                  </td>

                  {/* Feed */}
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min="10"
                      max="20000"
                      step="10"
                      value={op.feedMmMin}
                      onChange={(e) => handleUpdateOp(idx, 'feedMmMin', parseFloat(e.target.value) || 10)}
                      className="w-16 py-1 px-1.5 text-xs text-right font-mono bg-surface-1 border border-border rounded text-text focus:outline-none focus:border-accent"
                    />
                  </td>

                  {/* Plunge Feed */}
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min="5"
                      max="5000"
                      step="10"
                      value={op.plungeFeedMmMin}
                      onChange={(e) => handleUpdateOp(idx, 'plungeFeedMmMin', parseFloat(e.target.value) || 10)}
                      className="w-14 py-1 px-1.5 text-xs text-right font-mono bg-surface-1 border border-border rounded text-text focus:outline-none focus:border-accent"
                    />
                  </td>

                  {/* ap Depth */}
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min="0.1"
                      max="50"
                      step="0.5"
                      value={op.apMm}
                      onChange={(e) => handleUpdateOp(idx, 'apMm', parseFloat(e.target.value) || 1)}
                      className="w-14 py-1 px-1.5 text-xs text-right font-mono bg-surface-1 border border-border rounded text-text focus:outline-none focus:border-accent"
                    />
                  </td>

                  {/* ae Width */}
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min="0.1"
                      max="50"
                      step="0.5"
                      value={op.aeMm}
                      onChange={(e) => handleUpdateOp(idx, 'aeMm', parseFloat(e.target.value) || 1)}
                      className="w-14 py-1 px-1.5 text-xs text-right font-mono bg-surface-1 border border-border rounded text-text focus:outline-none focus:border-accent"
                    />
                  </td>

                  {/* Spindle Load */}
                  <td className="py-2 px-2.5 text-center font-mono">
                    <div
                      className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded ${
                        isOverload
                          ? 'bg-danger/20 text-danger border border-danger/40'
                          : isHighLoad
                          ? 'bg-warning/20 text-warning border border-warning/40'
                          : 'bg-surface-2 text-text-muted'
                      }`}
                      title={`${powerKw} kW / ${ratedPowerKw} kW`}
                    >
                      <Zap className="w-2.5 h-2.5" />
                      <span>{powerKw} kW ({loadPercent}%)</span>
                    </div>
                  </td>

                  {/* Provenance */}
                  <td className="py-2 px-2 text-center">
                    <Chip variant={op.parametersSource === 'CALCULATED' ? 'accent' : 'neutral'}>
                      {op.parametersSource === 'CALCULATED' ? 'Calc' : 'Edit'}
                    </Chip>
                  </td>

                  {/* Delete */}
                  <td className="py-2 px-2 text-center">
                    {operations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteOp(idx)}
                        className="p-1 text-text-muted hover:text-danger rounded hover:bg-surface-2 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
