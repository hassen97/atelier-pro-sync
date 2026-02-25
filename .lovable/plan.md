

# Add Shop Contact Details to Settings Page

## Problem
The Settings page's "General" tab is missing input fields for the shop's address, phone, WhatsApp, and email. These fields were added to the database and receipt PDF, but never added to the settings UI -- so there's no way to fill them in.

## Solution
Add a new "Coordonnees du magasin" (Shop Contact Details) card to the General tab with fields for:
- Address (text input)
- Phone number
- WhatsApp number
- Email

These will be saved as part of the shop settings (not the user profile) and will appear on receipts/PDFs.

## Technical Changes

**File: `src/pages/Settings.tsx`**

1. Add local state variables for the new fields:
   - `shopAddress`, `shopPhone`, `shopWhatsapp`, `shopEmail`

2. Sync them from `settings` in the existing `useEffect` (around line 128-138):
   - `setShopAddress(settings.address || "")`
   - `setShopPhone(settings.phone || "")`
   - `setShopWhatsapp(settings.whatsapp_phone || "")`
   - `setShopEmail(settings.email || "")`

3. Include the new fields in `handleSaveGeneralSettings` (line 179-188):
   - Add `address`, `phone`, `whatsapp_phone`, `email` to the save call

4. Add a new Card after the existing "Informations du magasin" card (after line 378) with:
   - MapPin icon + title "Coordonnees du magasin"
   - Input for address (full width)
   - Grid with phone, WhatsApp, and email inputs
   - The existing "Enregistrer" button in the first card will save everything together

