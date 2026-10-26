import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Cpu, BarChart2, Activity, Wrench,
  Briefcase, Bell, Settings, ChevronLeft, ChevronRight, ActivitySquare
} from 'lucide-react';

const SECTIONS = [
  {
    title: 'OVERVIEW',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { to: '/machines', label: 'Machine Fleet', icon: Cpu },
    ],
  },
  {
    title: 'ANALYTICS & AI',
    items: [
      { to: '/analytics', label: 'Telemetry Analytics', icon: BarChart2 },
      { to: '/predictive-maintenance', label: 'Predictive Maintenance', icon: Activity },
      { to: '/tool-wear', label: 'Tool Wear Prediction', icon: Wrench },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { to: '/job-scheduling', label: 'Job Schedule', icon: Briefcase },
      { to: '/alerts', label: 'Real-time Alerts', icon: Bell },
      { to: '/settings', label: 'Platform Settings', icon: Settings },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside style={{
      width: collapsed ? 64 : 230,
      height: '100%',
      background: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
      userSelect: 'none',
    }}>
      {/* Brand Header */}
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: collapsed ? '0 16px' : '0 18px',
        borderBottom: '1px solid #e2e8f0',
        gap: 10,
        overflow: 'hidden',
        background: '#fafafa',
      }}>
        <div style={{
          width: 30, height: 30, flexShrink: 0,
          background: '#ea580c',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(234, 88, 12, 0.3)',
        }}>
          <ActivitySquare size={17} color="#ffffff" strokeWidth={2.2} />
        </div>
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '-0.02em',
              color: '#0f172a',
              lineHeight: 1.1,
            }}>
              CNC SMARTCORE
            </span>
            <span style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: 2,
            }}>
              Module 1 · Monitoring
            </span>
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {SECTIONS.map((section) => (
          <div key={section.title} style={{ marginBottom: 14 }}>
            {!collapsed && (
              <div style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: '#94a3b8',
                letterSpacing: '0.08em',
                padding: '4px 18px 6px',
                textTransform: 'uppercase',
              }}>
                {section.title}
              </div>
            )}
            {section.items.map(({ to, label, icon: Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                title={collapsed ? label : undefined}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '9px 18px' : '8px 16px',
                  margin: '1px 8px',
                  borderRadius: 6,
                  color: isActive ? '#ea580c' : '#475569',
                  background: isActive ? '#fff7ed' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 12.5,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  border: isActive ? '1px solid #fed7aa' : '1px solid transparent',
                  transition: 'all 120ms ease',
                })}
              >
                <Icon size={16} strokeWidth={1.9} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div style={{ padding: '8px', borderTop: '1px solid #e2e8f0', background: '#fafafa' }}>
        <button
          onClick={onToggle}
          style={{
            width: '100%',
            padding: '6px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            transition: 'all 150ms ease',
          }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
