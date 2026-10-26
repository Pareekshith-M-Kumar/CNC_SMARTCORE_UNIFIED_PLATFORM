import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Play, Pause, WifiOff, Bell } from 'lucide-react';
import useMachineStore from '../store/useMachineStore';
import StatCard from '../components/common/StatCard';
import Card from '../components/common/Card';
import Spinner from '../components/common/Spinner';
import ErrorMessage from '../components/common/ErrorMessage';
import StatusBadge from '../components/common/StatusBadge';
import UtilizationChart from '../components/charts/UtilizationChart';
import SpindleChart from '../components/charts/SpindleChart';

export default function Dashboard() {
  const { machines, alerts, loading, error, fetchMachines, fetchAlerts } = useMachineStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMachines();
    fetchAlerts();
    const interval = setInterval(() => { fetchMachines(); fetchAlerts(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && machines.length === 0) return <Spinner message="Loading dashboard…" />;
  if (error && machines.length === 0) return <ErrorMessage message={error} onRetry={fetchMachines} />;

  const byStatus = (s) => machines.filter((m) => m.status?.toUpperCase() === s).length;
  const running = byStatus('RUNNING');
  const idle = byStatus('IDLE');
  const offline = byStatus('OFFLINE');
  const activeAlerts = alerts.filter((a) => !a.acknowledged).length;

  const recentMachines = [...machines].slice(0, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <StatCard label="Total Machines" value={machines.length} icon={Cpu} sub="Registered in system" />
        <StatCard label="Running" value={running} icon={Play} accent="var(--status-running)" sub="Active production" />
        <StatCard label="Idle" value={idle} icon={Pause} accent="var(--status-idle)" sub="Awaiting jobs" />
        <StatCard label="Offline" value={offline} icon={WifiOff} accent="var(--status-offline)" sub="Check connectivity" />
        <StatCard label="Active Alerts" value={activeAlerts} icon={Bell} accent="var(--status-offline)" sub="Needs attention" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16 }}>
        <Card>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Machine Utilization</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Status distribution</p>
          </div>
          <UtilizationChart machines={machines} />
        </Card>

        <Card>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Spindle Speed & Feed Rate</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Per machine comparison</p>
          </div>
          <SpindleChart machines={machines} />
        </Card>
      </div>

      {/* Recent machines */}
      <Card>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
        }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600 }}>Recent Machines</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Latest activity</p>
          </div>
          <button
            onClick={() => navigate('/machines')}
            style={{
              padding: '6px 14px',
              background: 'var(--accent-glow)',
              border: '1px solid var(--accent-dim)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent)',
              fontSize: 12, fontWeight: 500,
            }}
          >
            View all →
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {recentMachines.map((m) => (
            <div
              key={m.id}
              onClick={() => navigate(`/machines/${m.id}`)}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'border-color var(--transition)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-bright)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{m.machineName || m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {m.machineCode}
                  </div>
                </div>
                <StatusBadge status={m.status} />
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-secondary)' }}>
                <span>📍 {m.location || '—'}</span>
                <span>⚡ {m.spindleSpeed ? `${m.spindleSpeed} RPM` : '—'}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
