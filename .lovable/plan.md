

# Fix Real-Time Sync Between Shop Owner and Employees

## Problem

Currently, realtime subscriptions filter by `user_id=eq.${user.id}`. Employees have a different `user_id` than the shop owner, but all shop data (repairs, sales, products, customers) is stored under the **owner's** `user_id`. This means employees never receive realtime updates.

## Solution

Use the existing `useEffectiveUserId()` hook (which already returns the owner's ID for employees) in the realtime subscription system.

## Changes

### 1. Update `src/hooks/useRealtimeSubscription.ts`

- Import `useEffectiveUserId` from `useTeam`
- Replace `user.id` with `effectiveUserId` in the realtime filter
- This ensures both owner and employees listen to the same data channel

Before:
```
filter: `user_id=eq.${user.id}`
```

After:
```
filter: `user_id=eq.${effectiveUserId}`
```

- Update the `useEffect` dependencies to include `effectiveUserId`

### 2. Add `team_tasks` to realtime subscriptions

- Add "team_tasks" as a valid table in the `TableName` type
- Create a new `useTeamRealtime()` pre-configured hook that subscribes to `team_tasks` changes
- This ensures task assignments and status changes sync instantly between owner and employees

### 3. Use realtime in the Dashboard and Task components

- In `src/pages/Dashboard.tsx`: ensure `useDashboardRealtime()` is called (may already be present)
- In `src/components/settings/TaskManagement.tsx` and `src/components/dashboard/MyTasks.tsx`: add the new `useTeamRealtime()` hook so tasks update in real-time

### 4. Enable Realtime on `team_tasks` table

- Run a migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.team_tasks;`
- Realtime is likely already enabled on repairs, sales, products, customers -- we will verify and add if missing

## What This Achieves

- Owner creates a repair, employee sees it appear instantly
- Employee updates a task to "done", owner sees the change immediately
- No offline mode needed -- just proper use of the existing team architecture
- Zero new dependencies, minimal code changes

## Technical Note

The `useEffectiveUserId()` hook already handles the logic:
- For owners: returns their own `user.id`
- For employees: returns `teamInfo.owner_id`

This is the same ID used in all data queries, so realtime will match exactly what the user sees.
