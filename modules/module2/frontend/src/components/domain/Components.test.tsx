import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { StatusBadge } from "./StatusBadge";
import { MetricTile } from "./MetricTile";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { WorkflowStepper } from "./WorkflowStepper";
import { LabelChip } from "./LabelChip";

describe("Domain Components Test Suite (Milestone 2)", () => {
  it("renders StatusBadge variants correctly with accessible text", () => {
    const { rerender } = render(<StatusBadge status="READY" />);
    expect(screen.getByText("Preview ready")).toBeInTheDocument();

    rerender(<StatusBadge status="PENDING" />);
    expect(screen.getByText("Processing")).toBeInTheDocument();

    rerender(<StatusBadge status="FAILED" />);
    expect(screen.getByText("Conversion failed")).toBeInTheDocument();

    rerender(<StatusBadge status="WARN" />);
    expect(screen.getByText("Warnings")).toBeInTheDocument();
  });

  it("renders MetricTile with value, unit, and estimate label", () => {
    render(
      <MetricTile
        label="Spindle Power"
        value="18.6"
        unit="kW"
        isEstimate
        hint="83% of rated limit"
      />
    );
    expect(screen.getByText("Spindle Power")).toBeInTheDocument();
    expect(screen.getByText("18.6")).toBeInTheDocument();
    expect(screen.getByText("kW")).toBeInTheDocument();
    expect(screen.getByText("Estimate")).toBeInTheDocument();
    expect(screen.getByText("83% of rated limit")).toBeInTheDocument();
  });

  it("renders EmptyState and triggers action callback", () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No CAD files yet"
        description="Upload a STEP or STL file to begin."
        action={{ label: "Upload File", onClick: handleAction }}
      />
    );

    expect(screen.getByText("No CAD files yet")).toBeInTheDocument();
    expect(screen.getByText("Upload a STEP or STL file to begin.")).toBeInTheDocument();

    const button = screen.getByRole("button", { name: "Upload File" });
    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it("renders ErrorState with message, what-next suggestion, and retry button", () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState
        title="Travel Limit Exceeded"
        message="X axis travel exceeds 762 mm machine capacity."
        whatNext="Reposition WCS origin or choose a larger machine."
        requestId="req-xyz123"
        onRetry={handleRetry}
      />
    );

    expect(screen.getByText("Travel Limit Exceeded")).toBeInTheDocument();
    expect(screen.getByText("X axis travel exceeds 762 mm machine capacity.")).toBeInTheDocument();
    expect(screen.getByText("Reposition WCS origin or choose a larger machine.")).toBeInTheDocument();
    expect(screen.getByText("ID: req-xyz123")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("renders WorkflowStepper with complete, active, and blocked steps", () => {
    const handleStepClick = vi.fn();
    const steps = [
      { id: "1", label: "Design", status: "complete" as const },
      { id: "2", label: "CAM", status: "active" as const },
      { id: "3", label: "Simulation", status: "blocked" as const, blockedReason: "Generate toolpath first" },
    ];

    render(
      <WorkflowStepper
        steps={steps}
        currentStepId="2"
        onStepClick={handleStepClick}
      />
    );

    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByText("CAM")).toBeInTheDocument();
    expect(screen.getByText("Simulation")).toBeInTheDocument();

    // Click active step
    fireEvent.click(screen.getByRole("button", { name: /cam/i }));
    expect(handleStepClick).toHaveBeenCalledWith("2");

    // Blocked step is disabled
    const blockedBtn = screen.getByRole("button", { name: /simulation/i });
    expect(blockedBtn).toBeDisabled();
  });

  it("renders LabelChip honesty badges correctly", () => {
    const { rerender } = render(<LabelChip type="estimate" />);
    expect(screen.getByText("Estimate")).toBeInTheDocument();

    rerender(<LabelChip type="rule-based" />);
    expect(screen.getByText("Rule-based recommendation")).toBeInTheDocument();

    rerender(<LabelChip type="prototype-output" />);
    expect(screen.getByText("Prototype output — not for production")).toBeInTheDocument();
  });
});
