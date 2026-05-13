## Goal

Make publishing changelogs effortless — so you don't have to open the Ultra Admin dashboard every time we ship a fix or feature, AND get a ready-to-paste Facebook version for free.

## What exists today

- `platform_announcements` table + `WhatsNewModal` already pops up for shop owners/employees on login when there's an unread announcement.
- Posting today requires: log into Ultra Admin → Announcements view → fill 3 fields → publish. That's the friction.

## What we'll add

### 1. One-click "Quick Changelog" composer (everywhere in Admin)

- Add a floating **"Publier un changelog"** button in the Admin shell (top-right of `AdminDashboard`, always visible — not buried in the Announcements tab).
- Also wire it into the **Cmd+K command palette** (`AdminCommandPalette.tsx`) as `"Publier un changelog"` so you can fire it from any admin page in 2 keystrokes.
- Opens a slim dialog with:
  - Title (auto-suggested: `"Mise à jour du <date du jour>"`)
  - Nouvelles fonctionnalités (textarea)
  - Changements / Corrections (textarea)
  - Target = "Toutes les boutiques" by default (keeps current targeting option as a collapsible advanced section)
- On publish → uses existing `useCreateAnnouncement` → broadcasts to all shop owners + employees → `WhatsNewModal` pops up for them next time they open the app (already works).

### 2. Facebook-ready copy button

In the same dialog, after publishing (and also as a button on each row in the existing Announcements list):

- **"Copier pour Facebook"** button → copies a nicely formatted post to clipboard:
  ```
  🚀 RepairPro — Mise à jour du 8 mai 2026

  ✨ Nouveautés
  • <bullet 1>
  • <bullet 2>

  🛠 Améliorations & corrections
  • <bullet 1>
  • <bullet 2>

  👉 Mettez à jour votre app pour en profiter !
  #RepairPro #GestionDeBoutique
  ```
- Uses your shop/brand name from `platform_settings` and current date.
- Toast confirms "Copié — collez sur Facebook".

### 3. Employees see the popup too (verify)

- Confirm `WhatsNewModal` is mounted in the main shop layout (not only owner-only routes). If currently gated to owners, lift the gate so employees also see broadcasts. Targeted announcements (specific `target_user_id`) stay unchanged.

## Files touched

- `src/pages/AdminDashboard.tsx` — add floating "Publier un changelog" button.
- `src/components/admin/QuickChangelogDialog.tsx` *(new)* — slim composer + "Copier pour Facebook".
- `src/components/admin/AdminCommandPalette.tsx` — add command entry.
- `src/components/admin/AdminAnnouncementsView.tsx` — add "Copier pour Facebook" button per row (reuses formatter).
- `src/lib/changelogFormat.ts` *(new)* — single function `formatForFacebook({title, newFeatures, changesFixes, brandName})`.
- `src/components/layout/MainLayout.tsx` (or wherever `WhatsNewModal` lives) — verify employees see it; lift gate if needed.

No DB migration. No RLS change. Reuses existing `platform_announcements` + `useCreateAnnouncement` + `WhatsNewModal`.

## Result

- 2 clicks (or Cmd+K → Enter) from anywhere in admin to publish a changelog that pops up for every shop owner and employee.
- One extra click to get a Facebook-ready post on your clipboard — no manual rewriting.
