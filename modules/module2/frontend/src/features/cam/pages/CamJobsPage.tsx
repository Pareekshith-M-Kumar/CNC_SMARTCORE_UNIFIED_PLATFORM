import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { camApi } from '../api';
import { materialsApi } from '@/features/materials/api';
import { api, ApiError } from '@/lib/apiClient';
import { MachineProfile, CuttingTool, CamJob } from '../types';
import { Material } from '@/features/materials/types';
import { CadAsset, CadVersion } from '@/features/design/types';
import { CamWizard } from '../components/CamWizard';
import { PageHeader } from '@/components/domain/PageHeader';
import { Panel } from '@/components/domain/Panel';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { LabelChip } from '@/components/domain/LabelChip';
import { MetricTile } from '@/components/domain/MetricTile';
import { DataTable, Column } from '@/components/domain/DataTable';
import { EmptyState } from '@/components/domain/EmptyState';
import { ErrorState } from '@/components/domain/ErrorState';
import { LoadingSkeleton } from '@/components/domain/LoadingSkeleton';
import { Chip } from '@/components/domain/Chip';
import { ToolpathViewer } from '../components/ToolpathViewer';
import { GCodePreviewModal } from '../components/GCodePreviewModal';
import { GCodeStudio } from '../components/GCodeStudio';
import { ToolpathGeometry } from '../types';
import {
  Plus,
  Clock,
  Zap,
  Cpu,
  Wrench,
  AlertTriangle,
  ArrowLeft,
  X,
  Sliders,
  CheckCircle2,
  Box,
  Activity,
  Terminal,
  Code2,
  Info,
} from 'lucide-react';

