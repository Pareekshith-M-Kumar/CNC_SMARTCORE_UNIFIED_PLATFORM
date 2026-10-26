import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import UnifiedPlatformBar from './UnifiedPlatformBar';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/machines': 'Machine Monitoring',
  '/analytics': 'Analytics',
  '/predictive-maintenance': 'Predictive Maintenance',
  '/tool-wear': 'Tool Wear',
  '/job-scheduling': 'Job Scheduling',
  '/alerts': 'Alerts',
  '/settings': 'Settings',
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || PAGE_TITLES[Object.keys(PAGE_TITLES).find((k) => pathname.startsWith(k) && k !== '/')] || 'CNC SmartCore';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <UnifiedPlatformBar />
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Navbar title={title} />
          <main style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
            background: 'var(--bg-base)',
          }}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
