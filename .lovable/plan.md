

# Fix Employee Issues: Dashboard Access, Username Display, and Management Actions

## Issues Identified

### 1. Dashboard "Access Denied" for Employees
**Root cause**: `ALL_PAGES` defines the dashboard as `href: "/"`, but the actual route is `/dashboard`. When `ProtectedRoute` checks `location.pathname` (`/dashboard`) against `allowedPages` (`["/", "/pos"]`), it doesn't match — so employees are blocked.

**Fix**: Update `useAllowedPages` in `useTeam.ts` to map `"/"` entries to `"/dashboard"` so both paths are recognized. Also update `ALL_PAGES` to use `/dashboard` going forward. In `ProtectedRoute`, redirect blocked employees to their first allowed page instead of always `/dashboard`.

### 2. Username Not Showing in Employee List
**Root cause**: The `list-employees` action in the edge function fetches profiles correctly, but the `create-employee` function creates the user with `user_metadata.username`. The trigger does set the username. However, the admin **users list** (shops view `list` action) only shows `super_admin` users — employees are excluded by design. The user likely means the **employees tab** is missing `verification_status` and `is_locked` data, and possibly the profile isn't created fast enough.

**Fix**: Add `verification_status` and `is_locked` to the `list-employees` profile fetch in the edge function. Also verify the profiles query includes these fields.

### 3. Employee Management Actions (Unlock, Verify)
**Missing feature**: The admin employees dropdown only has "Reset password" and "Delete". Need to add Unlock, Lock, and Verify actions.

**Fix**: Add UI buttons in `AdminEmployeesView.tsx` dropdown menu using existing edge function actions (`unlock`, `lock`, `verify-owner`). Show status badges for locked/verified state.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useTeam.ts` | Change `ALL_PAGES` dashboard href from `"/"` to `"/dashboard"`. Map old `"/"` entries in `useAllowedPages`. |
| `src/components/auth/ProtectedRoute.tsx` | Fix blocked redirect to first allowed page. Handle `"/"` ↔ `/dashboard` equivalence. |
| `supabase/functions/admin-manage-users/index.ts` | Add `verification_status`, `is_locked` to `list-employees` profile fetch. Fix TS error (missing return). |
| `src/components/admin/AdminEmployeesView.tsx` | Add Lock, Unlock, Verify dropdown actions + status badges. |
| `src/hooks/useAdmin.ts` | Add `verification_status` and `is_locked` to `EmployeeRecord` interface. |

## Build Error Fix
The `admin-manage-users` edge function has a TS error: `serve()` handler can return `undefined`. Add a final `return jsonResp(...)` at the end of the handler to ensure all paths return a Response.

