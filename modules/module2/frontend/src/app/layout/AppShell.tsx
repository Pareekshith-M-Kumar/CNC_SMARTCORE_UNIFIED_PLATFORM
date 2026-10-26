import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarNav } from "./SidebarNav";
import { TopBar } from "./TopBar";
import { UnifiedPlatformBar } from "./UnifiedPlatformBar";

export const AppShell: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-canvas text-text">
      {/* Shared Platform TopBar */}
      <UnifiedPlatformBar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar Navigation */}
        <SidebarNav isCollapsed={isSidebarCollapsed} />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Module 2 Top Header */}
          <TopBar
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          />

          {/* Scrollable Page Body */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-[1440px] mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

