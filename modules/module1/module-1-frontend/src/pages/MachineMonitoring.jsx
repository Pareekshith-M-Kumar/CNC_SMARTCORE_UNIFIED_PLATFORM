import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Pencil, Trash2, Search } from 'lucide-react';
import useMachineStore from '../store/useMachineStore';
import Spinner from '../components/common/Spinner';
import ErrorMessage from '../components/common/ErrorMessage';
import StatusBadge from '../components/common/StatusBadge';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import MachineForm from '../components/machines/MachineForm';

export default function MachineMonitoring() {
  const { machines, loading, error, fetchMachines, createMachine, updateMachine, deleteMachine } = useMachineStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchMachines(); }, []);

  const filtered = machines.filter((m) => {
    const matchSearch =
      !search ||
      (m.machineName || m.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.machineCode || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.location || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || m.status?.toUpperCase() === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleCreate = async (data) => {
    setSaving(true);
    try { await createMachine(data); setShowCreate(false); }
    finally { setSaving(false); }
  };

  const handleEdit = async (data) => {
    setSaving(true);
    try { await updateMachine(editTarget.id, data); setEditTarget(null); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await deleteMachine(deleteTarget.id); setDeleteTarget(null); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: 'machineName', label: 'Machine Name', render: (v, row) => (
      <span style={{ fontWeight: 600 }}>{v || row.name}</span>
    )},
    { key: 'machineCode', label: 'Code', render: (v) => (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{v}</span>
    )},
    { key: 'assetTag', label: 'Physical Asset Tag', render: (v, row) => {
      const tag = v || (row.machineCode === 'CNC-001' ? 'ASSET-000123' : row.machineCode === 'CNC-002' ? 'ASSET-000120' : null);
      return tag ? (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
          padding: '2px 8px', borderRadius: 4, background: 'var(--accent-glow)',
          color: 'var(--accent)', border: '1px solid var(--accent)'
        }}>
          {tag}
        </span>
      ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Unlinked</span>;
    }},
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'location', label: 'Location' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'model', label: 'Model' },
    { key: 'spindleSpeed', label: 'Spindle (RPM)', align: 'right', render: (v) => (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v ?? '—'}</span>
    )},
    { key: 'feedRate', label: 'Feed (mm/min)', align: 'right', render: (v) => (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v ?? '—'}</span>
    )},
    { key: '_actions', label: 'Actions', render: (_, row) => (
      <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
        <ActionBtn icon={Eye} title="View" onClick={() => navigate(`/machines/${row.id}`)} />
        <ActionBtn icon={Pencil} title="Edit" onClick={() => setEditTarget(row)} accent="var(--status-idle)" />
        <ActionBtn icon={Trash2} title="Delete" onClick={() => setDeleteTarget(row)} accent="var(--status-offline)" />
      </div>
    )},
  ];

  if (loading && machines.length === 0) return <Spinner message="Loading machines…" />;
  if (error && machines.length === 0) return <ErrorMessage message={error} onRetry={fetchMachines} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search machines…"
            style={{ width: '100%', padding: '8px 10px 8px 32px', fontSize: 13 }}
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '8px 10px', fontSize: 13, minWidth: 130 }}
        >
          {['ALL', 'RUNNING', 'IDLE', 'OFFLINE', 'MAINTENANCE'].map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</option>
          ))}
        </select>

        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: '#0d0f14',
            fontSize: 13, fontWeight: 600,
          }}
        >
          <Plus size={14} />
          Add machine
        </button>
      </div>

      {/* Count */}
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Showing {filtered.length} of {machines.length} machines
        {loading && ' · Refreshing…'}
      </p>

      {/* Table */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(row) => navigate(`/machines/${row.id}`)}
          emptyMessage="No machines match your search."
        />
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add machine">
        <MachineForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} loading={saving} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit machine">
        {editTarget && (
          <MachineForm initial={editTarget} onSubmit={handleEdit} onCancel={() => setEditTarget(null)} loading={saving} />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete machine" width={400}>
        {deleteTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Remove <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.machineName || deleteTarget.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteTarget(null)} style={{
                padding: '8px 16px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-bright)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)', fontSize: 13,
              }}>Cancel</button>
              <button onClick={handleDelete} disabled={saving} style={{
                padding: '8px 16px',
                background: 'var(--status-offline)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: '#fff', fontSize: 13, fontWeight: 600,
                opacity: saving ? 0.7 : 1,
              }}>
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ActionBtn({ icon: Icon, title, onClick, accent = 'var(--text-secondary)' }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28,
        background: 'var(--bg-base)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        color: accent,
        transition: 'border-color var(--transition)',
      }}
    >
      <Icon size={13} />
    </button>
  );
}
