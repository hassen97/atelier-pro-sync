# Show usernames in Admin Orders page

## Problem
The "Commandes d'abonnement" admin page (`AdminOrdersView.tsx`) shows truncated user UUIDs (`26c3f824…`) in the "Utilisateur" column instead of human-readable usernames or full names.

Root cause: `useAdminOrders` in `src/hooks/useSubscription.ts` selects from `subscription_orders` without joining the `profiles` table — so only `user_id` is available to the UI, which renders `order.user_id.slice(0, 8)…`.

## Plan

### 1. `src/hooks/useSubscription.ts` — enrich the admin query
Update the admin `useAdminOrders` query to also fetch profile info per order:

- After loading orders, collect distinct `user_id`s and run a second query:
  `supabase.from("profiles").select("user_id, username, full_name, email").in("user_id", ids)`
- Merge into each order as `order.profile = { username, full_name, email }`.

(Two-step approach is safer than a PostgREST embed because there is no FK from `subscription_orders.user_id` → `profiles.user_id` declared, and an embed could silently return null.)

### 2. `src/components/admin/AdminOrdersView.tsx` — render the name
Replace both occurrences of:
```
{order.user_id.slice(0, 8)}…
```
with a small helper that shows, in priority order:
1. `@username`
2. `full_name`
3. `email`
4. fallback: `uuid.slice(0,8)…`

Apply in:
- Pending table "Utilisateur" cell (line ~111)
- Reviewed/Historique table "Utilisateur" cell (line ~171)
- Also surface the name in the Review dialog header for clarity.

Style: keep the same compact design — username in white, secondary line (email or uuid) in muted slate text below.

### 3. No DB / RLS changes needed
Platform admins already have read access to `profiles` via existing admin policies, so no migration required. If the profile fetch returns nothing for a given user (deleted account), the UI falls back gracefully to the UUID.

## Files to edit
- `src/hooks/useSubscription.ts` (admin `useAdminOrders` only — leave shop-owner `useMyOrders` untouched)
- `src/components/admin/AdminOrdersView.tsx`

No new files, no migration, no edge function changes.
