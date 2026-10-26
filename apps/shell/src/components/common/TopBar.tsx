import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Cpu, Activity, Box, LogOut, LayoutDashboard } from "lucide-react";

export const TopBar: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  const roleColors: Record<string, string> = {
    admin: "bg-danger/20 text-danger border-danger/40",
    approver: "bg-warning/20 text-warning border-warning/40",
    cam_engineer: "bg-info/20 text-info border-info/40",
    operator: "bg-success/20 text-success border-success/40",
    designer: "bg-accent/20 text-accent border-accent/40",
    customer: "bg-raised text-text-2 border-border-strong",
  };

  const currentRole = profile?.role || "designer";
  const roleBadgeStyle = roleColors[currentRole] || "bg-raised text-text-2 border-border";

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-border z-50 flex items-center justify-between px-4 sm:px-6">
      {/* Brand & Left Navigation */}
      <div className="flex items-center space-x-6">
        <Link to="/dashboard" className="flex items-center space-x-2.5 text-text hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded bg-canvas border border-border flex items-center justify-center">
            <Cpu className="w-5 h-5 text-accent" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight leading-none text-text">CNC SMARTCORE</span>
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest mt-0.5">Unified Platform</span>
          </div>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-border">
            <Link
              to="/dashboard"
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                location.pathname === "/dashboard"
                  ? "bg-raised text-accent border border-border"
                  : "text-text-2 hover:text-text hover:bg-raised/50"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>

            <a
              href="/m1/"
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded text-text-2 hover:text-text hover:bg-raised/50 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-success" />
              <span>Module 1: Monitoring</span>
            </a>

            <a
              href="/m2/"
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded text-text-2 hover:text-text hover:bg-raised/50 transition-colors"
            >
              <Box className="w-3.5 h-3.5 text-info" />
              <span>Module 2: Pre-Mfg</span>
            </a>
          </nav>
        )}
      </div>

      {/* Right User & Actions */}
      <div className="flex items-center space-x-3">
        {user ? (
          <>
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-medium text-text truncate max-w-[180px]">
                {profile?.full_name || user.email}
              </span>
              <span className="text-[10px] font-mono text-text-muted truncate max-w-[180px]">
                {user.email}
              </span>
            </div>

            <span className={`text-[11px] font-mono px-2 py-0.5 rounded border uppercase font-medium ${roleBadgeStyle}`}>
              {currentRole.replace("_", " ")}
            </span>

            <button
              onClick={() => signOut()}
              title="Sign out"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded bg-raised hover:bg-border text-text-2 hover:text-danger transition-colors border border-border"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </>
        ) : (
          <div className="flex items-center space-x-2">
            <Link
              to="/login"
              className="px-3 py-1.5 text-xs font-medium text-text-2 hover:text-text transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-1.5 text-xs font-medium rounded bg-accent text-accent-fg hover:bg-accent-hover transition-colors shadow-sm"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
