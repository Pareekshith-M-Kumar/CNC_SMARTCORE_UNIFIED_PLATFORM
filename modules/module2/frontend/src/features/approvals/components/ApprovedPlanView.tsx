import React, { useState, useEffect } from "react";
import { ApprovalItem } from "../types";
import { approvalsApi } from "../api";
import { HashDisplay } from "@/components/domain/HashDisplay";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { CodeBlock } from "@/components/domain/CodeBlock";
import {
  ShieldCheck,
  Download,
  User,
  CheckCircle2,
  FileCode,
  ArrowLeft,
  Loader2,
} from "lucide-react";

interface ApprovedPlanViewProps {
  approval: ApprovalItem;
  onBack: () => void;
}

export const ApprovedPlanView: React.FC<ApprovedPlanViewProps> = ({
  approval,
  onBack,
}) => {
  const [snapshotJson, setSnapshotJson] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    approvalsApi
      .getPlanSnapshot(approval.id)
      .then((data) => {
        setSnapshotJson(
          typeof data === "string" ? data : JSON.stringify(data, null, 2)
        );
      })
      .catch((err) => {
        console.error("Failed to load plan snapshot:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [approval.id]);

  const handleDownloadSnapshot = () => {
    if (!snapshotJson) return;
    const blob = new Blob([snapshotJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plan-snapshot-${approval.camJobName.toLowerCase().replace(/\s+/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top back button */}
      <div>
        <button
          onClick={onBack}
          className="text-xs text-text-muted hover:text-text flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Approval Queue</span>
        </button>
      </div>

      {/* Plan Header Card */}
      <div className="bg-raised border border-border rounded-lg p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                Approved Manufacturing Plan
              </span>
              <StatusBadge status="APPROVED" />
            </div>
            <h2 className="text-lg font-bold text-text">{approval.camJobName}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSnapshot}
              disabled={!snapshotJson}
              className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Snapshot JSON</span>
            </button>
          </div>
        </div>

        {/* Cryptographic Hash Card */}
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cryptographic SHA-256 Plan Hash</span>
            <span className="text-[10px] font-normal bg-emerald-500/20 px-1.5 py-0.2 rounded text-emerald-300">
              Tamper-Evident Evidence
            </span>
          </div>
          {approval.planHash ? (
            <HashDisplay hash={approval.planHash} />
          ) : (
            <span className="text-xs text-text-muted">Generating cryptographic seal...</span>
          )}
          <p className="text-[11px] text-text-muted">
            Permanently binds the uploaded CAD geometry SHA-256, validated CAM parameter configuration, toolpaths, and simulation risk outcome.
          </p>
        </div>

        {/* Governance & Evidence Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border/50 text-xs">
          <div className="space-y-1">
            <span className="text-text-muted text-[11px]">CAD Version & File</span>
            <div className="font-semibold text-text">
              {approval.originalFilename} (v{approval.cadVersionNumber})
            </div>
            <div className="text-[10px] text-text-muted font-mono truncate max-w-[180px]">
              {approval.cadSha256}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-text-muted text-[11px]">Simulation Outcome</span>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={approval.simulationResult} />
              <span className="text-[11px] text-text-2 font-medium">Pre-run check</span>
            </div>
            {approval.integrityVerified && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3 h-3" />
                CAD Hash Re-verified
              </span>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-text-muted text-[11px]">Submitted By</span>
            <div className="font-medium text-text flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-text-muted" />
              <span>{approval.submittedByName}</span>
            </div>
            <div className="text-[10px] text-text-muted">
              {new Date(approval.submittedAt).toLocaleDateString()} at{" "}
              {new Date(approval.submittedAt).toLocaleTimeString()}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-text-muted text-[11px]">Approved By</span>
            <div className="font-medium text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{approval.decidedByName || "Supervisor"}</span>
            </div>
            {approval.decidedAt && (
              <div className="text-[10px] text-text-muted">
                {new Date(approval.decidedAt).toLocaleDateString()} at{" "}
                {new Date(approval.decidedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {approval.decisionComment && (
          <div className="p-3 bg-surface border border-border rounded-md text-xs space-y-1">
            <span className="font-semibold text-text text-[11px]">Supervisor Sign-Off Comment:</span>
            <p className="text-text-2 italic">"{approval.decisionComment}"</p>
          </div>
        )}
      </div>

      {/* Snapshot Tree / JSON */}
      <div className="bg-raised border border-border rounded-lg p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-text uppercase tracking-wider">
            <FileCode className="w-4 h-4 text-accent" />
            <span>Immutable Plan Snapshot Payload</span>
          </div>
          <span className="text-[11px] font-mono text-text-muted">JSON format</span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-text-muted text-xs space-y-2">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
            <span>Loading snapshot payload...</span>
          </div>
        ) : snapshotJson ? (
          <CodeBlock code={snapshotJson} language="json" showLineNumbers={true} />
        ) : (
          <div className="py-6 text-center text-xs text-text-muted">
            Snapshot data unavailable.
          </div>
        )}
      </div>
    </div>
  );
};
