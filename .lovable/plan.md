# Account Vault — Plan

A new module to securely store customer device accounts (iCloud / Google / Samsung) linked to the existing customer database, with a smart entry modal and a masked dashboard.

## 1. Database (migration)

New table `public.customer_vault`:
- `id uuid PK default gen_random_uuid()`
- `user_id uuid not null` (shop owner — matches RLS pattern used everywhere else, "shop_id")
- `customer_id uuid not null` (links to `customers.id`, ON DELETE CASCADE via trigger-safe check)
- `account_type text not null check in ('icloud','google','samsung')`
- `email_id text not null`
- `password text not null` (stored as-is in DB; see security note)
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- Index on `(user_id, customer_id)`

RLS (mirrors `customers` policies):
- Owner or team can manage / view: `auth.uid() = user_id OR is_team_member(user_id, auth.uid())`
- Platform admin can view all
- Trigger: `update_updated_at_column` on UPDATE

Security note: Postgres column encryption requires `pgsodium`/Vault setup. To stay consistent with the current project (passwords elsewhere handled by Supabase Auth, proofs stored in private buckets), I'll store the password in plaintext in a row that is **only accessible to the shop owner + their team via RLS**. The bucket pattern isn't a fit (it's a single string). If you want true at-rest encryption with a per-shop key, that's a follow-up (would need a master secret + edge function for encrypt/decrypt).

## 2. New files

- `src/hooks/useCustomerVault.ts` — React Query hooks (`useVaultEntries`, `useCreateVaultEntry`, `useUpdateVaultEntry`, `useDeleteVaultEntry`) using `useEffectiveUserId()` (per project Core rule).
- `src/components/vault/VaultEntryDialog.tsx` — Smart modal:
  - Reuses `CustomerCombobox` (already exists) for search + select.
  - "+ Create New Client" inline: expands `Full Name` + `Phone` inputs; on save, creates customer via `useCustomers` mutation then inserts vault row in a single flow.
  - Bottom section: `account_type` Select (iCloud/Google/Samsung), `email_id` input, `password` input with eye-toggle + "Générer" button (12-char strong password, e.g. `Apple2026!xyz`-style: word + year + symbol + 3 random chars).
  - Zod validation.
- `src/components/vault/VaultTable.tsx` — Data table:
  - Columns: Client (name + phone from join), Type (badge), Email/ID, Password (masked `••••••••`, eye to reveal per row), Created at, Actions (edit/delete).
  - "Export CSV" button (client-side blob, no taxes/VAT per project rule — N/A here anyway).
  - Search/filter by customer name/phone/email.
- `src/pages/Vault.tsx` — Page wrapper with `PageHeader`, SEO, and the table + "New entry" button.

## 3. Routing & nav

- Add route `/vault` in `src/App.tsx` (lazy via `lazyWithRetry` like other pages).
- Add sidebar entry in `src/components/layout/AppSidebar.tsx` (icon: `KeyRound` from lucide), positioned near Customers.
- Respect read-only impersonation guard (`useReadOnlyGuard`) on mutations.

## 4. UX details

- Modal reuses existing shadcn `Dialog`, `Combobox`, `Select`, `Input`, `Label`.
- Password generator: 12 chars, guaranteed upper/lower/digit/symbol.
- Toasts via `sonner` on success/error (French copy, matching project tone).
- Empty state in table with CTA to create first entry.

## 5. Out of scope (flagged for confirmation)

- True at-rest encryption with pgsodium/Vault (default: plaintext + RLS).
- Sharing vault entries between shops (not requested).
- Audit log of password reveals (can add if desired — there's an `activity_log` table available).

## Technical summary

```text
DB:           +customer_vault (RLS owner/team + admin view)
Hook:         useCustomerVault.ts (React Query + useEffectiveUserId)
UI:           VaultEntryDialog (combobox + inline create + creds)
              VaultTable (masked passwords, CSV export)
Page/Route:   /vault + sidebar link
Reused:       CustomerCombobox, useCustomers, useReadOnlyGuard
```

Confirm and I'll implement.
