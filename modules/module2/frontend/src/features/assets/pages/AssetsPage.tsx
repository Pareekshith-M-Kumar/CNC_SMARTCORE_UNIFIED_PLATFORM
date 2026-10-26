import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assetsApi } from '../api';
import { PhysicalAsset } from '../types';
import {
  Package,
  QrCode,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Cpu,
  Link2
} from 'lucide-react';

export const AssetsPage: React.FC = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<PhysicalAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registeringTag, setRegisteringTag] = useState<string | null>(null);
  const [linkingTag, setLinkingTag] = useState<string | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Record<string, string>>({});

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assetsApi.getAssets();
      setAssets(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load physical assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleRegister = async (assetTag: string) => {
    setRegisteringTag(assetTag);
    setError(null);
    try {
      await assetsApi.registerAsset(assetTag);
      await fetchAssets();
    } catch (err: any) {
      setError(err?.message || 'Failed to register physical asset');
    } finally {
      setRegisteringTag(null);
    }
  };

  const handleLinkMachine = async (assetTag: string) => {
    const machineCode = selectedMachine[assetTag] || 'CNC-001';
    setLinkingTag(assetTag);
    setError(null);
    try {
      await assetsApi.linkMachine(assetTag, { machineCode });
      await fetchAssets();
    } catch (err: any) {
      setError(err?.message || 'Failed to link asset to CNC machine');
    } finally {
      setLinkingTag(null);
    }
  };

  const renderStatusBadge = (status: string, registered: boolean, isLinked: boolean) => {
    if (isLinked || status === 'VERIFIED') {
      return (
        <span className="bg-accent/15 text-accent border border-accent/30 px-2 py-0.5 rounded font-mono text-xs font-semibold flex items-center gap-1">
          <Cpu className="w-3 h-3 text-accent" /> VERIFIED LINKED
        </span>
      );
    }
    if (registered || status === 'REGISTERED') {
      return (
        <span className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 px-2 py-0.5 rounded font-mono text-xs font-semibold">
          ✓ REGISTERED
        </span>
      );
    }
    switch (status) {
      case 'DELIVERED':
        return <span className="bg-blue-500/15 text-blue-600 border border-blue-500/30 px-2 py-0.5 rounded font-mono text-xs font-semibold">READY TO REGISTER</span>;
      case 'IN_SHIPMENT':
        return <span className="bg-amber-500/15 text-amber-600 border border-amber-500/30 px-2 py-0.5 rounded font-mono text-xs font-semibold">IN SHIPMENT</span>;
      case 'MANUFACTURED':
        return <span className="bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 px-2 py-0.5 rounded font-mono text-xs font-semibold">MANUFACTURED</span>;
      default:
        return <span className="bg-surface border border-border px-2 py-0.5 rounded font-mono text-xs text-text-muted">{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text">Serialized Physical Assets</h1>
            <span className="font-mono text-xs bg-surface border border-border text-text-muted px-2 py-0.5 rounded">
              {assets.length} ASSETS
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Physical CNC assets with verified cryptographic provenance, permanent tag IDs (<code className="font-mono text-accent">ASSET-XXXXXX</code>), and Module 1 machine link.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 px-3 py-1.5 border border-border rounded text-xs font-medium text-text bg-surface hover:bg-canvas transition-colors"
          >
            Orders List
          </button>
          <button
            onClick={() => navigate('/shipments')}
            className="flex items-center gap-2 px-3 py-1.5 border border-border rounded text-xs font-medium text-text bg-surface hover:bg-canvas transition-colors"
          >
            Shipments Tracking
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-md flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Asset Cards */}
      {loading ? (
        <div className="p-12 text-center text-text-muted">Loading serialized assets…</div>
      ) : assets.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-lg bg-surface">
          <Package className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
          <h3 className="text-base font-semibold text-text">No physical assets released</h3>
          <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">
            Release a manufacturing order from an approved CAM plan to serialize physical assets.
          </p>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 bg-accent text-white hover:bg-accent-hover px-4 py-2 rounded text-xs font-medium transition-colors"
          >
            View Orders
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => {
            const isDelivered = asset.status === 'DELIVERED';
            const isRegistered = asset.registered || asset.status === 'REGISTERED';
            const isLinked = asset.status === 'VERIFIED' || !!asset.machineLinked || !!asset.machineCode;
            const isBridgeAsset = asset.assetTag === 'ASSET-000123' || asset.assetTag === 'ASSET-000120';
            const isBusy = registeringTag === asset.assetTag || linkingTag === asset.assetTag;
            const chosenMachine = selectedMachine[asset.assetTag] || 'CNC-001';

            return (
              <div key={asset.id} className="border border-border bg-surface rounded-lg p-5 shadow-sm hover:shadow transition-shadow space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-mono font-bold text-accent flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-accent" />
                        {asset.assetTag}
                      </div>
                      {isBridgeAsset && (
                        <span className="bg-accent/15 text-accent border border-accent/30 text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold">
                          M1 BRIDGE
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted mt-1">
                      Order: <strong className="text-text font-mono">{asset.orderNo}</strong> • Serial: <span className="font-mono">{asset.serialNo}</span>
                    </div>
                  </div>
                  {renderStatusBadge(asset.status, isRegistered, isLinked)}
                </div>

                {/* Integrity & Plan Hash */}
                <div className="bg-canvas/60 p-2.5 rounded-md border border-border/60 text-xs space-y-1">
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Provenance Plan Hash
                    </span>
                    <span className="font-mono text-[10px] text-emerald-600 font-semibold">
                      {asset.integrityOk ? 'HASH OK' : 'MISMATCH'}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-text-muted truncate select-all">
                    {asset.planHash || 'Verified Manufacturing Hash'}
                  </div>
                </div>

                {/* Asset Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-canvas/40 p-2 rounded border border-border/40">
                    <span className="text-text-muted block text-[10px] uppercase font-semibold">Asset Kind</span>
                    <span className="text-text font-mono font-bold capitalize">{asset.assetKind.replace('_', ' ')}</span>
                  </div>
                  <div className="bg-canvas/40 p-2 rounded border border-border/40">
                    <span className="text-text-muted block text-[10px] uppercase font-semibold">Registered Owner</span>
                    <span className="text-text font-medium truncate block">{asset.ownerName || 'Customer'}</span>
                  </div>
                </div>

                {/* Linked Machine Banner */}
                {isLinked ? (
                  <div className="p-3 bg-accent/10 border border-accent/30 rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-accent flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-accent" />
                        Linked CNC Machine: <span className="font-mono font-bold text-text">{asset.machineCode || 'CNC-001'}</span>
                      </span>
                      <span className="text-[10px] font-mono bg-accent/20 text-accent font-semibold px-1.5 py-0.5 rounded">
                        M1 LIVE
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-accent/20">
                      <span className="text-[11px] text-text-muted">Provenance & Telemetry Active</span>
                      <a
                        href="/m1/machines"
                        className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1"
                      >
                        Inspect in M1 Monitoring →
                      </a>
                    </div>
                  </div>
                ) : null}

                {/* Actions / Registration / Machine Linking */}
                <div className="pt-2 border-t border-border/60 space-y-2">
                  {/* Delivered -> Register */}
                  {isDelivered && !isRegistered && (
                    <button
                      disabled={isBusy}
                      onClick={() => handleRegister(asset.assetTag)}
                      className="w-full bg-emerald-600 text-white hover:bg-emerald-700 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isBusy ? 'Verifying Integrity…' : 'Register Physical Asset'}
                    </button>
                  )}

                  {/* Registered -> Link to Machine */}
                  {(isRegistered || isDelivered) && !isLinked && (
                    <div className="bg-canvas/60 p-3 rounded-md border border-border/60 space-y-2.5">
                      <div className="text-[11px] font-medium text-text flex items-center justify-between">
                        <span className="flex items-center gap-1 text-text">
                          <Link2 className="w-3.5 h-3.5 text-accent" /> Link to Physical Machine:
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">Milestone 8 Bridge</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={chosenMachine}
                          onChange={(e) => setSelectedMachine({ ...selectedMachine, [asset.assetTag]: e.target.value })}
                          className="flex-1 bg-surface border border-border rounded px-2.5 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                          <option value="CNC-001">CNC-001 (Haas VF-2 Vertical Machining Center)</option>
                          <option value="CNC-002">CNC-002 (DMG Mori NMV 5000 5-Axis)</option>
                          <option value="CNC-003">CNC-003 (Mazak VTC-800/30SR)</option>
                        </select>
                        <button
                          disabled={isBusy}
                          onClick={() => handleLinkMachine(asset.assetTag)}
                          className="bg-accent text-white hover:bg-accent-hover px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-50 flex items-center gap-1 shadow-sm"
                        >
                          <Link2 className="w-3 h-3" />
                          {isBusy ? 'Linking…' : 'Link Machine'}
                        </button>
                      </div>
                    </div>
                  )}

                  {!isDelivered && !isRegistered && !isLinked && (
                    <div className="text-[11px] text-text-muted flex items-center justify-between">
                      <span>Status: <strong className="font-mono text-text">{asset.status}</strong></span>
                      <span
                        onClick={() => navigate('/shipments')}
                        className="text-accent hover:underline cursor-pointer font-medium"
                      >
                        Track Shipment →
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
