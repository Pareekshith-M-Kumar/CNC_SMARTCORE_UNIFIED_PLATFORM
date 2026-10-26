import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = {
  Running: 'var(--status-running)',
  Idle: 'var(--status-idle)',
  Offline: 'var(--status-offline)',
  Maintenance: 'var(--status-maintenance)',
};

export default function UtilizationChart({ machines }) {
  const counts = machines.reduce((acc, m) => {
    const key = m.status?.charAt(0) + m.status?.slice(1).toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(counts).map(([name, value]) => ({ name, value }));

  if (data.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No machine data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%" cy="50%"
          innerRadius={60} outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name] || '#888'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-bright)',
            borderRadius: 6, fontSize: 12,
          }}
        />
        <Legend
          iconType="circle" iconSize={8}
          formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
