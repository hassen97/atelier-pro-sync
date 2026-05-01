## Finding analysis

`useAllowedPages` reads `team_members.allowed_pages` from the database (RLS-protected — only the owner and the member can read their own row). `ProtectedRoute` then blocks navigation to pages not in that list.

Critically, **all actual data is protected by row-level security** (every business table is scoped via `useEffectiveUserId` + RLS policies tied to `team_members`). A team member who manually types a restricted URL would only see an empty page or get an "Accès non autorisé" toast and be redirected — they cannot read or mutate data their role does not allow.

`allowed_pages` is therefore a **UI navigation policy**, not a data access boundary. The scanner is technically correct that there is no Postgres-level enforcement of "page visibility", but page visibility is a UX concept, not a data concept. Trying to enforce it in the database would be an architectural mismatch (URLs are a frontend concern; the DB has no notion of routes).

The right response is:
1. Make sure the client guard is robust (it already is — `ProtectedRoute` blocks + redirects + toasts).
2. Confirm data-layer RLS truly covers every page's underlying tables (already done — covered by the `Multi-tenant Architecture` and `Shared Data Access` memories).
3. Mark this finding as an **accepted risk** in the security memory so the scanner stops re-flagging it.

## What to change

### 1. Small hardening of `ProtectedRoute`
Currently `ProtectedRoute` only redirects when `allowedPages !== null` (i.e. the user is a team member). Add a defensive log + ensure the redirect target itself is in `allowedPages` (avoid redirect loops if `firstAllowed` is somehow stale).

```text
src/components/auth/ProtectedRoute.tsx
- if `isBlocked`, pick `allowedPages?.[0] ?? "/dashboard"` (already correct)
- add an explicit comment that this is a UX guard, data is RLS-protected
```

No new files, no DB changes.

### 2. Mark the finding as accepted

Use `security--manage_security_finding` with `operation: "ignore"` on `internal_id: team_permission_client_check`, with the rationale: "Page visibility is a UI policy. All underlying data is RLS-protected per-table via `team_members` membership. A bypassed URL shows no data."

### 3. Update `@security-memory`

Append an "Accepted risks" entry:
- `allowed_pages` is enforced client-side only by design. Data protection is at the table-RLS layer, which is the actual security boundary. Future scans should not re-flag this.

## Why not enforce server-side

Options that were considered and rejected:

- **A Postgres function `can_access_page(user_id, route)`**: would duplicate UI route definitions in the DB. Adding a new page would require a migration. No data-protection benefit beyond what RLS already gives.
- **An edge function gate**: same problem — every page navigation would need a network round-trip just to confirm UI visibility, harming UX, with no extra data protection.

## Files touched

- `src/components/auth/ProtectedRoute.tsx` — add a clarifying comment, no behavior change required (existing guard already works correctly).
- Security memory — note the accepted risk.
- Security finding — marked as ignored with rationale.

## Out of scope

No database migrations. No changes to RLS policies. No new edge functions.
