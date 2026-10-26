import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', gap: 16, textAlign: 'center',
    }}>
      <div style={{ fontSize: 72, fontWeight: 800, color: 'var(--border-bright)', letterSpacing: '-4px', fontVariantNumeric: 'tabular-nums' }}>
        404
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>Page not found</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320 }}>
        The route you're looking for doesn't exist. Check the URL or go back to the dashboard.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          padding: '9px 20px',
          background: 'var(--accent)',
          border: 'none', borderRadius: 'var(--radius-sm)',
          color: '#0d0f14', fontSize: 13, fontWeight: 600,
        }}
      >
        Back to dashboard
      </button>
    </div>
  );
}
