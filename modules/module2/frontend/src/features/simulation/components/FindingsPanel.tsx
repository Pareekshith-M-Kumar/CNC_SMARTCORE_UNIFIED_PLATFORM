import React, { useState } from "react";
import { SimulationFinding, Severity } from "../types";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Crosshair } from "lucide-react";

interface FindingsPanelProps {
  findings: SimulationFinding[];
  selectedFinding?: SimulationFinding | null;
  onSelectFinding: (finding: SimulationFinding) => void;
}

export const FindingsPanel: React.FC<FindingsPanelProps> = ({
  findings,
  selectedFinding,
  onSelectFinding,
}) => {
  const [filter, setFilter] = useState<"ALL" | Severity>("ALL");

  const counts = {
    FAIL: findings.filter((f) => f.severity === "FAIL").length,
    WARN: findings.filter((f) => f.severity === "WARN").length,
    INFO: findings.filter((f) => f.severity === "INFO").length,
  };

  const filteredFindings = findings.filter(
    (f) => filter === "ALL" || f.severity === filter
  );

  const getSeverityBadge = (severity: Severity) => {
    switch (severity) {
      case "FAIL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-destructive/15 text-destructive border border-destructive/30">
            <AlertCircle className="w-3 h-3" />
            FAIL
          </span>
        );
      case "WARN":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-warning/15 text-warning border border-warning/30">
            <AlertTriangle className="w-3 h-3" />
            WARN
          </span>
        );
      case "INFO":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Info className="w-3 h-3" />
            INFO
          </span>
        );
    }
  };

  return (
    <div className="bg-raised border border-border rounded-lg flex flex-col h-full shadow-sm">
      {/* Header & Filter tabs */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-text uppercase tracking-wider flex items-center gap-1.5">
            <span>Risk Findings</span>
            <span className="text-[11px] font-normal text-text-muted">({findings.length})</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 text-[11px]">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-2 py-1 rounded transition-colors ${
              filter === "ALL" ? "bg-surface text-text font-semibold shadow-xs" : "text-text-muted hover:text-text"
            }`}
          >
            All ({findings.length})
          </button>
          <button
            onClick={() => setFilter("FAIL")}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
              filter === "FAIL"
                ? "bg-destructive/20 text-destructive font-semibold"
                : "text-text-muted hover:text-destructive"
            }`}
          >
            <span>Fail</span>
            <span className="text-[10px] font-mono">({counts.FAIL})</span>
          </button>
          <button
            onClick={() => setFilter("WARN")}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
              filter === "WARN"
                ? "bg-warning/20 text-warning font-semibold"
                : "text-text-muted hover:text-warning"
            }`}
          >
            <span>Warn</span>
            <span className="text-[10px] font-mono">({counts.WARN})</span>
          </button>
          <button
            onClick={() => setFilter("INFO")}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
              filter === "INFO"
                ? "bg-cyan-500/20 text-cyan-400 font-semibold"
                : "text-text-muted hover:text-cyan-400"
            }`}
          >
            <span>Info</span>
            <span className="text-[10px] font-mono">({counts.INFO})</span>
          </button>
        </div>
      </div>

      {/* Findings List */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[460px]">
        {filteredFindings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-80" />
            <div className="text-xs font-semibold text-text">No findings in this category</div>
            <p className="text-[11px] text-text-muted max-w-xs">
              {filter === "FAIL"
                ? "Zero critical collision or travel envelope violations detected."
                : "All operations conform to selected risk thresholds."}
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const isSelected = selectedFinding?.id === finding.id;
            return (
              <div
                key={finding.id}
                onClick={() => onSelectFinding(finding)}
                className={`p-3 rounded-md border text-left cursor-pointer transition-all ${
                  isSelected
                    ? "bg-accent/10 border-accent shadow-sm"
                    : "bg-surface hover:bg-hover border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getSeverityBadge(finding.severity)}
                    <span className="font-mono text-xs font-semibold text-text">
                      {finding.ruleCode}
                    </span>
                  </div>
                  {finding.moveIndex !== undefined && (
                    <button
                      type="button"
                      title="Inspect coordinates in 3D"
                      className="text-text-muted hover:text-accent p-0.5 rounded transition-colors"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-text-2 mt-1.5 leading-relaxed">{finding.message}</p>

                {(finding.moveIndex !== undefined || finding.xMm !== undefined) && (
                  <div className="mt-2 pt-1.5 border-t border-border/50 flex flex-wrap items-center gap-2 text-[10px] font-mono text-text-muted">
                    {finding.moveIndex !== undefined && (
                      <span className="text-text-2">Move #{finding.moveIndex}</span>
                    )}
                    {finding.xMm !== undefined && finding.yMm !== undefined && finding.zMm !== undefined && (
                      <span>
                        ({finding.xMm.toFixed(2)}, {finding.yMm.toFixed(2)}, {finding.zMm.toFixed(2)} mm)
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
