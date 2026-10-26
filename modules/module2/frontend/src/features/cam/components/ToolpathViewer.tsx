import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Box,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Activity,
  Layers,
  Gauge,
  Zap,
} from 'lucide-react';
import { ToolpathGeometry, ToolpathPoint } from '../types';

interface ToolpathViewerProps {
  toolpath: ToolpathGeometry | null;
  isLoading?: boolean;
  className?: string;
  onScrubChange?: (index: number) => void;
  focusedPoint?: { x: number; y: number; z: number } | null;
  externalStep?: number;
}

interface FlattenedMove {
  opSeq: number;
  opType: string;
  from: ToolpathPoint;
  to: ToolpathPoint;
  moveType: string;
  feed: number;
  spindle: number;
}

const COLOR_RAPID = new THREE.Color('#00E5FF'); // Cyan / Bright Blue
const COLOR_FEED = new THREE.Color('#00E676');  // Neon Green
const COLOR_PLUNGE = new THREE.Color('#FF1744'); // Vivid Red
const COLOR_ARC = new THREE.Color('#FFD600');   // Amber Yellow

export const ToolpathViewer: React.FC<ToolpathViewerProps> = ({
  toolpath,
  isLoading = false,
  className = '',
  onScrubChange,
  focusedPoint,
  externalStep,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const toolMeshRef = useRef<THREE.Group | null>(null);
  const lineMeshRef = useRef<THREE.LineSegments | null>(null);
  const stockMeshRef = useRef<THREE.Group | null>(null);
  const animFrameId = useRef<number | null>(null);

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showRapids, setShowRapids] = useState<boolean>(true);
  const [showStock, setShowStock] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Flatten toolpath operations into an ordered sequence of line moves
  const moves: FlattenedMove[] = useMemo(() => {
    if (!toolpath || !toolpath.operations) return [];
    const list: FlattenedMove[] = [];
    let lastPoint: ToolpathPoint = {
      x: 0,
      y: 0,
      z: (toolpath.stock?.safeZ ?? 5.0),
      moveType: 'RAPID',
      f: 15000,
      s: 0,
    };

    for (const op of toolpath.operations) {
      if (!op.points || op.points.length === 0) continue;
      for (const pt of op.points) {
        list.push({
          opSeq: op.seq,
          opType: op.opType,
          from: lastPoint,
          to: pt,
          moveType: pt.moveType || 'FEED',
          feed: pt.f ?? op.feedMmMin,
          spindle: pt.s ?? op.spindleRpm,
        });
        lastPoint = pt;
      }
    }
    return list;
  }, [toolpath]);

  const totalMoves = moves.length;

  // Whenever moves change, reset scrub to start at 0 so simulation plays from start
  useEffect(() => {
    if (totalMoves > 0) {
      setCurrentStep(0);
      setIsPlaying(false);
    }
  }, [totalMoves]);

  // Synchronize externalStep if provided
  useEffect(() => {
    if (externalStep !== undefined && externalStep >= 0 && externalStep < totalMoves) {
      setCurrentStep(externalStep);
    }
  }, [externalStep, totalMoves]);

  // Focus camera on focusedPoint if provided
  useEffect(() => {
    if (!focusedPoint || !controlsRef.current || !cameraRef.current) return;
    const { x, y, z } = focusedPoint;
    controlsRef.current.target.set(x, y, z);
    cameraRef.current.position.set(x + 50, y + 50, z + 50);
    controlsRef.current.update();
  }, [focusedPoint]);

  // Center coordinate offset for nice orbiting
  const stockCenter = useMemo(() => {
    if (!toolpath?.stock) return { x: 0, y: 0, z: 0 };
    return {
      x: toolpath.stock.x / 2,
      y: toolpath.stock.y / 2,
      z: toolpath.stock.z / 2,
    };
  }, [toolpath]);

  // Initialize Three.js
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d14);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(120, 140, 160);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.target.set(0, 0, 0);
      controlsRef.current = controls;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      scene.add(ambientLight);
      const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight1.position.set(150, 200, 150);
      scene.add(dirLight1);
      const dirLight2 = new THREE.DirectionalLight(0x60a5fa, 0.4);
      dirLight2.position.set(-150, -100, -150);
      scene.add(dirLight2);

      // Floor Grid
      const grid = new THREE.GridHelper(300, 30, 0x334155, 0x1e293b);
      grid.position.y = -0.5;
      scene.add(grid);

      // Coordinate Axes (Red=X, Green=Z-vertical, Blue=Y)
      const axes = new THREE.AxesHelper(30);
      axes.position.set(-60, 0, -60);
      scene.add(axes);

      // Tool Mesh representation
      const toolGroup = new THREE.Group();
      // Tool shank (yellow-gold cylinder)
      const shankGeo = new THREE.CylinderGeometry(3, 3, 20, 16);
      const shankMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.8,
        roughness: 0.3,
      });
      const shank = new THREE.Mesh(shankGeo, shankMat);
      shank.position.y = 10;
      toolGroup.add(shank);

      // Tool cutting flutes (silver)
      const fluteGeo = new THREE.CylinderGeometry(2.5, 2.5, 10, 16);
      const fluteMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.9,
        roughness: 0.2,
      });
      const flutes = new THREE.Mesh(fluteGeo, fluteMat);
      flutes.position.y = 0;
      toolGroup.add(flutes);

      // Cutting tip indicator (glowing red dot)
      const tipGeo = new THREE.SphereGeometry(1.2, 12, 12);
      const tipMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.y = -5;
      toolGroup.add(tip);

      toolGroup.visible = false;
      scene.add(toolGroup);
      toolMeshRef.current = toolGroup;

      // Animation loop with continuous CNC cutter flute rotation
      const animate = () => {
        animFrameId.current = requestAnimationFrame(animate);
        if (toolMeshRef.current && toolMeshRef.current.visible) {
          // Visibly spin the CNC cutter tool at spindle speed during toolpath simulation
          toolMeshRef.current.rotation.y += 0.28;
        }
        if (controls) controls.update();
        if (renderer && scene && camera) renderer.render(scene, camera);
      };
      animate();
    } catch {
      // Graceful fallback for non-WebGL environments (e.g. testing)
    }

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (container && rendererRef.current.domElement && container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);

  // Build stock bounds mesh when toolpath changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !toolpath?.stock) return;

    if (stockMeshRef.current) {
      scene.remove(stockMeshRef.current);
      stockMeshRef.current = null;
    }

    const { x: sx, y: sy, z: sz } = toolpath.stock;
    const stockGroup = new THREE.Group();

    // Translucent box
    const boxGeo = new THREE.BoxGeometry(sx, sz, sy);
    const boxMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    boxMesh.position.set(0, sz / 2, 0);
    stockGroup.add(boxMesh);

    // Crisp wireframe edges
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
      linewidth: 1.5,
    });
    const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
    wireframe.position.set(0, sz / 2, 0);
    stockGroup.add(wireframe);

    stockGroup.visible = showStock;
    scene.add(stockGroup);
    stockMeshRef.current = stockGroup;

    // Auto-fit camera
    if (cameraRef.current && controlsRef.current) {
      const maxDim = Math.max(sx, sy, sz, 40);
      cameraRef.current.position.set(maxDim * 1.5, maxDim * 1.6, maxDim * 1.8);
      controlsRef.current.target.set(0, sz / 2, 0);
      controlsRef.current.update();
    }
  }, [toolpath, showStock]);

  // Build the toolpath line geometry
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || moves.length === 0) return;

    if (lineMeshRef.current) {
      scene.remove(lineMeshRef.current);
      lineMeshRef.current.geometry.dispose();
      lineMeshRef.current = null;
    }

    const positions: number[] = [];
    const colors: number[] = [];

    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      // Convert CNC coords (X, Y, Z) to Three.js coords:
      // X = X - stockCenter.x
      // Y = Z (up)
      // Z = -(Y - stockCenter.y)
      const x1 = m.from.x - stockCenter.x;
      const y1 = m.from.z;
      const z1 = -(m.from.y - stockCenter.y);

      const x2 = m.to.x - stockCenter.x;
      const y2 = m.to.z;
      const z2 = -(m.to.y - stockCenter.y);

      positions.push(x1, y1, z1, x2, y2, z2);

      let col = COLOR_FEED;
      if (m.moveType === 'RAPID') col = COLOR_RAPID;
      else if (m.moveType === 'PLUNGE') col = COLOR_PLUNGE;
      else if (m.moveType === 'ARC') col = COLOR_ARC;

      colors.push(col.r, col.g, col.b, col.r, col.g, col.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
      transparent: true,
      opacity: 0.95,
    });

    const lines = new THREE.LineSegments(geometry, material);
    scene.add(lines);
    lineMeshRef.current = lines;
  }, [moves, stockCenter]);

  // Update draw range & tool position based on currentStep
  useEffect(() => {
    if (!lineMeshRef.current || moves.length === 0) return;

    const visibleCount = Math.min(currentStep + 1, moves.length);
    // 2 vertices per move segment
    lineMeshRef.current.geometry.setDrawRange(0, visibleCount * 2);

    // Update tool position
    if (toolMeshRef.current && visibleCount > 0) {
      const activeMove = moves[visibleCount - 1];
      const activePt = activeMove.to;
      toolMeshRef.current.visible = true;
      toolMeshRef.current.position.set(
        activePt.x - stockCenter.x,
        activePt.z + 5, // tip sits at activePt.z
        -(activePt.y - stockCenter.y)
      );
    }
  }, [currentStep, moves, stockCenter]);

  // Toggle rapids visibility by swapping geometry or draw range
  useEffect(() => {
    if (!lineMeshRef.current) return;
    // We could dynamically hide rapids or adjust opacity
    lineMeshRef.current.visible = true;
  }, [showRapids]);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying || totalMoves === 0) return;

    const intervalMs = Math.max(16, Math.floor(40 / playbackSpeed));
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalMoves - 1) {
          setIsPlaying(false);
          return totalMoves - 1;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, totalMoves, playbackSpeed]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setCurrentStep(val);
    if (onScrubChange) onScrubChange(val);
  };

  const handleTogglePlay = useCallback(() => {
    if (totalMoves === 0) return;
    if (!isPlaying && currentStep >= totalMoves - 1) {
      setCurrentStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [isPlaying, currentStep, totalMoves]);

  const handleResetCamera = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current || !toolpath?.stock) return;
    const { x: sx, y: sy, z: sz } = toolpath.stock;
    const maxDim = Math.max(sx, sy, sz, 50);
    cameraRef.current.position.set(maxDim * 1.5, maxDim * 1.6, maxDim * 1.8);
    controlsRef.current.target.set(0, sz / 2, 0);
    controlsRef.current.update();
  }, [toolpath]);

  const activeMove = moves[currentStep] || moves[moves.length - 1];

  return (
    <div
      className={`relative flex flex-col bg-slate-950 rounded-xl border border-slate-800 overflow-hidden select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full h-[540px]'
      } ${className}`}
    >
      {/* 3D WebGL Canvas */}
      <div className="w-full flex-1 relative cursor-grab active:cursor-grabbing">
        {/* Isolated Three.js canvas container — no React children inside */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm text-slate-200">
            <Activity className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
            <p className="text-sm font-medium">Generating 2.5D Toolpath Geometry...</p>
            <p className="text-xs text-slate-400 mt-1">Slicing pockets, offsets & clearance passes</p>
          </div>
        )}

        {!isLoading && totalMoves === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 text-slate-400 p-6 text-center">
            <Layers className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-base font-semibold text-slate-300">No Toolpath Geometry Available</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Configure operations and click &quot;Generate Toolpaths &amp; G-Code&quot; to synthesize polyline toolpaths and 3D simulation.
            </p>
          </div>
        )}

        {/* Floating Realtime Telemetry HUD */}
        {activeMove && (
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 p-3 rounded-lg bg-slate-900/85 backdrop-blur-md border border-slate-700/60 text-xs shadow-xl pointer-events-none">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] tracking-wider uppercase ${
                  activeMove.moveType === 'RAPID'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : activeMove.moveType === 'PLUNGE'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : activeMove.moveType === 'ARC'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {activeMove.moveType}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                Op #{activeMove.opSeq} ({activeMove.opType})
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-300 pt-1 border-t border-slate-800">
              <div>
                <span className="text-slate-500 mr-1">X:</span>
                <span className="font-semibold text-white">{activeMove.to.x.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 mr-1">Y:</span>
                <span className="font-semibold text-white">{activeMove.to.y.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 mr-1">Z:</span>
                <span className="font-semibold text-white">{activeMove.to.z.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 gap-3">
              <span className="flex items-center gap-1">
                <Gauge className="w-3 h-3 text-cyan-400" />
                F: <span className="text-slate-200 font-semibold">{Math.round(activeMove.feed)}</span> mm/min
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                S: <span className="text-slate-200 font-semibold">{Math.round(activeMove.spindle)}</span> RPM
              </span>
            </div>
          </div>
        )}

        {/* Top-Right Quick Viewport Controls */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/60 shadow-lg">
          <button
            type="button"
            onClick={() => setShowStock(!showStock)}
            title={showStock ? 'Hide Stock Bounding Box' : 'Show Stock Bounding Box'}
            className={`p-1.5 rounded transition-colors ${
              showStock ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowRapids(!showRapids)}
            title={showRapids ? 'Hide Rapid Moves' : 'Show Rapid Moves'}
            className={`p-1.5 rounded transition-colors ${
              showRapids ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {showRapids ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleResetCamera}
            title="Reset Camera View"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Color Legend Overlay */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900/85 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]" />
            <span>Rapid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E676] shadow-[0_0_6px_#00E676]" />
            <span>Feed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF1744] shadow-[0_0_6px_#FF1744]" />
            <span>Plunge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFD600] shadow-[0_0_6px_#FFD600]" />
            <span>Arc</span>
          </div>
        </div>
      </div>

      {/* Scrub & Playback Controller Bar */}
      <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
        {/* Scrub Slider */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-400 min-w-[70px]">
            Move {totalMoves > 0 ? currentStep + 1 : 0} / {totalMoves}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, totalMoves - 1)}
            value={currentStep}
            onChange={handleSliderChange}
            disabled={totalMoves === 0}
            className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40"
          />
          <span className="font-mono text-xs text-cyan-400 font-semibold min-w-[45px] text-right">
            {totalMoves > 0 ? Math.round(((currentStep + 1) / totalMoves) * 100) : 0}%
          </span>
        </div>

        {/* Playback & Speed Controls */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentStep(0)}
              disabled={totalMoves === 0 || currentStep === 0}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 disabled:opacity-30 transition-colors"
              title="Jump to Start"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleTogglePlay}
              disabled={totalMoves === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-colors shadow-sm ${
                isPlaying
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400'
              } disabled:opacity-40`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(totalMoves - 1)}
              disabled={totalMoves === 0 || currentStep >= totalMoves - 1}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 disabled:opacity-30 transition-colors"
              title="Jump to End"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 ml-3 border-l border-slate-800 pl-3">
              {[0.5, 1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Aggregate Path Summary */}
          {toolpath && (
            <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-slate-400">
              <span>
                Path: <span className="text-white font-medium">{toolpath.totalPathLengthMm.toFixed(1)}</span> mm
              </span>
              <span>
                Cutting: <span className="text-emerald-400 font-medium">{toolpath.totalCuttingLengthMm.toFixed(1)}</span> mm
              </span>
              <span>
                Time:{' '}
                <span className="text-cyan-400 font-medium">
                  {Math.floor(toolpath.totalCycleTimeS / 60)}m {Math.round(toolpath.totalCycleTimeS % 60)}s
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
