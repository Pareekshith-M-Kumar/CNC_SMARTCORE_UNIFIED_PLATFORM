import { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Check } from 'lucide-react';
import { machineApi } from '../api/machineApi';
import useMachineStore from '../store/useMachineStore';
import Card from '../components/common/Card';
import Spinner from '../components/common/Spinner';

const SEVERITY = {
  CRITICAL: { color: 'var(--status-offline)', icon: AlertCircle },
  HIGH:     { color: '#f97316',               icon: AlertTriangle },
  MEDIUM:   { color: 'var(--status-idle)',    icon: AlertTriangle },
  LOW:      { color: 'var(--accent)',          icon: Info },
};

export default function Alerts() {
  const { alerts, fetchAlerts } = useMachineStore();
  const [localAlerts, setLocalAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchAlerts();
    machineApi.getAlerts()
      .then((r) => setLocalAlerts(r.data))
      .catch(() => setLocalAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  const display = localAlerts.length > 0 ? localAlerts : alerts;

  const acknowledge = (id) => {
    setLocalAlerts((prev) => prev.map((a) => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const filtered = display.filter((a) => filter === 'ALL' || (a.severity || a.level)?.toUpperCase() === filter);

  if (loading) return <Spinner message="Loading alerts…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            style={{
              padding: '6px 14px',
              background: filter === level ? 'var(--accent-glow)' : 'var(--bg-surface)',
              border: `1px solid ${filter === level ? 'var(--accent-dim)' : 'var(--border)'}`,
              borderRadius: 20,
              color: filter === level ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 500,
            }}
          >
            {level}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 60 }}>
          <CheckCircle size={40} color="var(--status-running)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 600, fontSize: 15 }}>All clear</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>No alerts to display.</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((alert) => {
            const sev = (alert.severity || alert.level || 'LOW').toUpperCase();
            const cfg = SEVERITY[sev] || SEVERITY.LOW;
            const Icon = cfg.icon;
            return (
              <div
                key={alert.id}
                style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  padding: '14px 18px',
                  background: 'var(--bg-surface)',
                  border: `1px solid ${alert.acknowledged ? 'var(--border)' : cfg.color + '44'}`,
                  borderLeft: `3px solid ${alert.acknowledged ? 'var(--border)' : cfg.color}`,
                  borderRadius: 'var(--radius-md)',
                  opacity: alert.acknowledged ? 0.5 : 1,
                  transition: 'opacity var(--transition)',
                }}
              >
                <Icon size={16} color={cfg.color} style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {alert.title || alert.message || 'Alert'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {alert.description || alert.details || ''}
                  </div>
                  {alert.machineName && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Machine: {alert.machineName}
                    </div>
                  )}
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => acknowledge(alert.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                      fontSize: 11, fontWeight: 500, flexShrink: 0,
                    }}
                  >
                    <Check size={11} /> Acknowledge
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