const DEMO_FALLBACK_ASSETS: CadAsset[] = [
  {
    id: '11111111-1111-1111-1111-111111111101',
    name: 'Standard Calibration Cube (10mm)',
    description: 'Calibration fixture cube for machining verification',
    currentVersionId: '11111111-1111-1111-1111-111111111102',
    currentVersion: {
      id: '11111111-1111-1111-1111-111111111102',
      versionNumber: 1,
      originalFilename: 'cube_10mm.stl',
      format: 'STL',
      fileSizeBytes: 1487,
      sha256Hash: 'a3b2c1d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
      units: 'mm',
      storagePath: '',
      previewStatus: 'READY',
      bboxXMm: 10,
      bboxYMm: 10,
      bboxZMm: 10,
      volumeMm3: 1000,
      selectedMaterialId: '11111111-1111-1111-1111-111111111101',
      createdAt: new Date().toISOString(),
    },
    versions: [
      {
        id: '11111111-1111-1111-1111-111111111102',
        versionNumber: 1,
        originalFilename: 'cube_10mm.stl',
        format: 'STL',
        fileSizeBytes: 1487,
        sha256Hash: 'a3b2c1d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
        units: 'mm',
        storagePath: '',
        previewStatus: 'READY',
        bboxXMm: 10,
        bboxYMm: 10,
        bboxZMm: 10,
        volumeMm3: 1000,
        selectedMaterialId: '11111111-1111-1111-1111-111111111101',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '11111111-1111-1111-1111-111111111103',
    name: 'High-Speed Aircraft Bracket',
    description: 'Aerospace bracket fixture with pocket and perimeter contour features',
    currentVersionId: '11111111-1111-1111-1111-111111111104',
    currentVersion: {
      id: '11111111-1111-1111-1111-111111111104',
      versionNumber: 1,
      originalFilename: 'bracket.step',
      format: 'STEP',
      fileSizeBytes: 805,
      sha256Hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      units: 'mm',
      storagePath: '',
      previewStatus: 'READY',
      bboxXMm: 80,
      bboxYMm: 40,
      bboxZMm: 25,
      volumeMm3: 32000,
      selectedMaterialId: '11111111-1111-1111-1111-111111111101',
      createdAt: new Date().toISOString(),
    },
    versions: [
      {
        id: '11111111-1111-1111-1111-111111111104',
        versionNumber: 1,
        originalFilename: 'bracket.step',
        format: 'STEP',
        fileSizeBytes: 805,
        sha256Hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        units: 'mm',
        storagePath: '',
        previewStatus: 'READY',
        bboxXMm: 80,
        bboxYMm: 40,
        bboxZMm: 25,
        volumeMm3: 32000,
        selectedMaterialId: '11111111-1111-1111-1111-111111111101',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface CamJobsPageProps {
  defaultTab?: 'jobs' | 'studio';
}

export const CamJobsPage: React.FC<CamJobsPageProps> = ({ defaultTab = 'jobs' }) => {
  const [searchParams] = useSearchParams();

  const queryAssetId = searchParams.get('assetId');
  const queryVersionId = searchParams.get('versionId');
  const queryTab = searchParams.get('tab') as 'jobs' | 'studio' | null;

  const [activeTab, setActiveTab] = useState<'jobs' | 'studio'>(queryTab || defaultTab);

  // Core Data States
  const [jobs, setJobs] = useState<CamJob[]>([]);
  const [machines, setMachines] = useState<MachineProfile[]>([]);
  const [tools, setTools] = useState<CuttingTool[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [assets, setAssets] = useState<CadAsset[]>([]);

  // UI States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeJobForWizard, setActiveJobForWizard] = useState<CamJob | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Toolpath & 3D Inspection Modal States
  const [selectedJobForToolpath, setSelectedJobForToolpath] = useState<CamJob | null>(null);
  const [toolpathGeometry, setToolpathGeometry] = useState<ToolpathGeometry | null>(null);
  const [isLoadingToolpath, setIsLoadingToolpath] = useState<boolean>(false);
  const [isGeneratingToolpath, setIsGeneratingToolpath] = useState<boolean>(false);
  const [toolpathError, setToolpathError] = useState<string | null>(null);

  // G-Code Modal States
  const [selectedJobForGCode, setSelectedJobForGCode] = useState<CamJob | null>(null);
  const [gcodeText, setGcodeText] = useState<string | null>(null);
  const [isLoadingGCode, setIsLoadingGCode] = useState<boolean>(false);
  const [gcodeError, setGcodeError] = useState<string | null>(null);

  // New Job Form State
  const [formAssetId, setFormAssetId] = useState<string>('');
  const [formVersionId, setFormVersionId] = useState<string>('');
  const [formMachineId, setFormMachineId] = useState<string>('');
  const [formMaterialId, setFormMaterialId] = useState<string>('');
  const [formJobName, setFormJobName] = useState<string>('');
  const [formIsSubmitting, setFormIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Handlers for Toolpath and G-Code
  const handleOpenToolpathModal = async (job: CamJob) => {
    setSelectedJobForToolpath(job);
    setToolpathGeometry(null);
    setToolpathError(null);
    setIsLoadingToolpath(true);
    try {
      const geo = await camApi.getToolpathGeometry(job.id);
      setToolpathGeometry(geo);
    } catch {
      setToolpathGeometry(null);
    } finally {
      setIsLoadingToolpath(false);
    }
  };

  const handleGenerateToolpath = async (job: CamJob) => {
    setIsGeneratingToolpath(true);
    setToolpathError(null);
    try {
      const updatedJob = await camApi.generateToolpaths(job.id);
      setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
      setSelectedJobForToolpath(updatedJob);
      const geo = await camApi.getToolpathGeometry(job.id);
      setToolpathGeometry(geo);
      setSuccessMessage(`Toolpaths generated and validated for "${updatedJob.name}". G-code ready.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Toolpath generation failed';
      setToolpathError(msg);
    } finally {
      setIsGeneratingToolpath(false);
    }
  };

  const handleOpenGCodeModal = async (job: CamJob) => {
    setSelectedJobForGCode(job);
    setGcodeText(null);
    setGcodeError(null);
    setIsLoadingGCode(true);
    try {
      const code = await camApi.getGCode(job.id);
      setGcodeText(code);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch G-code program';
      setGcodeError(msg);
    } finally {
      setIsLoadingGCode(false);
    }
  };

  const handleDownloadGCode = () => {
    if (!selectedJobForGCode) return;
    window.open(`/api/v1/cam-jobs/${selectedJobForGCode.id}/gcode?download=true`, '_blank');
  };

  // Initial Data Fetch
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedJobs, fetchedMachines, fetchedTools, fetchedMaterials, fetchedAssets] =
        await Promise.all([
          camApi.getCamJobs(),
          camApi.getMachines(),
          camApi.getTools(),
          materialsApi.getMaterials(),
          api.get<CadAsset[]>('/cad-assets').catch(() => []),
        ]);

      const effectiveAssets =
        fetchedAssets && fetchedAssets.length > 0 ? fetchedAssets : DEMO_FALLBACK_ASSETS;

      setJobs(fetchedJobs);
      setMachines(fetchedMachines);
      setTools(fetchedTools);
      setMaterials(fetchedMaterials);
      setAssets(effectiveAssets);

      // Default Machine for form
      if (fetchedMachines.length > 0 && !formMachineId) {
        setFormMachineId(fetchedMachines[0].id);
      }

      // If navigated with URL query params:
      if (queryVersionId) {
        // Check if a job already exists for this version
        const matchingJob = fetchedJobs.find((j) => j.cadVersionId === queryVersionId);
        if (matchingJob) {
          setActiveJobForWizard(matchingJob);
        } else {
          // Open create modal pre-filled
          setFormAssetId(queryAssetId || '');
          setFormVersionId(queryVersionId);
          setIsCreateModalOpen(true);
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load CAM jobs and machine catalog.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [queryAssetId, queryVersionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set default form values when formAssetId changes
  useEffect(() => {
    if (!formAssetId && assets.length > 0) {
      const firstAsset = assets[0];
      setFormAssetId(firstAsset.id);
      const activeVer = firstAsset.currentVersion || (firstAsset.versions && firstAsset.versions[0]);
      if (activeVer) {
        setFormVersionId(activeVer.id);
        setFormJobName(`CAM Job: ${firstAsset.name} (v${activeVer.versionNumber})`);
        if (activeVer.selectedMaterialId) {
          setFormMaterialId(activeVer.selectedMaterialId);
        }
      }
    } else if (formAssetId) {
      const selectedAsset = assets.find((a) => a.id === formAssetId);
      if (selectedAsset) {
        const ver =
          selectedAsset.versions?.find((v) => v.id === formVersionId) ||
          selectedAsset.currentVersion ||
          (selectedAsset.versions && selectedAsset.versions[0]);
        if (ver && ver.id !== formVersionId) {
          setFormVersionId(ver.id);
          setFormJobName(`CAM Job: ${selectedAsset.name} (v${ver.versionNumber})`);
          if (ver.selectedMaterialId) {
            setFormMaterialId(ver.selectedMaterialId);
          }
        }
      }
    }
  }, [formAssetId, assets, formVersionId]);

  // Find CAD Version helper
  const findCadVersion = useCallback(
    (cadVersionId: string): { version: CadVersion; assetName: string } => {
      for (const asset of assets) {
        const match = asset.versions?.find((v) => v.id === cadVersionId);
        if (match) {
          return { version: match, assetName: asset.name };
        }
        if (asset.currentVersion?.id === cadVersionId) {
          return { version: asset.currentVersion, assetName: asset.name };
        }
      }
      // Fallback
      return {
        version: {
          id: cadVersionId,
          versionNumber: 1,
          originalFilename: 'part_geometry.step',
          format: 'STEP',
          fileSizeBytes: 1024 * 1024,
          sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          units: 'mm',
          storagePath: '',
          previewStatus: 'READY',
          bboxXMm: 50,
          bboxYMm: 50,
          bboxZMm: 25,
          volumeMm3: 45000,
          createdAt: new Date().toISOString(),
        },
        assetName: 'Component Model',
      };
    },
    [assets]
  );

  // Validate Kinematic Fit in Create Modal
  const selectedFormMachine = machines.find((m) => m.id === formMachineId);
  const selectedFormVersion = useMemo(() => {
    for (const a of assets) {
      const v = a.versions?.find((item) => item.id === formVersionId);
      if (v) return v;
    }
    return null;
  }, [assets, formVersionId]);

  const isFormOversized = useMemo(() => {
    if (!selectedFormMachine || !selectedFormVersion) return false;
    const partX = selectedFormVersion.bboxXMm || 0;
    const partY = selectedFormVersion.bboxYMm || 0;
    const partZ = selectedFormVersion.bboxZMm || 0;
    return (
      partX > selectedFormMachine.travelXMm ||
      partY > selectedFormMachine.travelYMm ||
      partZ > selectedFormMachine.travelZMm
    );
  }, [selectedFormMachine, selectedFormVersion]);

  // Handle Create Job Submission
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVersionId) {
      setFormError('Please select a valid CAD Version.');
      return;
    }
    if (!formMachineId) {
      setFormError('Please select a CNC Machine Profile.');
      return;
    }
    if (isFormOversized) {
      setFormError('Cannot create job: Part envelope exceeds machine kinematic travel limits.');
      return;
    }

    setFormIsSubmitting(true);
    setFormError(null);

    try {
      const newJob = await camApi.createCamJob({
        cadVersionId: formVersionId,
        machineId: formMachineId,
        materialId: formMaterialId || undefined,
        name: formJobName || 'CAM Job Configuration',
      });

      setJobs((prev) => [newJob, ...prev]);
      setIsCreateModalOpen(false);
      setActiveJobForWizard(newJob);
      setSuccessMessage(`CAM Job "${newJob.name}" created. Opening configuration wizard.`);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Failed to create CAM job. Please check parameters.');
      }
    } finally {
      setFormIsSubmitting(false);
    }
  };

  // Metrics Calculations
  const totalJobsCount = jobs.length;
  const configuredCount = jobs.filter(
    (j) => j.status === 'CONFIGURED' || j.status === 'TOOLPATH_READY' || j.status === 'SIMULATED'
  ).length;

  const totalEstTimeMin = jobs.reduce((acc, j) => {
    return acc + (j.estimates?.time?.totalMachiningMin || 0);
  }, 0);

  const totalEstEnergyKwh = jobs.reduce((acc, j) => {
    return acc + (j.estimates?.energyKwh || 0);
  }, 0);

  // Table Columns
  const columns: Column<CamJob>[] = [
    {
      key: 'name',
      header: 'CAM Job',
      render: (job) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-text flex items-center gap-2">
            <span>{job.name}</span>
            {job.configHash && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-muted" title={`Config Hash: ${job.configHash}`}>
                {job.configHash.substring(0, 8)}…
              </span>
            )}
          </div>
          <div className="text-[11px] font-mono text-text-muted">
            Created: {new Date(job.createdAt).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: 'cadVersionId',
      header: 'Target Part',
      render: (job) => {
        const { version, assetName } = findCadVersion(job.cadVersionId);
        return (
          <div className="space-y-0.5">
            <div className="font-mono text-xs text-text flex items-center gap-1.5">
              <span>{assetName}</span>
              <Chip variant="accent">v{version.versionNumber}</Chip>
            </div>
            <div className="text-[10px] font-mono text-text-muted">
              {version.bboxXMm?.toFixed(0)}×{version.bboxYMm?.toFixed(0)}×{version.bboxZMm?.toFixed(0)} mm
            </div>
          </div>
        );
      },
    },
    {
      key: 'machineId',
      header: 'CNC Machine',
      render: (job) => {
        const machine = machines.find((m) => m.id === job.machineId);
        return (
          <div className="space-y-0.5 font-mono text-xs">
            <div className="font-semibold text-text">{machine ? machine.name : 'Custom CNC'}</div>
            <div className="text-[10px] text-text-muted">
              Dialect: <span className="uppercase text-text font-bold">{machine?.controllerDialect || 'FANUC'}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'materialId',
      header: 'Material Alloy',
      render: (job) => {
        const mat = materials.find((m) => m.id === job.materialId);
        return (
          <div className="font-mono text-xs">
            <span className="text-text font-medium">{mat ? mat.name : 'AL6061-T6'}</span>
            <div className="text-[10px] text-text-muted">
              kc = {mat ? mat.kcNPerMm2 : 700} N/mm²
            </div>
          </div>
        );
      },
    },
    {
      key: 'stockAllowanceMm',
      header: 'Stock Envelope',
      isMono: true,
      render: (job) => {
        if (job.stockXMm && job.stockYMm && job.stockZMm) {
          return (
            <span className="text-xs font-mono text-text">
              {job.stockXMm.toFixed(1)} × {job.stockYMm.toFixed(1)} × {job.stockZMm.toFixed(1)} mm
            </span>
          );
        }
        return (
          <span className="text-xs font-mono text-text-muted">
            +{job.stockAllowanceMm.toFixed(1)} mm allowance
          </span>
        );
      },
    },
    {
      key: 'estimates',
      header: 'Est. Machining Time',
      isMono: true,
      render: (job) => {
        const timeMin = job.estimates?.time?.totalMachiningMin;
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="font-semibold text-text">
              {timeMin != null ? `${timeMin.toFixed(1)} min` : '—'}
            </span>
            <LabelChip type="estimate" />
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (job) => <StatusBadge status={job.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (job) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveJobForWizard(job)}
            title="Configure Speeds, Feeds & Tools"
            className="flex items-center gap-1 px-2 py-1 rounded bg-raised hover:bg-surface border border-border text-[11px] font-mono font-semibold text-text transition-colors"
          >
            <Sliders className="w-3 h-3 text-accent" />
            <span>Config</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenToolpathModal(job)}
            title="3D Toolpath Visualization"
            className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[11px] font-mono font-semibold text-cyan-400 transition-colors"
          >
            <Activity className="w-3 h-3" />
            <span>3D Path</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenGCodeModal(job)}
            title="View G-Code Program"
            className="flex items-center gap-1 px-2 py-1 rounded bg-raised hover:bg-surface border border-border text-[11px] font-mono font-semibold text-text-muted hover:text-text transition-colors"
          >
            <Terminal className="w-3 h-3" />
            <span>G-Code</span>
          </button>
        </div>
      ),
    },
  ];

  // If loading and no data yet
  if (isLoading && jobs.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          category="Computer-Aided Manufacturing"
          title="CAM Configuration & Jobs"
          description="Kinematic machine profiles, cutting tool parameters, 2.5D stock sizing, and live machining estimates."
        />
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  // Active Wizard View
  if (activeJobForWizard) {
    const { version, assetName } = findCadVersion(activeJobForWizard.cadVersionId);
    const assignedMaterial =
      materials.find((m) => m.id === activeJobForWizard.materialId) ||
      materials.find((m) => m.id === version.selectedMaterialId) ||
      null;

    return (
      <div className="space-y-6">
        {/* Top Breadcrumb Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveJobForWizard(null)}
            className="flex items-center gap-2 text-xs font-mono text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All CAM Jobs</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-text-muted">Target Part:</span>
            <span className="text-xs font-mono font-bold text-text">{assetName}</span>
            <Chip variant="accent">v{version.versionNumber}</Chip>
            <StatusBadge status={activeJobForWizard.status} />
          </div>
        </div>

        {/* Wizard Component */}
        <CamWizard
          job={activeJobForWizard}
          version={version}
          material={assignedMaterial}
          machines={machines}
          tools={tools}
          onSaved={(updated) => {
            setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
            setActiveJobForWizard(null);
            setSuccessMessage(`CAM Job "${updated.name}" saved with cryptographic config hash.`);
          }}
          onCancel={() => setActiveJobForWizard(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        category="Computer-Aided Manufacturing"
        title="CAM Configuration & G-Code Studio"
        description="Machine kinematics verification, cutting tool parameter assignment, 2.5D stock sizing, interactive G-code editing, and live physics-based machining estimates."
        actions={
          activeTab === 'jobs' ? (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                if (assets.length > 0) {
                  const a = assets.find((item) => item.id === formAssetId) || assets[0];
                  setFormAssetId(a.id);
                  const v = a.currentVersion || (a.versions && a.versions[0]);
                  if (v) {
                    setFormVersionId(v.id);
                    setFormJobName(`CAM Job: ${a.name} (v${v.versionNumber})`);
                    if (v.selectedMaterialId) {
                      setFormMaterialId(v.selectedMaterialId);
                    }
                  }
                }
                if (machines.length > 0 && !formMachineId) {
                  setFormMachineId(machines[0].id);
                }
                if (materials.length > 0 && !formMaterialId) {
                  setFormMaterialId(materials[0].id);
                }
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-xs font-semibold rounded-md shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New CAM Job</span>
            </button>
          ) : undefined
        }
      />

      {/* Top Tab Bar: CAM Jobs vs G-Code Studio */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
            activeTab === 'jobs'
              ? 'bg-accent text-accent-fg shadow-xs font-bold'
              : 'bg-surface hover:bg-hover text-text-muted hover:text-text border border-border'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Configured CAM Jobs & Wizard</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface/50 font-mono">
            {jobs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('studio')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
            activeTab === 'studio'
              ? 'bg-accent text-accent-fg shadow-xs font-bold'
              : 'bg-surface hover:bg-hover text-text-muted hover:text-text border border-border'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>CAM G-Code Studio (Codeplace)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-accent/20 text-accent font-mono font-bold">
            Live Validator
          </span>
        </button>
      </div>

      {activeTab === 'studio' ? (
        <GCodeStudio />
      ) : (
        <>
          {/* Success Notification */}
          {successMessage && (
            <div className="p-3 bg-success/10 border border-success/30 rounded-md flex items-center justify-between text-xs font-mono text-success">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-success hover:opacity-80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Error State */}
          {error && <ErrorState message={error} onRetry={loadData} />}

          {/* Summary Running Estimates Preview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricTile
              label="Active CAM Jobs"
              value={totalJobsCount.toString()}
              unit="jobs"
              icon={<Cpu className="w-3.5 h-3.5 text-accent" />}
              hint={`${configuredCount} configured & verified`}
            />
            <MetricTile
              label="Est. Total Cycle Time"
              value={totalEstTimeMin.toFixed(1)}
              unit="min"
              isEstimate
              icon={<Clock className="w-3.5 h-3.5 text-info" />}
              hint="Sum of cutting, rapid, toolchange & setup"
            />
            <MetricTile
              label="Est. Total Energy"
              value={totalEstEnergyKwh.toFixed(3)}
              unit="kWh"
              isEstimate
              icon={<Zap className="w-3.5 h-3.5 text-warning" />}
              hint="Based on spindle power Pc & machine efficiency"
            />
            <MetricTile
              label="Machine Profiles"
              value={machines.length.toString()}
              unit="envelopes"
              icon={<Wrench className="w-3.5 h-3.5 text-success" />}
              hint={`${tools.length} cutting tools in tooling library`}
            />
          </div>

          {/* Active Jobs Table Panel */}
          <Panel
            title="Configured & In-Progress CAM Jobs"
            subtitle="Manage toolpaths, review stock allowances, and simulate cycle times"
            hasTicks
          >
            {jobs.length === 0 ? (
              <EmptyState
                title="No CAM jobs created yet"
                description="Initialize a CAM job from an uploaded CAD model or click 'New CAM Job' above."
                action={{
                  label: 'New CAM Job',
                  onClick: () => {
                    setFormError(null);
                    if (assets.length > 0 && !formAssetId) {
                      setFormAssetId(assets[0].id);
                      const v = assets[0].currentVersion || (assets[0].versions && assets[0].versions[0]);
                      if (v) setFormVersionId(v.id);
                    }
                    setIsCreateModalOpen(true);
                  },
                }}
              />
            ) : (
              <DataTable columns={columns} data={jobs} keyExtractor={(j) => j.id} />
            )}
          </Panel>

          {/* Create New CAM Job Modal */}
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="w-full max-w-xl bg-raised border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col z-50">
                <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-accent" />
                    <h3 className="text-sm font-semibold text-text">Initialize New CAM Job</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="text-text-muted hover:text-text transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateJob} className="p-5 space-y-4 bg-raised">
                  {/* Context notice */}
                  <div className="p-2.5 bg-accent/10 border border-accent/30 rounded text-xs font-mono text-text flex items-center gap-2">
                    <Info className="w-4 h-4 text-accent shrink-0" />
                    <span>Select an asset geometry model to configure CNC tooling, travel, and feeds.</span>
                  </div>

                  {formError && (
                    <div className="p-3 bg-danger/15 border border-danger/40 rounded-md text-xs font-mono text-danger flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span className="font-semibold">{formError}</span>
                    </div>
                  )}

                  {/* Target CAD Part & Version Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-semibold text-text uppercase tracking-wider block">
                      TARGET CAD MODEL
                    </label>
                    <select
                      value={formAssetId}
                      onChange={(e) => {
                        const newAssetId = e.target.value;
                        setFormAssetId(newAssetId);
                        const a = assets.find((item) => item.id === newAssetId);
                        if (a) {
                          const v = a.currentVersion || (a.versions && a.versions[0]);
                          if (v) {
                            setFormVersionId(v.id);
                            setFormJobName(`CAM Job: ${a.name} (v${v.versionNumber})`);
                            if (v.selectedMaterialId) setFormMaterialId(v.selectedMaterialId);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 rounded-md border border-border bg-surface text-xs font-mono text-text focus:outline-none focus:border-accent"
                    >
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Version Selector */}
                  {assets.find((a) => a.id === formAssetId)?.versions && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-semibold text-text uppercase tracking-wider block">
                        CAD VERSION
                      </label>
                      <select
                        value={formVersionId}
                        onChange={(e) => setFormVersionId(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-border bg-surface text-xs font-mono text-text focus:outline-none focus:border-accent"
                      >
                        {assets
                          .find((a) => a.id === formAssetId)
                          ?.versions?.map((v) => (
                            <option key={v.id} value={v.id}>
                              v{v.versionNumber} ({v.format} - {v.originalFilename})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Target Part Dimensions Callout */}
                  {selectedFormVersion && (
                    <div className="p-3 rounded bg-surface border border-border text-[11px] font-mono grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-text-muted block text-[10px]">BOUNDING BOX (X × Y × Z)</span>
                        <span className="text-text font-bold">
                          {(selectedFormVersion.bboxXMm || 50).toFixed(1)} ×{' '}
                          {(selectedFormVersion.bboxYMm || 50).toFixed(1)} ×{' '}
                          {(selectedFormVersion.bboxZMm || 25).toFixed(1)} mm
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">PART VOLUME</span>
                        <span className="text-text font-bold">
                          {((selectedFormVersion.volumeMm3 || 45000) / 1000).toFixed(1)} cm³
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Job Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-semibold text-text uppercase tracking-wider block">
                      JOB NAME
                    </label>
                    <input
                      type="text"
                      required
                      value={formJobName}
                      onChange={(e) => setFormJobName(e.target.value)}
                      placeholder="e.g. CAM Job: Bracket Rough & Finish"
                      className="w-full px-3 py-2 rounded-md border border-border bg-surface text-xs font-mono text-text focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* CNC Machine Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-semibold text-text uppercase tracking-wider block">
                      CNC MACHINE PROFILE
                    </label>
                    <select
                      value={formMachineId}
                      onChange={(e) => setFormMachineId(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-surface text-xs font-mono text-text focus:outline-none focus:border-accent"
                    >
                      {machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — Dialect: {m.controllerDialect} (Travel: {m.travelXMm}×{m.travelYMm}×{m.travelZMm} mm)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kinematic limit warning */}
                  {isFormOversized && selectedFormMachine && (
                    <div className="p-3 rounded bg-danger/10 border border-danger/30 text-xs font-mono text-danger flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Kinematic Envelope Violation:</strong> Part bounding box exceeds machine travel limits ({selectedFormMachine.travelXMm}×{selectedFormMachine.travelYMm}×{selectedFormMachine.travelZMm} mm). Choose a larger CNC machine profile.
                      </div>
                    </div>
                  )}

                  {/* Material Alloy */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-semibold text-text uppercase tracking-wider block">
                      RAW MATERIAL ALLOY
                    </label>
                    <select
                      value={formMaterialId}
                      onChange={(e) => setFormMaterialId(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-surface text-xs font-mono text-text focus:outline-none focus:border-accent"
                    >
                      <option value="">Default (From CAD Model)</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {m.category} (kc: {m.kcNPerMm2} N/mm²)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-3 py-1.5 text-xs font-mono text-text-muted hover:text-text rounded-md border border-border transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formIsSubmitting || isFormOversized}
                      className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-accent-fg text-xs font-mono font-bold rounded-md shadow-xs transition-colors"
                    >
                      {formIsSubmitting ? (
                        <span>Initializing…</span>
                      ) : (
                        <>
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Create & Open Wizard</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* G-Code Program Preview & Download Modal */}
      <GCodePreviewModal
        isOpen={!!selectedJobForGCode}
        onClose={() => setSelectedJobForGCode(null)}
        camJob={selectedJobForGCode}
        gcodeText={gcodeText}
        isLoading={isLoadingGCode}
        error={gcodeError}
        onDownload={handleDownloadGCode}
      />

      {/* 3D Toolpath Inspection & Generation Modal */}
      {selectedJobForToolpath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-white">
                      3D Toolpath Simulation &amp; Polyline Inspection
                    </h3>
                    <StatusBadge status={selectedJobForToolpath.status} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Job: <span className="text-slate-200 font-medium">{selectedJobForToolpath.name}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenGCodeModal(selectedJobForToolpath)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>View G-Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateToolpath(selectedJobForToolpath)}
                  disabled={isGeneratingToolpath}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold shadow-md transition-colors disabled:opacity-40"
                >
                  {isGeneratingToolpath ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Generating Toolpaths...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>
                        {selectedJobForToolpath.status === 'TOOLPATH_READY'
                          ? 'Regenerate Toolpaths'
                          : 'Generate Toolpaths & G-Code'}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedJobForToolpath(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Error Notification if generation failed */}
            {toolpathError && (
              <div className="px-6 py-2.5 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2 text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{toolpathError}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              <ToolpathViewer
                toolpath={toolpathGeometry}
                isLoading={isLoadingToolpath || isGeneratingToolpath}
                className="h-[460px]"
              />

              {/* Toolpath Operations Breakdown Table */}
              {selectedJobForToolpath.operations && selectedJobForToolpath.operations.length > 0 && (
                <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
                  <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                      Toolpath Slices &amp; Kinematic Operation Summary
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {selectedJobForToolpath.operations.length} configured passes
                    </span>
                  </div>
                  <table className="w-full text-left text-xs font-mono text-slate-300">
                    <thead className="bg-slate-900/40 text-slate-500 border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2">Seq</th>
                        <th className="px-3 py-2">Op Type</th>
                        <th className="px-3 py-2">Spindle / Feed</th>
                        <th className="px-3 py-2 text-right">Path Length</th>
                        <th className="px-3 py-2 text-right">Cutting</th>
                        <th className="px-3 py-2 text-right">Rapid</th>
                        <th className="px-3 py-2 text-right">Moves</th>
                        <th className="px-3 py-2 text-right">Est Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedJobForToolpath.operations.map((op) => (
                        <tr key={op.seq} className="hover:bg-slate-900/30">
                          <td className="px-3 py-2 font-bold text-white">#{op.seq}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-semibold text-[11px]">
                              {op.opType}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-400">
                            {op.spindleRpm} RPM &bull; {op.feedMmMin} mm/min
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-white">
                            {op.pathLengthMm != null ? `${op.pathLengthMm.toFixed(1)} mm` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-400">
                            {op.cuttingLengthMm != null ? `${op.cuttingLengthMm.toFixed(1)} mm` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-cyan-400">
                            {op.rapidLengthMm != null ? `${op.rapidLengthMm.toFixed(1)} mm` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-400">
                            {op.moveCount != null ? op.moveCount : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-amber-300">
                            {op.estTimeS != null ? `${op.estTimeS.toFixed(1)}s` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
