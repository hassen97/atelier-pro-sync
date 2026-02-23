

# Plan: Password Reset Requests, Profile Contact Editing, Admin Search, and Signup Confirmation

---

## Summary

This plan covers 4 features:
1. **Reset Password page refonte** -- Replace static instructions with a form that sends a reset request ticket to the admin inbox
2. **Profile phone/WhatsApp editing** -- Already partially implemented; ensure the checkbox sync logic works properly in Settings
3. **Admin search by phone/WhatsApp** -- Already implemented; no changes needed
4. **Admin confirmation of new signups** -- New accounts start as "pending" and need admin approval before they can log in

---

## 1. Password Reset Request System

### What changes
- **`src/pages/ResetPassword.tsx`** -- Replace the current static instruction card with:
  - A "Username" input field
  - A "Send Reset Request" button
  - On submit: insert a row into `platform_feedback` with type `"password_reset"`, the username, and auto-fetched phone/WhatsApp from the profile
  - Show a success message: "Votre demande a ete envoyee. L'administrateur vous contactera."
  - No authentication required for this action -- needs a new approach (see below)

### Database Changes
- **New table: `password_reset_requests`**
  - `id` (uuid, PK, default gen_random_uuid())
  - `username` (text, NOT NULL)
  - `status` (text, default 'pending') -- pending, contacted, resolved
  - `created_at` (timestamptz, default now())
  - RLS: Allow anonymous INSERT (anyone can submit a request). Only platform_admin can SELECT/UPDATE.
  - This is separate from `platform_feedback` because reset requests don't require authentication.

### Edge Function Changes
- **`supabase/functions/admin-manage-users/index.ts`** -- Add a new action `"list-reset-requests"` that returns all pending reset requests joined with the profile's phone/whatsapp_phone for that username.
- Add action `"update-reset-request"` to mark requests as contacted/resolved.

### Admin UI Changes
- **`src/components/admin/AdminSidebar.tsx`** -- Add a new nav item: "Demandes" (Key icon) pointing to a new `"reset_requests"` view
- **`src/pages/AdminDashboard.tsx`** -- Add the new view rendering
- **New file: `src/components/admin/AdminResetRequests.tsx`** -- List of pending password reset requests showing:
  - Username
  - Phone number (fetched from profile)
  - WhatsApp number (with click-to-contact link)
  - Submission date
  - Status badge (pending/contacted/resolved)
  - Action buttons to change status and a direct "Reset Password" button that opens the existing ResetPasswordDialog

---

## 2. Profile Phone/WhatsApp Editing

Already implemented in `src/pages/Settings.tsx` (Security tab). The phone and WhatsApp fields with checkbox sync logic are functional. No additional changes needed.

---

## 3. Admin Search by Phone/WhatsApp

Already implemented in `AdminShopsView.tsx` -- search filters by phone and whatsapp_phone. Phone and WhatsApp columns are displayed with click-to-call/WhatsApp links. No changes needed.

---

## 4. Admin Confirmation of Signups

### Concept
New shop owner signups will require admin approval. Until approved, the account is locked (banned) and the user sees a message saying their account is pending approval.

### Flow
1. User signs up normally via `/auth`
2. After signup, the account is automatically locked (ban_duration set)
3. User sees: "Votre compte est en attente de validation par l'administrateur."
4. Admin sees pending accounts in the shops table with a "Pending" badge
5. Admin clicks "Approve" to unlock the account

### Implementation

**`src/contexts/AuthContext.tsx`** (signUp function):
- After successful signup, immediately lock the account by calling a new edge function action `"pending-signup"` (or handle via database trigger)
- Actually: simpler approach -- use the `is_locked` flag on profiles. After signup, set `is_locked = true` on the new profile.

**`supabase/functions/admin-manage-users/index.ts`**:
- Add action `"approve-signup"` -- unlocks the account (same as "unlock" but with a semantic name)
- In the `"list"` action, include a `is_pending` computed field for accounts that are locked and were created recently / never logged in

**`src/pages/Auth.tsx`**:
- After signup, show message: "Votre compte a ete cree. Il est en attente de validation par l'administrateur."
- On login, if the error indicates the account is banned, show: "Votre compte est en attente de validation."

**`src/components/admin/AdminShopsView.tsx`**:
- Add a "Pending" filter button
- Show a "En attente" badge on locked accounts that have never been online
- Add an "Approve" action in the dropdown menu that calls unlock

**Database trigger** (migration):
- After a new profile is created with role `super_admin`, automatically set `is_locked = true`
- This ensures all new signups start locked

---

## Technical Summary

### Database Migration
```sql
-- Password reset requests table (anonymous access)
CREATE TABLE password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;
-- Anonymous can insert
CREATE POLICY "Anyone can submit reset request" ON password_reset_requests
  FOR INSERT WITH CHECK (true);
-- Only platform admins can view/update
CREATE POLICY "Platform admins can view reset requests" ON password_reset_requests
  FOR SELECT USING (has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Platform admins can update reset requests" ON password_reset_requests
  FOR UPDATE USING (has_role(auth.uid(), 'platform_admin'));
```

### New Files (2)
- `src/components/admin/AdminResetRequests.tsx` -- Reset requests inbox
- `src/hooks/useResetRequests.ts` -- Hook for submitting (unauthenticated) and listing reset requests

### Modified Files (7)
- `src/pages/ResetPassword.tsx` -- Username input + submit form
- `src/pages/Auth.tsx` -- Post-signup "pending approval" message, login ban detection
- `src/contexts/AuthContext.tsx` -- Lock profile after signup
- `src/components/admin/AdminSidebar.tsx` -- Add "Demandes" nav item
- `src/pages/AdminDashboard.tsx` -- Render reset requests view
- `src/components/admin/AdminShopsView.tsx` -- Pending filter + approve button
- `supabase/functions/admin-manage-users/index.ts` -- list-reset-requests, update-reset-request, approve-signup actions

### Execution Order
1. Database migration (password_reset_requests table)
2. Edge function updates (new actions)
3. Reset password page refonte
4. Signup approval flow (Auth + admin UI)
5. Admin reset requests inbox

