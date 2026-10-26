import { createContext } from "react";

export type UserRole = "designer" | "cam_engineer" | "approver" | "admin" | "operator" | "customer";

export interface DevRoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  canAccessCam: boolean;
  canAccessApprovals: boolean;
  canAccessAdmin: boolean;
}

export const DevRoleContext = createContext<DevRoleContextType | undefined>(undefined);
