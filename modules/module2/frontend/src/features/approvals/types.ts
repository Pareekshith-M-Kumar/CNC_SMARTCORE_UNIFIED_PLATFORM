export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApprovalItem {
  id: string;
  camJobId: string;
  camJobName: string;
  cadVersionId: string;
  cadVersionNumber: number;
  originalFilename: string;
  cadSha256: string;
  simulationId: string;
  simulationResult: "PASS" | "WARN" | "FAIL";
  status: ApprovalStatus;
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  submitNote?: string;
  decidedBy?: string;
  decidedByName?: string;
  decidedAt?: string;
  decisionComment?: string;
  integrityVerified?: boolean;
  integrityCheckedAt?: string;
  planHash?: string;
  hasPlanSnapshot: boolean;
  rowVersion: number;
}

export interface SubmitPlanRequest {
  note?: string;
}

export interface ApprovalDecisionRequest {
  decision: "APPROVED" | "REJECTED";
  comment: string;
}
