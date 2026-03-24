

# Fix Three Issues: Email Domain, Payment Validation, Trial RLS

## Issue 1: Email Domain → www.getheavencoin.com

Update `supabase/functions/auth-email-hook/index.ts` to use `www.getheavencoin.com` as the site URL and display name. Change `SITE_NAME` to "RepairPro" (or keep as-is) and update `SAMPLE_PROJECT_URL` and `siteUrl` references to use `https://www.getheavencoin.com`.

Also update all 6 email templates to reference `www.getheavencoin.com` where applicable (the `siteUrl` prop is passed at runtime, so templates themselves may not need changes — but the hook's `SITE_NAME`, `SAMPLE_PROJECT_URL`, and `siteUrl` in `templateProps` need updating).

**Files:** `supabase/functions/auth-email-hook/index.ts`
- `SITE_NAME` → `"RepairPro"` (already set)
- `SAMPLE_PROJECT_URL` → `"https://www.getheavencoin.com"`
- `templateProps.siteUrl` → `"https://www.getheavencoin.com"`

Then redeploy `auth-email-hook`.

## Issue 2: Payment Input Validation Error

The screenshot shows "Il valore deve essere 0" (browser native validation: "value must be 0"). This happens because the `<Input type="number" max={currentDebt}>` has `max` set to `0` when the supplier's current debt is 0 (or the debt calculation results in 0).

**Root cause:** `max={currentDebt}` when `currentDebt === 0` means the browser enforces max=0, rejecting any positive value.

**Fix for SupplierPaymentDialog.tsx (line 104):** Remove the `max` attribute entirely. The server-side/submit handler already validates the amount. Alternatively, only set `max` when `currentDebt > 0`.

**Fix for CustomerDebts.tsx (line 168):** Same issue — `max={selectedDebt.totalAmount - selectedDebt.paidAmount}` can be 0. Remove `max` or conditionally apply it.

**Files:**
- `src/components/suppliers/SupplierPaymentDialog.tsx` — remove `max={currentDebt}` from Input
- `src/pages/CustomerDebts.tsx` — remove `max={...}` from Input

## Issue 3: Trial Activation Error

**Root cause:** The `shop_subscriptions` table has RLS policies that only allow `platform_admin` to INSERT/UPDATE. Regular shop owners (role `super_admin`) cannot insert a trial subscription.

**Fix:** Add two RLS policies:
1. Allow authenticated users to INSERT their own subscription (`user_id = auth.uid()`)
2. Allow authenticated users to UPDATE their own subscription (`user_id = auth.uid()`)

This lets shop owners start a trial or cancel their own subscriptions via the Checkout page.

**Migration SQL:**
```sql
CREATE POLICY "Users can insert own subscription"
ON public.shop_subscriptions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscription"
ON public.shop_subscriptions FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

## Summary of Changes

| File | Change |
|------|--------|
| `auth-email-hook/index.ts` | Update URLs to www.getheavencoin.com |
| `SupplierPaymentDialog.tsx` | Remove `max` attribute from payment input |
| `CustomerDebts.tsx` | Remove `max` attribute from payment input |
| DB migration | Add INSERT/UPDATE RLS policies for shop owners on `shop_subscriptions` |
| Deploy | Redeploy `auth-email-hook` edge function |

