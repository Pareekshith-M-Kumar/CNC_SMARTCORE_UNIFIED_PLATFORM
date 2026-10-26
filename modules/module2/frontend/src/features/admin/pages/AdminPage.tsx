import React from "react";
import { PageHeader } from "@/components/domain/PageHeader";
import { Panel } from "@/components/domain/Panel";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Chip } from "@/components/domain/Chip";
import { DataTable, Column } from "@/components/domain/DataTable";

interface UserProfile {
  id: string;
  email: string;
  role: "designer" | "cam_engineer" | "approver" | "admin";
  status: "ACTIVE" | "INACTIVE";
}

export const AdminPage: React.FC = () => {
  const users: UserProfile[] = [
    { id: "u-1", email: "student_designer@smartcore.internal", role: "designer", status: "ACTIVE" },
    { id: "u-2", email: "cam_programmer@smartcore.internal", role: "cam_engineer", status: "ACTIVE" },
    { id: "u-3", email: "faculty_supervisor@smartcore.internal", role: "approver", status: "ACTIVE" },
    { id: "u-4", email: "admin@smartcore.internal", role: "admin", status: "ACTIVE" },
  ];

  const columns: Column<UserProfile>[] = [
    {
      key: "email",
      header: "User Email",
      render: (u) => <span className="font-medium text-text">{u.email}</span>,
    },
    {
      key: "role",
      header: "Assigned RBAC Role",
      render: (u) => <Chip variant="accent">{u.role}</Chip>,
    },
    {
      key: "status",
      header: "Account Status",
      render: (u) => <StatusBadge status="READY" customLabel={u.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        category="Administration & Security"
        title="User Roles & Governance"
        description="Assign authorized roles, inspect machine envelopes, and verify immutable audit log streams."
      />

      <Panel title="System Users & RBAC Assignments" hasTicks>
        <DataTable columns={columns} data={users} keyExtractor={(u) => u.id} />
      </Panel>
    </div>
  );
};
