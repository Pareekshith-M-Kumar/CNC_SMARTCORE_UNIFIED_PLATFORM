import React, { useState, useEffect } from "react";
import { UserRole, DevRoleContext } from "./DevRoleContext";

export function DevRoleProvider({
  children,
  initialRole,
}: {
  children: React.ReactNode;
  initialRole?: UserRole;
}) {
  const [role, setRoleState] = useState<UserRole>(() => {
    if (initialRole) return initialRole;
    try {
      const stored = localStorage.getItem("cnc_dev_role");
      if (stored === "designer" || stored === "cam_engineer" || stored === "approver" || stored === "admin") {
        return stored;
      }
    } catch {
      // Ignore
    }
    return "admin"; // Default to admin in dev to preview all screens
  });

  useEffect(() => {
    try {
      localStorage.setItem("cnc_dev_role", role);
    } catch {
      // Ignore
    }
  }, [role]);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
  };

  const canAccessCam = role === "cam_engineer" || role === "admin" || role === "approver";
  const canAccessApprovals = role === "approver" || role === "admin" || role === "cam_engineer";
  const canAccessAdmin = role === "admin";

  return (
    <DevRoleContext.Provider
      value={{
        role,
        setRole,
        canAccessCam,
        canAccessApprovals,
        canAccessAdmin,
      }}
    >
      {children}
    </DevRoleContext.Provider>
  );
}
