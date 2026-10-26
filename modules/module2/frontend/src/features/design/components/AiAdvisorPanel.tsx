import React from 'react';
import { Panel } from '@/components/domain/Panel';
import { LabelChip } from '@/components/domain/LabelChip';
import { Chip } from '@/components/domain/Chip';
import {
  Sparkles,
  Gauge,
  Zap,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
} from 'lucide-react';

interface AiAdvisorPanelProps {
  aiDataRaw?: string | null;
  className?: string;
}

export const AiAdvisorPanel: React.FC<AiAdvisorPanelProps> = ({ aiDataRaw, className = '' }) => {
  if (!aiDataRaw) {
    return (
      <Panel title="AI Machinability Advisor" hasTicks className={className}>
        <div className="p-4 text-center text-xs text-text-muted">
          <Info className="w-5 h-5 mx-auto mb-2 text-text-muted opacity-60" />
          No AI machinability assessment available for this model version.
        </div>
      </Panel>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let aiData: any = null;
  try {
    aiData = typeof aiDataRaw === 'string' ? JSON.parse(aiDataRaw) : aiDataRaw;
  } catch {
    return null;
  }

  if (!aiData) return null;

  const riskScore = aiData.risk_score ?? aiData.riskScore ?? 0;
  const riskCategory = (aiData.risk_category ?? aiData.riskCategory ?? 'LOW').toUpperCase();
  const flags = aiData.geometry_flags ?? aiData.geometryFlags ?? {};
  const params = aiData.recommended_parameters ?? aiData.recommendedParameters ?? {};
  const warnings: string[] = aiData.warnings ?? [];

  const getRiskColor = (cat: string) => {
    switch (cat) {
      case 'HIGH':
        return 'text-danger bg-danger/10 border-danger/30';
      case 'MODERATE':
        return 'text-warning bg-warning/10 border-warning/30';
      default:
        return 'text-success bg-success/10 border-success/30';
    }
  };

  return (
    <Panel
      title="AI Machinability & Empirical Advisory"
      hasTicks
      className={className}
      headerActions={
        <div className="flex items-center gap-1.5 flex-wrap">
          <LabelChip type="rule-based" />
          <LabelChip type="estimate" />
        </div>
      }
    >
      <div className="space-y-4">
        {/* Dataset Provenance Banner */}
        <div className="flex items-center justify-between p-2.5 rounded bg-surface-1 border border-border text-[11px] font-mono">
          <div className="flex items-center gap-2 text-text">
            <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>Benchmark Dataset:</span>
            <span className="text-text-muted">Kaggle CNC Milling Benchmark (Empirical Records)</span>
          </div>
          <Chip variant="accent">AI Assisted</Chip>
        </div>

        {/* Risk Assessment Summary */}
        <div className="p-3 rounded-lg border bg-surface-0/60 flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1.5">
              <span>Machinability Risk Evaluation</span>
              <LabelChip type="risk-indicator" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getRiskColor(riskCategory)}`}>
                {riskCategory} RISK
              </span>
              <span className="text-xs font-mono text-text-muted">
                Score: <strong className="text-text">{riskScore}/100</strong>
              </span>
            </div>
          </div>

          {/* Quick Flags */}
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <div className={`flex items-center gap-1 ${flags.non_watertight_mesh ? 'text-warning' : 'text-success'}`}>
              {flags.non_watertight_mesh ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{flags.non_watertight_mesh ? 'Open Mesh' : 'Watertight'}</span>
            </div>
            <span className="text-border">•</span>
            <div className={`flex items-center gap-1 ${flags.thin_wall_risk ? 'text-warning' : 'text-success'}`}>
              {flags.thin_wall_risk ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{flags.thin_wall_risk ? 'Thin Wall Alert' : 'Aspect Normal'}</span>
            </div>
          </div>
        </div>

        {/* Recommended CNC Parameters Grid */}
        {params.recommended_rpm && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-text flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-accent" />
                <span>Empirical Milling Parameters ({params.benchmark_material || 'AL6061-T6'})</span>
              </h4>
              <span className="text-[10px] font-mono text-text-muted">
                Hardness: {params.dataset_hardness_hb ?? 95} HB
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* Spindle Speed */}
              <div className="p-2.5 rounded bg-surface-1 border border-border">
                <div className="text-[10px] font-mono text-text-muted uppercase">Spindle Speed</div>
                <div className="text-sm font-mono font-bold text-accent mt-0.5">
                  {Number(params.recommended_rpm).toLocaleString()} <span className="text-[10px] font-normal text-text-muted">RPM</span>
                </div>
              </div>

              {/* Feed Rate */}
              <div className="p-2.5 rounded bg-surface-1 border border-border">
                <div className="text-[10px] font-mono text-text-muted uppercase">Feed Rate</div>
                <div className="text-sm font-mono font-bold text-accent mt-0.5">
                  {Number(params.recommended_feed_mmpm).toLocaleString()} <span className="text-[10px] font-normal text-text-muted">mm/min</span>
                </div>
              </div>

              {/* Cutting Speed Vc */}
              <div className="p-2.5 rounded bg-surface-1 border border-border">
                <div className="text-[10px] font-mono text-text-muted uppercase">Cutting Speed (Vc)</div>
                <div className="text-sm font-mono font-bold text-text mt-0.5">
                  {params.cutting_speed_vc_m_min} <span className="text-[10px] font-normal text-text-muted">m/min</span>
                </div>
              </div>

              {/* Material Removal Rate MRR */}
              <div className="p-2.5 rounded bg-surface-1 border border-border">
                <div className="text-[10px] font-mono text-text-muted uppercase">MRR</div>
                <div className="text-sm font-mono font-bold text-text mt-0.5">
                  {params.mrr_cm3_min} <span className="text-[10px] font-normal text-text-muted">cm³/min</span>
                </div>
              </div>

              {/* Estimated Spindle Power */}
              <div className="p-2.5 rounded bg-surface-1 border border-border">
                <div className="text-[10px] font-mono text-text-muted uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-warning" />
                  <span>Est. Power</span>
                </div>
                <div className="text-sm font-mono font-bold text-text mt-0.5">
                  {params.estimated_spindle_power_kw} <span className="text-[10px] font-normal text-text-muted">kW</span>
                </div>
              </div>

              {/* Cutting Force */}
              <div className="p-2.5 rounded bg-surface-1 border border-border">
                <div className="text-[10px] font-mono text-text-muted uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-info" />
                  <span>Est. Force</span>
                </div>
                <div className="text-sm font-mono font-bold text-text mt-0.5">
                  {params.estimated_cutting_force_n} <span className="text-[10px] font-normal text-text-muted">N</span>
                </div>
              </div>

              {/* Tool Life Expectancy */}
              <div className="p-2.5 rounded bg-surface-1 border border-border">
                <div className="text-[10px] font-mono text-text-muted uppercase flex items-center gap-1">
                  <Clock className="w-3 h-3 text-text-muted" />
                  <span>Est. Tool Life</span>
                </div>
                <div className="text-sm font-mono font-bold text-text mt-0.5">
                  {params.estimated_tool_life_min} <span className="text-[10px] font-normal text-text-muted">min</span>
                </div>
              </div>

              {/* Expected Surface Roughness */}
              <div className="p-2.5 rounded bg-surface-1 border border-border">
                <div className="text-[10px] font-mono text-text-muted uppercase flex items-center gap-1">
                  <Layers className="w-3 h-3 text-success" />
                  <span>Roughness (Ra)</span>
                </div>
                <div className="text-sm font-mono font-bold text-text mt-0.5">
                  {params.expected_roughness_ra_um} <span className="text-[10px] font-normal text-text-muted">µm</span>
                </div>
              </div>

              {/* Feed per Tooth */}
              <div className="p-2.5 rounded bg-surface-1 border border-border">
                <div className="text-[10px] font-mono text-text-muted uppercase">Feed / Tooth (fz)</div>
                <div className="text-sm font-mono font-bold text-text mt-0.5">
                  {params.feed_per_tooth_fz_mm} <span className="text-[10px] font-normal text-text-muted">mm/t</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warnings List */}
        {warnings.length > 0 && (
          <div className="p-3 rounded bg-warning/10 border border-warning/20 space-y-1">
            <div className="text-[11px] font-semibold text-warning flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Geometry Observations & Notices</span>
            </div>
            <ul className="text-xs text-text-2 space-y-1 pl-5 list-disc">
              {warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Mandatory Safety Notice */}
        <div className="p-2.5 rounded bg-surface-1 border border-border text-[11px] text-text-muted leading-relaxed">
          <strong className="text-text">Advisory Notice:</strong> Speeds and feeds are rule-based recommendations derived from empirical benchmark datasets. Machine rigidity, workpiece fixturing, tool stickout, and coolant application must be reviewed prior to physical execution.
        </div>
      </div>
    </Panel>
  );
};
