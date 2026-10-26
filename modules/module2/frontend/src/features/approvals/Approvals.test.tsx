import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApprovalQueue } from "./components/ApprovalQueue";
import { ReviewScreen } from "./components/ReviewScreen";
import { ApprovedPlanView } from "./components/ApprovedPlanView";
import { ApprovalItem } from "./types";
import * as authHook from "@/features/auth/useAuth";
import { approvalsApi } from "./api";

// Mock approvalsApi
vi.mock("./api", () => ({
  approvalsApi: {
    getApprovals: vi.fn(),
    decideApproval: vi.fn(),
    getPlanSnapshot: vi.fn().mockResolvedValue({
      plan_id: "app-cube-123",
      schema_version: "1.0",
      job_name: "Standard Cube Facing",
      cad_sha256: "a3b2c1d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0",
      plan_hash: "7b4c92f153a80de412cb90e1f3780a49bc1256da23490fdcba9843210abced45",
      material: { name: "Aluminum 6061-T6" },
      machine: { name: "Haas VF-2" },
      tools: [{ tool_number: 1, name: "10mm 4-Flute Endmill" }],
      simulation: { overall_result: "PASS", finding_counts: { FAIL: 0, WARN: 0, INFO: 0 } },
    }),
  },
}));

// Mock useAuth
vi.mock("@/features/auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

const mockPendingApproval: ApprovalItem = {
  id: "app-pending-1",
  camJobId: "job-1",
  camJobName: "Bracket Milling High-Speed",
  cadVersionId: "cad-ver-2",
  cadVersionNumber: 2,
  originalFilename: "bracket_v2.step",
  cadSha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  simulationId: "sim-1",
  simulationResult: "WARN",
  status: "PENDING",
  submittedBy: "user-submitter-id",
  submittedByName: "Alex Chen (CAM Specialist)",
  submittedAt: "2026-10-24T10:00:00Z",
  submitNote: "Verified at 8500 RPM. Rapid move warning at clearance plane reviewed.",
  rowVersion: 1,
  hasPlanSnapshot: false,
};

const mockApprovedItem: ApprovalItem = {
  id: "app-approved-2",
  camJobId: "job-2",
  camJobName: "Standard Cube Facing",
  cadVersionId: "cad-ver-1",
  cadVersionNumber: 1,
  originalFilename: "cube_10mm.stl",
  cadSha256: "a3b2c1d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0",
  simulationId: "sim-2",
  simulationResult: "PASS",
  status: "APPROVED",
  submittedBy: "user-submitter-id",
  submittedByName: "Alex Chen (CAM Specialist)",
  submittedAt: "2026-10-23T08:00:00Z",
  submitNote: "Standard facing job ready for execution.",
  decidedBy: "user-supervisor-id",
  decidedByName: "Dr. Marcus Vance (Shop Supervisor)",
  decidedAt: "2026-10-23T11:00:00Z",
  decisionComment: "Simulation clean, tool clearance verified. Approved for shop floor.",
  integrityVerified: true,
  integrityCheckedAt: "2026-10-23T11:00:00Z",
  planHash: "7b4c92f153a80de412cb90e1f3780a49bc1256da23490fdcba9843210abced45",
  hasPlanSnapshot: true,
  rowVersion: 2,
};

describe("Manufacturing Approvals Module Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ApprovalQueue", () => {
    it("renders table with pending and approved plans", () => {
      const handleSelect = vi.fn();
      const handleFilter = vi.fn();

      render(
        <ApprovalQueue
          approvals={[mockPendingApproval, mockApprovedItem]}
          loading={false}
          onSelectApproval={handleSelect}
          statusFilter="ALL"
          onStatusFilterChange={handleFilter}
        />
      );

      expect(screen.getByText("Bracket Milling High-Speed")).toBeInTheDocument();
      expect(screen.getByText("Standard Cube Facing")).toBeInTheDocument();
      expect(screen.getAllByText("Alex Chen (CAM Specialist)")).toHaveLength(2);
    });

    it("triggers selection when clicking Review button for pending item", () => {
      const handleSelect = vi.fn();

      render(
        <ApprovalQueue
          approvals={[mockPendingApproval]}
          loading={false}
          onSelectApproval={handleSelect}
          statusFilter="ALL"
          onStatusFilterChange={vi.fn()}
        />
      );

      const reviewBtn = screen.getByRole("button", { name: /^review$/i });
      fireEvent.click(reviewBtn);
      expect(handleSelect).toHaveBeenCalledWith(mockPendingApproval);
    });

    it("filters list when status filter button is clicked", () => {
      const handleFilter = vi.fn();

      render(
        <ApprovalQueue
          approvals={[mockPendingApproval]}
          loading={false}
          onSelectApproval={vi.fn()}
          statusFilter="ALL"
          onStatusFilterChange={handleFilter}
        />
      );

      const approvedTab = screen.getByRole("button", { name: "APPROVED" });
      fireEvent.click(approvedTab);
      expect(handleFilter).toHaveBeenCalledWith("APPROVED");
    });
  });

  describe("ReviewScreen - Separation of Duties & Validation", () => {
    it("enforces separation of duties: blocks approval if user is the submitter", () => {
      // Mock logged-in user to match the submitter ID
      vi.spyOn(authHook, "useAuth").mockReturnValue({
        user: { id: "user-submitter-id", email: "alex@smartcore.internal" } as any,
        profile: null,
        session: null,
        role: "CAM_ENGINEER",
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <ReviewScreen
          approval={mockPendingApproval}
          onBack={vi.fn()}
          onDecisionComplete={vi.fn()}
        />
      );

      // Warning banner must be visible
      expect(screen.getByText(/Separation of Duties Policy/i)).toBeInTheDocument();
      expect(
        screen.getByText(/As the submitter of this CAM job, you cannot approve or reject your own plan/i)
      ).toBeInTheDocument();

      // Action buttons must be disabled
      const approveBtn = screen.getByRole("button", { name: /approve & seal plan/i });
      const rejectBtn = screen.getByRole("button", { name: /reject plan/i });
      expect(approveBtn).toBeDisabled();
      expect(rejectBtn).toBeDisabled();
    });

    it("allows authorized supervisor to approve when comment is >= 10 chars", async () => {
      // Mock logged-in user to be a different supervisor
      vi.spyOn(authHook, "useAuth").mockReturnValue({
        user: { id: "user-supervisor-id", email: "supervisor@smartcore.internal" } as any,
        profile: null,
        session: null,
        role: "FACULTY_SUPERVISOR",
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      const handleDecisionComplete = vi.fn();
      const mockDecide = vi.mocked(approvalsApi.decideApproval);
      mockDecide.mockResolvedValueOnce({
        ...mockPendingApproval,
        status: "APPROVED",
        decidedBy: "user-supervisor-id",
        planHash: "7b4c92f153a80de412cb90e1f3780a49bc1256da23490fdcba9843210abced45",
      });

      render(
        <ReviewScreen
          approval={mockPendingApproval}
          onBack={vi.fn()}
          onDecisionComplete={handleDecisionComplete}
        />
      );

      const textarea = screen.getByPlaceholderText(/Document verification of toolpath clearance/i);
      const approveBtn = screen.getByRole("button", { name: /approve & seal plan/i });

      // Initially disabled due to empty comment
      expect(approveBtn).toBeDisabled();

      // Enter short comment (< 10 chars)
      fireEvent.change(textarea, { target: { value: "Too short" } }); // 9 chars
      expect(approveBtn).toBeDisabled();

      // Enter valid comment (>= 10 chars)
      fireEvent.change(textarea, {
        target: { value: "Verified clearance parameters, approved for machining on Haas VF-2." },
      });
      expect(approveBtn).not.toBeDisabled();

      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(mockDecide).toHaveBeenCalledWith("app-pending-1", {
          decision: "APPROVED",
          comment: "Verified clearance parameters, approved for machining on Haas VF-2.",
        });
        expect(handleDecisionComplete).toHaveBeenCalled();
      });
    });
  });

  describe("ApprovedPlanView", () => {
    it("renders cryptographic seal, plan hash, and allows downloading immutable plan snapshot", async () => {
      render(<ApprovedPlanView approval={mockApprovedItem} onBack={vi.fn()} />);

      expect(screen.getByText("Approved Manufacturing Plan")).toBeInTheDocument();
      expect(screen.getByText("Cryptographic SHA-256 Plan Hash")).toBeInTheDocument();
      expect(screen.getByText("CAD Hash Re-verified")).toBeInTheDocument();

      // Check snapshot JSON loading
      await waitFor(() => {
        expect(screen.getByText(/Aluminum 6061-T6/i)).toBeInTheDocument();
      });

      // Download button exists
      const downloadBtn = screen.getByRole("button", { name: /download snapshot json/i });
      expect(downloadBtn).toBeInTheDocument();
    });
  });
});
