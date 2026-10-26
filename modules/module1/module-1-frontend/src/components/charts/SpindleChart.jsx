import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function SpindleChart({ machines }) {
  const data = machines.slice(0, 10).map((m) => ({
    name: m.machineCode || m.machineName || `M${m.id}`,
    spindle: m.spindleSpeed || 0,
    feedRate: m.feedRate || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="spindleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="feedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--status-running)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--status-running)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-bright)',
            borderRadius: 6, fontSize: 12,
          }}
        />
        <Area type="monotone" dataKey="spindle" name="Spindle RPM" stroke="var(--accent)" fill="url(#spindleGrad)" strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="feedRate" name="Feed Rate" stroke="var(--status-running)" fill="url(#feedGrad)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
