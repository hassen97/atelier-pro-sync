

# Fix: Mobile "Failed to fetch dynamically imported module" Error

## Problem

After each deployment/code change, Vite generates new JavaScript chunk filenames (content-hashed). Mobile browsers aggressively cache the old chunks. When the app tries to lazy-load a page (like `/auth`), it requests the old chunk URL which no longer exists, causing a blank screen.

This only affects phones because mobile browsers (especially Chrome on Android) cache more aggressively than desktop browsers.

## Solution

Add a retry mechanism to all `lazy()` imports in `App.tsx` that automatically reloads the page once if a chunk fails to load.

### File: `src/App.tsx`

Create a helper function that wraps `lazy()` imports:

```
function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch(() => {
      // Chunk failed to load - likely stale cache. Reload once.
      if (!sessionStorage.getItem("chunk_reload")) {
        sessionStorage.setItem("chunk_reload", "1");
        window.location.reload();
      }
      // Clear flag after reload so future failures can retry
      sessionStorage.removeItem("chunk_reload");
      return importFn(); // Second attempt
    })
  );
}
```

Then replace all `lazy(() => import(...))` calls with `lazyWithRetry(() => import(...))`.

This ensures that if a chunk fails to load (stale cache), the page reloads once to get fresh assets. The `sessionStorage` flag prevents infinite reload loops.

### Technical details

- Only `src/App.tsx` is modified
- No database or backend changes needed
- The fix is invisible to users: they see a brief reload instead of a blank screen
- The `sessionStorage` flag is cleared after reload, so it works correctly on subsequent visits
