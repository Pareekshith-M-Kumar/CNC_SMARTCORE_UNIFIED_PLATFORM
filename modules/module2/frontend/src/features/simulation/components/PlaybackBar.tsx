import React from "react";
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Repeat } from "lucide-react";

interface PlaybackBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentMoveIndex: number;
  totalMoves: number;
  onSeek: (index: number) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  currentPoint?: {
    x: number;
    y: number;
    z: number;
    moveType?: string;
    f?: number;
    s?: number;
  };
  totalCycleTimeS?: number;
}

const SPEEDS = [0.5, 1, 2, 4, 8];

export const PlaybackBar: React.FC<PlaybackBarProps> = ({
  isPlaying,
  onTogglePlay,
  currentMoveIndex,
  totalMoves,
  onSeek,
  speed,
  onSpeedChange,
  isLooping,
  onToggleLoop,
  currentPoint,
  totalCycleTimeS = 0,
}) => {
  const elapsedS = totalMoves > 0 ? (currentMoveIndex / totalMoves) * totalCycleTimeS : 0;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-raised border border-border rounded-lg p-3 space-y-3 shadow-sm select-none">
      {/* Top row: Scrub track & timeline */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
          <span>
            Move {Math.min(currentMoveIndex + 1, totalMoves)} of {totalMoves}
          </span>
          <span>
            {formatTime(elapsedS)} / {formatTime(totalCycleTimeS)}
          </span>
        </div>
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={Math.max(0, totalMoves - 1)}
            value={currentMoveIndex}
            onChange={(e) => onSeek(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-accent focus:outline-none"
            aria-label="Simulation Scrub Slider"
          />
        </div>
      </div>

      {/* Bottom row: Control buttons, Speed pills, Coordinates HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/50">
        {/* Playback action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSeek(0)}
            title="Reset to Start"
            className="p-1.5 text-text-muted hover:text-text hover:bg-hover rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSeek(Math.max(0, currentMoveIndex - 1))}
            disabled={currentMoveIndex <= 0}
            title="Step Backward"
            className="p-1.5 text-text-muted hover:text-text hover:bg-hover rounded disabled:opacity-40 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={onTogglePlay}
            title={isPlaying ? "Pause" : "Play"}
            className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg rounded font-medium flex items-center gap-1.5 text-xs transition-colors shadow-sm"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>
          <button
            onClick={() => onSeek(Math.min(totalMoves - 1, currentMoveIndex + 1))}
            disabled={currentMoveIndex >= totalMoves - 1}
            title="Step Forward"
            className="p-1.5 text-text-muted hover:text-text hover:bg-hover rounded disabled:opacity-40 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleLoop}
            title={isLooping ? "Disable Loop" : "Enable Loop"}
            className={`p-1.5 rounded transition-colors ${
              isLooping ? "text-accent bg-accent/10" : "text-text-muted hover:text-text hover:bg-hover"
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Speed multiplier selector */}
        <div className="flex items-center gap-1 bg-surface border border-border rounded p-0.5 text-xs font-mono">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                speed === s
                  ? "bg-accent text-accent-fg font-semibold shadow-xs"
                  : "text-text-muted hover:text-text hover:bg-hover"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Real-time Tool coordinates HUD */}
        {currentPoint && (
          <div className="hidden sm:flex items-center gap-3 bg-surface/80 border border-border px-2.5 py-1 rounded text-[11px] font-mono text-text-2">
            <span
              className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                currentPoint.moveType === "RAPID"
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  : currentPoint.moveType === "PLUNGE"
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "bg-teal-500/10 text-teal-400 border border-teal-500/20"
              }`}
            >
              {currentPoint.moveType || "FEED"}
            </span>
            <span>
              X: <strong className="text-text">{currentPoint.x.toFixed(2)}</strong>
            </span>
            <span>
              Y: <strong className="text-text">{currentPoint.y.toFixed(2)}</strong>
            </span>
            <span>
              Z: <strong className="text-text">{currentPoint.z.toFixed(2)}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
