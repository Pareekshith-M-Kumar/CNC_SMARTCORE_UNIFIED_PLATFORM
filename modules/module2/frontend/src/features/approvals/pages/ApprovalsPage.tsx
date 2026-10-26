import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/domain/PageHeader";
import { ApprovalItem } from "../types";
import { approvalsApi } from "../api";
import { ApprovalQueue } from "../components/ApprovalQueue";
import { ReviewScreen } from "../components/ReviewScreen";
import { ApprovedPlanView } from "../components/ApprovedPlanView";
import {
  FileCheck,
  Send,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";

// Demo/sample items when backend database has no pending approvals yet
const DEMO_APPROVALS: ApprovalItem[] = [
  {
    id: "d9e1a8b2-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
    camJobId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    camJobName: "Bracket High-Speed Milling",
    cadVersionId: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    cadVersionNumber: 2,
    originalFilename: "bracket_v2.step",
    cadSha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    simulationId: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
    simulationResult: "WARN",
    status: "PENDING",
    submittedBy: "f1e2d3c4-b5a6-7890-1234-56789abcdef0",
    submittedByName: "Alex Chen (CAM Specialist)",
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    submitNote: "Verified at 8500 RPM with 40% radial stepover. Rapid move warning at clearance plane reviewed.",
    rowVersion: 1,
    hasPlanSnapshot: false,
  },
  {
    id: "e8f7a6b5-4c3d-2e1f-0a9b-8c7d6e5f4a3b",
    camJobId: "f5e4d3c2-b1a0-9f8e-7d6c-5b4a3f2e1d0c",
    camJobName: "Standard Cube Facing & Contour",
    cadVersionId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    cadVersionNumber: 1,
    originalFilename: "cube_10mm.stl",
    cadSha256: "a3b2c1d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0",
    simulationId: "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f90",
    simulationResult: "PASS",
    status: "APPROVED",
    submittedBy: "f1e2d3c4-b5a6-7890-1234-56789abcdef0",
    submittedByName: "Alex Chen (CAM Specialist)",
    submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    submitNote: "Standard facing job ready for shop floor execution.",
    decidedBy: "00000000-0000-0000-0000-000000000001",
    decidedByName: "Dr. Marcus Vance (Shop Supervisor)",
    decidedAt: new Date(Date.now() - 3600000 * 22).toISOString(),
    decisionComment: "Simulation clean, tool clearance verified against vise jaws. Approved for VF-2.",
    integrityVerified: true,
    integrityCheckedAt: new Date(Date.now() - 3600000 * 22).toISOString(),
    planHash: "7b4c92f153a80de412cb90e1f3780a49bc1256da23490fdcba9843210abced45",
    hasPlanSnapshot: true,
    rowVersion: 2,
  },
];

export const ApprovalsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryJobId = searchParams.get("jobId");
  const queryApprovalId = searchParams.get("id");

  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);

  // New submission state (when navigated from Simulation page)
  const [submitNote, setSubmitNote] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Fetch approvals from API
  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await approvalsApi.getApprovals(statusFilter === "ALL" ? undefined : statusFilter);
      if (data && data.length > 0) {
        setApprovals(data);
      } else {
        // Fallback to sample demo data if backend database has no entries
        setApprovals(
          statusFilter === "ALL"
            ? DEMO_APPROVALS
            : DEMO_APPROVALS.filter((a) => a.status === statusFilter)
        );
      }
    } catch (err: any) {
      console.warn("Failed to fetch approvals from API, falling back to local demo state:", err);
      setApprovals(
        statusFilter === "ALL"
          ? DEMO_APPROVALS
          : DEMO_APPROVALS.filter((a) => a.status === statusFilter)
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Handle URL deep linking (jobId or id)
  useEffect(() => {
    if (approvals.length === 0) return;

    if (queryApprovalId) {
      const match = approvals.find((a) => a.id === queryApprovalId);
      if (match) setSelectedApproval(match);
    } else if (queryJobId) {
      const match = approvals.find((a) => a.camJobId === queryJobId);
      if (match) setSelectedApproval(match);
    }
  }, [queryJobId, queryApprovalId, approvals]);

  // Handle submission for a CAM job directly from banner
  const handleSubmitPlan = async () => {
    if (!queryJobId) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const newApproval = await approvalsApi.submitPlan(queryJobId, submitNote.trim() || undefined);
      setApprovals((prev) => [newApproval, ...prev]);
      setSelectedApproval(newApproval);
      setSubmitSuccess(true);
      // Remove jobId query param after successful submission
      searchParams.delete("jobId");
      setSearchParams(searchParams);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit plan for approval.");
    } finally {
      setSubmitting(false);
    }
  };

  // Check if current queryJobId already has an approval
  const jobAlreadySubmitted = queryJobId
    ? approvals.some((a) => a.camJobId === queryJobId)
    : false;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        category="Governance & Release"
        title="Manufacturing Approval Queue"
        description="Review evidence packets (CAD hash, CAM parameters, simulation findings) and bind approval into an immutable plan snapshot."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchApprovals()}
              disabled={loading}
              className="px-3 py-1.5 bg-surface hover:bg-hover border border-border text-text text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* Error message banner */}
      {errorMsg && (
        <div className="p-3.5 bg-danger/10 border border-danger/30 rounded-lg flex items-center gap-3 text-xs text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-danger hover:underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Deep Link Banner: When arrived with ?jobId=... and not yet submitted */}
      {queryJobId && !jobAlreadySubmitted && !submitSuccess && (
        <div className="bg-gradient-to-r from-accent/15 via-surface to-accent/5 border border-accent/40 rounded-lg p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-text">
                Ready to Submit CAM Job for Manufacturing Sign-Off
              </div>
              <p className="text-xs text-text-muted">
                Job ID <span className="font-mono text-accent">{queryJobId}</span> has verified simulation findings and is eligible for formal supervisor review.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <input
              type="text"
              placeholder="Optional submission note for supervisor (e.g. verified tool clearance)..."
              value={submitNote}
              onChange={(e) => setSubmitNote(e.target.value)}
              className="w-full sm:flex-1 px-3 py-1.5 bg-surface border border-border rounded-md text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleSubmitPlan}
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-xs font-semibold rounded-md transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Plan</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {selectedApproval ? (
        selectedApproval.status === "PENDING" ? (
          <ReviewScreen
            approval={selectedApproval}
            onBack={() => {
              setSelectedApproval(null);
              if (queryApprovalId) {
                searchParams.delete("id");
                setSearchParams(searchParams);
              }
            }}
            onDecisionComplete={(updated) => {
              // Update approvals list
              setApprovals((prev) =>
                prev.map((item) => (item.id === updated.id ? updated : item))
              );
              // Switch view to approved/rejected details
              setSelectedApproval(updated);
            }}
          />
        ) : (
          <ApprovedPlanView
            approval={selectedApproval}
            onBack={() => {
              setSelectedApproval(null);
              if (queryApprovalId) {
                searchParams.delete("id");
                setSearchParams(searchParams);
              }
            }}
          />
        )
      ) : (
        <ApprovalQueue
          approvals={approvals}
          loading={loading}
          onSelectApproval={(item) => setSelectedApproval(item)}
          statusFilter={statusFilter}
          onStatusFilterChange={(st) => setStatusFilter(st)}
        />
      )}
    </div>
  );
};
