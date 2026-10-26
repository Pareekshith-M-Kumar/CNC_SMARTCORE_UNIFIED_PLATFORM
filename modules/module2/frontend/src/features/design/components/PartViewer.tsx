import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  RotateCcw,
  Grid,
  Box,
  Compass,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Download,
  Loader2,
  Layers,
} from 'lucide-react';

interface PartViewerProps {
  glbUrl?: string | null;
  downloadUrl?: string | null;
  previewStatus?: 'PENDING' | 'READY' | 'FAILED';
  previewError?: string | null;
  format?: string;
  className?: string;
}

export const PartViewer: React.FC<PartViewerProps> = ({
  glbUrl,
  downloadUrl,
  previewStatus = 'READY',
  previewError,
  format = 'STL',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const currentModelRef = useRef<THREE.Group | null>(null);
  const boxHelperRef = useRef<THREE.BoxHelper | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  const animFrameId = useRef<number | null>(null);

  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [showBoundingBox, setShowBoundingBox] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f141c); // Slate dark industrial viewport background
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(120, 100, 150);
    cameraRef.current = camera;

    // Renderer and OrbitControls with WebGL safety guard
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let resizeObserver: ResizeObserver | null = null;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;
      container.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = true;
      controls.minDistance = 2;
      controls.maxDistance = 1500;
      controlsRef.current = controls;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
      scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
      dirLight1.position.set(100, 200, 100);
      dirLight1.castShadow = true;
      scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0x7090b0, 0.45);
      dirLight2.position.set(-100, -100, -100);
      scene.add(dirLight2);

      // Grid (ground plane)
      const gridHelper = new THREE.GridHelper(300, 30, 0x3b82f6, 0x1e293b);
      gridHelper.position.y = 0;
      scene.add(gridHelper);
      gridHelperRef.current = gridHelper;

      // Axes
      const axesHelper = new THREE.AxesHelper(40);
      scene.add(axesHelper);
      axesHelperRef.current = axesHelper;

      // Animation Loop
      const animate = () => {
        animFrameId.current = requestAnimationFrame(animate);
        controls?.update();
        if (renderer && sceneRef.current && cameraRef.current) {
          renderer.render(sceneRef.current, cameraRef.current);
        }
      };
      animate();

      // Resize observer
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width: newW, height: newH } = entry.contentRect;
            if (newW > 0 && newH > 0 && cameraRef.current && rendererRef.current) {
              cameraRef.current.aspect = newW / newH;
              cameraRef.current.updateProjectionMatrix();
              rendererRef.current.setSize(newW, newH);
            }
          }
        });
        resizeObserver.observe(container);
      }
    } catch {
      // In environments where WebGL is unavailable (e.g. headless unit tests or legacy hardware)
    }

    return () => {
      resizeObserver?.disconnect();
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      controls?.dispose();
      renderer?.dispose();
      if (renderer && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Fit camera to object bounds
  const fitCameraToObject = useCallback((object: THREE.Object3D) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));
    cameraZ *= 2.2; // Extra padding

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    camera.position.set(center.x + cameraZ * 0.7, center.y + cameraZ * 0.6, center.z + cameraZ * 0.7);
    camera.lookAt(center);
    controls.target.copy(center);
    camera.updateProjectionMatrix();
    controls.update();
  }, []);

  // Load GLB whenever glbUrl changes
  useEffect(() => {
    if (!glbUrl || !sceneRef.current) return;

    // Clean previous model
    if (currentModelRef.current) {
      sceneRef.current.remove(currentModelRef.current);
      currentModelRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      currentModelRef.current = null;
    }

    if (boxHelperRef.current) {
      sceneRef.current.remove(boxHelperRef.current);
      boxHelperRef.current.dispose();
      boxHelperRef.current = null;
    }

    setIsLoadingModel(true);
    setLoadError(null);

    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        if (!sceneRef.current) return;
        const model = gltf.scene;

        // Apply sleek CNC milled billet material
        const cadMaterial = new THREE.MeshStandardMaterial({
          color: 0x94a3b8, // Milled aircraft aluminum
          metalness: 0.35,
          roughness: 0.3,
          wireframe: isWireframe,
        });

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.material = cadMaterial;
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });

        // Center model geometry at origin
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        // Put bottom of part on grid (y = 0)
        const updatedBox = new THREE.Box3().setFromObject(model);
        model.position.y -= updatedBox.min.y;

        sceneRef.current.add(model);
        currentModelRef.current = model;

        // Bounding box wireframe
        const boxHelper = new THREE.BoxHelper(model, 0x38bdf8);
        boxHelper.visible = showBoundingBox;
        sceneRef.current.add(boxHelper);
        boxHelperRef.current = boxHelper;

        fitCameraToObject(model);
        setIsLoadingModel(false);
      },
      undefined,
      (err) => {
        setIsLoadingModel(false);
        setLoadError(`Failed to load 3D preview: ${err instanceof Error ? err.message : String(err)}`);
      }
    );
  }, [glbUrl, fitCameraToObject, isWireframe, showBoundingBox]);

  // Wireframe toggle
  useEffect(() => {
    if (currentModelRef.current) {
      currentModelRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat) mat.wireframe = isWireframe;
        }
      });
    }
  }, [isWireframe]);

  // Grid toggle
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // Axes toggle
  useEffect(() => {
    if (axesHelperRef.current) {
      axesHelperRef.current.visible = showAxes;
    }
  }, [showAxes]);

  // Bounding box toggle
  useEffect(() => {
    if (boxHelperRef.current) {
      boxHelperRef.current.visible = showBoundingBox;
    }
  }, [showBoundingBox]);

  // Camera presets
  const setCameraView = (type: 'iso' | 'top' | 'front' | 'right') => {
    if (!cameraRef.current || !controlsRef.current || !currentModelRef.current) return;
    const box = new THREE.Box3().setFromObject(currentModelRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 2.2;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (type) {
      case 'iso':
        camera.position.set(center.x + dist * 0.7, center.y + dist * 0.6, center.z + dist * 0.7);
        break;
      case 'top':
        camera.position.set(center.x, center.y + dist, center.z);
        break;
      case 'front':
        camera.position.set(center.x, center.y, center.z + dist);
        break;
      case 'right':
        camera.position.set(center.x + dist, center.y, center.z);
        break;
    }
    camera.lookAt(center);
    controls.target.copy(center);
    camera.updateProjectionMatrix();
    controls.update();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isPending = previewStatus === 'PENDING';
  const isFailed = previewStatus === 'FAILED' || !!previewError || (!glbUrl && previewStatus === 'READY' && format !== 'STL');

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[460px] bg-[#0b0f17] rounded-lg border border-border overflow-hidden select-none ${className}`}
    >
      {/* 3D Viewport Controls Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 p-1 rounded-md bg-surface/85 backdrop-blur-md border border-border shadow-md">
        <button
          type="button"
          onClick={() => setCameraView('iso')}
          className="px-2 py-1 text-xs font-mono font-medium text-text hover:text-accent hover:bg-surface-2 rounded transition-colors"
          title="Isometric View"
        >
          ISO
        </button>
        <button
          type="button"
          onClick={() => setCameraView('top')}
          className="px-2 py-1 text-xs font-mono font-medium text-text hover:text-accent hover:bg-surface-2 rounded transition-colors"
          title="Top View (Z-Up)"
        >
          TOP
        </button>
        <button
          type="button"
          onClick={() => setCameraView('front')}
          className="px-2 py-1 text-xs font-mono font-medium text-text hover:text-accent hover:bg-surface-2 rounded transition-colors"
          title="Front View"
        >
          FRONT
        </button>
        <button
          type="button"
          onClick={() => setCameraView('right')}
          className="px-2 py-1 text-xs font-mono font-medium text-text hover:text-accent hover:bg-surface-2 rounded transition-colors"
          title="Right Side View"
        >
          RIGHT
        </button>

        <div className="w-[1px] h-4 bg-border mx-1" />

        <button
          type="button"
          onClick={() => currentModelRef.current && fitCameraToObject(currentModelRef.current)}
          className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2 rounded transition-colors"
          title="Fit to Screen"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setIsWireframe(!isWireframe)}
          className={`p-1.5 rounded transition-colors ${
            isWireframe ? 'text-accent bg-accent/15' : 'text-text-muted hover:text-text hover:bg-surface-2'
          }`}
          title="Toggle Wireframe"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setShowBoundingBox(!showBoundingBox)}
          className={`p-1.5 rounded transition-colors ${
            showBoundingBox ? 'text-accent bg-accent/15' : 'text-text-muted hover:text-text hover:bg-surface-2'
          }`}
          title="Toggle Bounding Box"
        >
          <Box className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setShowGrid(!showGrid)}
          className={`p-1.5 rounded transition-colors ${
            showGrid ? 'text-accent bg-accent/15' : 'text-text-muted hover:text-text hover:bg-surface-2'
          }`}
          title="Toggle Worktable Grid"
        >
          <Grid className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setShowAxes(!showAxes)}
          className={`p-1.5 rounded transition-colors ${
            showAxes ? 'text-accent bg-accent/15' : 'text-text-muted hover:text-text hover:bg-surface-2'
          }`}
          title="Toggle Axes (XYZ)"
        >
          <Compass className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2 rounded transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Orbit Navigation Hint */}
      <div className="absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded bg-surface/75 backdrop-blur-sm border border-border text-[11px] font-mono text-text-muted pointer-events-none flex items-center gap-2">
        <span>LMB: Rotate</span>
        <span>•</span>
        <span>RMB / Shift: Pan</span>
        <span>•</span>
        <span>Wheel: Zoom</span>
      </div>

      {/* Loading Overlay */}
      {isLoadingModel && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface-0/70 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-accent animate-spin mb-3" />
          <p className="text-xs font-mono font-medium text-text">Loading 3D mesh model...</p>
        </div>
      )}

      {/* Pending status overlay */}
      {isPending && !isLoadingModel && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface-0/80 backdrop-blur-sm p-6 text-center">
          <Loader2 className="w-8 h-8 text-warning animate-spin mb-3" />
          <h4 className="text-sm font-semibold text-text mb-1">Generating 3D Preview</h4>
          <p className="text-xs text-text-muted max-w-sm mb-4">
            Geometry pipeline is tessellating and validating the uploaded CAD model.
          </p>
        </div>
      )}

      {/* Fallback / Unsupported / Error Overlay */}
      {isFailed && !isLoadingModel && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface-0/90 backdrop-blur-md p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-warning/15 border border-warning/30 flex items-center justify-center mb-3 text-warning">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-text mb-1">
            {previewError ? '3D Preview Failed' : 'Preview Not Available for this Format'}
          </h4>
          <p className="text-xs text-text-muted max-w-md mb-4 leading-relaxed">
            {previewError ||
              `Interactive in-browser 3D preview is currently generated for STL mesh geometry. The raw ${format} model is stored securely and available for direct download.`}
          </p>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-surface-2 hover:bg-surface-3 border border-border text-text text-xs font-medium rounded-md transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-accent" />
              <span>Download Raw {format} File</span>
            </a>
          )}
        </div>
      )}

      {/* Internal loader error */}
      {loadError && !isFailed && (
        <div className="absolute top-14 left-3 right-3 z-20 p-2.5 rounded bg-danger/15 border border-danger/30 text-danger text-xs font-mono">
          {loadError}
        </div>
      )}
    </div>
  );
};
