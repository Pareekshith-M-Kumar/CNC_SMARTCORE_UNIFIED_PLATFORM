import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "^/m2$": {
        target: "http://localhost:5174/m2/",
        changeOrigin: true,
      },
      "^/m1$": {
        target: "http://localhost:5175/m1/",
        changeOrigin: true,
      },
      // Dev proxy to Module 2 frontend (served under /m2/)
      "/m2": {
        target: "http://localhost:5174",
        changeOrigin: true,
        ws: true,
      },
      // Dev proxy to Module 1 frontend (served under /m1/)
      "/m1": {
        target: "http://localhost:5175",
        changeOrigin: true,
        ws: true,
      },
      // Dev proxy to Module 2 Backend API
      "/m2-api": {
        target: "http://localhost:8080/api/v1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/m2-api/, ""),
      },
      // Dev proxy to Module 1 Backend API
      "/m1-api": {
        target: "http://localhost:8082/api",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/m1-api/, ""),
      },
      // Direct /api proxy used by Module 1 components
      "/api": {
        target: "http://localhost:8082",
        changeOrigin: true,
      },
    },
  },
});
