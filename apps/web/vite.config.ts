import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@homelab-topology/core": path.resolve(__dirname, "../../packages/core/src"),
      "@homelab-topology/renderer": path.resolve(__dirname, "../../packages/renderer/src"),
    },
  },
});
