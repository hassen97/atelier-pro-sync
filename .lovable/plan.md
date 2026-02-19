

# Fix: Signup "Erreur de connexion reseau" on Chrome Android

## Problem
The signup call uses the same `authFetch` helper as login, but Chrome Android is still blocking/proxying the request to the Supabase Auth API. The error "Erreur de connexion reseau" comes from the fetch failing after 3 retries.

## Solution
Harden the `authFetch` function with explicit fetch options that prevent Chrome from intercepting or proxying the request:

### Changes to `src/contexts/AuthContext.tsx`

1. Add `mode: 'cors'` to explicitly declare this is a cross-origin request
2. Add `credentials: 'omit'` to prevent Chrome from attaching cookies or using credential-based proxy routing
3. Add `cache: 'no-store'` to bypass any caching layer (Chrome Data Saver caches aggressively)
4. Increase timeout from 15s to 20s for signup (signup can be slower than login on mobile networks)
5. Add the `AbortError` name check alongside message checks for better abort detection

### Technical Detail

```text
Before:
  fetch(url, { method, headers, body, signal })

After:
  fetch(url, { method, headers, body, signal, mode: 'cors', credentials: 'omit', cache: 'no-store' })
```

These options tell Chrome: "This is an explicit cross-origin request, don't cache it, don't attach credentials, don't route it through any proxy." This is the standard way to bypass browser optimizations that interfere with API calls.

Only one file is modified: `src/contexts/AuthContext.tsx`.

