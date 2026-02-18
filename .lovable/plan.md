
# Fix: Chrome Android "Failed to fetch" Login Error

## Root Cause

Chrome on Android (especially with Data Saver/Lite Mode) can interfere with the Supabase JS client's internal fetch calls by proxying requests through Google servers. This breaks the authentication API calls. Brave works because it doesn't use Google's proxy infrastructure.

## Solution

Replace the Supabase JS client auth calls in `AuthContext.tsx` with direct `fetch` calls to the Supabase REST auth API. This gives us full control over headers, timeouts, and error handling -- bypassing whatever Chrome is doing to the Supabase client's internal fetch.

### Changes

**File: `src/contexts/AuthContext.tsx`**

1. Create a helper function `authFetch` that:
   - Calls the Supabase Auth REST API directly (`/auth/v1/token?grant_type=password` for login, `/auth/v1/signup` for registration)
   - Sets explicit headers (`apikey`, `Content-Type`, `Authorization`)
   - Uses `AbortController` with a 15-second timeout (Chrome mobile can be slow)
   - Retries up to 3 times with progressive delay on network errors

2. Update `signIn` to use `authFetch` for the POST to `/auth/v1/token?grant_type=password`, then manually set the session via `supabase.auth.setSession()` with the returned tokens.

3. Update `signUp` to use `authFetch` for the POST to `/auth/v1/signup`.

4. Keep `signOut`, `updatePassword`, and the `onAuthStateChange` listener unchanged (they work fine since they don't require the initial network call that Chrome blocks).

### Technical Details

```text
Current flow (broken on Chrome Android):
  signIn() -> supabase.auth.signInWithPassword() -> [internal fetch - blocked by Chrome proxy]

New flow:
  signIn() -> direct fetch("/auth/v1/token") with explicit headers + timeout
           -> supabase.auth.setSession(tokens) to sync state
```

Key points:
- The Supabase Auth REST API is publicly documented and stable
- We use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (already available via env)
- `AbortController` timeout prevents indefinite hangs on Chrome
- After successful login, `supabase.auth.setSession()` syncs the session so the rest of the app works normally via the Supabase client
- No database or backend changes needed
- Only `src/contexts/AuthContext.tsx` is modified
