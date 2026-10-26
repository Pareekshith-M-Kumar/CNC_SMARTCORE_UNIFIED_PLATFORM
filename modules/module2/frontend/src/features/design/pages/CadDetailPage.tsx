import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '@/lib/apiClient';
import { CadAsset, CadVersion } from '../types';
import { PartViewer } from '../components/PartViewer';
import { AiAdvisorPanel } from '../components/AiAdvisorPanel';
import { UploadDialog } from '../components/UploadDialog';
import { MaterialSelectionModal } from '@/features/materials/components/MaterialSelectionModal';
import { materialsApi } from '@/features/materials/api';
import { Material } from '@/features/materials/types';
import { PageHeader } from '@/components/domain/PageHeader';
import { Panel } from '@/components/domain/Panel';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { HashDisplay } from '@/components/domain/HashDisplay';
import { Chip } from '@/components/domain/Chip';
import { LabelChip } from '@/components/domain/LabelChip';
import { LoadingSkeleton } from '@/components/domain/LoadingSkeleton';
import { ErrorState } from '@/components/domain/ErrorState';
import {
  ArrowLeft,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Layers,
  Scale,
  Sparkles,
  DollarSign,
} from 'lucide-react';

export const CadDetailPage: React.FC = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<CadAsset | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<CadVersion | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  const fetchAsset = useCallback(async () => {
    if (!assetId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<CadAsset>(`/cad-assets/${assetId}`);
      setAsset(data);
      // Default to current version or first version
      const activeVer = data.currentVersion || (data.versions && data.versions[0]) || null;
      setSelectedVersion(activeVer);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load CAD asset details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  useEffect(() => {
    if (selectedVersion?.selectedMaterialId) {
      materialsApi.getMaterialById(selectedVersion.selectedMaterialId)
        .then(setSelectedMaterial)
        .catch(() => setSelectedMaterial(null));
    } else {
      setSelectedMaterial(null);
    }
  }, [selectedVersion?.selectedMaterialId]);

  const handleVersionUploaded = (updatedAsset: CadAsset) => {
    setAsset(updatedAsset);
    setSelectedVersion(updatedAsset.currentVersion || null);
  };

  const handleMaterialSelected = (newMaterialId: string) => {
    if (selectedVersion) {
      setSelectedVersion({
        ...selectedVersion,
        selectedMaterialId: newMaterialId,
      });
    }
    if (asset && asset.versions) {
      setAsset({
        ...asset,
        versions: asset.versions.map((v) =>
          v.id === selectedVersion?.id ? { ...v, selectedMaterialId: newMaterialId } : v
        ),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-surface-1 rounded animate-pulse" />
        <LoadingSkeleton variant="panel" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="space-y-6">
        <Link
          to="/cad"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to CAD Library</span>
        </Link>
        <ErrorState
          title="CAD Asset Not Found"
          message={error || 'The requested CAD model could not be found.'}
          onRetry={fetchAsset}
        />
      </div>
    );
  }

  const ver = selectedVersion;
  const downloadUrl = ver ? `/api/v1/cad-versions/${ver.id}/download-url` : undefined;
  // If preview GLB is ready, use the preview-url endpoint
  const glbUrl = ver?.previewStatus === 'READY' ? `/api/v1/cad-versions/${ver.id}/preview-url` : null;

  // Mass & Cost Calculations
  const estimatedMassGrams = selectedMaterial && ver?.volumeMm3 != null
    ? (ver.volumeMm3 * 1e-9 * selectedMaterial.densityKgM3 * 1000)
    : null;
  const estimatedRawCostInr = estimatedMassGrams != null && selectedMaterial
    ? ((estimatedMassGrams / 1000) * selectedMaterial.costPerKg)
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/cad"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-text-muted hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to CAD Library</span>
        </Link>
        <div className="flex items-center gap-2">
          {ver && <StatusBadge status={ver.previewStatus} />}
        </div>
      </div>

      {/* Header */}
      <PageHeader
        category="CAD Management & Verification"
        title={asset.name}
        description={asset.description || 'Pre-manufacturing verified 3D CAD geometry for CAM toolpath programming.'}
        actions={
          <div className="flex items-center gap-2">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-1 hover:bg-surface-2 border border-border text-text text-xs font-medium rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-accent" />
                <span>Download {ver?.format || 'File'}</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-xs font-semibold rounded-md shadow-sm transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload New Version</span>
            </button>
          </div>
        }
      />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 3D Viewport & AI Advisor */}
        <div className="lg:col-span-2 space-y-6">
          {/* 3D Model Viewport */}
          <Panel title="Interactive 3D Geometry Viewport" hasTicks>
            <PartViewer
              glbUrl={glbUrl}
              downloadUrl={downloadUrl}
              previewStatus={ver?.previewStatus || 'READY'}
              previewError={ver?.previewError}
              format={ver?.format || 'STL'}
            />
          </Panel>

          {/* AI Machinability Panel (Kaggle Dataset Empirical Advisory) */}
          <AiAdvisorPanel aiDataRaw={ver?.aiMachinabilityJson} />
        </div>

        {/* Right Column: Geometry Specs, Versions & Actions */}
        <div className="space-y-6">
          {/* Geometry Verification Specs */}
          <Panel title="Physical Dimensions & Bounding Box" hasTicks>
            <div className="space-y-4">
              {/* Bounding Box Dimension Tiles */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Extents (Bounding Box)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded bg-surface-1 border border-border text-center">
                    <span className="text-[10px] font-mono text-text-muted block">X (Width)</span>
                    <span className="text-xs font-mono font-bold text-text">
                      {ver?.bboxXMm != null ? `${ver.bboxXMm} mm` : '—'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-surface-1 border border-border text-center">
                    <span className="text-[10px] font-mono text-text-muted block">Y (Depth)</span>
                    <span className="text-xs font-mono font-bold text-text">
                      {ver?.bboxYMm != null ? `${ver.bboxYMm} mm` : '—'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-surface-1 border border-border text-center">
                    <span className="text-[10px] font-mono text-text-muted block">Z (Height)</span>
                    <span className="text-xs font-mono font-bold text-text">
                      {ver?.bboxZMm != null ? `${ver.bboxZMm} mm` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Volume & Surface Area */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-surface-1 border border-border">
                  <span className="text-[10px] font-mono text-text-muted uppercase block">Volume</span>
                  <span className="text-xs font-mono font-bold text-text mt-0.5 block">
                    {ver?.volumeMm3 != null ? `${(ver.volumeMm3 / 1000).toFixed(2)} cm³` : '—'}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">
                    {ver?.volumeMm3 != null ? `(${ver.volumeMm3.toLocaleString()} mm³)` : ''}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-surface-1 border border-border">
                  <span className="text-[10px] font-mono text-text-muted uppercase block">Surface Area</span>
                  <span className="text-xs font-mono font-bold text-text mt-0.5 block">
                    {ver?.surfaceAreaMm2 != null ? `${(ver.surfaceAreaMm2 / 100).toFixed(2)} cm²` : '—'}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">
                    {ver?.surfaceAreaMm2 != null ? `(${ver.surfaceAreaMm2.toLocaleString()} mm²)` : ''}
                  </span>
                </div>
              </div>

              {/* Mesh Complexity & Watertightness */}
              <div className="p-3 rounded bg-surface-1 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted font-mono">Triangle Count:</span>
                  <span className="font-mono font-semibold text-text">
                    {ver?.triangleCount != null ? ver.triangleCount.toLocaleString() : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted font-mono">Manifold / Watertight:</span>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    {ver?.isWatertight ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        <span className="text-success font-semibold">Watertight</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-warning" />
                        <span className="text-warning font-semibold">Open / Non-manifold</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted font-mono">Units:</span>
                  <Chip variant="neutral">{ver?.units || 'mm'}</Chip>
                </div>
              </div>

              {/* SHA-256 Hash Verification */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block mb-1">
                  SHA-256 Digest
                </span>
                {ver?.sha256Hash ? (
                  <HashDisplay hash={ver.sha256Hash} />
                ) : (
                  <span className="text-xs font-mono text-text-muted">None</span>
                )}
              </div>
            </div>
          </Panel>

          {/* Material Specification & Physical Mass Estimation */}
          <Panel
            title="Material & Physical Properties"
            subtitle="Alloy density, cutting resistance, and mass estimation"
            headerActions={<LabelChip type="rule-based" />}
            hasTicks
          >
            <div className="space-y-3">
              {selectedMaterial ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-surface-1 border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-accent" />
                        <span className="font-mono font-bold text-sm text-text">
                          {selectedMaterial.code}
                        </span>
                      </div>
                      <Chip variant="neutral">{selectedMaterial.category}</Chip>
                    </div>
                    <div className="text-xs text-text-muted mb-2.5">
                      {selectedMaterial.name}
                    </div>

                    {/* Physical Mass & Raw Material Cost */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                      <div className="p-2 rounded bg-surface-base border border-border">
                        <div className="flex items-center gap-1 text-[10px] font-mono text-text-muted uppercase">
                          <Scale className="w-3 h-3 text-accent" />
                          <span>Calculated Mass</span>
                        </div>
                        <div className="text-xs font-mono font-bold text-text mt-0.5">
                          {estimatedMassGrams != null
                            ? estimatedMassGrams >= 1000
                              ? `${(estimatedMassGrams / 1000).toFixed(3)} kg`
                              : `${estimatedMassGrams.toFixed(1)} g`
                            : '—'}
                        </div>
                      </div>

                      <div className="p-2 rounded bg-surface-base border border-border">
                        <div className="flex items-center gap-1 text-[10px] font-mono text-text-muted uppercase">
                          <DollarSign className="w-3 h-3 text-accent" />
                          <span>Est. Billet Cost</span>
                        </div>
                        <div className="text-xs font-mono font-bold text-text mt-0.5">
                          {estimatedRawCostInr != null
                            ? `₹ ${estimatedRawCostInr.toFixed(2)}`
                            : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Mechanics Parameters */}
                    <div className="mt-2.5 pt-2 border-t border-border grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-text-muted block text-[10px]">CUTTING FORCE (kc)</span>
                        <span className="font-semibold text-text">{selectedMaterial.kcNPerMm2} N/mm²</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">RECOMMENDED Vc</span>
                        <span className="font-semibold text-text">{selectedMaterial.vcMinMPerMin}–{selectedMaterial.vcMaxMPerMin} m/min</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMaterialModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-surface-1 hover:bg-surface-2 border border-border text-xs font-mono font-semibold text-text rounded-md transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>Change Alloy or Re-run Advisor</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 text-center rounded-lg border border-dashed border-border bg-surface-1 space-y-2">
                  <Layers className="w-6 h-6 text-text-muted mx-auto opacity-60" />
                  <div className="text-xs font-mono text-text-muted">
                    No material alloy assigned to this CAD model yet.
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMaterialModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-xs font-mono font-bold rounded-md shadow-xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Assign Material / Run Engine</span>
                  </button>
                </div>
              )}
            </div>
          </Panel>

          {/* Version History Selector */}
          <Panel title="Version Timeline" hasTicks>
            <div className="space-y-2">
              {asset.versions && asset.versions.length > 0 ? (
                asset.versions.map((v) => {
                  const isSelected = selectedVersion?.id === v.id;
                  const isCurrent = asset.currentVersionId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVersion(v)}
                      className={`w-full text-left p-2.5 rounded-md border transition-all ${
                        isSelected
                          ? 'border-accent bg-accent/10 shadow-sm'
                          : 'border-border bg-surface-1 hover:bg-surface-2'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-text">
                            v{v.versionNumber}
                          </span>
                          {isCurrent && (
                            <Chip variant="accent">Current</Chip>
                          )}
                          <Chip variant="neutral">{v.format}</Chip>
                        </div>
                        <span className="text-[11px] font-mono text-text-muted">
                          {(v.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                        <span className="truncate max-w-[150px]">{v.originalFilename}</span>
                        <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-text-muted font-mono">No versions recorded.</p>
              )}
            </div>
          </Panel>

          {/* Next Step Action: Create CAM Job */}
          <Panel title="Downstream Pipeline" hasTicks>
            <div className="space-y-3">
              <p className="text-xs text-text-muted leading-relaxed">
                This CAD version is cryptographically verified and ready for CAM toolpath setup, stock sizing, and simulation.
              </p>
              <button
                type="button"
                onClick={() => navigate(`/cam?assetId=${asset.id}&versionId=${ver?.id}`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-fg text-xs font-semibold rounded-md shadow-sm transition-colors"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Initialize CAM Job</span>
              </button>
            </div>
          </Panel>
        </div>
      </div>

      {/* Upload Dialog for Version Bump */}
      <UploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleVersionUploaded}
        existingAssetId={asset.id}
        existingAssetName={asset.name}
      />

      {/* Material Selection Modal */}
      {ver && (
        <MaterialSelectionModal
          isOpen={isMaterialModalOpen}
          onClose={() => setIsMaterialModalOpen(false)}
          cadVersionId={ver.id}
          currentMaterialId={ver.selectedMaterialId}
          onMaterialSelected={handleMaterialSelected}
        />
      )}
    </div>
  );
};
