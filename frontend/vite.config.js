
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

      includeAssets: ["favicon.ico"],

      manifest: {
        name: "BarberHub - Barber Shop Booking",
        short_name: "BarberHub",
        description:
          "Find barber shops, book appointments, and manage your visits with BarberHub.",
        theme_color: "#111827",
        background_color: "#111827",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/login",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
