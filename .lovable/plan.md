## Goal

Move the repairs that the employee `ibtihelouni` (old account) accidentally created this morning over to her new account `ibtihelounii`, inside the shop owned by `coolstoresbz`.

## What I found while investigating

From the auth logs (May 4, 2026):
- **Old account** `ibtihelouni@repairpro.local` → user_id `ace51d66-d0d3-4c51-b0c8-f880ee92c2b3`
- **New account** `ibtihelounii@repairpro.local` → user_id `5d945c48-112f-4dfc-8655-a64f733c2941`

Important nuance: in this app, repairs always belong to the **shop owner's user_id** (the `repairs.user_id` column), not to the employee's user_id. Employees are tracked via:
- `received_by` / `repaired_by` text fields on `repairs`
- `team_members.member_user_id` for access
- `activity_log.actor_id` for audit

So "moving repairs from one employee account to another" really means two things:

1. **Re-attribute** any repair where `received_by` (or `repaired_by`) currently shows the old employee's name/id to the new employee.
2. **Make sure the new account is the active team member** of `coolstoresbz`, and the old one is removed/inactive — so future actions go to the right account.

## Plan

### Step 1 — Confirm identity of the two accounts and the shop

Run a SELECT (read-only) against the live database to confirm:
- Both user_ids exist in `auth.users` and `profiles`
- Which `team_members` row links each one to the `coolstoresbz` owner
- The exact `received_by` / `repaired_by` values used today

```sql
-- Identify the owner
SELECT user_id, username, full_name FROM profiles
WHERE username IN ('coolstoresbz','ibtihelouni','ibtihelounii');

-- Team membership for both employees
SELECT * FROM team_members
WHERE member_user_id IN (
  'ace51d66-d0d3-4c51-b0c8-f880ee92c2b3',
  '5d945c48-112f-4dfc-8655-a64f733c2941'
);

-- Repairs created today under coolstoresbz where the old employee was involved
SELECT id, ticket_number, device_model, received_by, repaired_by, created_at
FROM repairs
WHERE user_id = '<coolstoresbz_owner_id>'
  AND created_at >= '2026-05-04'
ORDER BY created_at;
```

### Step 2 — Show the user the candidate repairs and confirm

I will list every repair from today where `received_by` or `repaired_by` matches the old employee, so the user can confirm before I change anything. (Better than reassigning blindly — there may be a few repairs the old account legitimately handled before today.)

### Step 3 — Reassign the confirmed repairs

For each confirmed repair:

```sql
UPDATE repairs
SET received_by = 'ibtihelounii',     -- or her display name
    repaired_by = CASE WHEN repaired_by = 'ibtihelouni' THEN 'ibtihelounii' ELSE repaired_by END,
    updated_at = now()
WHERE id IN (...confirmed ids...);
```

Also re-point the audit trail entries created today so reports stay coherent:

```sql
UPDATE activity_log
SET actor_id = '5d945c48-112f-4dfc-8655-a64f733c2941'
WHERE actor_id = 'ace51d66-d0d3-4c51-b0c8-f880ee92c2b3'
  AND created_at >= '2026-05-04'
  AND user_id = '<coolstoresbz_owner_id>';
```

(`repairs.user_id` is **not** changed — it must stay as the shop owner.)

### Step 4 — Clean up the team membership

To prevent this from happening again:
- If `ibtihelouni` (old) is currently an active `team_member` of `coolstoresbz`, set its `status = 'removed'`.
- Make sure `ibtihelounii` (new) is an active `team_member` with the right `allowed_pages` and `role`.

### Step 5 — Report back

I'll send a short summary: how many repairs were reassigned, their ticket numbers, and the final state of the team for `coolstoresbz`.

## Safety notes

- All `UPDATE` statements will be scoped by `user_id = <coolstoresbz owner>` and by the explicit list of repair IDs confirmed in Step 2 — no cross-shop impact.
- No data is deleted; only `received_by`, `repaired_by`, and `actor_id` are rewritten, plus team_members status flipped.
- I will pause after Step 2 to let you confirm the list of repairs before any write happens.
