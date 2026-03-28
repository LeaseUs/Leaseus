import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Raise warning limit so we see real culprits only
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Mapbox is 1.7MB — isolate it so it only loads on Home
          "mapbox":    ["mapbox-gl"],
          // Charts only load on analytics pages
          "recharts":  ["recharts"],
          // Supabase in its own chunk
          "supabase":  ["@supabase/supabase-js"],
          // React core
          "react-vendor": ["react", "react-dom", "react-router"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router"],
    exclude: ["mapbox-gl"],
  },
});