import React, { useState } from "react";
import { ApprovalItem } from "../types";
import { approvalsApi } from "../api";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { useAuth } from "@/features/auth/useAuth";
import {
  ShieldAlert,
  Check,
  X,
  ArrowLeft,
  User,
  FileCheck2,
  AlertOctagon,
  Loader2,
} from "lucide-react";

interface ReviewScreenProps {
  approval: ApprovalItem;
  onBack: () => void;
  onDecisionComplete: (updated: ApprovalItem) => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  approval,
  onBack,
  onDecisionComplete,
}) => {
  const { user } = useAuth();
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Separation of duties rule: approver cannot be submitter
  const isSubmitter = user?.id === approval.submittedBy;
  const isCommentValid = comment.trim().length >= 10;

  const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (!isCommentValid || isSubmitter) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const updated = await approvalsApi.decideApproval(approval.id, {
        decision,
        comment: comment.trim(),
      });
      onDecisionComplete(updated);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record approval decision.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="text-xs text-text-muted hover:text-text flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Approval Queue</span>
        </button>
      </div>

      {/* Header Panel */}
      <div className="bg-raised border border-border rounded-lg p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                Manufacturing Governance Review
              </span>
              <StatusBadge status="PENDING" />
            </div>
            <h2 className="text-lg font-bold text-text">{approval.camJobName}</h2>
          </div>
          <div className="text-xs font-mono text-text-muted">
            Submitted {new Date(approval.submittedAt).toLocaleDateString()}
          </div>
        </div>

        {/* Evidence Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border/50 text-xs">
          <div className="space-y-1 bg-surface p-3 rounded-md border border-border">
            <span className="text-text-muted text-[11px]">CAD Artifact</span>
            <div className="font-semibold text-text">
              {approval.originalFilename} (v{approval.cadVersionNumber})
            </div>
            <div className="text-[10px] text-text-muted font-mono truncate">
              Hash: {approval.cadSha256}
            </div>
          </div>

          <div className="space-y-1 bg-surface p-3 rounded-md border border-border">
            <span className="text-text-muted text-[11px]">Simulation Status</span>
            <div className="flex items-center gap-2">
              <StatusBadge status={approval.simulationResult} />
              <span className="text-text font-medium">Kinematics Verified</span>
            </div>
            <div className="text-[10px] text-text-muted">
              Pre-run checks pass baseline safety bounds
            </div>
          </div>

          <div className="space-y-1 bg-surface p-3 rounded-md border border-border">
            <span className="text-text-muted text-[11px]">Submitted By</span>
            <div className="font-semibold text-text flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-text-muted" />
              <span>{approval.submittedByName}</span>
            </div>
            {approval.submitNote && (
              <div className="text-[11px] text-text-2 italic mt-1">
                "{approval.submitNote}"
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Separation of Duties Warning */}
      {isSubmitter && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-text-2 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-amber-500">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Separation of Duties Policy (FR-P3 / AC-41)</span>
          </div>
          <p className="text-text-muted">
            As the submitter of this CAM job, you cannot approve or reject your own plan. A qualified manufacturing supervisor or administrator must conduct this review to maintain strict four-eyes verification.
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Decision Card */}
      <div className="bg-raised border border-border rounded-lg p-5 space-y-4 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-accent" />
            <span>Supervisor Sign-Off & Plan Hash Generation</span>
          </h3>
          <p className="text-xs text-text-muted">
            Approval executes bit-for-bit SHA-256 verification of the stored CAD geometry and locks the CAM job into a permanent cryptographic snapshot.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-text flex justify-between items-center">
            <span>Mandatory Review Comment:</span>
            <span
              className={`text-[11px] font-mono ${
                comment.trim().length >= 10 ? "text-emerald-400" : "text-text-muted"
              }`}
            >
              {comment.trim().length} / 10 min chars
            </span>
          </label>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isSubmitter || submitting}
            placeholder="Document verification of toolpath clearance, fixture clamps, tool RPM, and stock datum coordinates..."
            className="w-full bg-surface border border-border rounded-md p-3 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-accent disabled:opacity-50"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-border/50">
          <button
            onClick={() => handleDecision("REJECTED")}
            disabled={!isCommentValid || isSubmitter || submitting}
            className="px-4 py-2 bg-destructive/15 hover:bg-destructive/25 text-destructive border border-destructive/30 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <X className="w-3.5 h-3.5" />
            )}
            <span>Reject Plan</span>
          </button>

          <button
            onClick={() => handleDecision("APPROVED")}
            disabled={!isCommentValid || isSubmitter || submitting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Approve & Seal Plan (SHA-256)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
