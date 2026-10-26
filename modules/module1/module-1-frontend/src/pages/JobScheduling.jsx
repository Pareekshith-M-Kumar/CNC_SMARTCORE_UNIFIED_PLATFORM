import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { machineApi } from '../api/machineApi';
import useMachineStore from '../store/useMachineStore';
import Card from '../components/common/Card';
import Spinner from '../components/common/Spinner';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

const STATUS_COLORS = {
  PENDING: 'var(--status-idle)',
  RUNNING: 'var(--status-running)',
  COMPLETED: 'var(--accent)',
  FAILED: 'var(--status-offline)',
};

export default function JobScheduling() {
  const { machines, fetchMachines } = useMachineStore();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ jobName: '', machineId: '', priority: 'MEDIUM', scheduledAt: '' });

  useEffect(() => {
    fetchMachines();
    machineApi.getJobs()
      .then((r) => setJobs(r.data))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    // POST to jobs endpoint — gracefully handle if not implemented
    setShowModal(false);
    setForm({ jobName: '', machineId: '', priority: 'MEDIUM', scheduledAt: '' });
  };

  const columns = [
    { key: 'jobName', label: 'Job Name', render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { key: 'machineName', label: 'Machine' },
    { key: 'priority', label: 'Priority', render: (v) => (
      <span style={{
        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        background: v === 'HIGH' ? 'rgba(239,68,68,0.12)' : v === 'LOW' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
        color: v === 'HIGH' ? 'var(--status-offline)' : v === 'LOW' ? 'var(--status-running)' : 'var(--status-idle)',
      }}>{v}</span>
    )},
    { key: 'status', label: 'Status', render: (v) => (
      <span style={{ color: STATUS_COLORS[v] || 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>{v}</span>
    )},
    { key: 'scheduledAt', label: 'Scheduled', render: (v) => v ? new Date(v).toLocaleString() : '—' },
    { key: 'completedAt', label: 'Completed', render: (v) => v ? new Date(v).toLocaleString() : '—' },
  ];

  if (loading) return <Spinner message="Loading job schedule…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            background: 'var(--accent)',
            border: 'none', borderRadius: 'var(--radius-sm)',
            color: '#0d0f14', fontSize: 13, fontWeight: 600,
          }}
        >
          <Plus size={14} /> Schedule job
        </button>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600 }}>Job Queue</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{jobs.length} jobs in schedule</p>
        </div>
        <DataTable
          columns={columns}
          data={jobs}
          emptyMessage="No jobs scheduled. Create one to get started."
        />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Schedule new job">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Job Name', name: 'jobName', type: 'text' },
              { label: 'Scheduled At', name: 'scheduledAt', type: 'datetime-local' },
            ].map(({ label, name, type }) => (
              <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>
                <input type={type} name={name} value={form[name]} onChange={onChange} style={{ padding: '8px 10px', fontSize: 13 }} />
              </div>
            ))}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Machine</label>
              <select name="machineId" value={form.machineId} onChange={onChange} style={{ padding: '8px 10px', fontSize: 13 }}>
                <option value="">Select machine</option>
                {machines.map((m) => <option key={m.id} value={m.id}>{m.machineName || m.name} ({m.machineCode})</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Priority</label>
              <select name="priority" value={form.priority} onChange={onChange} style={{ padding: '8px 10px', fontSize: 13 }}>
                {['LOW', 'MEDIUM', 'HIGH'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" onClick={() => setShowModal(false)} style={{
                padding: '8px 16px', background: 'var(--bg-surface)',
                border: '1px solid var(--border-bright)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)', fontSize: 13,
              }}>Cancel</button>
              <button type="submit" style={{
                padding: '8px 16px', background: 'var(--accent)',
                border: 'none', borderRadius: 'var(--radius-sm)',
                color: '#0d0f14', fontSize: 13, fontWeight: 600,
              }}>Schedule</button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
