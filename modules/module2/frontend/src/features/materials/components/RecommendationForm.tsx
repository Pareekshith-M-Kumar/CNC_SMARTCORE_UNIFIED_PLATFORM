import React, { useState } from 'react';
import {
  MaterialRecommendationRequest,
  Priority,
  Environment,
  ApplicationType,
} from '../types';
import { Sliders, Sparkles } from 'lucide-react';

interface RecommendationFormProps {
  onSubmit: (request: MaterialRecommendationRequest) => void;
  isLoading?: boolean;
}

const PRIORITIES: { id: Priority; label: string; desc: string }[] = [
  { id: 'BALANCED', label: 'Balanced', desc: 'Equal weighting across mechanical, machining, and cost factors' },
  { id: 'STRENGTH', label: 'High Strength', desc: 'Prioritize load-bearing yield strength & rigidity' },
  { id: 'WEIGHT', label: 'Lightweight', desc: 'Minimize part density for aerospace or moving assemblies' },
  { id: 'COST', label: 'Cost-Optimized', desc: 'Lowest raw billet raw material bill of materials' },
  { id: 'CORROSION', label: 'Corrosion Resist.', desc: 'High passivation against harsh outdoor or chemical exposure' },
  { id: 'MACHINABILITY', label: 'Max Machinability', desc: 'Rapid cycle times, low spindle wear, free cutting' },
];

const ENVIRONMENTS: { id: Environment; label: string }[] = [
  { id: 'INDOOR', label: 'Indoor Dry (Ambient Workshop)' },
  { id: 'OUTDOOR', label: 'Outdoor Weathering / Humidity' },
  { id: 'MARINE', label: 'Marine / Saline Coastal' },
  { id: 'CHEMICAL', label: 'Chemical / Solvent Contact' },
  { id: 'HIGH_TEMP', label: 'Elevated Temperature (>150°C)' },
];

const APPLICATIONS: { id: ApplicationType; label: string }[] = [
  { id: 'STRUCTURAL', label: 'Structural Bracket / Chassis' },
  { id: 'HOUSING', label: 'Enclosure / Electronic Housing' },
  { id: 'FIXTURE', label: 'Tooling / CNC Fixture / Jigs' },
  { id: 'PRECISION', label: 'Precision Mechanism / Shaft' },
  { id: 'PROTOTYPE', label: 'Rapid Prototype / Visual Model' },
  { id: 'GENERAL', label: 'General Mechanical Component' },
];

export const RecommendationForm: React.FC<RecommendationFormProps> = ({
  onSubmit,
  isLoading = false,
}) => {
  const [priority, setPriority] = useState<Priority>('BALANCED');
  const [environment, setEnvironment] = useState<Environment>('INDOOR');
  const [applicationType, setApplicationType] = useState<ApplicationType>('STRUCTURAL');
  const [budgetStr, setBudgetStr] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const budget = budgetStr ? parseFloat(budgetStr) : null;
    onSubmit({
      priority,
      environment,
      applicationType,
      maxBudgetPerKg: budget && !isNaN(budget) ? budget : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Priority Selector */}
      <div>
        <label className="block text-xs font-mono font-medium text-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-accent" />
          Primary Optimization Goal
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRIORITIES.map((p) => {
            const isSelected = priority === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPriority(p.id)}
                className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                  isSelected
                    ? 'border-accent bg-accent/10 shadow-xs'
                    : 'border-border bg-surface-1 hover:bg-surface-2'
                }`}
              >
                <div className={`font-mono font-bold ${isSelected ? 'text-accent' : 'text-text'}`}>
                  {p.label}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 line-clamp-2">
                  {p.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Environment & Application Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-mono font-medium text-text uppercase tracking-wider mb-1.5">
            Operating Environment
          </label>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as Environment)}
            className="w-full py-1.5 px-3 text-xs bg-surface-1 border border-border rounded-md text-text focus:outline-none focus:border-accent"
          >
            {ENVIRONMENTS.map((env) => (
              <option key={env.id} value={env.id}>
                {env.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono font-medium text-text uppercase tracking-wider mb-1.5">
            Component Application
          </label>
          <select
            value={applicationType}
            onChange={(e) => setApplicationType(e.target.value as ApplicationType)}
            className="w-full py-1.5 px-3 text-xs bg-surface-1 border border-border rounded-md text-text focus:outline-none focus:border-accent"
          >
            {APPLICATIONS.map((app) => (
              <option key={app.id} value={app.id}>
                {app.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Target Budget Input */}
      <div>
        <label className="block text-xs font-mono font-medium text-text uppercase tracking-wider mb-1.5">
          Maximum Target Budget (Optional)
        </label>
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-2 text-xs font-mono text-text-muted">₹</span>
          <input
            type="number"
            min="10"
            max="10000"
            step="10"
            placeholder="e.g. 500 / kg"
            value={budgetStr}
            onChange={(e) => setBudgetStr(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs font-mono bg-surface-1 border border-border rounded-md text-text placeholder-text-muted focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Submit Action */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-accent-fg text-xs font-mono font-bold rounded-md shadow-sm transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isLoading ? 'Computing Rule-Based Ranking...' : 'Run Material Recommendation Engine'}</span>
        </button>
      </div>
    </form>
  );
};
