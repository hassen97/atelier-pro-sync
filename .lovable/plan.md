## Issues to fix

### 1. Employees don't share their owner's subscription

**Root cause:** `useSubscription()` in `src/hooks/useSubscription.ts` queries `shop_subscriptions` filtered by `user.id` (the currently logged-in user). For an employee, that's the employee's own auth id — which has no subscription row — so the app behaves as if they're on the free plan. This also breaks `usePlanPermissions`, `BillingDashboard`, trial banners, etc.

**Fix:** Resolve the effective shop owner id (already implemented in `useEffectiveUserId` from `src/hooks/useTeam.ts`) and query the subscription against that id instead.

Changes:
- `useSubscription()` → use `useEffectiveUserId()` instead of `user.id`. Update `queryKey` to include the effective id so cache invalidation per shop still works.
- Leave `useMyOrders()` as-is (orders are personal billing history of the owner — employees shouldn't manage billing).
- Audit nearby callers that may rely on owner-only behavior:
  - `BillingDashboard` — should remain owner-only (gate via `useIsOwner`); employees just need read of plan capabilities, which `useSubscription` now correctly returns.
  - `WaitlistTrialBanner` / `TrialBanner` — fine; they read from subscription so will reflect owner's plan.

### 2. Add device unlock code (password / pattern) to the Create Repair form

Add a single optional free-text field "Code de déverrouillage (mot de passe / schéma)" so the technician can store the unlock code/pattern entered by the customer at intake.

Changes:
- **DB migration:** add column `device_unlock_code text` (nullable) to `public.repairs`.
- **Types:** auto-regenerated from Supabase.
- **`src/components/repairs/RepairDialog.tsx`:**
  - Extend Zod schema with `device_unlock_code: z.string().max(100).optional()`.
  - Add to `defaultValues`, `reset()` calls (edit + create), and submit payload.
  - Render an `<Input>` field in the device-info section, near `device_condition` / `imei`. Label: "Code de déverrouillage" with placeholder "Mot de passe, code PIN ou schéma (ex: L, 1234, ...)". Help text noting it's stored privately.
- **`src/components/repairs/RepairCard.tsx` / detail views:** optionally surface the code in the technician-facing view (read-only). Not required for the MVP — can be done in a follow-up if you want it visible there too.
- **Tracking page:** do NOT include the unlock code in the public `get_repair_by_token` RPC (it must stay private). No changes needed since the RPC explicitly lists fields.

### Technical details

```text
DB migration
------------
ALTER TABLE public.repairs
  ADD COLUMN device_unlock_code text;
```

Subscription hook diff (conceptual):
```ts
// before
const { user } = useAuth();
queryKey: ["my-subscription", user?.id]
.eq("user_id", user.id)

// after
const effectiveUserId = useEffectiveUserId();
queryKey: ["my-subscription", effectiveUserId]
.eq("user_id", effectiveUserId)
enabled: !!effectiveUserId
```

### Out of scope
- No change to billing/order management UI (still owner-only).
- No change to RLS — `shop_settings`/`shop_subscriptions` already allow team members to read owner data via existing policies (subscription read is unrestricted for authenticated, and team policies cover related tables).