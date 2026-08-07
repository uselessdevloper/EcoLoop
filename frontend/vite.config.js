import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    proxy: {
      // Forward all /api/* and /data/* and /dataset/* calls to the FastAPI backend
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/data": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/dataset": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
