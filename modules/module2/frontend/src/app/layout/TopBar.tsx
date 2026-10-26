import React from "react";
import { useTheme } from "@/app/context/useTheme";
import { useDevRole } from "@/app/context/useDevRole";
import { useAuth } from "@/features/auth/useAuth";
import { UserRole } from "@/features/auth/types";
import { Sun, Moon, Shield, PanelLeftClose, PanelLeftOpen, LogIn, LogOut, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface TopBarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ isSidebarCollapsed, onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { role: devRole, setRole: setDevRole } = useDevRole();
  const { user, profile, session, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getBreadcrumbTitle = (path: string): string => {
    switch (path) {
      case "/":
        return "Dashboard";
      case "/cad":
        return "CAD Library";
      case "/materials":
        return "Materials Catalog & Scoring";
      case "/cam":
        return "CAM Configuration";
      case "/simulation":
        return "Simulation Workspace";
      case "/approvals":
        return "Approval Queue";
      case "/admin/users":
        return "User Role Administration";
      case "/admin/catalog":
        return "Machines & Tools Library";
      case "/admin/audit":
        return "System Audit Trail";
      case "/design-system":
        return "Design System Showcase";
      case "/login":
        return "Sign In";
      case "/register":
        return "Register Account";
      default:
        return "CNC SmartCore";
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="h-12 bg-surface border-b border-border px-4 flex items-center justify-between select-none">
      {/* Left: Sidebar toggle + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-text-muted hover:text-text rounded-md hover:bg-raised transition-colors cursor-pointer"
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        <div className="h-4 w-[1px] bg-border" />

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-text-muted font-condensed uppercase tracking-wider">Workspace</span>
          <span className="text-text-muted">/</span>
          <span className="font-medium text-text">{getBreadcrumbTitle(location.pathname)}</span>
        </div>
      </div>

      {/* Right: Auth Profile / Role Switcher + Theme Toggle */}
      <div className="flex items-center gap-3">
        {session && user ? (
          /* Live Supabase Auth User Badge */
          <div className="flex items-center gap-2 bg-raised/80 border border-border-strong px-2.5 py-1 rounded-md text-xs">
            <User className="w-3.5 h-3.5 text-primary" />
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-text truncate max-w-[140px]">
                {profile?.fullName || user.email?.split("@")[0]}
              </span>
              <span className="text-[9px] font-mono uppercase tracking-wider text-primary font-bold">
                {profile?.role || "designer"}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="ml-1 text-text-muted hover:text-destructive p-1 rounded hover:bg-surface transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign out of system"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Dev / Guest Mode with Role Switcher */
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-raised/80 border border-border-strong px-2 py-1 rounded-md text-xs">
              <Shield className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-condensed uppercase tracking-wider text-text-muted">
                Dev Role:
              </span>
              <select
                value={devRole}
                onChange={(e) => setDevRole(e.target.value as UserRole)}
                className="bg-transparent text-xs font-semibold text-text focus:outline-hidden cursor-pointer"
                aria-label="Switch active mock role"
              >
                <option value="designer" className="bg-surface text-text">Designer</option>
                <option value="cam_engineer" className="bg-surface text-text">CAM Engineer</option>
                <option value="approver" className="bg-surface text-text">Approver</option>
                <option value="admin" className="bg-surface text-text">Admin</option>
              </select>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text px-2 py-1 rounded hover:bg-raised transition-colors cursor-pointer"
              aria-label="Sign in"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 text-text-muted hover:text-text hover:bg-raised rounded-md transition-colors cursor-pointer"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4 text-info" />}
        </button>
      </div>
    </header>
  );
};
