import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "generateSW",
      injectRegister: false, // we register manually with iframe guard in main.tsx
      devOptions: {
        enabled: false, // never run SW in dev / Lovable preview
      },
      manifest: false, // we ship our own /public/manifest.json
      workbox: {
        importScripts: ["/sw-custom.js"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api/, /^\/functions/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        // Heavy libs that are dynamically imported on demand — keep them out
        // of the precache manifest to shrink the publish payload.
        globIgnores: [
          "**/xlsx-*.js",
          "**/jspdf*.js",
          "**/html2canvas*.js",
          "**/purify.es-*.js",
          "**/index.es-*.js",
          "**/JsBarcode-*.js",
          "**/BarChart-*.js",
          "**/PieChart-*.js",
          "**/receiptPdf-*.js",
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          // Don't cache HTML aggressively — keep it fresh
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              networkTimeoutSeconds: 3,
            },
          },
          // Cache the excluded heavy chunks on first use instead of precaching
          {
            urlPattern: /\/assets\/(xlsx|jspdf|html2canvas|purify\.es|index\.es|JsBarcode|BarChart|PieChart|receiptPdf)-[^/]+\.js$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "heavy-libs",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
