

# Fix: Verification Timer Not Working

## Root Cause

All existing `pending_verification` accounts have `verification_deadline = NULL` in the database. The `handle_new_user` trigger correctly sets it for **new** accounts, but accounts created before the migration were never backfilled.

The timer code in `VerificationBanner.tsx` line 72 exits early when `verification_deadline` is null:
```typescript
if (!profile?.verification_deadline || ...) return;
```

So the countdown never starts and `timeLeft` stays empty.

## Fix

### 1. Database Migration — Backfill existing accounts
Run a migration to set `verification_deadline` for all existing `pending_verification` profiles that have a NULL deadline:

```sql
UPDATE profiles
SET verification_deadline = created_at + interval '48 hours'
WHERE verification_status = 'pending_verification'
  AND verification_deadline IS NULL;
```

This uses each account's `created_at` to calculate the correct 48-hour window retroactively.

### 2. Frontend — Handle edge case gracefully
In `VerificationBanner.tsx`, add a fallback so that if `verification_deadline` is somehow still null, the banner still renders (showing the form) but without a countdown, rather than silently returning null. This prevents the entire verification flow from being invisible if data is missing.

### Files to modify
| File | Change |
|------|--------|
| New migration SQL | Backfill `verification_deadline` for existing accounts |
| `src/components/verification/VerificationBanner.tsx` | Add fallback when deadline is null — still show overlay/form, just hide the timer display |

