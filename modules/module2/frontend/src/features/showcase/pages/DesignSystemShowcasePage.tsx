import React, { useState } from "react";
import { PageHeader } from "@/components/domain/PageHeader";
import { Panel } from "@/components/domain/Panel";
import { StatusBadge, StatusType } from "@/components/domain/StatusBadge";
import { LabelChip, HonestyLabelType } from "@/components/domain/LabelChip";
import { MetricTile } from "@/components/domain/MetricTile";
import { WorkflowStepper, WorkflowStep } from "@/components/domain/WorkflowStepper";
import { HashDisplay } from "@/components/domain/HashDisplay";
import { Chip } from "@/components/domain/Chip";
import { EmptyState } from "@/components/domain/EmptyState";
import { ErrorState } from "@/components/domain/ErrorState";
import { LoadingSkeleton } from "@/components/domain/LoadingSkeleton";
import { CodeBlock } from "@/components/domain/CodeBlock";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { useTheme } from "@/app/context/useTheme";
import { Sun, Moon, Zap, Shield, Clock, Layers } from "lucide-react";

export const DesignSystemShowcasePage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);

  const statusList: StatusType[] = [
    "READY",
    "PENDING",
    "FAILED",
    "UNSUPPORTED",
    "DRAFT",
    "CONFIGURED",
    "TOOLPATH_GENERATING",
    "TOOLPATH_READY",
    "TOOLPATH_FAILED",
    "SIMULATED",
    "SUBMITTED",
    "APPROVED",
    "REJECTED",
    "STALE",
    "PASS",
    "WARN",
    "FAIL",
    "INFO",
    "VERIFIED",
    "MISMATCH",
  ];

  const honestyLabels: HonestyLabelType[] = [
    "estimate",
    "rule-based",
    "prototype-output",
    "sample-data",
    "risk-indicator",
  ];

  const demoSteps: WorkflowStep[] = [
    { id: "1", label: "CAD Ingestion", status: "complete" },
    { id: "2", label: "Material Scoring", status: "complete" },
    { id: "3", label: "CAM Setup", status: "active" },
    { id: "4", label: "Toolpath Gen", status: "blocked", blockedReason: "Configure parameters first" },
    { id: "5", label: "Simulation", status: "blocked" },
    { id: "6", label: "Plan Approval", status: "blocked" },
  ];

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        category="Engineering Design System"
        title="Shop-Floor Precision Component Showcase"
        description="A living catalogue of all design tokens, domain widgets, honesty labels, and UI states in dark and light modes."
        actions={
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 bg-raised border border-border-strong hover:bg-surface text-text text-xs font-semibold rounded-md transition-colors"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-warning" /> : <Moon className="w-3.5 h-3.5 text-info" />}
            <span>Toggle Theme ({theme.toUpperCase()})</span>
          </button>
        }
      />

      {/* 1. Colour Tokens Palette */}
      <Panel title="1. Color Tokens & Theme Surfaces" subtitle="Mapped to CSS custom properties" hasTicks>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
          {[
            { name: "Canvas", varName: "var(--canvas)", class: "bg-canvas text-text border border-border" },
            { name: "Surface", varName: "var(--surface)", class: "bg-surface text-text border border-border" },
            { name: "Raised", varName: "var(--raised)", class: "bg-raised text-text border border-border-strong" },
            { name: "Viewport", varName: "var(--viewport)", class: "bg-viewport text-text border border-border" },
            { name: "Accent (Orange)", varName: "var(--accent)", class: "bg-accent text-accent-fg font-bold" },
            { name: "Info (Blue)", varName: "var(--info)", class: "bg-info text-white font-bold" },
            { name: "Success (Green)", varName: "var(--success)", class: "bg-success text-white font-bold" },
            { name: "Warning (Amber)", varName: "var(--warning)", class: "bg-warning text-black font-bold" },
            { name: "Danger (Red)", varName: "var(--danger)", class: "bg-danger text-white font-bold" },
            { name: "Border", varName: "var(--border)", class: "bg-surface border-2 border-border text-text" },
            { name: "Border Strong", varName: "var(--border-strong)", class: "bg-surface border-2 border-border-strong text-text" },
            { name: "Text Muted", varName: "var(--text-muted)", class: "bg-surface text-text-muted border border-border" },
          ].map((c) => (
            <div key={c.name} className={`p-3 rounded-md flex flex-col justify-between h-20 ${c.class}`}>
              <span className="font-condensed font-semibold uppercase tracking-wider">{c.name}</span>
              <span className="font-mono text-[10px] opacity-80">{c.varName}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* 2. Honesty Labels (§5.7) */}
      <Panel
        title="2. Honesty Chips & Disclaimer Vocabulary"
        subtitle="Mandatory non-removable labels for prototype integrity"
        hasTicks
      >
        <div className="flex flex-wrap gap-2.5 items-center">
          {honestyLabels.map((lbl) => (
            <LabelChip key={lbl} type={lbl} />
          ))}
        </div>
      </Panel>

      {/* 3. Status Badges (§5.6) */}
      <Panel
        title="3. StatusBadge Variants"
        subtitle="6px status dot + text with high WCAG contrast"
        hasTicks
      >
        <div className="flex flex-wrap gap-2.5">
          {statusList.map((st) => (
            <StatusBadge key={st} status={st} />
          ))}
        </div>
      </Panel>

      {/* 4. Metric Tiles (§5.3) */}
      <Panel title="4. MetricTile Layout" subtitle="Tabular numerals with corner ticks and units" hasTicks>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricTile
            label="Spindle Power"
            value="18.6"
            unit="kW"
            isEstimate
            icon={<Zap className="w-3.5 h-3.5 text-accent" />}
            hint="83% of Haas VF-2 rating (22.4 kW)"
          />
          <MetricTile
            label="Cycle Time"
            value="00:08:12"
            unit="m:s"
            isEstimate
            icon={<Clock className="w-3.5 h-3.5 text-info" />}
            hint="Feed 6.9m · Rapid 0.8m · Toolchange 0.5m"
          />
          <MetricTile
            label="Bounding Volume"
            value="80,000"
            unit="mm³"
            icon={<Layers className="w-3.5 h-3.5 text-success" />}
            hint="Dimensions: 80 × 50 × 20 mm"
          />
          <MetricTile
            label="Security Status"
            value="Verified"
            icon={<Shield className="w-3.5 h-3.5 text-success" />}
            hint="All foreign keys & hashes intact"
          />
        </div>
      </Panel>

      {/* 5. Workflow Stepper */}
      <Panel title="5. Workflow Stepper" subtitle="Tracks Design → CAM → Sim → Approval sequence" hasTicks>
        <WorkflowStepper steps={demoSteps} currentStepId="3" />
      </Panel>

      {/* 6. Chips and Hash Display */}
      <Panel title="6. Hashes, Versions, and Chips" subtitle="Monospaced truncated identifiers" hasTicks>
        <div className="flex flex-wrap gap-4 items-center">
          <HashDisplay
            label="Plan Hash"
            hash="9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
          />
          <HashDisplay
            label="CAD Version"
            hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
          />
          <Chip variant="accent">v2.1</Chip>
          <Chip variant="neutral">STL MESH</Chip>
          <Chip variant="mono">X 42.50 Y 18.00 Z -3.00</Chip>
        </div>
      </Panel>

      {/* 7. States: Empty, Error, Skeleton */}
      <Panel title="7. Loading, Empty, and Error States (§12)" subtitle="Always implemented for every data view" hasTicks>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <EmptyState
            title="No CAM jobs yet"
            description="Create your first computer-aided manufacturing configuration for this part."
            action={{ label: "New CAM Job", onClick: () => alert("New job clicked") }}
          />

          <ErrorState
            title="Spindle RPM Exceeded"
            message="Selected tool speed of 14,000 rpm exceeds machine profile limit (10,000 rpm)."
            whatNext="Clamp speed to 10,000 rpm or choose a high-speed spindle machine."
            requestId="err-8f3a1"
            onRetry={() => alert("Retrying...")}
          />

          <div className="space-y-2">
            <div className="text-xs font-condensed uppercase tracking-wider text-text-muted">Skeleton Loader</div>
            <LoadingSkeleton variant="tile" />
          </div>
        </div>
      </Panel>

      {/* 8. Code & Confirmation Modal */}
      <Panel title="8. Code Blocks and Confirm Dialogs" subtitle="G-code inspection and governance actions" hasTicks>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-2">Modal confirmation with mandatory comment (min 10 chars):</span>
            <button
              onClick={() => setDialogOpen(true)}
              className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-xs font-semibold rounded-md transition-colors shadow-sm"
            >
              Open Approval Dialog Demo
            </button>
          </div>

          <CodeBlock
            code={`(NOT FOR PRODUCTION - PROTOTYPE OUTPUT)\n(JOB demo-facing-al6061)\nG21 G17 G90 G94 G54\nT1 M6 (D10 FLAT END MILL)\nS8000 M3\nG0 Z5.000\nG1 Z-0.500 F200.0\nM5\nM30`}
            language="gcode"
            maxHeight="160px"
          />
        </div>
      </Panel>

      <ConfirmDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={(comment) => {
          alert(`Approved with comment: "${comment}"`);
          setDialogOpen(false);
        }}
        title="Approve Manufacturing Release"
        description="Approving locks the CAM job and creates a cryptographic plan snapshot. This action is immutable."
        confirmText="Confirm Approval"
        requireComment
      />
    </div>
  );
};
