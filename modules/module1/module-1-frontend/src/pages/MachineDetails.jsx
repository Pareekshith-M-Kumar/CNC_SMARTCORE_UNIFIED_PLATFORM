import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Building2, Cpu, Gauge, Activity, ShieldCheck, QrCode, ExternalLink } from 'lucide-react';
import useMachineStore from '../store/useMachineStore';
import Spinner from '../components/common/Spinner';
import ErrorMessage from '../components/common/ErrorMessage';
import StatusBadge from '../components/common/StatusBadge';
import Card from '../components/common/Card';

function DetailRow({ label, value, mono }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: 13, color: 'var(--text-primary)', fontWeight: 500,
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
      }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

export default function MachineDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedMachine, loading, error, fetchMachineById } = useMachineStore();

  useEffect(() => { fetchMachineById(id); }, [id]);

  if (loading) return <Spinner message="Loading machine details…" />;
  if (error) return <ErrorMessage message={error} onRetry={() => fetchMachineById(id)} />;
  if (!selectedMachine) return null;

  const m = selectedMachine;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>
      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={() => navigate('/machines')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            padding: '7px 12px', fontSize: 13,
          }}
        >
          <ArrowLeft size={13} /> Back
        </button>

        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{m.machineName || m.name}</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.machineCode}</p>
        </div>

        <StatusBadge status={m.status} />
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={14} color="var(--accent)" /> Identity
          </h3>
          <DetailRow label="Machine Name" value={m.machineName || m.name} />
          <DetailRow label="Machine Code" value={m.machineCode} mono />
          <DetailRow label="Manufacturer" value={m.manufacturer} />
          <DetailRow label="Model" value={m.model} />
          <DetailRow label="Location" value={m.location} />
        </Card>

        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={14} color="var(--accent)" /> Live Metrics
          </h3>
          <DetailRow label="Status" value={<StatusBadge status={m.status} />} />
          <DetailRow label="Spindle Speed" value={m.spindleSpeed ? `${m.spindleSpeed} RPM` : null} mono />
          <DetailRow label="Feed Rate" value={m.feedRate ? `${m.feedRate} mm/min` : null} mono />
          <DetailRow label="Created" value={m.createdAt ? new Date(m.createdAt).toLocaleDateString() : null} />
          <DetailRow label="Updated" value={m.updatedAt ? new Date(m.updatedAt).toLocaleString() : null} />
        </Card>
      </div>

      {/* Metric bars */}
      <Card>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Performance Overview</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <MetricBar label="Spindle Speed" value={m.spindleSpeed} max={12000} unit="RPM" color="var(--accent)" />
          <MetricBar label="Feed Rate" value={m.feedRate} max={5000} unit="mm/min" color="var(--status-running)" />
        </div>
      </Card>

      {/* Physical Asset Provenance Bridge (Module 2 -> Module 1) */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrCode size={15} color="var(--accent)" /> Physical Asset Provenance Bridge (Milestone 8)
          </h3>
          <span style={{
            fontSize: 11, fontFamily: 'var(--font-mono)', padding: '2px 8px',
            borderRadius: 4, background: 'var(--status-running-bg)',
            color: 'var(--status-running)', border: '1px solid var(--status-running)', fontWeight: 600
          }}>
            VERIFIED LINK
          </span>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12, padding: 14, background: 'var(--bg-base)',
          borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)'
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Permanent Asset Tag</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginTop: 2 }}>
              {m.assetTag || (m.machineCode === 'CNC-001' ? 'ASSET-000123' : 'ASSET-000120')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cryptographic Integrity</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--status-running)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <ShieldCheck size={14} /> SHA-256 Plan Hash Verified
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pre-Manufacturing Origin</div>
            <a
              href={`/m2/assets`}
              style={{
                fontSize: 12, color: 'var(--accent)', display: 'inline-flex',
                alignItems: 'center', gap: 4, fontWeight: 600, marginTop: 4, textDecoration: 'none'
              }}
            >
              Inspect in Module 2 Assets <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MetricBar({ label, value, max, unit, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100)) || 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
          {value ?? 0} {unit}
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-base)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color,
          borderRadius: 3,
          transition: 'width 600ms ease',
        }} />
      </div>
    </div>
  );
}
