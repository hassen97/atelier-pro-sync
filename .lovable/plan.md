# Fix: Verification overlay traps scroll on mobile

## Problem

On mobile (Chrome Android), the full-screen "Vérification Requise" overlay in `src/components/verification/VerificationBanner.tsx` shows the header and the top of the form, but the user can't scroll down to fill in the lower fields or reach the submit button.

## Cause

The overlay uses:
```tsx
<div className="fixed inset-0 z-[100] ... overflow-y-auto">
  <div className="min-h-full flex items-start sm:items-center ...">
```

Two issues on mobile:
1. `items-center` on `sm:` is fine, but the inner `min-h-full` combined with vertically-centered content can prevent the container from growing tall enough to scroll on small viewports when the form is taller than the viewport.
2. Mobile Safari/Chrome need `-webkit-overflow-scrolling: touch` and `overscroll-behavior: contain` to scroll smoothly inside a `fixed` overlay; without them touch scrolling is sometimes swallowed by the page underneath.

## Fix (single file, ~2 lines)

In `src/components/verification/VerificationBanner.tsx`, update the two outer wrapper divs of the State 1 overlay (lines 203–204):

```tsx
<div
  className="fixed inset-0 z-[100] bg-gradient-to-b from-red-950 via-red-900/98 to-zinc-950 overflow-y-auto overscroll-contain"
  style={{ WebkitOverflowScrolling: "touch" }}
>
  <div className="flex items-start justify-center px-3 py-4 sm:p-6 min-h-full">
```

Changes:
- Add `overscroll-contain` and `-webkit-overflow-scrolling: touch` so mobile touch scrolling works inside the fixed overlay.
- Always align content to the top (`items-start`) instead of vertically centering on tablets — vertical centering inside a scroll container can shrink the scrollable area on short viewports. The form will still look fine on desktop because it's capped at `max-w-2xl` and naturally sits near the top.

No DB changes, no other files touched.

## Result

User can scroll the entire verification form on mobile, fill out every field, and tap the "Soumettre la demande" button.
