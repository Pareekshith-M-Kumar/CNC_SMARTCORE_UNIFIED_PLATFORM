import { Bell, RefreshCw, Layers } from 'lucide-react';
import useMachineStore from '../store/useMachineStore';

export default function Navbar({ title }) {
  const { alerts, fetchMachines, loading } = useMachineStore();
  const unread = alerts.filter((a) => !a.acknowledged).length;

  return (
    <header style={{
      height: 56,
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 9,
      flexShrink: 0,
    }}>
      {/* Breadcrumbs matching Module 2 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Layers size={14} color="#ea580c" />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          WORKSPACE
        </span>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <h1 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.01em' }}>
          {title}
        </h1>
        <span style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          padding: '2px 6px',
          borderRadius: 4,
          background: '#f1f5f9',
          color: '#475569',
          border: '1px solid #e2e8f0',
          fontWeight: 500,
          marginLeft: 4,
        }}>
          LIVE TELEMETRY
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={fetchMachines}
          disabled={loading}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            color: '#475569',
            padding: '5px 11px',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 500,
            transition: 'all 120ms ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
          aria-label="Refresh telemetry data"
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none', color: '#ea580c' }} />
          <span>Refresh</span>
        </button>

        <div style={{ position: 'relative' }}>
          <button
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              color: '#475569',
              padding: '6px 9px',
              display: 'flex', alignItems: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
            aria-label={`${unread} active alerts`}
          >
            <Bell size={14} />
          </button>
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: '#dc2626',
              color: '#fff', fontSize: 9, fontWeight: 700,
              borderRadius: 10, padding: '1px 5px', lineHeight: 1.4,
              boxShadow: '0 1px 3px rgba(220, 38, 38, 0.4)',
            }}>
              {unread}
            </span>
          )}
        </div>

        <div style={{
          padding: '4px 8px',
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#c2410c',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
          <span>EDGE CONNECTED</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </header>
  );
}
