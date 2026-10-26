import React from "react";
import { TopBar } from "@/components/common/TopBar";
import { ModuleCard } from "@/components/common/ModuleCard";
import { LifecycleStepper } from "@/components/common/LifecycleStepper";
import { useAuth } from "@/context/AuthContext";
import { Activity, Box, Shield, Clock } from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const role = profile?.role || "designer";

  return (
    <div className="min-h-screen bg-canvas text-text flex flex-col pt-14">
      <TopBar />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-border gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono text-accent uppercase tracking-wider font-semibold">
                Operational Portal
              </span>
              <span className="text-xs text-text-muted">· Single Origin Session</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text mt-1">
              Welcome back, {profile?.full_name || user?.email?.split("@")[0] || "Operator"}
            </h1>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              Select an integrated manufacturing module to begin work.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-surface p-2.5 rounded border border-border">
            <Shield className="w-4 h-4 text-accent flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-text-muted uppercase">Active Role</span>
              <span className="text-xs font-semibold font-mono text-text uppercase">
                {role.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* 10-Step Digital-to-Physical Lifecycle Strip */}
        <div className="mb-10">
          <LifecycleStepper />
        </div>

        {/* Two Large Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Module 2: Pre-Manufacturing */}
          <ModuleCard
            id="m2"
            title="Pre-Manufacturing Platform"
            subtitle="Module 2 · CAD / CAM / G-Code"
            description="3D CAD geometry verification, rule-based material advisory, 2.5D toolpath emission, risk simulation, and engineering approval queue."
            icon={Box}
            badgeText="Design & CAM"
            badgeColor="text-info bg-info/10 border-info/30"
            stats={[
              { label: "Pipeline", value: "CAD→CAM" },
              { label: "G-Code", value: "Verified" },
              { label: "Approval", value: "Cryptographic" },
            ]}
            features={[
              "3D model viewer with GLB generation",
              "ISO material recommendation engine",
              "Toolpath simulation & collision detection",
              "Plan hash pinning & immutable approvals",
            ]}
            launchUrl="/m2/"
            accentBorder="hover:border-info"
          />

          {/* Module 1: Smart CNC Monitoring */}
          <ModuleCard
            id="m1"
            title="Smart CNC Monitoring"
            subtitle="Module 1 · Telemetry & Maintenance"
            description="Real-time multi-axis sensor tracking, cutting tool wear calculation, OEE analytics, and machine failure prediction with automated alerts."
            icon={Activity}
            badgeText="Live Fleet"
            badgeColor="text-success bg-success/10 border-success/30"
            stats={[
              { label: "Demo Fleet", value: "5 Units" },
              { label: "ML Model", value: "RandomForest" },
              { label: "OEE Telemetry", value: "Active" },
            ]}
            features={[
              "Real-time spindle, feed & vibration metrics",
              "Tool life & automated wear threshold alerts",
              "Failure prediction and health scoring",
              "Job queueing & production makespan calculation",
            ]}
            launchUrl="/m1/"
            accentBorder="hover:border-success"
          />
        </div>

        {/* Recent Traceability Activity & Audit Feed */}
        <section className="bg-surface border border-border rounded-md p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider font-mono">
                Recent Lifecycle Events
              </h3>
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              Live Postgres Audit Log
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-start justify-between p-2.5 bg-canvas rounded border border-border/60">
              <div className="flex flex-col">
                <span className="text-text font-medium">SESSION_AUTHENTICATED</span>
                <span className="text-[11px] text-text-muted">User {user?.email} signed in via Supabase Auth</span>
              </div>
              <span className="text-[10px] text-text-muted">Just now</span>
            </div>

            <div className="flex items-start justify-between p-2.5 bg-canvas rounded border border-border/60">
              <div className="flex flex-col">
                <span className="text-text font-medium">FLEET_TELEMETRY_SYNC</span>
                <span className="text-[11px] text-text-muted">5 CNC machines active (CNC-001 through CNC-005)</span>
              </div>
              <span className="text-[10px] text-text-muted">LINE-A / LINE-B</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
