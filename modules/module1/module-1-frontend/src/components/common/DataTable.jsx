export default function DataTable({ columns, data, onRowClick, emptyMessage = 'No data available' }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-bright)' }}>
            {columns.map((col) => (
              <th key={col.key} style={{
                padding: '10px 14px',
                textAlign: col.align || 'left',
                color: 'var(--text-muted)',
                fontWeight: 500,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{
                padding: '40px 14px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={() => onRowClick?.(row)}
                style={{
                  borderBottom: '1px solid var(--border)',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background var(--transition)',
                }}
                onMouseEnter={(e) => { if (onRowClick) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{
                    padding: '12px 14px',
                    textAlign: col.align || 'left',
                    color: 'var(--text-primary)',
                    whiteSpace: col.wrap ? 'normal' : 'nowrap',
                  }}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
