# Fix 403 on Employee Creation for Owner Admins

## Goal
Allow shop owners using the `admin` role to create employee accounts for their own shop, while preserving tenant isolation and updating the denial message for unauthorized callers.

## What I found
- The current `create-employee` function does **not** check `role === 'super_admin'` exactly; it currently allows `super_admin` and `platform_admin`, then falls back to active `team_members` with role `manager` or `admin`.
- In the current database, there are **no** `user_roles = 'admin'` users at all. Shop owners are still stored as `super_admin`.
- The user ID from the function logs (`26c3f824-a3a7-44f4-8664-9c7d15116e9a`) has **no** `user_roles` row and **no** `team_members` row, so the 403 is expected with the current data.
- Tenant isolation is already modeled by `team_members.owner_id`. The function does **not** accept a `shop_id` or `owner_id` in the request body today, so there is no current request-body tenant injection path.

## Plan

### 1) Update `create-employee` authorization logic
Refactor the authorization block in `supabase/functions/create-employee/index.ts` to support three valid caller types:
- `platform_admin` for platform-level actions,
- `super_admin` for existing shop owners,
- `admin` for shop owners if the project is transitioning to that role model.

Implementation shape:
- Read **all** roles for the caller from `user_roles`.
- Treat callers with `platform_admin` as privileged platform admins.
- Treat callers with `super_admin` or `admin` as shop owners.
- Keep the fallback for active `team_members` with role `manager` or `admin` only if that delegation is still desired.

### 2) Preserve tenant isolation explicitly
Keep ownership resolution server-side only:
- For `admin` or `super_admin` shop owners, force `ownerId = callerId`.
- For delegated team managers/admins, force `ownerId = managerMembership.owner_id`.
- For `platform_admin`, allow an optional explicit owner/shop target only if the function is intentionally extended to support that. Otherwise keep current owner resolution behavior.
- Ignore any client-provided tenant identifier unless the caller is a platform admin and the schema is explicitly expanded for it.

### 3) Update the forbidden message
Replace the current 403 message with:
- `Erreur : Seuls les gérants (admin) et super admins peuvent créer des comptes employés.`

If delegated managers remain allowed, adjust the copy to match the actual rule so the message does not contradict the code.

### 4) Align the rest of the app with the chosen owner role model
Because the app still assumes owners are `super_admin` in several places, update role checks if you truly want owners to use `admin` going forward:
- `src/hooks/useTeam.ts` (`useIsOwner`)
- `src/components/verification/VerificationBanner.tsx`
- any onboarding/auth guards that treat only `super_admin` as owner

Without this alignment, changing create-employee alone could make employee creation work while other owner-only features still break for `admin` owners.

### 5) Verify against real cases
Test these cases after implementation:
- `super_admin` owner can create employees
- `admin` owner can create employees
- delegated team `manager`/`admin` behavior matches intended policy
- regular employee is denied with the updated message
- created employee is attached to the correct `owner_id`

## Technical details

### Current issue in practice
The current failure is not just a missing `admin` branch in code; the logged caller has no recognized ownership or team membership record at all. That means one of these is also true:
- the caller is the wrong account/session,
- the expected role row is missing,
- the owner model changed in UI assumptions but not in backend data.

### Recommended implementation detail
Use a role set instead of a single-role check, e.g.:
```ts
const roles = new Set((ownerRoles ?? []).map((r) => r.role));
const isPlatformAdmin = roles.has("platform_admin");
const isOwner = roles.has("super_admin") || roles.has("admin");
```
Then derive `ownerId` only from trusted backend lookups.

### Scope note
No database migration is strictly required for the function change itself unless you also want to migrate shop owners from `super_admin` to `admin` across the project.

## Expected result
- Shop owners with role `admin` can create employees for their own shop.
- Unauthorized users still get a 403.
- Employee creation remains tenant-safe because ownership is resolved server-side.
- Owner behavior stays consistent across team management, onboarding, and verification screens.