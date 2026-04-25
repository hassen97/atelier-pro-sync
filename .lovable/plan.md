# Cleanup verification + add signup notifications + online filter + waitlist→signup redirect

## 1. Remove the verification system completely

### Database migration
- Mark every existing profile as `verified`:
  - `UPDATE profiles SET verification_status = 'verified', verification_requested_at = NULL, verification_deadline = NULL, verified_at = COALESCE(verified_at, now()) WHERE verification_status <> 'verified';`
- Change the default for `profiles.verification_status` from `'pending_verification'` to `'verified'`.
- Update `public.handle_new_user()` so new signups are inserted with `verification_status = 'verified'` and `is_locked = false` regardless of the `auto_confirm_signups` flag (verification gate is gone).
- Drop `verification_requests` table (currently 10 rows — unused going forward; data is no longer surfaced anywhere).
- Note: keep the columns `verification_status / verification_deadline / verification_requested_at / verified_at / verified_by_admin` on `profiles` for now (used in many admin queries) — they will simply always be `verified`.

### Frontend deletions / changes
- Delete `src/components/verification/VerificationBanner.tsx`.
- Delete `src/components/verification/VerificationRequestDialog.tsx`.
- Delete `src/components/admin/AdminVerificationView.tsx` (already orphaned).
- Keep `VerifiedBadge.tsx` (still used as a generic “verified shop” badge in admin lists).
- Remove the `<VerificationBanner />` mount in `src/components/layout/MainLayout.tsx`.
- In `src/components/auth/ProtectedRoute.tsx` (`useOnboardingStatus`): drop `verification_requested_at` from the select, treat everyone as verified, remove the `isPendingVerification / isSuspended` branch; the funnel becomes: verified → onboarding → checkout.
- In `src/pages/Auth.tsx`: drop the `verification_status` checks during login (keep only the `is_locked` admin kill-switch).
- In `src/components/announcements/WhatsNewModal.tsx`: remove the `useVerificationGate` hook and just render the modal normally.

### Admin UI cleanup (keep functionality, drop verification-specific filters/buttons)
- `AdminShopsView.tsx`: remove `pending_verification` and `suspended` filter chips & counters; simplify `getUnifiedStatus` (no more pending/suspended branches); remove “verify / suspend / unsuspend” quick actions; keep the `VerifiedBadge` next to verified rows (which is now everyone).
- `ShopDetailSheet.tsx`: remove the verify / suspend / unsuspend action block.
- `AdminEmployeesView.tsx`: drop the `isVerified` visual logic (or hard-code to `true`).

## 2. Notify the platform admin on every new shop signup

### Backend
- New edge function `notify-admin-signup` (`verify_jwt = false`):
  - Triggered from the client right after a successful `signUp` in `Auth.tsx` (so it never blocks the signup flow if it fails).
  - Reads `platform_settings`:
    - `admin_notify_email` (new key) — destination email.
    - `admin_notify_email_enabled` (new key, `"true"`/`"false"`).
    - `admin_notify_browser_enabled` (new key, `"true"`/`"false"`) — used only by the frontend listener; the edge function still inserts a row regardless so the live admin sees it.
  - Sends an email via the already-configured Lovable Emails infrastructure (reusing `enqueue_email` RPC + the existing `process-email-queue` worker, template name `admin-signup-alert`). A new minimal template `_shared/email-templates/admin-signup-alert.tsx` will be added.
  - Inserts a row into a new `admin_signup_events` table (so the admin dashboard can show a live feed and trigger the browser notification).

### Database migration
- New table `admin_signup_events (id uuid pk, user_id uuid, username text, full_name text, email text, phone text, country text, created_at timestamptz default now(), seen_at timestamptz)`.
- RLS: only `platform_admin` can `select` / `update`; service role can `insert`.
- Add it to `supabase_realtime` publication so the admin dashboard receives live inserts.
- Seed three new keys in `platform_settings`: `admin_notify_email`, `admin_notify_email_enabled` (default `'true'`), `admin_notify_browser_enabled` (default `'true'`).

### Admin frontend
- Extend `src/components/admin/AdminSettingsView.tsx` with a new card **“Alertes d’inscription”** containing:
  - Email destinataire (text input) + Save.
  - Toggle “Notifications par e-mail”.
  - Toggle “Notifications navigateur (push)” + a button **“Activer dans ce navigateur”** that calls `Notification.requestPermission()`.
- New hook `useAdminSignupNotifier` mounted inside `AdminDashboard`:
  - Subscribes to realtime inserts on `admin_signup_events`.
  - When a row arrives and the browser-toggle is on + permission granted, fires a `new Notification("Nouvelle inscription", { body: "<shop> – <username>" })` and a toast.

## 3. “Online shops” filter in shop management
- In `AdminShopsView.tsx`:
  - Add a new filter chip **“En ligne (N)”** next to existing chips, computed from `last_online_at > now() - 10 min` (matches the existing `getOnlineStatus` thresholds).
  - Add it to the `FilterType` union and the chip rendering.
  - Counter recomputed in the same `useMemo` that builds the other counters.

## 4. Waitlist email → signup redirect with prefilled username
- In `src/pages/LandingPage.tsx`, change `handleWaitlistSubmit`:
  - Still call `joinWaitlist.mutate(email)` (so the waitlist row is recorded — admin already lists them).
  - On success **and** on duplicate, immediately `navigate("/auth?tab=register&email=<email>&username=<localPart>")` where `localPart = email.split("@")[0]` sanitized to `[a-z0-9_]{3,20}` (truncate / pad with `_` if needed).
- In `src/pages/Auth.tsx`:
  - On mount, read `tab`, `email`, `username` from `location.search`.
  - If `tab=register`, switch `authTab` to `"register"`.
  - Prefill `registerEmail` and `registerUsername` from the query params.

## Technical details

**Files to delete**
- `src/components/verification/VerificationBanner.tsx`
- `src/components/verification/VerificationRequestDialog.tsx`
- `src/components/admin/AdminVerificationView.tsx`

**Files to edit**
- `src/components/layout/MainLayout.tsx` (remove banner)
- `src/components/auth/ProtectedRoute.tsx` (drop verification stage)
- `src/pages/Auth.tsx` (drop verification login branches, prefill from query string)
- `src/pages/LandingPage.tsx` (waitlist redirect)
- `src/components/announcements/WhatsNewModal.tsx` (drop gate)
- `src/components/admin/AdminShopsView.tsx` (drop pending/suspended filters, add Online filter, drop verify actions)
- `src/components/admin/ShopDetailSheet.tsx` (drop verify actions)
- `src/components/admin/AdminEmployeesView.tsx` (drop verification badges)
- `src/components/admin/AdminSettingsView.tsx` (new “Signup alerts” card)
- `src/pages/AdminDashboard.tsx` (mount `useAdminSignupNotifier`)

**New files**
- `supabase/functions/notify-admin-signup/index.ts`
- `supabase/functions/_shared/email-templates/admin-signup-alert.tsx`
- `src/hooks/useAdminSignupNotifier.ts`
- New migration: profile flip + default change + `handle_new_user` rewrite + drop `verification_requests` + `admin_signup_events` table + RLS + realtime publication + seed `platform_settings` keys.

**Memory updates after build**
- Remove / overwrite `mem://security/verification-proprietaire-48h` (system removed).
- Update `mem://features/onboarding-funnel` to drop the verification stage.
