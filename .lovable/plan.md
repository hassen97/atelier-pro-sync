

# Repair Tracking Improvements & QR Domain Fix

## Summary
Fix QR code domain to use a configurable production URL, add `/r/:token` short route, improve the tracking page UX, and add a "Public Site Domain" setting in the admin panel.

## Changes

### 1. Database: Add `public_site_domain` to `platform_settings`
Insert a new row in `platform_settings` with key `public_site_domain` and default value `https://www.getheavencoin.com`.

```sql
INSERT INTO platform_settings (key, value)
VALUES ('public_site_domain', 'https://www.getheavencoin.com')
ON CONFLICT (key) DO NOTHING;
```

### 2. Admin Panel: Add "Public Site Domain" setting
In `AdminSettingsView.tsx`, add a new card for configuring the public domain. Loads/saves like the existing WhatsApp setting.

### 3. Fix QR Code Domain in Receipt
In `RepairReceiptDialog.tsx`, fetch `public_site_domain` from `platform_settings` and use it instead of the hardcoded `https://atelier-pro-sync.lovable.app`. Falls back to `window.location.origin` if not set.

### 4. Add `/r/:token` Short Route
In `App.tsx`, add a route `/r/:token` that renders the same `RepairTracking` component. This gives shorter QR URLs.

### 5. Improve Tracking Page (`RepairTracking.tsx`)
The page already handles not-found well and has a progress bar. Enhancements:
- Add repair reference number display more prominently in header area
- Improve the "not found" message to match the requested copy exactly
- Ensure lightweight, mobile-first (already is, minor polish)
- The existing progress bar, contact buttons (WhatsApp + Phone), and status messages are already solid

### 6. Old Domain Redirect
Since the app is deployed with `vercel.json` rewrites (SPA), old domains pointing to the same deployment already serve the same app. The `/track/:token` route works regardless of domain. No code change needed — this is a DNS/hosting concern. The key fix is ensuring **new** QR codes use the correct domain.

## Files Summary

| File | Change |
|------|--------|
| `supabase/migrations/new.sql` | Insert `public_site_domain` into `platform_settings` |
| `src/components/admin/AdminSettingsView.tsx` | Add domain config card |
| `src/components/repairs/RepairReceiptDialog.tsx` | Fetch domain from platform_settings, use for trackingUrl |
| `src/App.tsx` | Add `/r/:token` route |
| `src/pages/RepairTracking.tsx` | Minor UX polish (reference number in header, copy tweaks) |

