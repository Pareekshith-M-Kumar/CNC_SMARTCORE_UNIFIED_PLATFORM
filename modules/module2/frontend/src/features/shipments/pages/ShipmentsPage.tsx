import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shipmentsApi } from '../api';
import { Shipment, ShipmentStatus } from '../types';
import {
  Truck,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Info,
  Package,
  ShoppingBag
} from 'lucide-react';

export const ShipmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await shipmentsApi.getShipments();
      setShipments(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load demo shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleTransition = async (shipmentId: string, toStatus: string, note: string) => {
    setActionInProgress(shipmentId);
    setError(null);
    try {
      await shipmentsApi.transitionShipment(shipmentId, { toStatus, note });
      await fetchShipments();
    } catch (err: any) {
      setError(err?.message || `Failed to transition shipment to ${toStatus}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleConfirmDelivery = async (shipmentId: string) => {
    setActionInProgress(shipmentId);
    setError(null);
    try {
      await shipmentsApi.confirmDelivery(shipmentId);
      await fetchShipments();
    } catch (err: any) {
      setError(err?.message || 'Failed to confirm delivery');
    } finally {
      setActionInProgress(null);
    }
  };

  const steps: ShipmentStatus[] = ['PREPARING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'];

  const getStepIndex = (status: ShipmentStatus) => {
    return steps.indexOf(status);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Demo Banner per Milestone 7 Requirements */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-text flex items-center gap-2">
            <span>Demo Logistics Sandbox (Milestone 7)</span>
            <span className="text-[10px] font-mono bg-amber-500/20 text-amber-600 border border-amber-500/40 px-2 py-0.5 rounded">
              SIMULATED LOGISTICS
            </span>
          </div>
          <p className="text-text-muted leading-relaxed">
            Physical shipping is simulated with strict state machine validation (skipping intermediate states is forbidden by the backend).
            Transitions automatically propagate status updates to orders and serialized physical assets (<code className="font-mono text-accent">ASSET-XXXXXX</code>).
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text">Shipments & Logistics</h1>
            <span className="font-mono text-xs bg-surface border border-border text-text-muted px-2 py-0.5 rounded">
              {shipments.length} PACKAGES
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Track package dispatch, in-transit telemetry, and customer delivery confirmations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 px-3 py-1.5 border border-border rounded text-xs font-medium text-text bg-surface hover:bg-canvas transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-accent" />
            View Orders
          </button>
          <button
            onClick={() => navigate('/assets')}
            className="flex items-center gap-2 px-3 py-1.5 border border-border rounded text-xs font-medium text-text bg-surface hover:bg-canvas transition-colors"
          >
            <Package className="w-4 h-4 text-accent" />
            Inspect Assets
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-md flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Shipments List */}
      {loading ? (
        <div className="p-12 text-center text-text-muted">Loading shipments…</div>
      ) : shipments.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-lg bg-surface">
          <Truck className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
          <h3 className="text-base font-semibold text-text">No active shipments</h3>
          <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">
            Create a manufacturing order first to dispatch shipments.
          </p>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 bg-accent text-white hover:bg-accent-hover px-4 py-2 rounded text-xs font-medium transition-colors"
          >
            Go to Orders
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {shipments.map((shipment) => {
            const currentIdx = getStepIndex(shipment.status);
            const isBusy = actionInProgress === shipment.id;

            return (
              <div key={shipment.id} className="border border-border bg-surface rounded-lg overflow-hidden shadow-sm">
                <div className="bg-canvas/30 border-b border-border/60 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="text-base font-mono font-bold text-text flex items-center gap-2">
                          <Truck className="w-4 h-4 text-accent" />
                          {shipment.shipmentNo}
                        </div>
                        <span className="font-mono text-xs text-text-muted border border-border px-2 py-0.5 rounded">
                          Order: {shipment.orderNo}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted flex items-center gap-4">
                        <span>Carrier: <strong className="text-text font-mono">{shipment.carrierLabel}</strong></span>
                        <span>Tracking: <strong className="text-text font-mono">{shipment.trackingNo || 'N/A'}</strong></span>
                      </div>
                    </div>

                    {/* Step Action Buttons */}
                    <div className="flex items-center gap-2">
                      {shipment.status === 'PREPARING' && (
                        <button
                          disabled={isBusy}
                          onClick={() => handleTransition(shipment.id, 'SHIPPED', 'Dispatched from factory warehouse via demo logistics')}
                          className="bg-accent text-white hover:bg-accent-hover px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          {isBusy ? 'Processing…' : 'Dispatch (PREPARING → SHIPPED)'}
                        </button>
                      )}
                      {shipment.status === 'SHIPPED' && (
                        <button
                          disabled={isBusy}
                          onClick={() => handleTransition(shipment.id, 'IN_TRANSIT', 'Package in transit with logistics carrier')}
                          className="bg-accent text-white hover:bg-accent-hover px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          {isBusy ? 'Processing…' : 'Move to IN_TRANSIT'}
                        </button>
                      )}
                      {shipment.status === 'IN_TRANSIT' && (
                        <button
                          disabled={isBusy}
                          onClick={() => handleConfirmDelivery(shipment.id)}
                          className="bg-emerald-600 text-white hover:bg-emerald-700 px-3.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isBusy ? 'Confirming…' : 'Confirm Customer Delivery'}
                        </button>
                      )}
                      {shipment.status === 'DELIVERED' && (
                        <span className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-mono py-1 px-3 rounded font-semibold">
                          ✓ DELIVERED TO CUSTOMER
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Visual Stepper */}
                  <div className="relative">
                    <div className="overflow-hidden h-1.5 mb-4 text-xs flex rounded bg-canvas border border-border">
                      <div
                        style={{ width: `${((currentIdx + 1) / steps.length) * 100}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-accent transition-all duration-500"
                      />
                    </div>
                    <div className="grid grid-cols-4 text-center text-xs">
                      {steps.map((st, idx) => {
                        const active = idx <= currentIdx;
                        const isCurrent = idx === currentIdx;
                        return (
                          <div key={st} className="flex flex-col items-center">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold border transition-colors ${
                                isCurrent
                                  ? 'bg-accent text-white border-accent'
                                  : active
                                  ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500'
                                  : 'bg-canvas text-text-muted border-border'
                              }`}
                            >
                              {active ? '✓' : idx + 1}
                            </div>
                            <span className={`mt-2 font-mono text-[11px] font-semibold ${active ? 'text-text' : 'text-text-muted'}`}>
                              {st}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Shipment Event History */}
                  <div className="border-t border-border/60 pt-4">
                    <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                      Validated Lifecycle Event Trail
                    </h4>
                    <div className="space-y-2">
                      {shipment.events.map((evt) => (
                        <div
                          key={evt.id}
                          className="flex items-center justify-between p-2.5 rounded bg-canvas/40 border border-border/40 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] uppercase border border-border px-1.5 py-0.5 rounded font-semibold">
                              {evt.toStatus}
                            </span>
                            <span className="text-text">{evt.note}</span>
                          </div>
                          <span className="font-mono text-[10px] text-text-muted">
                            {new Date(evt.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
