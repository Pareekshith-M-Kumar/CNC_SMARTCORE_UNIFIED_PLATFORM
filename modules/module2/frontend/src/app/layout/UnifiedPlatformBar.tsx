import React from "react";
import { useAuth } from "@/features/auth/useAuth";
import { Cpu, Activity, Box, LogOut, LayoutDashboard } from "lucide-react";

export const UnifiedPlatformBar: React.FC = () => {
  const { user, profile, signOut } = useAuth();

  const roleColors: Record<string, string> = {
    admin: "bg-red-500/20 text-red-400 border-red-500/40",
    approver: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    cam_engineer: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    operator: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    designer: "bg-[#FF7A1A]/20 text-[#FF7A1A] border-[#FF7A1A]/40",
    customer: "bg-stone-800 text-stone-300 border-stone-700",
  };

  const currentRole = profile?.role || "designer";
  const roleBadgeStyle = roleColors[currentRole] || "bg-stone-800 text-stone-300 border-stone-700";

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  return (
    <header className="h-14 bg-[#14181B] border-b border-[#262C30] shrink-0 z-50 flex items-center justify-between px-4 sm:px-6 select-none">
      {/* Brand & Left Platform Navigation */}
      <div className="flex items-center space-x-6">
        <a href="/dashboard" className="flex items-center space-x-2.5 text-stone-200 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded bg-[#0F1214] border border-[#262C30] flex items-center justify-center">
            <Cpu className="w-5 h-5 text-[#FF7A1A]" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight leading-none text-stone-100">CNC SMARTCORE</span>
            <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest mt-0.5">Unified Platform</span>
          </div>
        </a>

        <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-[#262C30]">
          <a
            href="/dashboard"
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded text-stone-300 hover:text-stone-100 hover:bg-[#1C2226] transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </a>

          <a
            href="/m1"
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded text-stone-300 hover:text-stone-100 hover:bg-[#1C2226] transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Module 1: Monitoring</span>
          </a>

          <a
            href="/m2"
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded bg-[#1C2226] text-[#FF7A1A] border border-[#262C30] transition-colors"
          >
            <Box className="w-3.5 h-3.5 text-[#FF7A1A]" />
            <span className="font-semibold">Module 2: Pre-Mfg</span>
          </a>
        </nav>
      </div>

      {/* Right User & Actions */}
      <div className="flex items-center space-x-3">
        {user ? (
          <>
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-medium text-stone-200 truncate max-w-[180px]">
                {profile?.fullName || user.email?.split("@")[0]}
              </span>
              <span className="text-[10px] font-mono text-stone-400 truncate max-w-[180px]">
                {user.email}
              </span>
            </div>

            <span className={`text-[11px] font-mono px-2 py-0.5 rounded border uppercase font-medium ${roleBadgeStyle}`}>
              {currentRole.replace("_", " ")}
            </span>

            <button
              onClick={handleSignOut}
              title="Sign out"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded bg-[#1C2226] hover:bg-[#262C30] text-stone-300 hover:text-red-400 transition-colors border border-[#262C30] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </>
        ) : (
          <div className="flex items-center space-x-2">
            <a
              href="/login"
              className="px-3 py-1.5 text-xs font-medium text-stone-300 hover:text-stone-100 transition-colors"
            >
              Sign In
            </a>
            <a
              href="/register"
              className="px-3.5 py-1.5 text-xs font-medium rounded bg-[#FF7A1A] text-white hover:bg-[#FF7A1A]/90 transition-colors shadow-xs"
            >
              Register
            </a>
          </div>
        )}
      </div>
    </header>
  );
};
