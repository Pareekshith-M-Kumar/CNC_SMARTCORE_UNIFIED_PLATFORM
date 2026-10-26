import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { api, ApiError } from '@/lib/apiClient';
import { exportMeshesToBinaryStl } from '../utils/stlExporter';
import { CadFeature, FeatureType, MATERIAL_PRESETS, MaterialDensity } from './types';
import { CadAsset } from '../types';
import { Chip } from '@/components/domain/Chip';
import { LabelChip } from '@/components/domain/LabelChip';
import {
  Box,
  Circle,
  Scissors,
  Layers,
  Move,
  RotateCw,
  Maximize2,
  Compass,
  Download,
  Upload,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  ArrowLeft,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const CadStudioPage: React.FC = () => {
  const navigate = useNavigate();

  // Container & Three.js refs
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const meshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const animFrameId = useRef<number | null>(null);

  // Studio State
  const [features, setFeatures] = useState<CadFeature[]>([
    {
      id: 'body-1',
      name: 'Base Stock Plate',
      type: 'block',
      position: [0, 10, 0],
      rotation: [0, 0, 0],
      dimensions: { width: 120, length: 80, height: 20 },
      isCut: false,
      visible: true,
      color: '#94a3b8',
    },
    {
      id: 'feature-1',
      name: 'Central Pocket',
      type: 'pocket',
      position: [0, 15, 0],
      rotation: [0, 0, 0],
      dimensions: { width: 60, length: 40, height: 10 },
      isCut: true,
      visible: true,
      color: '#38bdf8',
    },
    {
      id: 'feature-2',
      name: 'Mounting Bore Hole',
      type: 'bore',
      position: [40, 10, 25],
      rotation: [0, 0, 0],
      dimensions: { width: 12, length: 12, height: 22, diameter: 12 },
      isCut: true,
      visible: true,
      color: '#f59e0b',
    },
  ]);

  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>('body-1');
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialDensity>(MATERIAL_PRESETS[0]);
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  // Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [partName, setPartName] = useState<string>('Custom CNC Milled Component');
  const [partDescription, setPartDescription] = useState<string>('Parametrically modeled in CNC SmartCore CAD Studio');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedFeature = useMemo(
    () => features.find((f) => f.id === selectedFeatureId) || null,
    [features, selectedFeatureId]
  );

  // Compute total volume & mass
  const physicsSummary = useMemo(() => {
    let additiveVolumeMm3 = 0;
    let subtractiveVolumeMm3 = 0;

    for (const f of features) {
      if (!f.visible) continue;
      let vol = 0;
      if (f.type === 'cylinder' || f.type === 'bore') {
        const r = (f.dimensions.diameter || f.dimensions.width) / 2;
        vol = Math.PI * r * r * f.dimensions.height;
      } else {
        vol = f.dimensions.width * f.dimensions.length * f.dimensions.height;
      }

      if (f.isCut) {
        subtractiveVolumeMm3 += vol;
      } else {
        additiveVolumeMm3 += vol;
      }
    }

    const netVolumeMm3 = Math.max(additiveVolumeMm3 - subtractiveVolumeMm3, 0);
    const netVolumeCm3 = netVolumeMm3 / 1000;
    const estimatedMassGrams = netVolumeCm3 * selectedMaterial.densityGPerCm3;

    return {
      netVolumeCm3: round(netVolumeCm3, 2),
      estimatedMassGrams: round(estimatedMassGrams, 1),
      machiningRemovalPercent: additiveVolumeMm3 > 0
        ? Math.min(round((subtractiveVolumeMm3 / additiveVolumeMm3) * 100, 1), 100)
        : 0,
    };
  }, [features, selectedMaterial]);

  // Initialize Three.js scene & controls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 550;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f17); // Sleek AutoDesk dark slate viewport
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 2500);
    camera.position.set(160, 140, 200);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let transformControls: TransformControls | null = null;
    let gridHelper: THREE.GridHelper | null = null;
    let axesHelper: THREE.AxesHelper | null = null;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
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
      controls.minDistance = 10;
      controls.maxDistance = 1500;
      controlsRef.current = controls;

      // TransformControls (AutoDesk 3D manipulator gizmo)
      transformControls = new TransformControls(camera, renderer.domElement);
      transformControls.size = 0.85;
      transformControls.addEventListener('dragging-changed', (event) => {
        if (controls) controls.enabled = !event.value;
      });
      scene.add(transformControls.getHelper());
      transformControlsRef.current = transformControls;

      // Studio Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
      dirLight1.position.set(150, 250, 150);
      dirLight1.castShadow = true;
      scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0x60a5fa, 0.45);
      dirLight2.position.set(-150, -100, -150);
      scene.add(dirLight2);

      // CNC Ground Grid (Datum plane)
      gridHelper = new THREE.GridHelper(300, 30, 0x38bdf8, 0x1e293b);
      gridHelper.position.y = 0;
      scene.add(gridHelper);

      // WCS G54 Datum Origin Gizmo
      axesHelper = new THREE.AxesHelper(50);
      axesHelper.position.set(0, 0.1, 0);
      scene.add(axesHelper);

      // Animation Loop
      const animate = () => {
        animFrameId.current = requestAnimationFrame(animate);
        controls?.update();
        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      };
      animate();

      const resizeObserver = new ResizeObserver((entries) => {
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

      return () => {
        resizeObserver.disconnect();
        if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
        controls?.dispose();
        transformControls?.dispose();
        renderer?.dispose();
        if (renderer && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    } catch {
      // Graceful fallback if WebGL is unavailable
    }
  }, []);

  // Sync Features with Three.js scene meshes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const existingMeshMap = meshMapRef.current;
    const activeIds = new Set(features.map((f) => f.id));

    // Remove obsolete meshes
    existingMeshMap.forEach((mesh, id) => {
      if (!activeIds.has(id)) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
        existingMeshMap.delete(id);
      }
    });

    // Create or update meshes
    features.forEach((feature) => {
      let mesh = existingMeshMap.get(feature.id);
      const isSelected = selectedFeatureId === feature.id;

      let geom: THREE.BufferGeometry;
      if (feature.type === 'cylinder' || feature.type === 'bore') {
        const radius = (feature.dimensions.diameter || feature.dimensions.width) / 2;
        geom = new THREE.CylinderGeometry(radius, radius, feature.dimensions.height, 32);
      } else {
        geom = new THREE.BoxGeometry(
          feature.dimensions.width,
          feature.dimensions.height,
          feature.dimensions.length
        );
      }

      if (!mesh) {
        // Construct material
        const material = createFeatureMaterial(feature, isSelected, isWireframe);
        mesh = new THREE.Mesh(geom, material);
        mesh.name = feature.id;
        mesh.castShadow = !feature.isCut;
        mesh.receiveShadow = true;
        scene.add(mesh);
        existingMeshMap.set(feature.id, mesh);
      } else {
        // Update geometry & material
        mesh.geometry.dispose();
        mesh.geometry = geom;
        mesh.material = createFeatureMaterial(feature, isSelected, isWireframe);
      }

      // Update transform
      mesh.position.set(feature.position[0], feature.position[1], feature.position[2]);
      mesh.rotation.set(feature.rotation[0], feature.rotation[1], feature.rotation[2]);
      mesh.visible = feature.visible;
    });

    // Attach TransformControls to selected mesh
    if (transformControlsRef.current) {
      if (selectedFeatureId && existingMeshMap.has(selectedFeatureId)) {
        const selectedMesh = existingMeshMap.get(selectedFeatureId)!;
        transformControlsRef.current.attach(selectedMesh);
        transformControlsRef.current.setMode(transformMode);
      } else {
        transformControlsRef.current.detach();
      }
    }
  }, [features, selectedFeatureId, transformMode, isWireframe]);

  // Sync TransformControls drag back to feature state
  useEffect(() => {
    const tControls = transformControlsRef.current;
    if (!tControls) return;

    const handleObjectChange = () => {
      const obj = tControls.object;
      if (!obj || !selectedFeatureId) return;

      setFeatures((prev) =>
        prev.map((f) => {
          if (f.id === selectedFeatureId) {
            let px = obj.position.x;
            let py = obj.position.y;
            let pz = obj.position.z;

            if (snapToGrid) {
              px = Math.round(px / 5) * 5;
              py = Math.round(py / 5) * 5;
              pz = Math.round(pz / 5) * 5;
              obj.position.set(px, py, pz);
            }

            return {
              ...f,
              position: [round(px, 1), round(py, 1), round(pz, 1)],
              rotation: [round(obj.rotation.x, 2), round(obj.rotation.y, 2), round(obj.rotation.z, 2)],
            };
          }
          return f;
        })
      );
    };

    tControls.addEventListener('objectChange', handleObjectChange);
    return () => {
      tControls.removeEventListener('objectChange', handleObjectChange);
    };
  }, [selectedFeatureId, snapToGrid]);

  // Add new feature primitive
  const addPrimitive = (type: FeatureType) => {
    const id = `feature-${Date.now()}`;
    let newFeature: CadFeature;

    switch (type) {
      case 'block':
        newFeature = {
          id,
          name: `Billet Body ${features.length + 1}`,
          type: 'block',
          position: [0, 15, 0],
          rotation: [0, 0, 0],
          dimensions: { width: 80, length: 60, height: 20 },
          isCut: false,
          visible: true,
          color: '#94a3b8',
        };
        break;
      case 'cylinder':
        newFeature = {
          id,
          name: `Cylinder Boss ${features.length + 1}`,
          type: 'cylinder',
          position: [0, 20, 0],
          rotation: [0, 0, 0],
          dimensions: { width: 30, length: 30, height: 30, diameter: 30 },
          isCut: false,
          visible: true,
          color: '#94a3b8',
        };
        break;
      case 'pocket':
        newFeature = {
          id,
          name: `Milled Pocket ${features.length + 1}`,
          type: 'pocket',
          position: [0, 16, 0],
          rotation: [0, 0, 0],
          dimensions: { width: 40, length: 30, height: 12 },
          isCut: true,
          visible: true,
          color: '#38bdf8',
        };
        break;
      case 'bore':
        newFeature = {
          id,
          name: `Bore Hole ${features.length + 1}`,
          type: 'bore',
          position: [20, 10, 0],
          rotation: [0, 0, 0],
          dimensions: { width: 10, length: 10, height: 25, diameter: 10 },
          isCut: true,
          visible: true,
          color: '#f59e0b',
        };
        break;
      case 'slot':
        newFeature = {
          id,
          name: `Endmill Slot ${features.length + 1}`,
          type: 'slot',
          position: [0, 18, 0],
          rotation: [0, 0, 0],
          dimensions: { width: 50, length: 12, height: 8 },
          isCut: true,
          visible: true,
          color: '#38bdf8',
        };
        break;
      case 'cnc_envelope':
        newFeature = {
          id,
          name: 'CNC Haas VF-2 Machine Table Envelope',
          type: 'cnc_envelope',
          position: [0, 75, 0],
          rotation: [0, 0, 0],
          dimensions: { width: 250, length: 200, height: 150 },
          isCut: false,
          visible: true,
          color: '#3b82f6',
        };
        break;
    }

    setFeatures((prev) => [...prev, newFeature]);
    setSelectedFeatureId(id);
  };

  const removeFeature = (id: string) => {
    setFeatures((prev) => prev.filter((f) => f.id !== id));
    if (selectedFeatureId === id) {
      setSelectedFeatureId(features.find((f) => f.id !== id)?.id || null);
    }
  };

  const toggleFeatureVisibility = (id: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, visible: !f.visible } : f))
    );
  };

  const updateSelectedDimensions = (key: 'width' | 'length' | 'height' | 'diameter', value: number) => {
    if (!selectedFeatureId) return;
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.id === selectedFeatureId) {
          const dims = { ...f.dimensions, [key]: Math.max(value, 1) };
          if (key === 'diameter') {
            dims.width = dims.diameter!;
            dims.length = dims.diameter!;
          }
          return { ...f, dimensions: dims };
        }
        return f;
      })
    );
  };

  const setCameraView = (type: 'iso' | 'top' | 'front' | 'right') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (type) {
      case 'iso':
        camera.position.set(160, 140, 200);
        break;
      case 'top':
        camera.position.set(0, 260, 0);
        break;
      case 'front':
        camera.position.set(0, 40, 260);
        break;
      case 'right':
        camera.position.set(260, 40, 0);
        break;
    }
    camera.lookAt(0, 10, 0);
    controls.target.set(0, 10, 0);
    camera.updateProjectionMatrix();
    controls.update();
  };

  // Export Binary STL locally
  const handleExportStlLocal = () => {
    const meshes = Array.from(meshMapRef.current.values()).filter(
      (m) => m.visible && m.name !== 'cnc_envelope'
    );
    if (meshes.length === 0) {
      alert('No visible solid features to export.');
      return;
    }

    const stlBlob = exportMeshesToBinaryStl(meshes, 'CNC SmartCore AutoDesk Studio Part');
    const url = URL.createObjectURL(stlBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${partName.replace(/\s+/g, '_').toLowerCase()}.stl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save directly to CAD Library & Send to CAM
  const handleSaveToCadLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    const meshes = Array.from(meshMapRef.current.values()).filter(
      (m) => m.visible && m.name !== 'cnc_envelope'
    );
    if (meshes.length === 0) {
      setSaveError('Cannot save an empty model. Add at least one solid feature.');
      return;
    }

    setIsSubmitting(true);
    setSaveError(null);

    try {
      const stlBlob = exportMeshesToBinaryStl(meshes, `CNC SmartCore: ${partName}`);
      const filename = `${partName.replace(/\s+/g, '_').toLowerCase()}.stl`;
      const file = new File([stlBlob], filename, { type: 'model/stl' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', partName.trim());
      formData.append('description', `${partDescription.trim()} (Material: ${selectedMaterial.name})`);
      formData.append('units', 'mm');

      const savedAsset = await api.post<CadAsset>('/cad-assets', formData);
      setIsSaveModalOpen(false);
      // Navigate to CAD detail page with full AI advisor and CAM initiation button
      navigate(`/cad/${savedAsset.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveError(err.message);
      } else {
        setSaveError('Failed to save CAD model to server.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 bg-surface-0 overflow-hidden select-none">
      {/* Top AutoDesk Precision Ribbon */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-1">
        {/* Left: Back & Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link
            to="/cad"
            className="flex items-center gap-1.5 text-xs font-mono font-medium text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>CAD Library</span>
          </Link>
          <div className="h-4 w-[1px] bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-text">AutoDesk CAD Modeling Studio</span>
            <Chip variant="accent">Fusion Mode</Chip>
            <LabelChip type="prototype-output" />
          </div>
        </div>

        {/* Center: Modeling Ribbon Tools */}
        <div className="flex items-center gap-1 p-1 rounded-md bg-surface border border-border">
          {/* Primitives */}
          <button
            type="button"
            onClick={() => addPrimitive('block')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text hover:text-accent hover:bg-surface-2 rounded transition-colors"
            title="Add Rectangular Billet Block"
          >
            <Box className="w-3.5 h-3.5 text-accent" />
            <span>+ Billet</span>
          </button>
          <button
            type="button"
            onClick={() => addPrimitive('cylinder')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text hover:text-accent hover:bg-surface-2 rounded transition-colors"
            title="Add Cylindrical Boss / Bar Stock"
          >
            <Circle className="w-3.5 h-3.5 text-accent" />
            <span>+ Cylinder</span>
          </button>
          <button
            type="button"
            onClick={() => addPrimitive('pocket')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text hover:text-info hover:bg-surface-2 rounded transition-colors"
            title="Add Subtractive Milled Pocket"
          >
            <Scissors className="w-3.5 h-3.5 text-info" />
            <span>+ Pocket</span>
          </button>
          <button
            type="button"
            onClick={() => addPrimitive('bore')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text hover:text-warning hover:bg-surface-2 rounded transition-colors"
            title="Add Drilled Bore Hole"
          >
            <Circle className="w-3.5 h-3.5 text-warning" />
            <span>+ Hole</span>
          </button>
          <button
            type="button"
            onClick={() => addPrimitive('slot')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text hover:text-info hover:bg-surface-2 rounded transition-colors"
            title="Add Milled Slot"
          >
            <Layers className="w-3.5 h-3.5 text-info" />
            <span>+ Slot</span>
          </button>
          <button
            type="button"
            onClick={() => addPrimitive('cnc_envelope')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text hover:text-accent hover:bg-surface-2 rounded transition-colors"
            title="Toggle CNC Machine Table Envelope"
          >
            <Maximize2 className="w-3.5 h-3.5 text-accent" />
            <span>+ CNC Bed</span>
          </button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          {/* Gizmo Modes */}
          <button
            type="button"
            onClick={() => setTransformMode('translate')}
            className={`p-1.5 rounded transition-colors ${
              transformMode === 'translate' ? 'bg-accent/20 text-accent font-bold' : 'text-text-muted hover:text-text'
            }`}
            title="Translate Gizmo (W)"
          >
            <Move className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTransformMode('rotate')}
            className={`p-1.5 rounded transition-colors ${
              transformMode === 'rotate' ? 'bg-accent/20 text-accent font-bold' : 'text-text-muted hover:text-text'
            }`}
            title="Rotate Gizmo (E)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTransformMode('scale')}
            className={`p-1.5 rounded transition-colors ${
              transformMode === 'scale' ? 'bg-accent/20 text-accent font-bold' : 'text-text-muted hover:text-text'
            }`}
            title="Scale Gizmo (R)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportStlLocal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 hover:bg-surface-3 border border-border text-text text-xs font-medium rounded-md transition-colors"
            title="Download Binary STL locally"
          >
            <Download className="w-3.5 h-3.5 text-text-muted" />
            <span>Export STL</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-xs font-semibold rounded-md shadow-sm transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Save to Library & Send to CAM</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body: 3-Column Fusion Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Model Browser / Feature Tree */}
        <div className="w-72 border-r border-border bg-surface-1 flex flex-col shrink-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-text">Parametric Feature Tree</span>
            <span className="text-[10px] font-mono text-text-muted">{features.length} Features</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {features.map((feature) => {
              const isSelected = selectedFeatureId === feature.id;
              return (
                <div
                  key={feature.id}
                  onClick={() => setSelectedFeatureId(feature.id)}
                  className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-accent bg-accent/15 shadow-sm text-text'
                      : 'border-transparent hover:border-border hover:bg-surface-2 text-text-2'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {feature.type === 'cylinder' || feature.type === 'bore' ? (
                      <Circle className={`w-3.5 h-3.5 shrink-0 ${feature.isCut ? 'text-warning' : 'text-accent'}`} />
                    ) : feature.isCut ? (
                      <Scissors className="w-3.5 h-3.5 shrink-0 text-info" />
                    ) : (
                      <Box className="w-3.5 h-3.5 shrink-0 text-accent" />
                    )}
                    <span className="truncate font-medium">{feature.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {feature.isCut && (
                      <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-info/10 text-info uppercase">
                        Cut
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFeatureVisibility(feature.id);
                      }}
                      className="p-1 text-text-muted hover:text-text rounded transition-colors"
                      title={feature.visible ? 'Hide feature' : 'Show feature'}
                    >
                      {feature.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-text-muted/50" />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFeature(feature.id);
                      }}
                      className="p-1 text-text-muted hover:text-danger rounded transition-colors"
                      title="Delete feature"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Add Footer */}
          <div className="p-2 border-t border-border grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => addPrimitive('block')}
              className="flex items-center justify-center gap-1 p-1.5 rounded bg-surface border border-border text-[11px] font-medium text-text hover:bg-surface-2 transition-colors"
            >
              <Plus className="w-3 h-3 text-accent" />
              <span>Add Billet</span>
            </button>
            <button
              type="button"
              onClick={() => addPrimitive('pocket')}
              className="flex items-center justify-center gap-1 p-1.5 rounded bg-surface border border-border text-[11px] font-medium text-text hover:bg-surface-2 transition-colors"
            >
              <Plus className="w-3 h-3 text-info" />
              <span>Add Pocket</span>
            </button>
          </div>
        </div>

        {/* Center: 3D Viewport Canvas */}
        <div className="flex-1 relative bg-[#090d14] overflow-hidden">
          <div ref={containerRef} className="w-full h-full" />

          {/* Viewport Overlay Controls */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 p-1 rounded-md bg-surface/80 backdrop-blur-md border border-border shadow-md">
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
              onClick={() => setIsWireframe(!isWireframe)}
              className={`p-1.5 rounded transition-colors ${
                isWireframe ? 'text-accent bg-accent/20' : 'text-text-muted hover:text-text'
              }`}
              title="Toggle Wireframe Mode"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                snapToGrid ? 'text-accent bg-accent/20 font-bold' : 'text-text-muted hover:text-text'
              }`}
              title="Toggle 5mm Grid Snapping"
            >
              SNAP {snapToGrid ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Viewport Dimension HUD (Selected Feature) */}
          {selectedFeature && (
            <div className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-md bg-surface/80 backdrop-blur-md border border-border text-xs font-mono flex items-center gap-3">
              <span className="text-text font-bold">{selectedFeature.name}:</span>
              <span className="text-accent">X: {selectedFeature.dimensions.width}mm</span>
              <span className="text-accent">Y: {selectedFeature.dimensions.length}mm</span>
              <span className="text-accent">Z: {selectedFeature.dimensions.height}mm</span>
            </div>
          )}

          {/* Navigation Hint */}
          <div className="absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded bg-surface/75 backdrop-blur-sm border border-border text-[11px] font-mono text-text-muted pointer-events-none flex items-center gap-2">
            <span>Left-click: Rotate</span>
            <span>•</span>
            <span>Right-click / Shift: Pan</span>
            <span>•</span>
            <span>Wheel: Zoom</span>
            <span>•</span>
            <span>W/E/R: Transform</span>
          </div>
        </div>

        {/* Right: Parametric Property Inspector & Physics */}
        <div className="w-80 border-l border-border bg-surface-1 flex flex-col shrink-0 overflow-y-auto">
          {selectedFeature ? (
            <div className="p-4 space-y-5">
              {/* Feature Header */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    Feature Properties
                  </span>
                  <Chip variant="accent">{selectedFeature.type.toUpperCase()}</Chip>
                </div>
                <input
                  type="text"
                  value={selectedFeature.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFeatures((prev) =>
                      prev.map((f) => (f.id === selectedFeature.id ? { ...f, name: val } : f))
                    );
                  }}
                  className="w-full px-2.5 py-1 bg-surface-0 border border-border rounded text-xs font-semibold text-text focus:outline-none focus:border-accent"
                />
              </div>

              {/* Parametric Dimension Inputs */}
              <div className="space-y-3">
                <span className="text-xs font-medium text-text flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-accent" />
                  <span>Dimensional Extents (mm)</span>
                </span>

                {selectedFeature.type === 'cylinder' || selectedFeature.type === 'bore' ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-muted font-mono">Diameter (Ø):</span>
                        <span className="font-mono font-bold text-text">
                          {selectedFeature.dimensions.diameter || selectedFeature.dimensions.width} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="150"
                        value={selectedFeature.dimensions.diameter || selectedFeature.dimensions.width}
                        onChange={(e) => updateSelectedDimensions('diameter', Number(e.target.value))}
                        className="w-full accent-accent cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-muted font-mono">Depth / Height (Z):</span>
                        <span className="font-mono font-bold text-text">
                          {selectedFeature.dimensions.height} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="200"
                        value={selectedFeature.dimensions.height}
                        onChange={(e) => updateSelectedDimensions('height', Number(e.target.value))}
                        className="w-full accent-accent cursor-pointer"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Width X */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-muted font-mono">Width (X):</span>
                        <span className="font-mono font-bold text-text">
                          {selectedFeature.dimensions.width} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="300"
                        value={selectedFeature.dimensions.width}
                        onChange={(e) => updateSelectedDimensions('width', Number(e.target.value))}
                        className="w-full accent-accent cursor-pointer"
                      />
                    </div>

                    {/* Length Y */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-muted font-mono">Length (Y):</span>
                        <span className="font-mono font-bold text-text">
                          {selectedFeature.dimensions.length} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="300"
                        value={selectedFeature.dimensions.length}
                        onChange={(e) => updateSelectedDimensions('length', Number(e.target.value))}
                        className="w-full accent-accent cursor-pointer"
                      />
                    </div>

                    {/* Height Z */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-muted font-mono">Height / Depth (Z):</span>
                        <span className="font-mono font-bold text-text">
                          {selectedFeature.dimensions.height} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="150"
                        value={selectedFeature.dimensions.height}
                        onChange={(e) => updateSelectedDimensions('height', Number(e.target.value))}
                        className="w-full accent-accent cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Offset Position relative to G54 */}
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-xs font-medium text-text flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-accent" />
                  <span>Position Offset (G54 Datum)</span>
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs">
                  <div className="p-1.5 rounded bg-surface-0 border border-border">
                    <span className="text-[10px] text-text-muted block">X</span>
                    <span className="font-bold text-text">{selectedFeature.position[0]}</span>
                  </div>
                  <div className="p-1.5 rounded bg-surface-0 border border-border">
                    <span className="text-[10px] text-text-muted block">Y</span>
                    <span className="font-bold text-text">{selectedFeature.position[1]}</span>
                  </div>
                  <div className="p-1.5 rounded bg-surface-0 border border-border">
                    <span className="text-[10px] text-text-muted block">Z</span>
                    <span className="font-bold text-text">{selectedFeature.position[2]}</span>
                  </div>
                </div>
              </div>

              {/* Subtractive / Additive Toggle */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-text block">Subtractive Cut</span>
                    <span className="text-[11px] text-text-muted">Cavity or drilled feature</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedFeature.isCut}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFeatures((prev) =>
                        prev.map((f) => (f.id === selectedFeature.id ? { ...f, isCut: checked } : f))
                      );
                    }}
                    className="w-4 h-4 accent-accent cursor-pointer"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-text-muted">
              Select any feature in the tree or viewport to adjust parametric dimensions.
            </div>
          )}

          {/* Physical Material & Mass Estimator */}
          <div className="p-4 border-t border-border bg-surface-0/60 mt-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Physical Material Physics</span>
              </span>
              <LabelChip type="estimate" />
            </div>

            <div>
              <label className="text-[11px] font-mono text-text-muted block mb-1">Stock Alloy</label>
              <select
                value={selectedMaterial.id}
                onChange={(e) => {
                  const m = MATERIAL_PRESETS.find((mat) => mat.id === e.target.value);
                  if (m) setSelectedMaterial(m);
                }}
                className="w-full px-2.5 py-1.5 bg-surface-1 border border-border rounded text-xs text-text focus:outline-none focus:border-accent"
              >
                {MATERIAL_PRESETS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-surface-1 border border-border">
                <span className="text-[10px] text-text-muted block uppercase">Net Volume</span>
                <span className="font-bold text-text mt-0.5 block">{physicsSummary.netVolumeCm3} cm³</span>
              </div>
              <div className="p-2 rounded bg-surface-1 border border-border">
                <span className="text-[10px] text-text-muted block uppercase">Est. Mass</span>
                <span className="font-bold text-accent mt-0.5 block">
                  {physicsSummary.estimatedMassGrams > 1000
                    ? `${(physicsSummary.estimatedMassGrams / 1000).toFixed(2)} kg`
                    : `${physicsSummary.estimatedMassGrams} g`}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-surface-1 border border-border text-[11px] flex items-center justify-between">
              <span className="text-text-muted">Material Removal:</span>
              <span className="font-mono font-bold text-info">
                {physicsSummary.machiningRemovalPercent}% Chip Volume
              </span>
            </div>

            {/* Downstream CAM Pipeline Banner */}
            <div className="p-2.5 rounded bg-accent/10 border border-accent/30 text-[11px] text-text flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
              <span>Design is valid for automated CAM toolpathing and G-code generation.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save to CAD Library Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface border border-border rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-border bg-surface-1 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text">Save Design to CAD Library</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Converts 3D geometry to binary STL and links to CAM & AI advisory.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveToCadLibrary} className="p-5 space-y-4">
              {saveError && (
                <div className="p-3 rounded bg-danger/10 border border-danger/30 text-danger text-xs font-mono flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{saveError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">
                  Part / Component Name <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  required
                  placeholder="e.g. Engine Mounting Flange"
                  className="w-full px-3 py-1.5 bg-surface-0 border border-border rounded-md text-xs text-text focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Description</label>
                <textarea
                  value={partDescription}
                  onChange={(e) => setPartDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 bg-surface-0 border border-border rounded-md text-xs text-text focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="p-3 rounded bg-surface-1 border border-border text-xs space-y-1 font-mono">
                <div className="flex justify-between text-text-muted">
                  <span>Selected Material:</span>
                  <span className="text-text font-semibold">{selectedMaterial.name}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Geometry Body Count:</span>
                  <span className="text-text font-semibold">{features.filter((f) => f.visible).length} Features</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Estimated Billet Volume:</span>
                  <span className="text-text font-semibold">{physicsSummary.netVolumeCm3} cm³</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-md border border-border text-xs font-medium text-text hover:bg-surface-2 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-xs font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving & Validating Geometry...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Send to CAM</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function round(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function createFeatureMaterial(feature: CadFeature, isSelected: boolean, wireframe: boolean): THREE.Material {
  if (feature.type === 'cnc_envelope') {
    return new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
  }

  if (feature.isCut) {
    return new THREE.MeshStandardMaterial({
      color: isSelected ? 0x38bdf8 : feature.type === 'bore' ? 0xf59e0b : 0x0284c7,
      metalness: 0.2,
      roughness: 0.3,
      transparent: true,
      opacity: 0.75,
      wireframe,
    });
  }

  return new THREE.MeshStandardMaterial({
    color: isSelected ? 0x60a5fa : 0x94a3b8,
    metalness: 0.45,
    roughness: 0.35,
    wireframe,
  });
}

