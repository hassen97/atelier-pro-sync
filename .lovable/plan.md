## Goal

Two things, in one cohesive setup:

1. **Installable on Android** — your Chrome shows "Add to Home screen as shortcut" instead of "Install app" because the project is missing a valid `manifest.json` (the `<link rel="manifest">` tag points to a file that doesn't exist) and has no service worker. Once both exist, Chrome on Android will offer **"Install app"** which creates a true standalone app icon (no Chrome chrome around it).

2. **Background push notifications** — your current code uses `new Notification(...)` which only fires when the admin tab is **open and focused**. To get alerts when the app is **closed or in the background**, we need a Service Worker + Web Push API + a server-side trigger. This works on Android Chrome, desktop Chrome/Firefox/Edge — and on iOS only if installed as PWA (16.4+).

Both share the same Service Worker, so it's one integrated build.

---

## What I'll build

### A. Make the app installable (PWA basics)

1. Create `public/manifest.json` with proper PWA fields (name, icons 192/512, theme color, `display: "standalone"`, `start_url`, `scope`). Reuse your existing `android-chrome-192x192.png` and `android-chrome-512x512.png`.
2. Add a small set of mobile meta tags to `index.html` (`apple-mobile-web-app-capable`, status-bar style).
3. Install `vite-plugin-pwa` (only enabled in production builds, **disabled in the editor preview** to avoid stale-cache issues — Lovable's preview iframe will skip the SW).
4. Add an iframe/preview-host guard in `main.tsx` so the SW never registers in the Lovable editor.
5. Add a small "Install app" prompt button on the admin dashboard that captures `beforeinstallprompt` and lets you tap "Installer l'application" once Chrome considers it installable.

### B. Background push notifications (Web Push)

The hard requirement for background push: your edge function must send a push payload signed with **VAPID keys** to the browser's push service (FCM on Android Chrome). The browser wakes up the SW and shows the notification — even if the tab is closed.

**Database** (one new table via migration):
- `push_subscriptions` — stores per-user `endpoint`, `p256dh`, `auth` keys, `user_id`, `user_agent`. RLS: a user can only see/insert/delete their own.

**Secrets** (I'll request via `add_secret` once you approve):
- `VAPID_PUBLIC_KEY` (also added to `.env` as `VITE_VAPID_PUBLIC_KEY` for the browser to subscribe)
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (e.g. `mailto:hassen.brg97@gmail.com`)

I'll generate the keypair for you and give you the values to paste — it's a 30-second copy/paste.

**Service Worker** (`public/sw.js` written by `vite-plugin-pwa` + a custom `push` handler):
- Listens for `push` events
- Shows a native OS notification with title, body, icon, click-action URL

**Frontend**:
- New hook `usePushSubscription` that registers the SW, asks for permission, subscribes via VAPID, and upserts the subscription into `push_subscriptions`
- "Activer dans ce navigateur" button in your admin settings will use it — works on Android Chrome **without PWA install** (regular tab), and after PWA install it works in the background too
- Updated test button that triggers a real server-side push (not just a local `Notification`)

**Edge function** (`send-web-push`):
- Reads all subscriptions for the admin user(s)
- For each, sends a Web Push request signed with VAPID via `npm:web-push`
- Cleans up dead subscriptions (410/404 responses)

**Wire-up**:
- `notify-admin-signup` (existing) gets one extra step at the end: invoke `send-web-push` with the signup payload. So real shop signups deliver email + browser push + background push.
- The "Tester maintenant" button calls `send-web-push` with `test: true`.

### C. Document the constraints honestly

I'll add a small note in the admin settings explaining:
- Push works on **Android Chrome** even before installing the app
- For **closed-tab / background** delivery, install the app via the new "Installer l'application" button
- iOS still requires PWA install (Safari, iOS 16.4+)

---

## Files & changes

**New files**
- `public/manifest.json`
- `public/sw-push.js` (custom push handler — merged into the workbox SW)
- `src/hooks/usePushSubscription.ts`
- `src/components/pwa/InstallAppButton.tsx`
- `supabase/functions/send-web-push/index.ts`

**Modified files**
- `vite.config.ts` — add `vite-plugin-pwa` (production only, with iframe denylist + injectManifest mode for the custom push handler)
- `index.html` — add `apple-mobile-web-app-capable` + manifest is already linked
- `src/main.tsx` — guard SW registration against iframes / lovableproject.com hosts
- `src/components/admin/AdminSettingsView.tsx` — replace the local-only `Notification` test with a real server push trigger; add "Installer l'application" entry
- `supabase/functions/notify-admin-signup/index.ts` — fanout to `send-web-push` after enqueuing email
- `package.json` — add `vite-plugin-pwa`, `workbox-window`

**Database migration**
- `push_subscriptions` table + RLS policies

**Secrets to add** (after plan approval, via `add_secret`)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

---

## Important caveats (so there are no surprises)

1. **Push only works on the published/deployed URL**, not in the Lovable editor preview iframe. After I implement, you'll need to click **Publish → Update** so the new SW + manifest go live, then open `https://atelier-pro-sync.lovable.app` in your phone's Chrome.
2. **HTTPS is required** — your `lovable.app` URL is already HTTPS, so that's fine.
3. **First time on your phone**: open the published URL in Chrome → click "Activer dans ce navigateur" → accept the OS permission prompt → click "Tester maintenant". You should see a real Android push at the top of your screen.
4. **For background delivery (app closed)**: tap the new "Installer l'application" button (Android Chrome will now offer it because the manifest is valid). After installing, push works even if you fully close the app.
5. **Battery optimizations** on some Android skins (Xiaomi, Huawei, Samsung) can throttle push delivery for installed PWAs. If you ever notice misses, I can document the per-vendor settings to disable battery optimization for Chrome.
