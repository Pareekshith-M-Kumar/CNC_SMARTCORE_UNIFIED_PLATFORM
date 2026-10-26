import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { ThemeProvider } from "@/app/context/ThemeProvider";
import { DevRoleProvider } from "@/app/context/DevRoleProvider";
import { AuthProvider } from "@/features/auth/AuthProvider";

export default function App() {
  return (
    <ThemeProvider>
      <DevRoleProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </DevRoleProvider>
    </ThemeProvider>
  );
}
