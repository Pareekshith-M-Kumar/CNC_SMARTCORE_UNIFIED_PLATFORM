import { render, screen, act, within } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import App from "./App";

describe("CNC SmartCore App Shell (Milestone 2)", () => {
  it("renders main dashboard header and metric cards on initial load", async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText("Manufacturing Dashboard")).toBeInTheDocument();
    expect(screen.getByText("CAD Assets")).toBeInTheDocument();
    expect(screen.getByText("Active CAM Jobs")).toBeInTheDocument();
    expect(screen.getByText("Awaiting Approval")).toBeInTheDocument();
    expect(screen.getByText("Approved Plans")).toBeInTheDocument();
  });

  it("renders sidebar navigation links", async () => {
    await act(async () => {
      render(<App />);
    });

    const nav = screen.getByRole("navigation", { name: "Main Navigation" });
    expect(within(nav).getByText("Dashboard")).toBeInTheDocument();
    expect(within(nav).getByText("CAD Library")).toBeInTheDocument();
    expect(within(nav).getByText("Materials")).toBeInTheDocument();
    expect(within(nav).getByText("CAM Jobs")).toBeInTheDocument();
    expect(within(nav).getByText("Simulation")).toBeInTheDocument();
    expect(within(nav).getByText("Approvals")).toBeInTheDocument();
    expect(within(nav).getByText("Design System")).toBeInTheDocument();
  });
});
