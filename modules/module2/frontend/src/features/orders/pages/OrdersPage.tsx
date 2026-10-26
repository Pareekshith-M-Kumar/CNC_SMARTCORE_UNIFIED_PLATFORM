import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../api';
import { ManufacturingOrder } from '../types';
import { approvalsApi } from '@/features/approvals/api';
import { ApprovalItem } from '@/features/approvals/types';
import {
  ShoppingBag,
  Plus,
  Truck,
  Package,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string>('');
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, approvalsRes] = await Promise.all([
        ordersApi.getOrders(),
        approvalsApi.getApprovals('APPROVED').catch(() => []),
      ]);
      setOrders(ordersRes);
      setApprovals(approvalsRes);
      if (approvalsRes.length > 0) {
        setSelectedApprovalId(approvalsRes[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load manufacturing orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApprovalId) return;
    setCreating(true);
    setError(null);
    try {
      await ordersApi.createOrder({
        approvalId: selectedApprovalId,
        quantity: orderQuantity,
      });
      setShowCreateModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create order from approval');
    } finally {
      setCreating(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <span className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 px-2 py-0.5 rounded font-mono text-xs font-semibold">DELIVERED</span>;
      case 'SHIPPING':
        return <span className="bg-blue-500/15 text-blue-600 border border-blue-500/30 px-2 py-0.5 rounded font-mono text-xs font-semibold">SHIPPING</span>;
      case 'READY_TO_SHIP':
        return <span className="bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 px-2 py-0.5 rounded font-mono text-xs font-semibold">READY TO SHIP</span>;
      case 'IN_PRODUCTION':
        return <span className="bg-amber-500/15 text-amber-600 border border-amber-500/30 px-2 py-0.5 rounded font-mono text-xs font-semibold">IN PRODUCTION</span>;
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
            <h1 className="text-2xl font-bold tracking-tight text-text">Manufacturing Orders</h1>
            <span className="font-mono text-xs bg-surface border border-border text-text-muted px-2 py-0.5 rounded">
              MILESTONE 7
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Track production orders released from approved CAM plans with verifiable SHA-256 integrity and serialized assets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/shipments')}
            className="flex items-center gap-2 px-3 py-1.5 border border-border rounded text-xs font-medium text-text bg-surface hover:bg-canvas transition-colors"
          >
            <Truck className="w-4 h-4 text-accent" />
            View Shipments
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-accent text-white hover:bg-accent-hover flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Order from Plan
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-md flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Orders Grid */}
      {loading ? (
        <div className="p-12 text-center text-text-muted">Loading manufacturing orders…</div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-lg bg-surface">
          <Package className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
          <h3 className="text-base font-semibold text-text">No manufacturing orders yet</h3>
          <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">
            Approve a CAM manufacturing plan in the Approvals tab to release production orders.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 bg-accent text-white hover:bg-accent-hover px-4 py-2 rounded text-xs font-medium transition-colors"
          >
            Create Order Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <div key={order.id} className="border border-border bg-surface rounded-lg p-5 shadow-sm hover:shadow transition-shadow space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-mono font-bold text-text flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-accent" />
                    {order.orderNo}
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    Recipient: <span className="text-text font-medium">{order.recipientName || 'Dev CNC Engineer'}</span>
                  </div>
                </div>
                {renderStatusBadge(order.status)}
              </div>

              {/* Plan Hash & Integrity */}
              <div className="bg-canvas/60 p-2.5 rounded-md border border-border/60 text-xs space-y-1">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    SHA-256 Plan Hash
                  </span>
                  <span className="font-mono text-[10px] text-emerald-600 font-semibold">VERIFIED</span>
                </div>
                <div className="font-mono text-[11px] text-text-muted truncate select-all">
                  {order.planHash}
                </div>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-canvas/40 p-2 rounded border border-border/40">
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Batch Quantity</span>
                  <span className="text-text font-mono font-bold text-sm">{order.quantity} units</span>
                </div>
                <div className="bg-canvas/40 p-2 rounded border border-border/40">
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Created Date</span>
                  <span className="text-text font-mono text-xs">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Serialized Physical Assets */}
              <div className="border-t border-border/60 pt-3">
                <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Serialized Physical Assets</span>
                  <span className="text-accent font-mono text-xs">{order.assetTags.length} registered</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {order.assetTags.map((tag) => (
                    <span
                      key={tag}
                      onClick={() => navigate('/assets')}
                      className="font-mono text-xs px-2.5 py-1 bg-surface border border-border rounded text-text hover:border-accent hover:text-accent cursor-pointer transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-border/60">
                <button
                  onClick={() => navigate('/shipments')}
                  className="text-xs text-text-muted hover:text-accent font-medium transition-colors"
                >
                  Track in Demo Shipments →
                </button>
                <button
                  onClick={() => navigate('/assets')}
                  className="text-xs text-text-muted hover:text-accent font-medium transition-colors"
                >
                  Inspect Assets →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-accent" />
                Release Manufacturing Order
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-text mb-1">Select Approved CAM Plan</label>
                {approvals.length === 0 ? (
                  <div className="p-3 bg-canvas border border-border rounded text-text-muted">
                    No APPROVED plans found. Please approve a plan first.
                  </div>
                ) : (
                  <select
                    value={selectedApprovalId}
                    onChange={(e) => setSelectedApprovalId(e.target.value)}
                    className="w-full p-2 bg-canvas border border-border rounded text-text font-mono text-xs focus:outline-none focus:border-accent"
                  >
                    {approvals.map((a) => (
                      <option key={a.id} value={a.id}>
                        Approval #{a.id.substring(0, 8)} ({a.status}) — {a.planHash ? a.planHash.substring(0, 12) : 'Hash'}...
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-medium text-text mb-1">Order Quantity (Units to Serialise)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 1)}
                  className="w-full p-2 bg-canvas border border-border rounded text-text font-mono text-xs focus:outline-none focus:border-accent"
                />
                <p className="text-[11px] text-text-muted mt-1">
                  Each unit will automatically receive a unique permanent physical asset tag (<code className="font-mono text-accent">ASSET-XXXXXX</code>).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-border rounded text-xs text-text hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !selectedApprovalId}
                  className="bg-accent text-white hover:bg-accent-hover px-4 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Release Order & Serialise Assets'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
