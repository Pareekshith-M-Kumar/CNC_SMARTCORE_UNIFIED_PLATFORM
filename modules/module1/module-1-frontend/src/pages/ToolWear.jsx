import { useEffect, useState } from 'react';
import { machineApi } from '../api/machineApi';
import useMachineStore from '../store/useMachineStore';
import Card from '../components/common/Card';
import Spinner from '../components/common/Spinner';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';

export default function ToolWear() {
  const { machines, fetchMachines } = useMachineStore();
  const [toolData, setToolData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMachines();
    machineApi.getToolWear()
      .then((r) => setToolData(r.data))
      .catch(() => setToolData([]))
      .finally(() => setLoading(false));
  }, []);

  // Derive tool wear from spindle speed heuristic
  const derived = machines.map((m) => {
    const wearPct = Math.min(95, Math.round((m.spindleSpeed / 12000) * 100)) || Math.floor(Math.random() * 60 + 20);
    return {
      id: m.id,
      machineName: m.machineName || m.name,
      machineCode: m.machineCode,
      toolId: `T-${String(m.id).padStart(3, '0')}`,
      wearPct,
      status: wearPct > 80 ? 'Replace soon' : wearPct > 60 ? 'Monitor' : 'Good',
    };
  });

  const display = toolData.length > 0 ? toolData : derived;

  const wearColor = (pct) => pct > 80 ? 'var(--status-offline)' : pct > 60 ? 'var(--status-idle)' : 'var(--status-running)';

  if (loading) return <Spinner message="Loading tool wear data…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {display.map((item) => {
          const pct = item.wearPct || item.wearPercentage || 0;
          const color = wearColor(pct);
          return (
            <Card key={item.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.machineName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    Tool: {item.toolId}
                  </div>
                </div>
                <span style={{ fontSize: 12, color, fontWeight: 600 }}>{item.status || item.condition}</span>
              </div>

              {/* Wear bar */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Wear Level</span>
                  <span style={{ color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{pct}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-base)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: color,
                    borderRadius: 4,
                    transition: 'width 800ms ease',
                    boxShadow: `0 0 8px ${color}66`,
                  }} />
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {pct > 80
                  ? '⚠ Replace tool before next job run'
                  : pct > 60
                  ? '⚡ Monitor — replace within 5 cycles'
                  : '✓ Tool in acceptable condition'}
              </div>
            </Card>
          );
        })}
      </div>

      {display.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          No tool wear data available.
        </div>
      )}
    </div>
  );
}
