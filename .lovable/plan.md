# Make the Ultra Admin UI smooth

The admin dashboard feels laggy because the UI is doing **too much GPU/CPU work on every paint and every navigation**, especially on Android Chrome. The biggest offenders are:

1. **Heavy `backdrop-filter: blur(12–32px)` stacked on 6+ elements** (sidebar, header, top bar, every KPI card, every panel, command palette). Backdrop blur is one of the most expensive CSS effects on mobile GPUs and is repainted on every scroll/animation.
2. **Framer-motion animating `width` on the sidebar** (64 ↔ 256). Animating `width` triggers layout on every frame for the entire main content area.
3. **`AnimatePresence` + per-item `motion.div` everywhere** (sidebar labels, sidebar buttons with `whileHover`/`whileTap`, every KPI card, every activity row with staggered delays, view transitions). Each navigation re-runs all these animations.
4. **Always-on `animate-ping` pulses** in 2 spots — continuous repaints in the background.
5. **The signup notifier** is fine, but stats are not invalidated, so no extra cost there. We will leave it alone.

## What we'll change

### Visual effects
- Remove `backdrop-filter: blur(...)` from KPI cards, panels, sidebar, header, top bar. Replace with **solid (or near-solid) dark backgrounds** matching the current palette so the look stays the same but paints are cheap.
- Keep blur **only** on the command palette overlay (it's modal, opens on demand).
- Replace the heavy `shadow-[0_0_24px_...]` glows on KPI cards with a single thin border + subtle inset highlight (kept for active sidebar item only).
- Remove the two ambient `animate-ping` pulses, or downgrade them to a static dot.

### Sidebar
- Stop animating `width` with framer-motion. Switch to two fixed widths via CSS `transition: width 200ms` on a plain `div` (or just toggle a class). Browsers handle width transitions much faster than JS-driven motion when there are many children.
- Remove `whileHover`/`whileTap` scale on every nav button. Use a CSS `:hover` background change instead (cheaper, no JS frame work).
- Remove the `AnimatePresence` wrapping each label `<span>` and section title — just conditionally render text. The collapsed/expanded swap will be instant.
- Keep the active-item highlight (border + cyan tint) — that's static, no cost.

### Dashboard view (AdminOverview)
- Remove `motion.div` wrappers and staggered `delay` on the 6 KPI cards. Replace with one CSS `animate-fade-in` (already in the project).
- Same for the activity feed rows: drop per-row `motion.div` with `delay: i * 0.04`. The list will appear instantly instead of cascading over ~600ms.
- Keep the revenue bar fill animation (it's only 2 elements, runs once).

### Page transitions
- Remove the `AnimatePresence mode="wait"` view-switcher in `AdminDashboard.tsx`. Switching tabs currently waits for an exit animation, then plays an enter animation — that's the main "lag" feeling when clicking sidebar items. We'll render the active view directly so navigation is instant.

### Data fetching
- `useAdminData`, `useAdminRevenue`, `useAdminActivity`, `useAdminFeedback`, `useWaitlistCount` each call edge functions on mount. Add `staleTime: 60_000` and `refetchOnWindowFocus: false` so re-entering the dashboard or switching tabs doesn't re-trigger network spinners.

## Files to edit

- `src/pages/AdminDashboard.tsx` — drop `AnimatePresence`/`motion.div` view switcher, drop blur on header/top bar.
- `src/components/admin/AdminSidebar.tsx` — remove framer-motion width animation, remove per-item `whileHover/whileTap`, remove `AnimatePresence` text/label wrappers, use plain conditional render + CSS transitions.
- `src/components/admin/AdminOverview.tsx` — remove `motion.div` wrappers, drop blur + heavy glow on stat cards and panels, remove `animate-ping` pulses (keep single static dot).
- `src/components/admin/AdminActivityFeed.tsx` — remove per-row `motion.div` stagger, render rows directly.
- `src/hooks/useAdmin.ts` — add `staleTime` + `refetchOnWindowFocus: false` to the four admin queries.

## What stays the same

- Visual identity: same dark navy palette, same cyan accents, same layout, same sidebar collapse behavior, same command palette (⌘K), same realtime signup toasts and Web Push.
- The command palette keeps its blur (modal, opens on demand only).

## Expected result

- Sidebar collapse/expand: instant, no width animation jank.
- Tab switching in admin: instant, no fade-out delay.
- Scrolling the dashboard on Android Chrome: smooth (no per-frame backdrop-blur recompositing).
- KPI cards and activity list appear at once instead of staggering in over half a second.

No database changes, no edge function changes, no new dependencies.
