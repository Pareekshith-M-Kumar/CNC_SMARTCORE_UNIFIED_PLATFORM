import React from 'react';
import { MachineProfile } from '../types';
import { Cpu, AlertTriangle, CheckCircle2, Zap, Gauge } from 'lucide-react';
import { Chip } from '@/components/domain/Chip';

interface MachineSelectorProps {
  machines: MachineProfile[];
  selectedMachineId: string;
  onSelectMachine: (machineId: string) => void;
  partX?: number | null;
  partY?: number | null;
  partZ?: number | null;
  allowanceMm?: number;
}

export const MachineSelector: React.FC<MachineSelectorProps> = ({
  machines,
  selectedMachineId,
  onSelectMachine,
  partX = 0,
  partY = 0,
  partZ = 0,
  allowanceMm = 2.0,
}) => {
  const stockX = (partX || 0) + 2 * (allowanceMm || 0);
  const stockY = (partY || 0) + 2 * (allowanceMm || 0);
  const stockZ = (partZ || 0) + (allowanceMm || 0);

  return (
    <div className="space-y-3">
      <div className="text-xs font-mono uppercase text-text-muted tracking-wider">
        Select CNC Machine Workcenter
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {machines.map((machine) => {
          const isSelected = selectedMachineId === machine.id;
          const exceedsX = stockX > machine.travelXMm;
          const exceedsY = stockY > machine.travelYMm;
          const exceedsZ = stockZ > machine.travelZMm;
          const isOversized = exceedsX || exceedsY || exceedsZ;

          return (
            <div
              key={machine.id}
              onClick={() => {
                if (!isOversized) onSelectMachine(machine.id);
              }}
              className={`p-3.5 rounded-lg border text-left transition-all relative ${
                isOversized
                  ? 'border-danger/30 bg-danger/5 opacity-70 cursor-not-allowed'
                  : isSelected
                  ? 'border-accent bg-accent/10 shadow-sm cursor-pointer'
                  : 'border-border bg-surface-1 hover:bg-surface-2 cursor-pointer'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Cpu className={`w-4 h-4 ${isSelected ? 'text-accent' : 'text-text-muted'}`} />
                  <div>
                    <div className="font-mono font-bold text-xs text-text">{machine.name}</div>
                    <div className="text-[10px] font-mono text-text-muted">
                      Dialect: {machine.controllerDialect}
                    </div>
                  </div>
                </div>
                <Chip variant="neutral">{machine.travelXMm}×{machine.travelYMm}×{machine.travelZMm} mm</Chip>
              </div>

              {/* Machine Specs Grid */}
              <div className="grid grid-cols-3 gap-1.5 p-2 rounded bg-surface-base border border-border text-[11px] font-mono mb-2">
                <div>
                  <span className="text-[10px] text-text-muted block flex items-center gap-0.5">
                    <Gauge className="w-2.5 h-2.5 text-accent" /> MAX RPM
                  </span>
                  <span className="font-semibold text-text">{machine.maxRpm.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5 text-warning" /> POWER
                  </span>
                  <span className="font-semibold text-text">{machine.ratedPowerKw} kW</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">HOURLY RATE</span>
                  <span className="font-semibold text-text">₹{machine.machineRatePerHr}/hr</span>
                </div>
              </div>

              {/* Travel Envelope Compatibility Status */}
              {isOversized ? (
                <div className="flex items-center gap-1.5 text-xs text-danger font-mono pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Part envelope ({stockX.toFixed(0)}×{stockY.toFixed(0)}×{stockZ.toFixed(0)} mm) exceeds machine travel
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 text-[11px] font-mono text-success">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Travel Envelope OK</span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-mono font-bold text-accent uppercase">
                      Selected Machine
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
