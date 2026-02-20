
# Fix Signup Network Error on Mobile

## Problem
The signup fails on mobile Chrome with "Erreur de connexion reseau" because the custom `authFetch` function (direct REST calls to the auth API) is being blocked at the network level. No request reaches the server (confirmed by empty auth logs). This affects users on mobile networks with data savers or unstable connections.

## Solution
Switch to a **hybrid approach**: use the Supabase JS client as the primary auth method (it handles retries, token refresh, and connection management internally), and only fall back to the direct REST `authFetch` if the JS client also fails.

## Changes

### File: `src/contexts/AuthContext.tsx`

**signUp function:**
1. First attempt: Use `supabase.auth.signUp()` from the JS client
2. If that fails with a network error: Fall back to the existing `authFetch("signup", ...)` 
3. Keep the existing retry/timeout logic in `authFetch` as the fallback

**signIn function:**
1. First attempt: Use `supabase.auth.signInWithPassword()` from the JS client
2. If that fails with a network error: Fall back to the existing `authFetch("token?grant_type=password", ...)`

The `authFetch` function will be kept as-is for the fallback, but the primary path will use the standard Supabase client which has better compatibility with mobile browsers.

---

### Technical details

The `signUp` method will change from:
```
authFetch("signup", { email, password, data })
```
to:
```
1. Try: supabase.auth.signUp({ email, password, options: { data } })
2. If network error, retry with: authFetch("signup", { email, password, data })
```

The `signIn` method will change from:
```
authFetch("token?grant_type=password", { email, password })
```
to:
```
1. Try: supabase.auth.signInWithPassword({ email, password })
2. If network error, retry with: authFetch("token?grant_type=password", { email, password })
```

A helper function `isNetworkError(error)` will be extracted to detect network failures consistently across both paths.
