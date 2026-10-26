import { api } from "@/lib/apiClient";
import { ApprovalItem, ApprovalDecisionRequest } from "./types";

export const approvalsApi = {
  submitPlan: async (jobId: string, note?: string): Promise<ApprovalItem> => {
    return api.post<ApprovalItem>(`/cam-jobs/${jobId}/submit`, { note });
  },

  getApprovals: async (status?: string): Promise<ApprovalItem[]> => {
    const url = status && status !== "ALL" ? `/approvals?status=${status}` : "/approvals";
    return api.get<ApprovalItem[]>(url);
  },

  getApprovalById: async (id: string): Promise<ApprovalItem> => {
    return api.get<ApprovalItem>(`/approvals/${id}`);
  },

  decideApproval: async (id: string, request: ApprovalDecisionRequest): Promise<ApprovalItem> => {
    return api.post<ApprovalItem>(`/approvals/${id}/decision`, request);
  },

  getPlanSnapshot: async (id: string): Promise<any> => {
    return api.get<any>(`/approvals/${id}/plan`);
  },
};
