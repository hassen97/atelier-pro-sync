

# Plan: Enhanced Auth Pages, Email Support, Admin Settings & WhatsApp Contact

---

## Overview

This plan adds 7 features:
1. Username existence check on the forgot password page
2. Optional phone number field on forgot password (for users who forgot their username too)
3. Optional email field on signup + email editing in Settings
4. Admin WhatsApp contact button on login/signup/forgot password pages
5. Email search in admin shops table
6. Admin Settings page (WhatsApp number + auto-confirm signups toggle)
7. Store admin WhatsApp number in a new `platform_settings` table

---

## 1. Database Migration

### New table: `platform_settings`
A key-value settings table for admin-level configuration:
- `id` (uuid, PK)
- `key` (text, UNIQUE) -- e.g. "admin_whatsapp", "auto_confirm_signups"
- `value` (text)
- `updated_at` (timestamptz)

RLS: Anyone can SELECT (needed for displaying the WhatsApp button on public pages). Only platform_admin can INSERT/UPDATE.

### Add `email` column to `profiles`
- `email` (text, nullable) -- optional contact email for owners

### Update `handle_new_user` trigger
- Capture `email` from user metadata if provided.

---

## 2. Reset Password Page Enhancement (`src/pages/ResetPassword.tsx`)

- After the user types a username and before submitting, check if the username exists by querying the `password_reset_requests` insert (we can't query profiles without auth).
- **Alternative approach**: Add an edge function action `"check-username"` that takes a username and returns whether it exists (without requiring auth). This will be a **public** endpoint via a new lightweight edge function `check-username`.
- If the username doesn't exist, show an error: "Nom d'utilisateur introuvable".
- Add an optional phone number field: "Vous avez oublie votre nom d'utilisateur ? Entrez votre numero de telephone". The phone will be included in the reset request so the admin can find the account.
- Add an "Admin WhatsApp" contact button at the bottom that links to `wa.me/{admin_whatsapp}` fetched from `platform_settings`.

---

## 3. Signup Page Enhancement (`src/pages/Auth.tsx`)

- Add an optional "Email" field in the registration form.
- Pass email to `signUp()` in AuthContext, store it in user metadata.
- Add the admin WhatsApp contact button at the bottom of login and signup tabs.
- Fetch admin WhatsApp number from `platform_settings` on mount (public access).

---

## 4. Settings Page -- Email Editing (`src/pages/Settings.tsx`)

- In the Security tab "Coordonnees" card, add an Email field.
- Load email from profiles, save it on update.

---

## 5. Admin Search by Email (`src/components/admin/AdminShopsView.tsx`)

- Add `email` to the search filter logic.
- Display email in a new column (or in the existing owner info).
- Update the edge function `list` action to fetch email from profiles.

---

## 6. Admin Settings Page

### New file: `src/components/admin/AdminSettingsView.tsx`
- Card 1: "WhatsApp Admin" -- Input to set the admin WhatsApp number (stored in `platform_settings` with key `admin_whatsapp`)
- Card 2: "Confirmation des inscriptions" -- Toggle switch for auto-confirm signups (stored in `platform_settings` with key `auto_confirm_signups`). When enabled, new accounts will NOT be locked automatically.

### Navigation
- Add "Parametres" nav item (Settings icon) in `AdminSidebar.tsx`
- Add `"settings"` to the `AdminView` type
- Render in `AdminDashboard.tsx`

### Edge function updates (`admin-manage-users/index.ts`)
- Add action `"get-platform-settings"` -- returns all platform_settings rows
- Add action `"update-platform-setting"` -- upserts a key/value pair

---

## 7. Auto-Confirm Signup Logic

### In `handle_new_user` trigger (database)
- Check `platform_settings` for `auto_confirm_signups`. If its value is `'true'`, set `is_locked = false` instead of `true`.

### In Auth pages
- When auto-confirm is on, after signup show "Votre compte a ete cree. Vous pouvez vous connecter." instead of the pending message.

---

## 8. Public Check-Username Edge Function

### New file: `supabase/functions/check-username/index.ts`
- Accepts POST with `{ username }` or `{ phone }`
- Returns `{ exists: boolean }` by querying profiles with service role
- No auth required (public endpoint)
- Rate-limit protection: simple validation only

---

## Files Summary

### Database Migration (1 SQL file)
- Create `platform_settings` table with RLS
- Add `email` column to `profiles`
- Update `handle_new_user` trigger to capture email and check auto-confirm setting
- Insert default platform settings rows

### New Files (3)
- `supabase/functions/check-username/index.ts` -- public username/phone lookup
- `src/components/admin/AdminSettingsView.tsx` -- admin settings page

### Modified Files (7)
- `src/pages/ResetPassword.tsx` -- username check, optional phone, admin WhatsApp button
- `src/pages/Auth.tsx` -- optional email field, admin WhatsApp button on login/signup
- `src/contexts/AuthContext.tsx` -- pass email in signUp metadata
- `src/pages/Settings.tsx` -- add email field in Coordonnees card
- `src/components/admin/AdminShopsView.tsx` -- email in search + display
- `src/components/admin/AdminSidebar.tsx` -- add Settings nav item
- `src/pages/AdminDashboard.tsx` -- render AdminSettingsView
- `supabase/functions/admin-manage-users/index.ts` -- platform settings actions, email in list

