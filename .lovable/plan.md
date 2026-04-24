# Redesign Verification Gate as Hovering Popup

## Problem
The current full-screen red overlay in `VerificationBanner.tsx` takes over the entire viewport and traps scroll on mobile (384px viewport), making the form fields and submit button unreachable. Previous scroll fixes did not solve it because the wrapper height + nested flex `min-h-full` still wins on mobile Chrome/Safari.

## New Approach
Replace the full-screen takeover with a **hovering popup card** that floats over a **blurred, dimmed dashboard**. The dashboard stays mounted underneath (visible but inaccessible), and the popup itself is a properly-sized modal that scrolls internally on mobile.

### Visual concept
```text
┌─────────────────────────────┐
│ ░░ blurred dashboard ░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│   ┌───────────────────┐     │
│   │ 🛡 Vérification    │     │
│   │   Requise         │     │
│   │  ⏱ 47:59:23       │     │
│   │ ─────────────     │     │
│   │ [shop name]       │     │
│   │ [owner] [phone]   │     │
│   │ [city] [address]  │     │
│   │ ...               │     │
│   │ [Soumettre]       │     │
│   └───────────────────┘     │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────┘
```

## Changes

### 1. `src/components/verification/VerificationBanner.tsx` — STATE 1 redesign
Replace the full-screen wrapper with a fixed overlay that:
- Uses `backdrop-blur-md` + `bg-black/70` so the dashboard shows through, blurred
- Centers a constrained card (`max-w-lg` on mobile, `max-w-2xl` on desktop)
- Card has its own `max-h-[90vh]` with internal `overflow-y-auto` — guarantees the form scrolls within the card on any viewport
- Sticky header (timer + title) stays visible while user scrolls form
- Sticky footer with the submit button so it's always reachable without scrolling to the bottom
- Body padding adjusted so 384px viewport shows full card with margin
- Adds `document.body` overflow lock while the popup is open (via `useEffect`) to prevent background scroll bleeding

### 2. Apply blur to the page underneath
Two options considered. We'll do the simplest: the overlay itself uses `backdrop-blur-md` on a semi-transparent background. The dashboard underneath remains rendered normally — the blur is achieved entirely by the overlay's backdrop filter. No changes needed to `MainLayout` or other components.

### 3. Keep STATE 2 (post-submission amber banner) unchanged
The non-blocking banner already works fine.

## Technical details

- `fixed inset-0 z-[100] bg-black/70 backdrop-blur-md` for the backdrop
- Card: `relative w-full max-w-lg sm:max-w-2xl mx-auto my-auto max-h-[92vh] flex flex-col rounded-2xl border border-red-900/50 bg-zinc-900/95 shadow-2xl`
- Sticky header: `sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-red-900/30 p-4`
- Scrollable body: `flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3` with `WebkitOverflowScrolling: "touch"`
- Sticky footer: `sticky bottom-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-t border-red-900/30 p-4` containing the submit button + WhatsApp link
- `useEffect` adds `document.body.style.overflow = "hidden"` on mount, restores on unmount
- All form fields, validation, and submit logic stay identical — only the wrapper structure changes

## Files
- Edit: `src/components/verification/VerificationBanner.tsx` (STATE 1 block only, ~lines 180-285)

No DB changes, no auth changes, no other components touched.