# Fix admin reminder cards showing 0

## Root cause analysis

After inspecting the database, both "0" displays have different causes:

**1. Waitlist Invitations card — real bug**
- The `waitlist` table contains **39 rows**, all with `notified_at = NULL` and `signed_up_user_id = NULL`.
- Current admin (`hassen`) has `platform_admin` and RLS allows `SELECT`.
- The card's query `supabase.from("waitlist" as any).select("id, notified_at, signed_up_user_id")` is silently failing or being intercepted, but errors are only `console.error`'d (no toast). The user sees 0 with no signal.
- Most likely culprit: the typed client rejects the unknown table name at runtime in some build paths, OR the response is being truncated. Either way, the "Rafraîchir" button gives no feedback when it fails.

**2. Verification Reminders (waiting list) card — accurate but pointless**
- The `handle_new_user` DB trigger sets `verification_status = 'verified'` for **every** new signup (it no longer puts anyone in `pending_verification`).
- Result: the database has **0 profiles** in that status, so "0" is mathematically correct — but the card will *always* show 0 going forward.
- This card was built when the verification flow was active; it is now orphaned.

## Plan

### Step 1 — Fix the waitlist card (real bug)
Update `src/components/admin/WaitlistInvitationsAdminCard.tsx`:
- Switch to a server-trusted source: call the existing `admin-manage-users` edge function with a new action `get-waitlist-detailed-stats` (uses service role, bypasses RLS, immune to the typed-client `as any` issue). Returns `{ total, pending, notified, signedUp }`.
- Surface failures with `toast.error` so refresh failures stop being silent.
- Add the row count to the toast on success ("39 inscrits chargés") so the admin gets confirmation.

Update `supabase/functions/admin-manage-users/index.ts`:
- Add the new `get-waitlist-detailed-stats` action that runs the four counts on the `waitlist` table with the service role client.

### Step 2 — Make the verification reminders card honest
Update `src/components/admin/VerificationRemindersAdminCard.tsx`:
- Add a clear empty-state hint when `eligibleCount === 0`: explain that no users are currently in `pending_verification` because new signups are auto-verified, and the card will activate automatically if that policy changes.
- Keep the card (no removal) so it stays ready if verification is re-enabled later.

### Step 3 — Quick verification
After deploy, open Admin → Paramètres and confirm:
- Waitlist card shows **39 / 39 pending / 0 notified / 0 signed up**.
- "Envoyer l'invitation à 39 personnes" button is enabled.
- Verification card shows 0 with a friendly explanation instead of looking broken.

## Files touched
- `src/components/admin/WaitlistInvitationsAdminCard.tsx` (rewrite load logic, add error toasts)
- `src/components/admin/VerificationRemindersAdminCard.tsx` (empty-state hint)
- `supabase/functions/admin-manage-users/index.ts` (new action `get-waitlist-detailed-stats`)

No DB migration required.
