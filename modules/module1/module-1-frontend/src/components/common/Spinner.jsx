export default function Spinner({ size = 32, message }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: 40,
    }}>
      <div style={{
        width: size, height: size,
        border: `2px solid var(--border-bright)`,
        borderTop: `2px solid var(--accent)`,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      {message && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{message}</p>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
