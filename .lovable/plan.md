

# Fix: Timer Start on Login, Employee Exemption, Login Role Validation

## Problems Identified

1. **Timer starts at signup, not login** — The `handle_new_user` trigger sets `verification_deadline = now() + 48h` at account creation time. The 48-hour window should start at the user's next login instead.

2. **Employees get verification too** — The trigger sets `verification_status = 'pending_verification'` and `is_locked = true` for ALL new users, including employees created via the `create-employee` edge function. Employees should be exempt.

3. **No login role enforcement** — The owner/employee toggle on the login page is cosmetic. A shop owner can log in with the "Employé" tab selected and vice versa.

## Changes

### 1. Database Migration — Stop setting deadline at signup

Update `handle_new_user` trigger:
- Set `verification_deadline = NULL` instead of `now() + interval '48 hours'`
- Keep `verification_status = 'pending_verification'` (for owners created via signup)

### 2. `create-employee` Edge Function — Exempt employees

After creating the employee user (and after the trigger fires), update their profile:
- `verification_status = 'verified'`
- `verification_deadline = NULL`
- `is_locked = false`

This ensures employees skip verification entirely.

### 3. `VerificationBanner.tsx` — Start timer on first dashboard load

When the banner detects `verification_status = 'pending_verification'` and `verification_deadline IS NULL`, it sets the deadline to `now() + 48 hours` via a profile update. This means the timer starts on first login/dashboard access, not at signup.

### 4. `Auth.tsx` — Enforce login role matching

After successful login, check the user's role in `user_roles`:
- If "Employé" tab selected but user is `super_admin` → sign out, show "Ce compte est un compte propriétaire"
- If "Propriétaire" tab selected but user is `employee` → sign out, show "Ce compte est un compte employé"

### Files to Modify

| File | Change |
|------|--------|
| New migration SQL | Update `handle_new_user` to set `verification_deadline = NULL` |
| `supabase/functions/create-employee/index.ts` | After user creation, set `verification_status = 'verified'`, `is_locked = false` |
| `src/components/verification/VerificationBanner.tsx` | On mount, if deadline is null + pending, set deadline to now+48h |
| `src/pages/Auth.tsx` | After login, validate role matches selected tab |

