import { useContext } from "react";
import { DevRoleContext } from "./DevRoleContext";

export function useDevRole() {
  const context = useContext(DevRoleContext);
  if (!context) {
    throw new Error("useDevRole must be used within a DevRoleProvider");
  }
  return context;
}
