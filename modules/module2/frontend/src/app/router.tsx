import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { CadLibraryPage } from "@/features/design/pages/CadLibraryPage";
import { CadDetailPage } from "@/features/design/pages/CadDetailPage";
import { CadStudioPage } from "@/features/design/studio/CadStudioPage";
import { MaterialsPage } from "@/features/materials/pages/MaterialsPage";
import { CamJobsPage } from "@/features/cam/pages/CamJobsPage";
import { SimulationPage } from "@/features/simulation/pages/SimulationPage";
import { ApprovalsPage } from "@/features/approvals/pages/ApprovalsPage";
import { OrdersPage } from "@/features/orders/pages/OrdersPage";
import { ShipmentsPage } from "@/features/shipments/pages/ShipmentsPage";
import { AssetsPage } from "@/features/assets/pages/AssetsPage";
import { AdminPage } from "@/features/admin/pages/AdminPage";
import { DesignSystemShowcasePage } from "@/features/showcase/pages/DesignSystemShowcasePage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { RequireRole } from "@/features/auth/components/RequireRole";
import { RequireAuth } from "@/features/auth/components/RequireAuth";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "cad",
        element: <CadLibraryPage />,
      },
      {
        path: "cad/studio",
        element: <CadStudioPage />,
      },
      {
        path: "cad/:assetId",
        element: <CadDetailPage />,
      },
      {
        path: "materials",
        element: (
          <RequireRole allowedRoles={["designer", "cam_engineer", "approver", "admin"]}>
            <MaterialsPage />
          </RequireRole>
        ),
      },
      {
        path: "cam",
        element: (
          <RequireRole allowedRoles={["designer", "cam_engineer", "approver", "admin"]}>
            <CamJobsPage />
          </RequireRole>
        ),
      },
      {
        path: "cam/studio",
        element: (
          <RequireRole allowedRoles={["designer", "cam_engineer", "approver", "admin"]}>
            <CamJobsPage defaultTab="studio" />
          </RequireRole>
        ),
      },
      {
        path: "simulation",
        element: (
          <RequireRole allowedRoles={["cam_engineer", "approver", "admin"]}>
            <SimulationPage />
          </RequireRole>
        ),
      },
      {
        path: "approvals",
        element: (
          <RequireRole allowedRoles={["cam_engineer", "approver", "admin"]}>
            <ApprovalsPage />
          </RequireRole>
        ),
      },
      {
        path: "orders",
        element: <OrdersPage />,
      },
      {
        path: "shipments",
        element: <ShipmentsPage />,
      },
      {
        path: "assets",
        element: <AssetsPage />,
      },
      {
        path: "admin/users",
        element: (
          <RequireRole allowedRoles={["admin"]}>
            <AdminPage />
          </RequireRole>
        ),
      },
      {
        path: "admin/catalog",
        element: (
          <RequireRole allowedRoles={["admin"]}>
            <AdminPage />
          </RequireRole>
        ),
      },
      {
        path: "admin/audit",
        element: (
          <RequireRole allowedRoles={["admin"]}>
            <AdminPage />
          </RequireRole>
        ),
      },
      {
        path: "design-system",
        element: <DesignSystemShowcasePage />,
      },
    ],
  },
], {
  basename: import.meta.env.MODE === "test"
    ? (typeof window !== "undefined" && window.location.pathname.startsWith("/m2") ? "/m2" : undefined)
    : "/m2",
});
