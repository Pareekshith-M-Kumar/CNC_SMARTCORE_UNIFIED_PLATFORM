export default function Card({ children, style, className }) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
