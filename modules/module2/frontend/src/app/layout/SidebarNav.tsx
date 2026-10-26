import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDevRole } from "@/app/context/useDevRole";
import { useAuth } from "@/features/auth/useAuth";
import {
  LayoutDashboard,
  Box,
  Layers,
  Cpu,
  PlayCircle,
  FileCheck2,
  Users,
  Settings,
  ShieldAlert,
  Palette,
  FolderGit2,
  Code2,
  ShoppingBag,
  Truck,
  QrCode,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  visible?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const SidebarNav: React.FC<{ isCollapsed?: boolean }> = ({ isCollapsed = false }) => {
  const { session, role: authRole } = useAuth();
  const { canAccessCam: devCam, canAccessApprovals: devApprovals, canAccessAdmin: devAdmin } = useDevRole();

  const effectiveRole = session ? authRole : undefined;
  const canAccessCam = effectiveRole
    ? ["cam_engineer", "approver", "admin", "operator"].includes(effectiveRole)
    : devCam;
  const canAccessApprovals = effectiveRole
    ? ["approver", "admin"].includes(effectiveRole)
    : devApprovals;
  const canAccessAdmin = effectiveRole
    ? effectiveRole === "admin"
    : devAdmin;

  const navGroups: NavGroup[] = [
    {
      group: "OVERVIEW",
      items: [
        { to: "/", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      group: "DESIGN",
      items: [
        { to: "/cad", label: "CAD Library", icon: <Box className="w-4 h-4" /> },
        { to: "/cad/studio", label: "CAD Studio (3D)", icon: <FolderGit2 className="w-4 h-4" /> },
        { to: "/materials", label: "Materials", icon: <Layers className="w-4 h-4" /> },
      ],
    },
    {
      group: "MANUFACTURE",
      items: [
        { to: "/cam", label: "CAM Jobs", icon: <Cpu className="w-4 h-4" />, visible: canAccessCam },
        { to: "/cam/studio", label: "G-Code Studio", icon: <Code2 className="w-4 h-4" />, visible: canAccessCam },
        { to: "/simulation", label: "Simulation", icon: <PlayCircle className="w-4 h-4" />, visible: canAccessCam },
      ],
    },
    {
      group: "RELEASE & LIFECYCLE",
      items: [
        { to: "/approvals", label: "Approvals", icon: <FileCheck2 className="w-4 h-4" />, visible: canAccessApprovals },
        { to: "/orders", label: "Orders", icon: <ShoppingBag className="w-4 h-4" /> },
        { to: "/shipments", label: "Demo Shipments", icon: <Truck className="w-4 h-4" /> },
        { to: "/assets", label: "Physical Assets", icon: <QrCode className="w-4 h-4" /> },
      ],
    },
    {
      group: "ADMIN",
      items: [
        { to: "/admin/users", label: "User Roles", icon: <Users className="w-4 h-4" />, visible: canAccessAdmin },
        { to: "/admin/catalog", label: "Machines & Tools", icon: <Settings className="w-4 h-4" />, visible: canAccessAdmin },
        { to: "/admin/audit", label: "Audit Log", icon: <ShieldAlert className="w-4 h-4" />, visible: canAccessAdmin },
      ],
    },
    {
      group: "DEV TOOLS",
      items: [
        { to: "/design-system", label: "Design System", icon: <Palette className="w-4 h-4 text-accent" /> },
      ],
    },
  ];

  return (
    <aside
      aria-label="Main Navigation"
      className={cn(
        "bg-surface border-r border-border h-full flex flex-col justify-between select-none transition-all duration-200",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex flex-col h-full overflow-y-auto py-3">
        {/* Brand / Logo */}
        <div className="px-4 pb-4 border-b border-border mb-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-accent-fg font-bold shrink-0">
            <FolderGit2 className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div>
              <div className="text-xs font-condensed font-bold tracking-wider text-text">
                CNC SMARTCORE
              </div>
              <div className="text-[10px] font-condensed text-text-muted tracking-tight">
                Module 2 · Pre-Mfg
              </div>
            </div>
          )}
        </div>

        {/* Navigation Groups */}
        <nav aria-label="Main Navigation" className="space-y-4 px-2">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => item.visible !== false);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.group} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-3 text-[10px] font-condensed font-semibold tracking-wider text-text-muted uppercase">
                    {group.group}
                  </div>
                )}
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "relative flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all group",
                        isActive
                          ? "bg-raised text-text font-semibold before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:bg-accent before:rounded-r"
                          : "text-text-2 hover:bg-raised/70 hover:text-text"
                      )
                    }
                    title={isCollapsed ? item.label : undefined}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer info in sidebar */}
      {!isCollapsed && (
        <div className="p-3 border-t border-border bg-raised/40 text-[10px] font-mono text-text-muted">
          <div>VERSION: v1.0-mvp</div>
          <div>STATUS: PROTOTYPE</div>
        </div>
      )}
    </aside>
  );
};
