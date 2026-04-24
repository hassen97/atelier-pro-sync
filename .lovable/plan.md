## Diagnostic

The edge function `create-employee` is working as designed. The 403 error for user `coolstoresbz` (ID `26c3f824-a3a7-44f4-8664-9c7d15116e9a`) is caused by **missing database records**, not a bug in the function.

Database state for this user:

- `auth.users` → exists (email `coolstoresbz@repairpro.local`)
- `profiles` → **missing** (no row)
- `user_roles` → **empty** (no role assigned)
- `team_members` → **empty** (not part of any team)

With no role and no team membership, the function correctly rejects the request with: *"Seuls les gérants (admin) et super admins peuvent créer des comptes employés."*

## Plan — Repair the orphaned account, then test

### 1. Backfill the missing records via SQL migration

Create one migration that:

- **Inserts a `profiles` row** for `26c3f824-a3a7-44f4-8664-9c7d15116e9a`:
  - `username` = `coolstoresbz`
  - `email` = `coolstoresbz@repairpro.local`
  - `verification_status` = `verified` (so the account is unlocked and can use the app)
  - `is_locked` = `false`
- **Inserts a `user_roles` row** assigning role `super_admin` (shop owner — this is the standard role for a registered shop, matching the project's role hierarchy).
- **Inserts a `shop_settings` row** with default values (`shop_name = 'Cool Store Sbz'`, `country = 'TN'`, etc.) so the owner has a working shop context.

No changes to `team_members` — owners are not their own team members.

### 2. Test the employee creation end-to-end

Once the data is repaired, run the `create-employee` edge function as this user with a sample payload:

```json
{
  "fullName": "Test Employé",
  "username": "test_emp_coolstoresbz",
  "password": "TempPass1234",
  "role": "employee",
  "allowedPages": ["/dashboard", "/pos"]
}
```

Expected outcomes:

- HTTP **200** with `{ userId, username, member: {...} }`
- A new `auth.users` row for `test_emp_coolstoresbz`
- A `profiles` row (verified, unlocked)
- A `user_roles` row with role = `employee`
- A `team_members` row with `owner_id = 26c3f824-a3a7-44f4-8664-9c7d15116e9a`, role `employee`, status `active`

### 3. Verify and report

Query the database after the test to confirm all four rows were created and tied to the correct owner. If anything fails, capture the edge function logs and the exact response, then iterate.

### 4. Cleanup (optional)

Delete the test employee account at the end so we leave a clean state. Ask before deleting if preferred.

## Files & operations

- **New migration**: backfill profile + role + shop_settings for the affected user.
- **Edge function call**: `supabase--curl_edge_functions` to `/create-employee` (no code changes required).
- **Verification**: SQL `SELECT` queries against `profiles`, `user_roles`, `team_members`.
- **No application code changes** — the 403 logic is correct and stays as-is.

## Out of scope

- Investigating why the original signup flow left this account orphaned (separate root-cause investigation).
- Touching `useTeam.ts` / `VerificationBanner.tsx` — already aligned in the prior change.