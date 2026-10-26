import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FindingsPanel } from "./components/FindingsPanel";
import { StatsPanel } from "./components/StatsPanel";
import { PlaybackBar } from "./components/PlaybackBar";
import { SimulationFinding, SimulationStats } from "./types";

const mockFindings: SimulationFinding[] = [
  {
    id: "f1",
    ruleCode: "RAPID_INTO_STOCK",
    severity: "FAIL",
    message: "Rapid move penetrates raw stock at Z=-2.5 mm",
    moveIndex: 12,
    xMm: 20.0,
    yMm: 30.0,
    zMm: -2.5,
  },
  {
    id: "f2",
    ruleCode: "DOC_EXCEEDS_RECOMMENDED",
    severity: "WARN",
    message: "Axial depth of cut ap (6.5mm) > 0.6x tool diameter",
    moveIndex: 45,
    xMm: 15.0,
    yMm: 20.0,
    zMm: -6.5,
  },
  {
    id: "f3",
    ruleCode: "TINY_SEGMENT",
    severity: "INFO",
    message: "Micro-segment detected (0.005mm)",
    moveIndex: 90,
    xMm: 50.0,
    yMm: 50.0,
    zMm: 0.0,
  },
];

const mockStats: SimulationStats = {
  totalCycleTimeS: 150,
  totalPathLengthMm: 12500,
  totalCuttingLengthMm: 9500,
  totalRapidLengthMm: 3000,
  totalMoves: 120,
  maxDepthEngagedMm: 18.5,
  maxPowerKw: 8.4,
  powerUtilizationPct: 75.2,
  findingCounts: { FAIL: 1, WARN: 1, INFO: 1 },
};

describe("Simulation Module Component Tests", () => {
  describe("FindingsPanel", () => {
    it("renders all findings with rule code, severity badge, and coordinates", () => {
      const handleSelect = vi.fn();
      render(
        <FindingsPanel
          findings={mockFindings}
          onSelectFinding={handleSelect}
        />
      );

      expect(screen.getByText("RAPID_INTO_STOCK")).toBeDefined();
      expect(screen.getByText("DOC_EXCEEDS_RECOMMENDED")).toBeDefined();
      expect(screen.getByText("TINY_SEGMENT")).toBeDefined();
      expect(screen.getByText("Move #12")).toBeDefined();
      expect(screen.getByText("(20.00, 30.00, -2.50 mm)")).toBeDefined();
    });

    it("filters findings when clicking filter pills", () => {
      render(
        <FindingsPanel
          findings={mockFindings}
          onSelectFinding={vi.fn()}
        />
      );

      // Click FAIL filter
      const failBtn = screen.getByRole("button", { name: /fail/i });
      fireEvent.click(failBtn);

      expect(screen.getByText("RAPID_INTO_STOCK")).toBeDefined();
      expect(screen.queryByText("DOC_EXCEEDS_RECOMMENDED")).toBeNull();
      expect(screen.queryByText("TINY_SEGMENT")).toBeNull();
    });

    it("triggers onSelectFinding callback when a finding card is clicked", () => {
      const handleSelect = vi.fn();
      render(
        <FindingsPanel
          findings={mockFindings}
          onSelectFinding={handleSelect}
        />
      );

      const item = screen.getByText("RAPID_INTO_STOCK");
      fireEvent.click(item);
      expect(handleSelect).toHaveBeenCalledWith(mockFindings[0]);
    });
  });

  describe("StatsPanel", () => {
    it("formats total cycle time into minutes and seconds", () => {
      render(<StatsPanel stats={mockStats} rulesetVersion="sim-1.0" />);
      expect(screen.getByText("2m 30s")).toBeDefined();
      expect(screen.getByText("120 programmed blocks")).toBeDefined();
    });

    it("displays spindle power utilization and max kW", () => {
      render(<StatsPanel stats={mockStats} rulesetVersion="sim-1.0" />);
      expect(screen.getByText("75.2%")).toBeDefined();
      expect(screen.getByText("8.40")).toBeDefined();
    });

    it("displays path length in meters and cutting vs rapid breakdown", () => {
      render(<StatsPanel stats={mockStats} rulesetVersion="sim-1.0" />);
      expect(screen.getByText("12.50")).toBeDefined();
      expect(screen.getByText(/Cut: 9.5m/)).toBeDefined();
      expect(screen.getByText(/Rapid: 3.0m/)).toBeDefined();
      expect(screen.getByText("-18.50")).toBeDefined();
    });
  });

  describe("PlaybackBar", () => {
    it("renders progress and current move index", () => {
      render(
        <PlaybackBar
          isPlaying={false}
          onTogglePlay={vi.fn()}
          currentMoveIndex={25}
          totalMoves={100}
          onSeek={vi.fn()}
          speed={1}
          onSpeedChange={vi.fn()}
          isLooping={false}
          onToggleLoop={vi.fn()}
          totalCycleTimeS={300}
        />
      );

      expect(screen.getByText("Move 26 of 100")).toBeDefined();
    });

    it("triggers onTogglePlay when clicking Play button", () => {
      const handlePlay = vi.fn();
      render(
        <PlaybackBar
          isPlaying={false}
          onTogglePlay={handlePlay}
          currentMoveIndex={0}
          totalMoves={100}
          onSeek={vi.fn()}
          speed={1}
          onSpeedChange={vi.fn()}
          isLooping={false}
          onToggleLoop={vi.fn()}
        />
      );

      const playBtn = screen.getByRole("button", { name: /play/i });
      fireEvent.click(playBtn);
      expect(handlePlay).toHaveBeenCalledTimes(1);
    });

    it("triggers onSpeedChange when selecting speed multiplier", () => {
      const handleSpeed = vi.fn();
      render(
        <PlaybackBar
          isPlaying={false}
          onTogglePlay={vi.fn()}
          currentMoveIndex={0}
          totalMoves={100}
          onSeek={vi.fn()}
          speed={1}
          onSpeedChange={handleSpeed}
          isLooping={false}
          onToggleLoop={vi.fn()}
        />
      );

      const speedBtn = screen.getByText("4x");
      fireEvent.click(speedBtn);
      expect(handleSpeed).toHaveBeenCalledWith(4);
    });

    it("displays real-time coordinates HUD when currentPoint is provided", () => {
      render(
        <PlaybackBar
          isPlaying={false}
          onTogglePlay={vi.fn()}
          currentMoveIndex={10}
          totalMoves={50}
          onSeek={vi.fn()}
          speed={1}
          onSpeedChange={vi.fn()}
          isLooping={false}
          onToggleLoop={vi.fn()}
          currentPoint={{ x: 12.34, y: 56.78, z: -3.5, moveType: "FEED" }}
        />
      );

      expect(screen.getByText("12.34")).toBeDefined();
      expect(screen.getByText("56.78")).toBeDefined();
      expect(screen.getByText("-3.50")).toBeDefined();
      expect(screen.getByText("FEED")).toBeDefined();
    });
  });
});
