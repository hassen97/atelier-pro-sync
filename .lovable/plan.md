
# Fix Reset Request: Mobile-Friendly Detail Popup

## Problem

The "Contact" column in the reset requests table uses `hidden sm:table-cell` (only shows on `sm` screens and above, i.e. ≥640px). On mobile in portrait mode, the phone number is completely invisible. The "Date" column is also hidden on small screens (`hidden md:table-cell`).

## Solution

Two improvements:

### 1. Clickable Row → Detail Dialog
When the admin taps/clicks anywhere on a request row, a **detail dialog** pops up showing all information about that request regardless of screen size:
- Username + Full name
- Phone (clickable `tel:` link)
- WhatsApp link (if phone available)
- Date & time submitted + relative time ("il y a 2 heures")
- Current status badge
- **Quick action buttons inline**: Mark contacted, Mark resolved, Reset Password

This replaces the need to find hidden columns or use the dropdown menu — everything is one tap away.

### 2. Add Phone Icon Hint on Mobile Rows
When a request has a phone number, show a small phone icon next to the username in the mobile view so the admin knows there's contact info available (hint to tap for details).

---

## Files to Change

### `src/components/admin/AdminResetRequests.tsx`
- Add `selectedRequest` state (`ResetRequest | null`)
- Make `TableRow` clickable (`cursor-pointer`, `onClick={() => setSelectedRequest(req)}`)
- Add a `Dialog` component that opens with full request details when a row is clicked
- Show phone + WhatsApp links, date, status, and action buttons inside the dialog
- Keep the existing `DropdownMenu` for desktop convenience (stop propagation so clicking dropdown doesn't also open dialog)
- Show a `Phone` icon hint in the username column on mobile when phone exists

---

## Dialog Content Layout

```
┌─────────────────────────────────────────┐
│ 🔑 Demande de réinitialisation          │
│                                         │
│ Utilisateur  │ @belfortgsm              │
│ Nom complet  │ Belfort GSM              │
│ Téléphone    │ 📞 +216 XX XXX XXX       │
│ WhatsApp     │ 💬 Ouvrir WhatsApp       │
│ Date         │ 01 mars 2026 14:30       │
│              │ (il y a 2 heures)        │
│ Statut       │ [En attente]             │
│                                         │
│ [Marquer contacté] [Marquer résolu]     │
│ [Réinitialiser mot de passe]            │
└─────────────────────────────────────────┘
```

No backend changes needed — purely a UI improvement to `AdminResetRequests.tsx`.
