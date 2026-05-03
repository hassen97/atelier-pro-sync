## Problem

Employees (e.g. `ibtihelounii` under shop `coolstoresbz`) print receipts/labels showing the default `Mon Atelier`, default currency, no logo, no address, etc. — instead of inheriting the owner's `shop_settings`.

## Root Cause

`src/hooks/useShopSettings.ts` queries `shop_settings` using:

```ts
const effectiveUserId = impersonatedUserId || user?.id || null;
```

It only handles **impersonation**, but ignores the **team membership** case. For a logged-in employee, `user.id` is the employee's own auth id, which has **no row** in `shop_settings`. The `.maybeSingle()` returns no data, so the hook silently falls back to `defaultSettings` (`shop_name: "Mon Atelier"`, `currency: "TND"`, no logo, etc.). That's exactly what shows on receipts and labels.

Every other data hook in the project correctly uses `useEffectiveUserId()` from `useTeam.ts`, which resolves to the owner's id when the user is an active team member. `useShopSettings` is the only outlier — it predates that pattern and uses raw auth + impersonation only.

This violates the project's core memory rule: "Always use `useEffectiveUserId()` in data hooks. Employees inherit owner's context."

## Fix

### 1. `src/hooks/useShopSettings.ts` — read path
- Replace the local `effectiveUserId` computation with `useEffectiveUserId()` from `@/hooks/useTeam`.
- Keep the same fetch logic (`shop_settings` filtered by `user_id = effectiveUserId`), so employees automatically load the owner's shop row.
- Refetch dependency stays on `effectiveUserId`.

### 2. `src/hooks/useShopSettings.ts` — write path (`saveSettings`)
- Employees must NOT overwrite the owner's settings. Guard `saveSettings`:
  - If `effectiveUserId !== user.id` AND not impersonating, block the save with a toast ("Action réservée au propriétaire") and return `false`.
  - Impersonation by a platform admin keeps working (writes go to `effectiveUserId`, matching current impersonation behavior elsewhere).
- Update both the UPDATE and INSERT branches to use `effectiveUserId` instead of `user.id` for the `user_id` column, so impersonated writes target the right shop.

### 3. No DB / RLS change needed
Existing policy `Owner or team can view settings` already allows employees to SELECT the owner's `shop_settings`. The bug is purely client-side query filtering.

### 4. No changes needed in
- `RepairReceiptDialog.tsx`, `receiptPdf.ts`, `ShopSettingsContext.tsx` — they consume `settings` from the context, which will now contain correct data automatically.
- Other hooks — already use `useEffectiveUserId()`.

## Verification After Fix
- Log in as an employee of `coolstoresbz` → settings page and printed receipts/labels should show `coolstoresbz` name, logo, currency, address, ticket prefix.
- Owner login still loads own settings.
- Platform admin impersonation continues to load the impersonated shop.
- Employee attempting to edit settings sees a denial toast (UI for hiding the form can be tightened later if needed; this plan only fixes the data-loading bug).
