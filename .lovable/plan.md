## What's happening

Your "Tester maintenant" button shows success in the UI, but nothing actually arrives because of two real bugs and one platform limitation.

### Root causes

1. **Email queue name mismatch (the email bug).**
   The `notify-admin-signup` edge function enqueues into a queue called `transactional_email_queue`, but the email processor (`process-email-queue`) and its cron job only watch `transactional_emails` (the standard Lovable Cloud queue). Result: 3 of your test emails are sitting in an orphan queue and will never be sent.
   
   Confirmed in the database — the orphan queue `pgmq.q_transactional_email_queue` contains your test messages, while `email_send_log` is empty (nothing processed).

2. **Payload schema mismatch.**
   The processor expects fields like `message_id`, `queued_at`, `label`, `purpose`, `idempotency_key`. The current payload only has `to / subject / html / template`. Without these, TTL, retries, and dedup all break — and the message will be moved to DLQ instead of sent.

3. **iPhone / mobile Safari does not support web notifications (the "phone notification" bug).**
   You're testing on a 384px viewport (mobile). iOS Safari **does not implement** the Web `Notification` API at all unless the app is installed as a PWA on iOS 16.4+ and notifications were granted from the installed PWA. On regular mobile Safari/Chrome on iPhone you will **never** get a browser push, no matter what we change in code. This is an OS limitation, not a bug.

### What I'll fix

**A. Fix the email path so test + real signup emails actually send**

Update `supabase/functions/notify-admin-signup/index.ts` to enqueue into the correct queue with a complete payload:

- Change `queue_name` from `transactional_email_queue` → `transactional_emails`.
- Add the required fields the processor expects:
  - `message_id` (random UUID for idempotency / dedup)
  - `queued_at` (ISO timestamp for TTL)
  - `label` (`admin-signup-alert` or `admin-signup-test`)
  - `purpose: "transactional"`
  - keep `to`, `subject`, `html`

After this fix, the next "Tester maintenant" click will actually deliver an email to `hassen.brg97@gmail.com` within ~5 seconds (cron runs every 5s).

**B. Make browser-notification status crystal-clear on mobile**

In `AdminSettingsView.tsx`:
- Detect iOS Safari / mobile and surface an explicit warning in the "Notifications navigateur" card: "Les notifications navigateur ne fonctionnent pas sur iPhone (Safari). Utilisez un ordinateur ou installez l'app comme PWA."
- Make the "Tester maintenant" button still work for the email part on mobile, and show a clear toast when the browser part is skipped because the device doesn't support it (instead of silently doing nothing).

**C. Drain the 3 orphan test messages**

Delete the stuck messages in `pgmq.q_transactional_email_queue` so they don't pile up (they can't be sent anyway — wrong queue, wrong payload).

### Why I'm not adding a new email provider

You already have Lovable Cloud's transactional email pipeline working (used for auth emails, repair receipts, etc.). The fix is just routing into the existing pipeline correctly — no new secrets, no new integration needed.

### How to verify after the fix

1. Open Admin → Paramètres → Alertes d'inscription
2. Click "Tester maintenant"
3. Within ~10 seconds you should receive an email at `hassen.brg97@gmail.com` with subject `🧪 [TEST] Alerte d'inscription RepairPro`
4. For the browser/phone notification: test from a **desktop** Chrome/Firefox/Edge (after granting permission) — it will pop up natively. On iPhone it will not, by design of iOS.

### Files to change

- `supabase/functions/notify-admin-signup/index.ts` — fix queue name + payload
- `src/components/admin/AdminSettingsView.tsx` — add iOS/mobile warning in browser-notif card
- One-shot SQL cleanup to purge the 3 stuck messages from the orphan queue
