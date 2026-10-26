import React, { useState, useEffect } from 'react';
import { Cpu, Activity, Box, LogOut, LayoutDashboard } from 'lucide-react';

export default function UnifiedPlatformBar() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('operator');

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const demoRaw = localStorage.getItem('cnc_demo_user');
        if (demoRaw) {
          try {
            const parsed = JSON.parse(demoRaw);
            if (parsed.user) {
              setUser(parsed.user);
              setRole(parsed.profile?.role || parsed.user.user_metadata?.role || 'admin');
              return;
            }
          } catch {}
        }

        const keys = Object.keys(localStorage);
        const authKey = keys.find((k) => k.startsWith('sb-') && k.endsWith('-auth-token')) || 'supabase.auth.token';
        const raw = localStorage.getItem(authKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          const u = parsed?.user || parsed?.currentSession?.user;
          if (u) {
            setUser(u);
            const userRole = u.user_metadata?.role || u.app_metadata?.role || 'operator';
            setRole(userRole);
          }
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleSignOut = () => {
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith('sb-')) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      // Ignore
    }
    window.location.href = '/login';
  };

  const roleColors = {
    admin: { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', border: 'rgba(239, 68, 68, 0.4)' },
    approver: { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.4)' },
    cam_engineer: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.4)' },
    operator: { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', border: 'rgba(16, 185, 129, 0.4)' },
    designer: { bg: 'rgba(255, 122, 26, 0.2)', text: '#FF7A1A', border: 'rgba(255, 122, 26, 0.4)' },
  };

  const currentRoleStyle = roleColors[role] || roleColors.operator;

  return (
    <header style={{
      height: '56px',
      backgroundColor: '#14181B',
      borderBottom: '1px solid #262C30',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      flexShrink: 0,
      zIndex: 50,
      userSelect: 'none',
      color: '#E6E4E0',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Brand & Left Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            backgroundColor: '#0F1214',
            border: '1px solid #262C30',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Cpu style={{ width: '20px', height: '20px', color: '#FF7A1A' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, fontSize: '13px', lineHeight: 1, letterSpacing: '-0.02em', color: '#F5F5F4' }}>CNC SMARTCORE</span>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#8E98A0', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>Unified Platform</span>
          </div>
        </a>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '16px', borderLeft: '1px solid #262C30' }}>
          <a
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '4px',
              color: '#A8A29E',
              textDecoration: 'none',
            }}
          >
            <LayoutDashboard style={{ width: '14px', height: '14px' }} />
            <span>Dashboard</span>
          </a>

          <a
            href="/m1"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '4px',
              backgroundColor: '#1C2226',
              color: '#34d399',
              border: '1px solid #262C30',
              textDecoration: 'none',
            }}
          >
            <Activity style={{ width: '14px', height: '14px', color: '#34d399' }} />
            <span>Module 1: Monitoring</span>
          </a>

          <a
            href="/m2"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '4px',
              color: '#A8A29E',
              textDecoration: 'none',
            }}
          >
            <Box style={{ width: '14px', height: '14px', color: '#60a5fa' }} />
            <span>Module 2: Pre-Mfg</span>
          </a>
        </nav>
      </div>

      {/* Right User & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#E6E4E0', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#8E98A0', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </span>
            </div>

            <span style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '2px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              fontWeight: 500,
              backgroundColor: currentRoleStyle.bg,
              color: currentRoleStyle.text,
              border: `1px solid ${currentRoleStyle.border}`,
            }}>
              {role.replace('_', ' ')}
            </span>

            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '4px',
                backgroundColor: '#1C2226',
                color: '#A8A29E',
                border: '1px solid #262C30',
                cursor: 'pointer',
              }}
            >
              <LogOut style={{ width: '14px', height: '14px' }} />
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href="/login"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                color: '#A8A29E',
                textDecoration: 'none',
              }}
            >
              Sign In
            </a>
            <a
              href="/register"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '4px',
                backgroundColor: '#FF7A1A',
                color: '#FFFFFF',
                textDecoration: 'none',
              }}
            >
              Register
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
