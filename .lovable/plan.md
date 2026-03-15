

# SaaS Transformation: Bug Fixes, Verification Elite, & Billing Engine

This is a large multi-pillar update. Here's the implementation plan organized by priority.

---

## Pillar 1: Community Bug Fixes & Employee Context

### 1A. Employee bypasses verification blocks
- **VerificationBanner.tsx**: Already checks `role !== "super_admin"` and returns null for non-owners. Correct.
- **Auth.tsx** (login flow): When employee logs in, the `is_locked` check on line 153 blocks them if the parent shop owner is locked. Fix: for employees, check the **owner's** profile lock status via `team_members.owner_id`, not the employee's own profile. If the owner is active, employee can log in regardless.

### 1B. Employee inherits parent shop settings (Logo, Name, Address, TVA)
- **useShopSettings.ts**: Uses `effectiveUserId` which comes from `useImpersonation` — but employees use `useEffectiveUserId()` from `useTeam.ts`. Fix: import and use `useEffectiveUserId()` in `useShopSettings` so employees load the owner's shop settings instead of their own.
- This fixes the "Mon Atelier" default text bug since employees will fetch the owner's configured settings.

### 1C. POS Discount field
- **POS.tsx**: Already has `discount` and `discountType` on `CartItem` (lines 34-35). The discount UI per-item already exists. Add a **global cart discount** field (percentage or flat) at the cart summary level that applies on top of per-item discounts.

### 1D. Stock Alert Threshold saves correctly
- **Settings.tsx**: `handleSaveGeneralSettings` (line 206) passes `stock_alert_threshold: parseInt(stockThreshold) || 5`. Check that `stockThreshold` state is properly bound to the input. Verify the input field and ensure `onChange` updates state correctly.

### 1E. Auto-generate REP-XXXX Reference IDs
- Already exists: `ticket_number` is auto-assigned by the `assign_repair_ticket_number` trigger. The display format `REP-{ticket_number}` just needs consistent rendering across the UI. Verify it shows in repair cards, receipts, and tracking.

### 1F. Session Security ("Se souvenir de moi")
- **AuthContext.tsx**: Supabase client uses `localStorage` for persistence. When "Remember me" is NOT checked, switch to `sessionStorage` after login so the session dies when the tab closes.
- After successful login in `Auth.tsx`, if `!rememberMe`, call a helper that migrates the session tokens from localStorage to sessionStorage and clears localStorage.

---

## Pillar 2: The 48-Hour Verification — Elite Status

### 2A. Verified Badge (Blue Checkmark)
- **VerifiedBadge.tsx** already exists with a green checkmark. Update it or create a new "Elite" variant with a blue/gold shield for owners with `verification_status === "verified"`.
- Show this badge in: `AppSidebar.tsx` (next to shop name), `MainLayout.tsx` header, and anywhere the owner name appears.

### 2B. Confetti on first verification
- When `VerificationBanner` detects status changed to `verified`, trigger a confetti animation (use `canvas-confetti` or a simple CSS animation). Store a flag in `localStorage` (`confetti_shown_${userId}`) to only show once.

---

## Pillar 3: SaaS Billing & Subscription Engine

### 3A. Owner "Abonnement & Facturation" tab in Settings
- **Settings.tsx**: Add a new tab `subscription` with:
  - Current Plan Card: fetch from `subscription_orders` (latest approved) or default to "Gratuit"
  - Payment History Table: query `subscription_orders` for the current user, show date, amount, plan name, status badge

### 3B. Admin "God Mode" — Manual Plan Management
- **AdminShopsView.tsx**: Add ability to manually set a shop's plan and expiration date via the dropdown menu actions. New edge function action: `set-shop-plan` that creates/updates a record linking `user_id` to a `plan_id` with `expires_at`.
- **Database**: Create `shop_subscriptions` table (user_id, plan_id, status, started_at, expires_at, set_by_admin).

### 3C. Global Revenue Ledger
- **AdminDashboard.tsx**: Add a new view `revenue_ledger` showing all `subscription_orders` across the platform with filters (date range, status, gateway). Add to sidebar.

### 3D. Verification Status Badges in Shop List
- **AdminShopsView.tsx**: Already shows `VerifiedBadge` for verified owners. Add:
  - 🔵 `Vérifié` — already done
  - ⏳ `En attente` — show for `pending_verification` with submitted request  
  - 🔴 `En sursis` — show for `pending_verification` with active countdown (deadline approaching)
  - Use the existing `verification_status` field from `ShopOwner`

---

## Technical Changes Summary

| Area | Files | Change |
|------|-------|--------|
| Employee auth bypass | `Auth.tsx` | Check owner's lock status for employee logins |
| Employee shop context | `useShopSettings.ts` | Use `useEffectiveUserId()` from useTeam |
| POS global discount | `POS.tsx` | Add cart-level discount input |
| Stock alert fix | `Settings.tsx` | Debug input binding |
| Session security | `AuthContext.tsx`, `Auth.tsx` | sessionStorage when !rememberMe |
| Elite badge | `VerifiedBadge.tsx`, `AppSidebar.tsx` | Blue/gold shield + confetti |
| Billing tab | `Settings.tsx` | New subscription tab |
| DB: shop_subscriptions | Migration | New table for plan assignments |
| Admin plan mgmt | Edge function, `AdminShopsView.tsx` | set-shop-plan action |
| Revenue ledger | New `AdminRevenueLedger.tsx` | Platform-wide payment view |
| Status badges | `AdminShopsView.tsx` | Enhanced verification badges |

### Database Migration
```sql
CREATE TABLE public.shop_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  set_by_admin uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_subscriptions ENABLE ROW LEVEL SECURITY;
-- Users can view own subscription
CREATE POLICY "Users can view own subscription" ON public.shop_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Platform admins can manage all
CREATE POLICY "Admins can manage subscriptions" ON public.shop_subscriptions FOR ALL TO authenticated USING (has_role(auth.uid(), 'platform_admin')) WITH CHECK (has_role(auth.uid(), 'platform_admin'));
```

