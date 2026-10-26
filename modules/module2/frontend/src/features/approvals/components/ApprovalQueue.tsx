import React, { useState } from "react";
import { ApprovalItem } from "../types";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Eye, Search, FileCheck, ShieldCheck } from "lucide-react";

interface ApprovalQueueProps {
  approvals: ApprovalItem[];
  loading: boolean;
  onSelectApproval: (item: ApprovalItem) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  approvals,
  loading,
  onSelectApproval,
  statusFilter,
  onStatusFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredApprovals = approvals.filter((a) => {
    const matchesSearch =
      a.camJobName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.originalFilename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.submittedByName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="bg-raised border border-border rounded-lg flex flex-col shadow-sm">
      {/* Top filter tabs & search */}
      <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-surface border border-border rounded-md p-1 text-xs">
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => onStatusFilterChange(st)}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                statusFilter === st
                  ? "bg-accent text-accent-fg font-semibold shadow-xs"
                  : "text-text-muted hover:text-text hover:bg-hover"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search plans, CAD files, or engineers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-surface border border-border rounded-md text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-accent w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-surface/50 text-[11px] uppercase tracking-wider text-text-muted">
              <th className="py-2.5 px-4 font-semibold">Plan / CAM Job</th>
              <th className="py-2.5 px-4 font-semibold">CAD Version</th>
              <th className="py-2.5 px-4 font-semibold">Submitter</th>
              <th className="py-2.5 px-4 font-semibold">Simulation</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-text-muted">
                  Loading approval queue...
                </td>
              </tr>
            ) : filteredApprovals.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-text-muted space-y-1">
                  <div className="text-sm font-semibold text-text">No approval requests found</div>
                  <p className="text-xs text-text-muted">
                    {statusFilter !== "ALL"
                      ? `No plans currently in ${statusFilter} state.`
                      : "Submit a simulated CAM job to initiate formal manufacturing sign-off."}
                  </p>
                </td>
              </tr>
            ) : (
              filteredApprovals.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-hover/50 transition-colors cursor-pointer group"
                  onClick={() => onSelectApproval(item)}
                >
                  <td className="py-3 px-4 font-medium text-text">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-accent shrink-0" />
                      <div>
                        <div className="font-semibold">{item.camJobName}</div>
                        {item.planHash && (
                          <div className="text-[10px] text-emerald-400 font-mono truncate max-w-[200px]">
                            Hash: {item.planHash}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-text-2">
                    <div>{item.originalFilename} (v{item.cadVersionNumber})</div>
                    <div className="text-[10px] text-text-muted font-mono truncate max-w-[150px]">
                      {item.cadSha256}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-text-muted">
                    <div>{item.submittedByName}</div>
                    <div className="text-[10px] text-text-muted">
                      {new Date(item.submittedAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={item.simulationResult} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectApproval(item);
                      }}
                      className={`px-3 py-1 rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs ${
                        item.status === "PENDING"
                          ? "bg-accent hover:bg-accent-hover text-accent-fg"
                          : item.status === "APPROVED"
                          ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30"
                          : "bg-surface hover:bg-hover text-text border border-border"
                      }`}
                    >
                      {item.status === "PENDING" ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </>
                      ) : item.status === "APPROVED" ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>View Plan</span>
                        </>
                      ) : (
                        <span>View</span>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
