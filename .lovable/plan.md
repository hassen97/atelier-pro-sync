

## Issues Identified

### 1. Blank Screen
The `ProtectedRoute` component waits on three async queries: `useAllowedPages` (which internally depends on `useIsOwner` + `useMyTeamInfo`), and `useIsPlatformAdmin`. For a newly created employee, the `user_roles` query in `useIsOwner` may fail or return unexpected results because the role inserted is `"employee"` (not `"super_admin"`), so `useIsOwner` returns `false`. However, `useMyTeamInfo` queries `team_members` which requires RLS to allow the employee to read their own row. If RLS blocks this, `teamInfo` stays `undefined`, causing `useAllowedPages` to return `{ isLoading: true }` indefinitely -- blank screen.

Additionally, the `useIsOwner` query uses `.single()` which throws if there's no row or multiple rows. For employees, if the query errors, `isOwner` stays `undefined` and `useAllowedPages` never resolves.

**Fix**: Make `useIsOwner` use `.maybeSingle()` instead of `.single()` to handle cases where no role row exists gracefully. Also add error handling so it defaults to `false` on error.

### 2. Dashboard Checkbox Not Checked / Not Tickable
Two related bugs:

- **In `AddMemberDialog`** (line 56): default `selectedPages` is `["/", "/pos"]` but `ALL_PAGES` defines dashboard as `"/dashboard"`. So checkbox `checked={selectedPages.includes("/dashboard")}` evaluates to `false` because the array has `"/"` not `"/dashboard"`.

- **In both `AddMemberDialog` and `TeamManagement`**: `togglePage` returns early when `href === "/dashboard"`, and `disabled={page.href === "/dashboard"}` makes it untickable. The intent is to always include dashboard, but the checkbox appears unchecked.

- **In `create-employee` edge function** (line 25-29): `normalizeAllowedPages` adds `"/"` not `"/dashboard"`, so the saved `allowed_pages` contain `"/"` which doesn't match the `ALL_PAGES` definition.

**Fix**: 
- Change default `selectedPages` to `["/dashboard", "/pos"]`
- Change `normalizeAllowedPages` to use `"/dashboard"` instead of `"/"`
- Ensure dashboard checkbox shows as checked+disabled (always included)

### 3. Employee Profile Still Shows "Sans nom"
The `create-employee` function looks correct now -- it upserts the profile. But the `useTeamMembers` hook fetches profiles separately. The issue may be that the optimistic cache update in `useCreateEmployee` correctly includes profile data from the edge function response, but `queryClient.invalidateQueries` may re-fetch before the profile upsert has propagated.

The edge function already returns `member.profile` with username and full_name. The `useCreateEmployee` hook does set this optimistically. This should work. Let me verify the hook code is correct.

Looking at `useTeam.ts` `useCreateEmployee`:
```typescript
onSuccess: (data) => {
  if (user && data?.member) {
    queryClient.setQueryData<TeamMember[]>(["team-members", user.id], (current = []) => {
      return [...current.filter(m => m.id !== data.member.id), data.member];
    });
  }
  queryClient.invalidateQueries({ queryKey: ["team-members", user?.id] });
```

The `invalidateQueries` immediately after `setQueryData` will trigger a refetch that overwrites the optimistic data. The refetch queries profiles from DB which may not have the data yet. **Fix**: Remove the `invalidateQueries` call since the optimistic update already has correct data, or delay invalidation.

## Plan

### A. Fix `useIsOwner` to prevent blank screen
In `src/hooks/useTeam.ts`, change `.single()` to `.maybeSingle()` and return `false` on error so the loading state resolves properly for employees.

### B. Fix dashboard checkbox consistency
1. **`src/components/settings/AddMemberDialog.tsx`**: Change default `selectedPages` from `["/", "/pos"]` to `["/dashboard", "/pos"]`.
2. **`src/components/settings/TeamManagement.tsx`**: In `MemberCard`, initialize `pages` state by normalizing `"/"` to `"/dashboard"` so the checkbox shows checked. Keep dashboard always checked+disabled.
3. **`supabase/functions/create-employee/index.ts`**: In `normalizeAllowedPages`, replace `"/"` with `"/dashboard"`.
4. **`src/hooks/useTeam.ts`**: In `handleSave` for `useUpdateMemberPermissions`, ensure `"/dashboard"` is always included instead of `"/"`.

### C. Fix "Sans nom" after creation
In `src/hooks/useTeam.ts` `useCreateEmployee`, remove or delay the `invalidateQueries` call so the optimistic update with correct profile data persists.

### D. Fix `useAllowedPages` normalization
The `useAllowedPages` already normalizes `"/"` to `"/dashboard"`. This is fine but we should also normalize in `MemberCard` initial state.

