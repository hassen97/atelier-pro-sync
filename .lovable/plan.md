

# Implement Platform Enhancements with Zero-Data Guardrail

## Critical Guardrail
The "Zero Data" bug was caused by adding verification/plan-status filters to dashboard data queries. **Current code is safe** — all data hooks (`useProducts`, `useSales`, etc.) filter only by `user_id` with no verification or plan filters. The plan below preserves this.

## What's Already Implemented
Most of the listed features already exist in the current codebase:
- Glassmorphism auth redesign, Remember Me, no math captcha
- 48-hour verification system with countdown banner (non-blocking)
- Employee context inheritance via `useEffectiveUserId`
- POS discounts (per-item + global)
- Auto repair ticket numbers (`assign_repair_ticket_number` trigger)
- Form draft persistence (`useFormDraft`)
- Verified badge system
- Kill switch (lock/unlock accounts)
- Feature flags matrix
- Data backup (JSON/SQL/Excel export)
- Team/employee management with role-based access
- Subscription plans management

## What Needs to Be Added

### 1. Global Safe Mode Toggle (Admin Settings)
- Add a `safe_mode_enabled` key to `platform_settings` table (migration to insert default row)
- Add a toggle card in `AdminSettingsView.tsx` labeled "Mode Sécurisé : Suppression Automatique"
- When ON, the 48-hour auto-deletion timer is globally paused
- Update `auto-suspend` edge function to check this setting before suspending

### 2. Admin Role Switcher
- Add a `change-role` action in the `admin-manage-users` edge function
- Allow switching a user between `super_admin` and `employee` roles in `user_roles` table
- Add a role change option in the shop/user dropdown menu in `AdminShopsView.tsx`

### 3. Data Transfer Tool (Admin)
- Add a `transfer-data` action in `admin-manage-users` edge function
- Clones products, customers, categories from one shop to another using service role
- Add a dialog in `AdminShopsView.tsx` with source/target shop selection

### 4. Admin Data Export per Shop
- Add a "Sauvegarde" button in the shop dropdown or `ShopDetailSheet`
- Invokes an edge function action that fetches all data for a given `user_id` and returns JSON

### 5. Owner Billing Tab (already partially exists in Settings)
- Verify the "Abonnement" tab exists in `Settings.tsx` with plan info, renewal date, payment history
- If missing, add a tab fetching from `shop_subscriptions` and `subscription_orders`

### 6. Confetti on First Verification
- Add `canvas-confetti` package
- Trigger confetti in the verification banner component when status changes to `verified`

## Files to Modify

| File | Change |
|------|--------|
| `AdminSettingsView.tsx` | Add Safe Mode toggle card |
| `admin-manage-users/index.ts` | Add `change-role`, `transfer-data`, `export-shop-data` actions |
| `AdminShopsView.tsx` | Add role switcher + data transfer dialog + export button in dropdown |
| `auto-suspend/index.ts` | Check `safe_mode_enabled` setting before suspending |
| `Settings.tsx` | Verify/add Billing tab |
| Migration | Insert `safe_mode_enabled` default row |

## Database Changes
- Insert one row into `platform_settings`: `key='safe_mode_enabled', value='false'`

## Safety Principle
No data query in any hook will be modified. No `WHERE verification_status = ...` or `WHERE plan_status = ...` will be added to any existing dashboard/data query.

