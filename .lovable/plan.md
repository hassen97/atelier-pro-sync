## Problem

After clicking **"Démarrer l'essai de 3 jours"**, the trial subscription is correctly inserted (the user even sees the success toast "Essai de 3 jours activé !"), but they remain stuck on `/checkout` instead of landing on `/dashboard`.

## Root Cause

`ProtectedRoute` runs a query called `onboarding-status` that decides where to send shop owners:

- If the user has **no active or trialing subscription** → it forces a redirect back to `/checkout?onboarding=true`.

When `handleStartTrial` in `src/pages/Checkout.tsx` inserts the new `trialing` row and calls `navigate("/dashboard")`, the `onboarding-status` query in React Query **still holds the previously cached result** (`hasNoSubscription: true`). The guard re-runs, sees "no subscription", and immediately sends the user back to `/checkout`. The trial is real — only the cache is stale.

The same bug affects the proof-upload checkout path (`handleSubmit`), but it's less visible there because that flow already requires admin verification.

## Fix

In `src/pages/Checkout.tsx`, after a successful trial insert (and after the proof-upload `onSuccess`), invalidate the React Query caches that drive routing and subscription state, then navigate.

### Changes

**`src/pages/Checkout.tsx`**
1. Import `useQueryClient` from `@tanstack/react-query`.
2. In `handleStartTrial`, after `insert` succeeds and before `navigate("/dashboard")`:
   - `await queryClient.invalidateQueries({ queryKey: ["onboarding-status", user.id] })`
   - Also invalidate `["subscription"]` / `["shop-subscription"]` (whatever `useSubscription` uses) so the dashboard's trial banner reflects reality immediately.
3. Apply the same invalidation in the `createOrder.mutate` `onSuccess` callback for consistency.

### Verification

After the change:
- Click "Démarrer l'essai de 3 jours" → toast appears → user lands on `/dashboard` with the trial banner visible.
- Refresh `/dashboard` → still works (the guard now sees the trialing row).

### Files Touched
- `src/pages/Checkout.tsx` (only)

No database, edge function, or schema changes are needed.