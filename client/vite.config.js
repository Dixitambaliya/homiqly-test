import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@admin": path.resolve(__dirname, "./src/admin"),
      "@vendor": path.resolve(__dirname, "./src/vendor"),
      "@shared": path.resolve(__dirname, "./src/shared"),
    },
  },
  server: {
    port: 3030,
    proxy: {
      "/api": {
        target: "https://homiqly-test-3av5.onrender.com",
        changeOrigin: true,
      },
    },
  },
});
