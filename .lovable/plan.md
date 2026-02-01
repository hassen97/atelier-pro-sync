
# Switch to Username-Based Authentication

## Why This Solves Your Problem
- No emails = no rate limits
- Users create a simple username + password
- No need for email verification at all

## How It Works
Since the backend authentication system still requires an email internally, we'll use a clever approach:
- Users enter a **username** (e.g., "ahmed123")
- System generates a fake internal email: `ahmed123@repairpro.local`
- Users never see or need to know about this internal email

## Database Changes

### Add username column to profiles table
```sql
ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
CREATE INDEX idx_profiles_username ON public.profiles(username);
```

### Update the handle_new_user trigger
Store the username from the signup metadata into the profiles table.

## Code Changes

### 1. AuthContext.tsx
- Update `signUp` to accept username instead of email
- Generate internal email from username: `${username}@repairpro.local`
- Update `signIn` to do the same lookup

### 2. Auth.tsx (Login/Signup Page)
- Replace email fields with username fields
- Update labels and placeholders in French
- Add username validation (alphanumeric, 3-20 chars)

## Updated Forms

**Signup:**
- Nom d'utilisateur (username) - NEW
- Nom complet (full name)
- Mot de passe
- Confirmer mot de passe

**Login:**
- Nom d'utilisateur (username) - replaces email
- Mot de passe

## Validation Rules
- Username: 3-20 characters, letters, numbers, underscores only
- Must be unique
- Case-insensitive (stored lowercase)

## Migration for Existing Users
Existing users who signed up with real emails will need to:
- Either keep using their email to login (we can support both)
- Or be assigned a username based on their email prefix

## Files to Modify
1. `src/contexts/AuthContext.tsx` - Update signUp/signIn logic
2. `src/pages/Auth.tsx` - Update form fields
3. Database migration - Add username column
4. Update `handle_new_user` trigger to store username
