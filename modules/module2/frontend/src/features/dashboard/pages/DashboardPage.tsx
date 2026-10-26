import React from "react";
import { PageHeader } from "@/components/domain/PageHeader";
import { MetricTile } from "@/components/domain/MetricTile";
import { Panel } from "@/components/domain/Panel";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { DataTable, Column } from "@/components/domain/DataTable";
import { Box, Cpu, FileCheck2, ShieldCheck, Upload, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface WorkQueueItem {
  id: string;
  item: string;
  stage: string;
  status: "DRAFT" | "CONFIGURED" | "TOOLPATH_READY" | "SUBMITTED" | "APPROVED";
  updated: string;
}

export const DashboardPage: React.FC = () => {
  const queueData: WorkQueueItem[] = [
    {
      id: "1",
      item: "Bracket Support Rib (bracket.step)",
      stage: "CAM Setup",
      status: "CONFIGURED",
      updated: "10 mins ago",
    },
    {
      id: "2",
      item: "Mounting Flange v2 (flange.stl)",
      stage: "Simulation",
      status: "TOOLPATH_READY",
      updated: "35 mins ago",
    },
    {
      id: "3",
      item: "Enclosure Base Plate (base.step)",
      stage: "Approval Review",
      status: "SUBMITTED",
      updated: "1 hour ago",
    },
  ];

  const queueColumns: Column<WorkQueueItem>[] = [
    {
      key: "item",
      header: "Asset / Job Name",
      render: (row) => <span className="font-medium text-text">{row.item}</span>,
    },
    {
      key: "stage",
      header: "Stage",
      className: "text-text-muted font-condensed uppercase tracking-wider",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "updated",
      header: "Last Activity",
      isMono: true,
      className: "text-text-muted",
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      render: (row) => (
        <Link
          to={row.status === "SUBMITTED" ? "/approvals" : "/cam"}
          className="text-xs text-accent hover:underline flex items-center justify-end gap-1 font-medium"
        >
          <span>Open</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        category="Workspace Overview"
        title="Manufacturing Dashboard"
        description="Traceable end-to-end status from CAD geometry ingestion to verified plan release."
        actions={
          <Link
            to="/cad"
            className="flex items-center gap-2 px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-xs font-semibold rounded-md transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CAD Part</span>
          </Link>
        }
      />

      {/* 4 Metric Tiles (§6 layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label="CAD Assets"
          value="12"
          unit="Parts"
          hint="3 updated today"
          icon={<Box className="w-3.5 h-3.5 text-info" />}
        />
        <MetricTile
          label="Active CAM Jobs"
          value="4"
          unit="Jobs"
          hint="2 ready for simulation"
          icon={<Cpu className="w-3.5 h-3.5 text-accent" />}
        />
        <MetricTile
          label="Awaiting Approval"
          value="2"
          unit="Plans"
          hint="Require review"
          icon={<FileCheck2 className="w-3.5 h-3.5 text-warning" />}
        />
        <MetricTile
          label="Approved Plans"
          value="8"
          unit="Released"
          hint="All hashes verified"
          icon={<ShieldCheck className="w-3.5 h-3.5 text-success" />}
        />
      </div>

      {/* Split Layout: Work Queue (span 7) & Pipeline (span 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Work Queue */}
        <div className="lg:col-span-7">
          <Panel
            title="My Work Queue"
            subtitle="Pending tasks requiring attention in your current role"
            hasTicks
          >
            <DataTable
              columns={queueColumns}
              data={queueData}
              keyExtractor={(item) => item.id}
            />
          </Panel>
        </div>

        {/* Workflow Pipeline */}
        <div className="lg:col-span-5">
          <Panel
            title="Workflow Pipeline"
            subtitle="Distribution of parts across development stages"
            hasTicks
          >
            <div className="space-y-3 py-1">
              {[
                { stage: "Design & Verification", count: 12, pct: 40, color: "bg-info" },
                { stage: "CAM Toolpath Generation", count: 4, pct: 20, color: "bg-accent" },
                { stage: "Simulation & Risk Checks", count: 3, pct: 15, color: "bg-warning" },
                { stage: "Manufacturing Release", count: 8, pct: 25, color: "bg-success" },
              ].map((item) => (
                <div key={item.stage} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-condensed uppercase tracking-wider text-text-2">
                      {item.stage}
                    </span>
                    <span className="font-mono text-text tabular-nums">{item.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-raised rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};
