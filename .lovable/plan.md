# Reduce PWA precache to fix publish failures

## Goal

Publishing currently fails because the PWA service worker precaches everything the build emits (~140 files / ~3.9 MB), including very large libraries that are already lazy-loaded and don't need to be cached upfront:

- `xlsx` ~425 kB
- `jspdf.es.min` ~416 kB
- `html2canvas.esm` ~201 kB
- `BarChart` (recharts) ~368 kB
- `purify.es`, `index.es` (pdf deps) ~170 kB combined
- `JsBarcode` ~61 kB

Shrinking the precache manifest makes the deploy upload smaller and faster, which should let publishing succeed.

## Changes

### 1. `vite.config.ts` — exclude heavy chunks from Workbox precache

Add `globIgnores` to the Workbox config so these chunks ship normally (still lazy-loadable at runtime) but are NOT baked into the service worker's precache list. Also raise `maximumFileSizeToCacheInBytes` as a safety net for any other large chunk, and keep the existing `NetworkFirst` HTML strategy.

```ts
workbox: {
  importScripts: ["/sw-custom.js"],
  navigateFallback: "/index.html",
  navigateFallbackDenylist: [/^\/~oauth/, /^\/api/, /^\/functions/],
  globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
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
    {
      urlPattern: ({ request }) => request.destination === "document",
      handler: "NetworkFirst",
      options: { cacheName: "html-cache", networkTimeoutSeconds: 3 },
    },
    // Cache excluded heavy chunks on first use instead of precaching them
    {
      urlPattern: /\/assets\/(xlsx|jspdf|html2canvas|purify\.es|index\.es|JsBarcode|BarChart|PieChart|receiptPdf)-.*\.js$/,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "heavy-libs", expiration: { maxEntries: 20 } },
    },
  ],
},
```

### Why this is safe

- These libs are already loaded via dynamic `import()` only when needed (export to Excel, generate PDF receipt, render a chart). They were never required for first paint.
- `StaleWhileRevalidate` runtime caching still gives offline access after first use.
- HTML stays `NetworkFirst`, so updates propagate normally.
- No app code changes — only `vite.config.ts`.

## Expected impact

- Precache manifest drops from ~3.9 MB / 140 entries to roughly ~1.6 MB / ~125 entries.
- Smaller `sw.js` precache list → smaller publish payload → publish should succeed.
- First load of POS/Inventory/Statistics is unaffected (libs were already lazy).
- First export/PDF/chart action fetches the chunk over network once, then is cached.

## Out of scope

- No business logic changes.
- No removal of `vite-plugin-pwa` (PWA stays enabled).
- No changes to `public/sw-custom.js`.
- Chunk-splitting via `manualChunks` (only do this if publish still fails after step above).

## Verification

After approval and implementation:
1. Run a local production build and confirm the PWA summary shows fewer precache entries / smaller total size.
2. Ask you to click Publish — it should now succeed.
