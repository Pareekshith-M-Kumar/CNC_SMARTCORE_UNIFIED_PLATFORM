export default function StatCard({ label, value, icon: Icon, accent, sub }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle glow strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 2,
        background: accent || 'var(--accent)',
        borderRadius: '12px 12px 0 0',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        {Icon && (
          <div style={{
            width: 32, height: 32,
            background: `${accent || 'var(--accent)'}18`,
            border: `1px solid ${accent || 'var(--accent)'}33`,
            borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={15} color={accent || 'var(--accent)'} />
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {value ?? '—'}
        </div>
        {sub && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </div>
  );
}
