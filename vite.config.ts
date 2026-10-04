import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["ticketstreamlogo.jpeg", "robots.txt", "sitemap.xml"],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
      },
      manifest: {
        name: "Ticket Stream",
        short_name: "TicketStream",
        description: "Discover, Book & Manage Event Tickets Online",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0f172a",
        icons: [
          { src: "/ticketstreamlogo.jpeg", sizes: "192x192", type: "image/jpeg" },
          { src: "/ticketstreamlogo.jpeg", sizes: "512x512", type: "image/jpeg" },
          { src: "/ticketstreamlogo.jpeg", sizes: "512x512", type: "image/jpeg", purpose: "any maskable" },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
});