import { useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import useMachineStore from '../store/useMachineStore';
import Card from '../components/common/Card';
import Spinner from '../components/common/Spinner';
import ErrorMessage from '../components/common/ErrorMessage';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-bright)',
    borderRadius: 6, fontSize: 12,
  },
};

export default function Analytics() {
  const { machines, loading, error, fetchMachines } = useMachineStore();

  useEffect(() => { fetchMachines(); }, []);

  if (loading && machines.length === 0) return <Spinner message="Loading analytics…" />;
  if (error && machines.length === 0) return <ErrorMessage message={error} onRetry={fetchMachines} />;

  // Derive charts from machine data
  const spindleData = machines.map((m) => ({
    name: m.machineCode || `M${m.id}`,
    spindle: m.spindleSpeed || 0,
    feed: m.feedRate || 0,
  }));

  const statusCounts = machines.reduce((acc, m) => {
    const s = m.status || 'UNKNOWN';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  const locationData = machines.reduce((acc, m) => {
    const loc = m.location || 'Unknown';
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {});

  const locationChartData = Object.entries(locationData)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {statusData.map(({ status, count }) => (
          <div key={status} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{count}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{status}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Spindle Speed by Machine</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={spindleData} margin={{ left: -16, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="spindle" name="Spindle RPM" fill="var(--accent)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Feed Rate Comparison</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={spindleData} margin={{ left: -16, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="feed" name="Feed mm/min" stroke="var(--status-running)" strokeWidth={2} dot={{ r: 3, fill: 'var(--status-running)' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Machines by Location</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={locationChartData} layout="vertical" margin={{ left: 40, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="location" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={80} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="count" name="Machines" fill="var(--status-maintenance)" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
