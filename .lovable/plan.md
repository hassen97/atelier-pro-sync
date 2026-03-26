

# Fix Login Gate Bug & Strengthen Onboarding Funnel

## Root Cause Analysis

**Bug 1 — Login "Red Box" for verified users:** In `Auth.tsx` line 153, `handleLogin` checks `profile.is_locked`. When admin verifies a user (sets `verification_status = 'verified'`), if `is_locked` remains `true`, the login is rejected with "en attente de validation" even though the user IS verified. The fix: check `verification_status` directly, not just `is_locked`.

**Bug 2 — Dashboard bypass for pending users:** `ProtectedRoute` has NO redirect for `pending_verification` users. It relies on the `VerificationBanner` overlay rendered inside `MainLayout`, but users can still reach dashboard routes and see content behind the overlay. The guard needs an explicit redirect.

**Bug 3 — Stale data after login:** `useOnboardingStatus` caches for 2 minutes. After login, stale cache can show old status. Need to invalidate on login.

## Plan

### 1. Fix Auth.tsx `handleLogin` (lines 147-163)

Replace the `is_locked` check with proper verification_status logic:

```typescript
const { data: profile } = await supabase
  .from("profiles")
  .select("is_locked, verification_status")
  .eq("user_id", userId)
  .single();

const vs = profile?.verification_status;

// Allow verified users through, even if is_locked was stale
if (vs === "verified") {
  // Unlock if still locked (admin verified but forgot to unlock)
  if (profile?.is_locked) {
    await supabase.from("profiles").update({ is_locked: false }).eq("user_id", userId);
  }
  // Proceed — ProtectedRoute will handle funnel
} else if (vs === "suspended") {
  await supabase.auth.signOut();
  setError("Votre compte a été suspendu...");
  setLoading(false);
  return;
} else if (profile?.is_locked) {
  await supabase.auth.signOut();
  setError("Votre compte est en attente de validation par l'administrateur.");
  setLoading(false);
  return;
}
```

### 2. Add explicit `pending_verification` redirect in ProtectedRoute

Before the "Stage 2" check, add Stage 1 — redirect pending users who have NOT yet submitted verification to `/dashboard` (where the overlay blocks them), but redirect those who HAVE submitted to a waiting state. More critically, ensure `pending_verification` users cannot bypass to dashboard sub-routes:

```typescript
// Stage 1: Pending verification → let through to MainLayout (overlay blocks)
// But prevent access to funnel routes meant for verified users
if (onboardingStatus.isPendingVerification || onboardingStatus.isSuspended) {
  if (isOnFunnelRoute) {
    return <Navigate to="/dashboard" replace />;
  }
  // Allow through — VerificationBanner overlay handles blocking
}
```

### 3. Invalidate onboarding cache after login

In `Auth.tsx` after successful login, invalidate the onboarding query cache to force fresh fetch:

```typescript
import { useQueryClient } from "@tanstack/react-query";
// ...
const queryClient = useQueryClient();
// After successful login:
queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
```

### 4. Reduce staleTime for onboarding-status

Change `staleTime` in `useOnboardingStatus` from 2 minutes to 0 so it always refetches on mount (the query itself is fast — 3 small SELECTs).

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Fix `handleLogin` to check `verification_status` instead of just `is_locked`; invalidate cache after login |
| `src/components/auth/ProtectedRoute.tsx` | Add Stage 1 redirect for pending/suspended users; set `staleTime: 0` |

