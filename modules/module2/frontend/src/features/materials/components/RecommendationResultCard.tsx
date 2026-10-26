import { MaterialRecommendationResponse } from '../types';
import { LabelChip } from '@/components/domain/LabelChip';
import { RatingPill } from './RatingPill';
import { CheckCircle2, AlertTriangle, Trophy, ArrowRight, Check } from 'lucide-react';

interface RecommendationResultCardProps {
  recommendation: MaterialRecommendationResponse;
  selectedMaterialId?: string | null;
  onSelectMaterial?: (materialId: string) => void;
  isSelecting?: boolean;
}

export const RecommendationResultCard: React.FC<RecommendationResultCardProps> = ({
  recommendation,
  selectedMaterialId,
  onSelectMaterial,
  isSelecting = false,
}) => {
  return (
    <div className="space-y-4">
      {/* Honesty & Version Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-surface-1 border border-border rounded-lg text-xs font-mono">
        <div className="flex items-center gap-2">
          <LabelChip type="rule-based" />
          <span className="text-text-muted">Algorithm: {recommendation.algorithmVersion}</span>
        </div>
        <div className="text-[11px] text-text-muted">
          Generated: {new Date(recommendation.createdAt).toLocaleTimeString()}
        </div>
      </div>

      {/* Ranked Candidate List */}
      <div className="space-y-3">
        {recommendation.results.map((result) => {
          const isTop = result.rank === 1;
          const isSelected = selectedMaterialId === result.materialId;

          return (
            <div
              key={result.materialId}
              className={`p-4 rounded-lg border transition-all ${
                isSelected
                  ? 'border-accent bg-accent/10 shadow-sm'
                  : isTop
                  ? 'border-accent/40 bg-surface-base hover:border-accent/60'
                  : 'border-border bg-surface-base hover:border-border-strong'
              }`}
            >
              {/* Header: Rank, Code, Category, Score */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                      isTop
                        ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                        : result.rank === 2
                        ? 'bg-zinc-400/20 text-zinc-300 border border-zinc-400/30'
                        : 'bg-surface-2 text-text-muted border border-border'
                    }`}
                  >
                    {isTop ? <Trophy className="w-3.5 h-3.5" /> : `#${result.rank}`}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-text">
                        {result.code}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-text-muted font-mono uppercase tracking-wider">
                        {result.category}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 bg-accent text-accent-fg rounded-full font-semibold">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">{result.name}</div>
                  </div>
                </div>

                {/* Score Badge */}
                <div className="text-right shrink-0">
                  <div className="font-mono text-lg font-black text-accent">
                    {result.score.toFixed(1)}
                    <span className="text-xs font-normal text-text-muted">/100</span>
                  </div>
                  <div className="text-[10px] font-mono text-text-muted uppercase">Fit Score</div>
                </div>
              </div>

              {/* Multi-Criteria Ratings Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2.5 bg-surface-1 border border-border rounded-md text-xs mb-3">
                <div>
                  <RatingPill label="Strength" value={result.strengthRating} />
                </div>
                <div>
                  <RatingPill label="Lightness" value={result.lightnessRating} />
                </div>
                <div>
                  <RatingPill label="Corrosion" value={result.corrosionRating} />
                </div>
                <div>
                  <RatingPill label="Machining" value={result.machinabilityRating} />
                </div>
                <div className="font-mono text-xs flex items-center gap-1">
                  <span className="text-[10px] uppercase text-text-muted">Cost:</span>
                  <span className="font-semibold text-text">₹{result.costPerKg.toFixed(0)}/kg</span>
                </div>
              </div>

              {/* Reasons List */}
              {result.reasons && result.reasons.length > 0 && (
                <div className="space-y-1 mb-2">
                  {result.reasons.map((reason, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs text-text">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings List */}
              {result.warnings && result.warnings.length > 0 && (
                <div className="space-y-1 mb-3 pt-1 border-t border-border/50">
                  {result.warnings.map((warning, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Button */}
              {onSelectMaterial && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={isSelecting || isSelected}
                    onClick={() => onSelectMaterial(result.materialId)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-colors ${
                      isSelected
                        ? 'bg-success/20 text-success border border-success/30 cursor-default'
                        : 'bg-accent hover:bg-accent-hover text-accent-fg shadow-xs'
                    }`}
                  >
                    <span>{isSelected ? 'Current Selection' : 'Select This Material'}</span>
                    {!isSelected && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
