

## Plan: Fix Impersonation (Read-Only Mode)

### Root Causes

1. **Provider ordering in `App.tsx`**: `ImpersonationProvider` is nested *inside* `ShopSettingsProvider`, so shop settings load using the admin's own `user.id` before impersonation is even resolved.

2. **`useShopSettings` ignores impersonation**: It queries `shop_settings` with `user.id` instead of `useEffectiveUserId()`, so the admin always sees their own (empty) shop settings.

3. **New tab loses auth context**: `window.open(viewUrl, '_blank')` opens a new browser tab. In the preview iframe environment, the new tab may not share the Supabase auth session, causing the user to land on the login page.

4. **Race condition in `ProtectedRoute`**: The redirect logic (`isPlatformAdmin → /admin`) runs before `ImpersonationContext` is mounted, because the context is deeper in the component tree. The URL param check (`location.search.has("impersonate")`) works but is fragile.

### Fixes

#### 1. Reorder providers in `App.tsx`
Move `ImpersonationProvider` to wrap *above* `ShopSettingsProvider` so impersonation state is available when shop settings load.

```
AuthProvider
  → BrowserRouter
    → ImpersonationProvider        ← moved up, wraps everything
      → ProtectedRoute
        → ShopSettingsProvider     ← now has access to impersonation
          → ...
```

#### 2. Update `useShopSettings` to use `useEffectiveUserId()`
Change the query from `eq("user_id", user.id)` to `eq("user_id", effectiveUserId)` so it loads the tenant's settings during impersonation.

#### 3. Replace `window.open` with same-tab navigation
In `AdminShopsView.tsx`, change the "Access Shop" button from `window.open(url, '_blank')` to `navigate(url)` (same tab) so the auth session is preserved. The admin can return via the "Exit" button in the `ReadOnlyBanner`.

#### 4. Add loading guard in `ImpersonationContext`
Add a `verifying` state so downstream consumers wait until the admin role check completes before rendering. This prevents the flash of unauthorized content / premature redirects.

### Files Modified

| File | Change |
|---|---|
| `src/App.tsx` | Move `ImpersonationProvider` above `ShopSettingsProvider`, outside the nested layout |
| `src/contexts/ImpersonationContext.tsx` | Add `isVerifying` loading state, export it |
| `src/hooks/useShopSettings.ts` | Use `useEffectiveUserId()` instead of `user.id` for fetching |
| `src/components/admin/AdminShopsView.tsx` | Replace `window.open` with `useNavigate` for same-tab navigation |
| `src/components/auth/ProtectedRoute.tsx` | Consume `isVerifying` from impersonation context to avoid premature redirect |

