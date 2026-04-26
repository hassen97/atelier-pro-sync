## Problem confirmed

23 shop owner accounts exist in `auth.users` but are **invisible** in the Ultra Admin → Shops page (and elsewhere) because they're missing rows in `public.profiles`, `public.user_roles`, and (for 22 of them) `public.shop_settings`.

The admin "list shops" endpoint joins on `profiles + user_roles`, so any account without those rows simply does not appear — even though the user can still log in normally.

The shop owner you mentioned, **mohamedghoudi32** (`f5092578-42f8-4f66-8e09-5f33d235763b`), is one of these orphaned accounts. He last signed in today (2026-04-26) but has no profile.

The `handle_new_user()` trigger that should auto-create these rows IS currently active, but it failed silently for 23 historical signups (older signups from a period when the trigger was missing, or signups that raced with it).

### Affected accounts (23)

Real-looking accounts that need recovery (the ones that actually use the app):
- mohamedghoudi32 — Mohamed Ghoudi
- lamjedgsm — hedhli lamjed
- jerbigs — najjar nabil
- jerbigsm — najjar nabil (2nd account)
- storegsm — Helmi
- gsmshoptn — welhazi bilel
- ahmed2004 — ahmed ben elghali
- jemnis — mustapha amine jemni
- hamza111 — Hamza
- ahmed1230 — ahmed
- mouhib — Mouhib slimen
- amourkappo123 — Hlimi nizar
- 26489410 — Raed Messaoud
- iheb_marzougui — Iheb Marzougui
- adem — Ademamdouni

Plus ~8 obvious test accounts (`testtest`, `test6`, `test7`, `7777`, `tttt`, `Trttt` duplicates, `Hh`, `Ttttt`).

## Plan

### Step 1 — Backfill the missing rows (one-time SQL migration)

Run a single safe migration that inserts the missing `profiles`, `user_roles` (`super_admin`), and `shop_settings` rows for every `auth.users` entry that's missing them — pulling values from `auth.users.raw_user_meta_data` exactly the same way `handle_new_user()` does.

Logic:
```sql
-- For each auth.users id with no profile → INSERT profile (full_name, username, email, phone, whatsapp, verification_status='verified')
-- For each auth.users id with no user_roles → INSERT (user_id, 'super_admin')
-- For each auth.users id with no shop_settings → INSERT (user_id, country, currency from metadata or defaults)
```

All three inserts use `ON CONFLICT DO NOTHING` so the migration is idempotent and safe.

### Step 2 — Harden `handle_new_user()` against future silent failures

The current trigger does 4 separate INSERTs in sequence (profile → role → shop_settings → optional waitlist trial). If any of them throws, Postgres aborts the whole signup transaction — but in some past versions the trigger was missing entirely or failed silently for unique-constraint reasons.

Improvements:
- Wrap each INSERT in its own `BEGIN/EXCEPTION WHEN OTHERS` block so partial state can never happen again
- Use `ON CONFLICT (user_id) DO NOTHING` on every insert
- Keep waitlist gift logic intact

### Step 3 — Add a self-healing safety net in the admin "list shops" endpoint

Modify `supabase/functions/admin-manage-users/index.ts` `action: "list"` so that, before returning the list, it:
1. Fetches all `auth.users` ids via the admin client
2. Compares against `profiles` ids
3. If any mismatch, auto-backfills the missing rows on the spot (same logic as Step 1)
4. Then returns the full list

This guarantees orphaned accounts can never disappear from the admin view again, even if a future code change breaks the trigger.

### Step 4 — Verify

After deploying, refresh the Ultra Admin → Shops page. All 23 accounts (including `mohamedghoudi32`) should appear, marked as verified super_admins with default shop settings. You can then contact the owner to confirm everything works on his side.

## Files to change

- New SQL migration (backfill + harden trigger) — created via the migration tool
- `supabase/functions/admin-manage-users/index.ts` — add self-healing block in the `list` action

## What the user (you) needs to do

Nothing — just approve the plan. The shop owner will appear in the admin list as soon as the migration runs, and his existing login will keep working unchanged.