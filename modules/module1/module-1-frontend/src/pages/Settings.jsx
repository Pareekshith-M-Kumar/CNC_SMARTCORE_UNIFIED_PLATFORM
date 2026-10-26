import { useState } from 'react';
import Card from '../components/common/Card';

function Section({ title, children }) {
  return (
    <Card>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 18, color: 'var(--text-primary)' }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </Card>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, flexShrink: 0,
        background: checked ? 'var(--accent)' : 'var(--bg-base)',
        border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-bright)'}`,
        borderRadius: 11,
        position: 'relative',
        transition: 'background 200ms, border-color 200ms',
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: checked ? 20 : 2,
        width: 16, height: 16,
        background: '#fff',
        borderRadius: '50%',
        transition: 'left 200ms',
      }} />
    </button>
  );
}

export default function Settings() {
  const [apiBase, setApiBase] = useState(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080');
  const [refreshInterval, setRefreshInterval] = useState('30');
  const [liveRefresh, setLiveRefresh] = useState(true);
  const [notifyAlerts, setNotifyAlerts] = useState(true);
  const [notifyCritical, setNotifyCritical] = useState(true);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
      <Section title="Connection">
        <SettingRow label="API Base URL" description="Spring Boot backend address">
          <input
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            style={{ padding: '7px 10px', fontSize: 13, width: 260 }}
          />
        </SettingRow>
        <SettingRow label="Context Path" description="Configured as /api in Spring Boot">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', padding: '7px 10px' }}>/api</span>
        </SettingRow>
      </Section>

      <Section title="Live Refresh">
        <SettingRow label="Enable live refresh" description="Automatically poll for new data">
          <Toggle checked={liveRefresh} onChange={setLiveRefresh} />
        </SettingRow>
        <SettingRow label="Refresh interval" description="How often to poll (seconds)">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(e.target.value)}
            style={{ padding: '7px 10px', fontSize: 13, width: 100 }}
          >
            {['10', '30', '60', '120'].map((v) => <option key={v} value={v}>{v}s</option>)}
          </select>
        </SettingRow>
      </Section>

      <Section title="Notifications">
        <SettingRow label="Alert notifications" description="Show badge when alerts arrive">
          <Toggle checked={notifyAlerts} onChange={setNotifyAlerts} />
        </SettingRow>
        <SettingRow label="Critical alert popups" description="Highlight critical severity alerts">
          <Toggle checked={notifyCritical} onChange={setNotifyCritical} />
        </SettingRow>
      </Section>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={save}
          style={{
            padding: '9px 24px',
            background: saved ? 'var(--status-running)' : 'var(--accent)',
            border: 'none', borderRadius: 'var(--radius-sm)',
            color: '#0d0f14', fontSize: 13, fontWeight: 600,
            transition: 'background 300ms',
          }}
        >
          {saved ? '✓ Saved' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
