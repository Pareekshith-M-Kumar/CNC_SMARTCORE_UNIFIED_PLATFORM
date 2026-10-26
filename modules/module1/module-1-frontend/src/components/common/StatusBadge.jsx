const STATUS_CONFIG = {
  RUNNING:     { color: 'var(--status-running)',     label: 'Running' },
  IDLE:        { color: 'var(--status-idle)',        label: 'Idle' },
  OFFLINE:     { color: 'var(--status-offline)',     label: 'Offline' },
  MAINTENANCE: { color: 'var(--status-maintenance)', label: 'Maintenance' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status?.toUpperCase()] || { color: 'var(--text-muted)', label: status || 'Unknown' };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 10px',
      borderRadius: 20,
      background: `${cfg.color}18`,
      border: `1px solid ${cfg.color}44`,
      fontSize: 11,
      fontWeight: 600,
      color: cfg.color,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: cfg.color,
        boxShadow: `0 0 6px ${cfg.color}`,
        animation: status?.toUpperCase() === 'RUNNING' ? 'pulse 2s ease-in-out infinite' : 'none',
      }} />
      {cfg.label}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </span>
  );
}
