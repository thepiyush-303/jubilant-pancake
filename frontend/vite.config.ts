import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Configures Vite to build and serve the React application.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
